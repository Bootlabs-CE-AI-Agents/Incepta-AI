"""
User management service for CRUD operations.

This service provides user management functions including creation,
retrieval, password updates with password history enforcement, and
role management.

Story: 1B - Auth Service & JWT Implementation
Epic: 2 (Authentication & Authorization Foundation)
"""

from datetime import datetime, timedelta, UTC
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings, get_settings
from src.database.models import User, UserTenantRole, RoleEnum
from src.services.auth_service import hash_password, validate_password_strength, verify_password


class UserService:
    """
    User management service for CRUD operations and role assignment.

    This class provides methods for:
    - User creation with password validation
    - User retrieval by email and ID
    - User updates
    - Soft deletion
    - Password history enforcement
    - Role assignment and retrieval
    """

    async def create_user(
        self,
        email: str,
        password: str,
        default_tenant_id: UUID,
        db: AsyncSession,
    ) -> User:
        """
        Create new user account with hashed password.

        Steps:
        1. Validate password strength
        2. Hash password with bcrypt
        3. Create user record
        4. Set password_expires_at (90 days from now by default)
        5. Save to database

        Args:
            email: User email (must be unique)
            password: Plain text password
            default_tenant_id: User's default tenant UUID
            db: Database session

        Returns:
            Created User object

        Raises:
            ValueError: If password validation fails
            IntegrityError: If email already exists (from SQLAlchemy)

        Security:
            - Password strength validated before hashing
            - Password hashed with bcrypt (10 rounds)
            - Password expiration set automatically
        """
        # Validate password strength
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            raise ValueError(error_msg)

        # Hash password
        password_hash = hash_password(password)

        # Get settings (initializing if necessary for tests)
        settings = get_settings()

        # Calculate password expiration
        password_expires_at = datetime.now(UTC) + timedelta(days=settings.password_expiration_days)

        # Create user
        user = User(
            email=email,
            password_hash=password_hash,
            default_tenant_id=default_tenant_id,
            password_expires_at=password_expires_at,
            failed_login_attempts=0,
            password_history=[],
            is_active=True,  # Explicitly set default value for Pydantic validation
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

        return user

    async def get_user_by_email(
        self,
        email: str,
        db: AsyncSession,
    ) -> Optional[User]:
        """
        Retrieve user by email address.

        Args:
            email: User email
            db: Database session

        Returns:
            User if found, None otherwise

        Security:
            Uses parameterized queries to prevent SQL injection
        """
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_by_id(
        self,
        user_id: UUID,
        db: AsyncSession,
    ) -> Optional[User]:
        """
        Retrieve user by UUID.

        Args:
            user_id: User UUID
            db: Database session

        Returns:
            User if found, None otherwise
        """
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_user(
        self,
        user_id: UUID,
        updates: dict,
        db: AsyncSession,
    ) -> User:
        """
        Update user fields.

        Args:
            user_id: User UUID
            updates: Dict of fields to update
            db: Database session

        Returns:
            Updated User instance

        Raises:
            ValueError: If user not found

        Note:
            Does not allow updating password directly.
            Use update_password() for password changes.
        """
        user = await self.get_user_by_id(user_id, db)
        if not user:
            raise ValueError(f"User not found: {user_id}")

        # Remove password fields if present (use update_password instead)
        updates.pop("password", None)
        updates.pop("password_hash", None)

        # Update fields
        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)

        await db.commit()
        await db.refresh(user)

        return user

    async def delete_user(
        self,
        user_id: UUID,
        current_user: User,
        db: AsyncSession,
    ) -> None:
        """
        Soft delete user account (AC-4).

        Steps:
        1. Verify user exists
        2. Check if last super_admin (prevent deletion)
        3. Set is_active = False (soft delete)
        4. Remove all role assignments
        5. Revoke JWT tokens (via updated_at timestamp)
        6. Log to AuditLog

        Args:
            user_id: User UUID to delete
            current_user: User performing the deletion (for audit)
            db: Database session

        Raises:
            ValueError: If user not found or is last super_admin

        Security:
            - Soft delete preserves audit trail
            - Token revocation invalidates existing sessions
            - Cannot delete last super_admin (system integrity)

        Story: nextjs-story-22-users-api-crud (AC-4)
        """
        from src.database.models import AuditLog, AuditActionEnum

        user = await self.get_user_by_id(user_id, db)
        if not user:
            raise ValueError(f"User not found: {user_id}")

        # Prevent deleting last super_admin
        if await self._is_last_super_admin(user, db):
            raise ValueError(
                "Cannot delete the last active super_admin user. "
                "Assign another super_admin first."
            )

        # Soft delete: set is_active = False
        user.is_active = False
        user.updated_at = datetime.now(UTC)  # Triggers JWT revocation

        # Remove all role assignments (hard delete UserTenantRole entries)
        stmt = select(UserTenantRole).where(UserTenantRole.user_id == user_id)
        result = await db.execute(stmt)
        roles = result.scalars().all()
        for role in roles:
            await db.delete(role)

        # Create audit log entry
        audit_log = AuditLog(
            user_id=current_user.id,
            tenant_id=current_user.default_tenant_id,
            action=AuditActionEnum.DELETE_USER,
            entity_type="User",
            entity_id=str(user_id),
            changes={"is_active": {"old": True, "new": False}},
        )
        db.add(audit_log)

        await db.commit()

    async def update_password(
        self,
        user: User,
        new_password: str,
        db: AsyncSession,
    ) -> User:
        """
        Update user password with history check.

        Steps:
        1. Validate password strength
        2. Hash new password
        3. Check password history (reject if reused)
        4. Update password_hash
        5. Add old hash to password_history (trim to 5)
        6. Set new password_expires_at (90 days from now)
        7. Save to database

        Args:
            user: User to update
            new_password: New plain text password
            db: Database session

        Returns:
            Updated User object

        Raises:
            ValueError: If password invalid or reused

        Security:
            - Validates password strength
            - Checks last 5 passwords to prevent reuse
            - Maintains password history for audit
        """
        # Get settings (initializing if necessary for tests)
        settings = get_settings()

        # Validate password strength
        is_valid, error_msg = validate_password_strength(new_password)
        if not is_valid:
            raise ValueError(error_msg)

        # Hash new password
        new_hash = hash_password(new_password)

        # Check password history (use plain password, not hash)
        if self.check_password_history(user, new_password):
            raise ValueError(
                "You cannot reuse any of your last 5 passwords. Please choose a new password."
            )

        # Update password
        old_hash = user.password_hash
        user.password_hash = new_hash

        # Update password history (prepend old hash, trim to 5)
        history = user.password_history or []
        history.insert(0, old_hash)
        user.password_history = history[:5]  # Keep only last 5

        # Set new expiration
        user.password_expires_at = datetime.now(UTC) + timedelta(
            days=settings.password_expiration_days
        )

        await db.commit()
        await db.refresh(user)

        return user

    def check_password_history(self, user: User, new_password: str) -> bool:
        """
        Check if new password was used in password history.

        CRITICAL FIX: Now accepts plain text password and verifies against each
        historical hash using verify_password(). This is the ONLY correct way to
        check password reuse with bcrypt, as bcrypt hashes include random salts.

        Args:
            user: User object
            new_password: New PLAIN TEXT password to check

        Returns:
            True if password was previously used, False otherwise

        Security:
            Uses verify_password() for constant-time comparison against each
            historical hash. This prevents:
            1. Password reuse (primary security goal)
            2. Timing attacks (constant-time verification)

        Implementation:
            For each hash in password_history, verify the plain password against
            that hash. If any match, the password has been used before.
        """
        history = user.password_history or []

        # Check if new password matches any password in history
        # MUST use verify_password() because bcrypt hashes have random salts
        # Direct hash comparison would NEVER match (bcrypt design)
        for old_hash in history:
            if verify_password(new_password, old_hash):
                return True  # Password reused - REJECT

        return False  # Password unique - ACCEPT

    async def get_user_role_for_tenant(
        self,
        user_id: UUID,
        tenant_id: str,
        db: AsyncSession,
    ) -> Optional[RoleEnum]:
        """
        Fetch user's role for specific tenant.

        Args:
            user_id: User UUID
            tenant_id: Tenant identifier
            db: Database session

        Returns:
            Role enum or None if no role assigned

        Critical:
            Roles fetched on-demand, not from JWT (ADR 003).
            This prevents token bloat for users with access to many tenants.
        """
        stmt = (
            select(UserTenantRole)
            .where(UserTenantRole.user_id == user_id)
            .where(UserTenantRole.tenant_id == tenant_id)
        )
        result = await db.execute(stmt)
        user_tenant_role = result.scalar_one_or_none()

        if user_tenant_role:
            return user_tenant_role.role

        return None

    async def has_admin_role(
        self,
        user_id: UUID,
        db: AsyncSession,
    ) -> bool:
        """
        Check if user has admin role in ANY tenant.

        This is used for infrastructure endpoints that require admin access
        but are not tenant-scoped (e.g., worker monitoring, system health).

        Args:
            user_id: User UUID
            db: Database session

        Returns:
            True if user has admin role in at least one tenant, False otherwise

        Story: nextjs-story-17-workers-api-backend (AC-5: RBAC Enforcement)
        """
        stmt = (
            select(UserTenantRole)
            .where(UserTenantRole.user_id == user_id)
            .where(
                (UserTenantRole.role == RoleEnum.SUPER_ADMIN)
                | (UserTenantRole.role == RoleEnum.TENANT_ADMIN)
            )
            .limit(1)
        )
        result = await db.execute(stmt)
        admin_role = result.scalar_one_or_none()

        return admin_role is not None

    async def assign_role(
        self,
        user_id: UUID,
        tenant_id: str,
        role: RoleEnum,
        db: AsyncSession,
    ) -> None:
        """
        Assign role to user for tenant.

        Args:
            user_id: User UUID
            tenant_id: Tenant identifier
            role: Role enum value
            db: Database session

        Side Effects:
            - Creates UserTenantRole entry if not exists
            - Updates role if entry exists (idempotent via UPSERT logic)

        Note:
            Uses manual idempotency check instead of ON CONFLICT
            due to SQLAlchemy async limitations.
        """
        # Check if role assignment exists
        stmt = (
            select(UserTenantRole)
            .where(UserTenantRole.user_id == user_id)
            .where(UserTenantRole.tenant_id == tenant_id)
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing role
            existing.role = role
        else:
            # Create new role assignment
            user_tenant_role = UserTenantRole(
                user_id=user_id,
                tenant_id=tenant_id,
                role=role,
            )
            db.add(user_tenant_role)

        await db.commit()

    # ==============================================================================
    # NEW METHODS: Story nextjs-story-22-users-api-crud
    # ==============================================================================

    async def list_users(
        self,
        tenant_id: Optional[UUID],
        is_active: Optional[bool],
        role: Optional[RoleEnum],
        limit: int,
        offset: int,
        current_user: User,
        db: AsyncSession,
    ) -> tuple[list[User], int]:
        """
        List users with pagination and filtering (AC-1).

        Supports:
        - Pagination (limit, offset)
        - Filtering by tenant_id, is_active, role
        - Tenant scoping (super_admin sees all, tenant_admin sees their tenant only)

        Args:
            tenant_id: Filter by tenant UUID (optional)
            is_active: Filter by active status (optional)
            role: Filter by role enum (optional)
            limit: Items per page (1-100)
            offset: Pagination offset (>=0)
            current_user: User performing the query (for RBAC)
            db: Database session

        Returns:
            Tuple of (users_list, total_count)

        Security:
            - super_admin: Can view all users across all tenants
            - tenant_admin: Can only view users in their own tenant

        Story: nextjs-story-22-users-api-crud (AC-1)
        """
        from sqlalchemy import func

        # Base query
        stmt = select(User)

        # Apply tenant scoping (RBAC enforcement)
        stmt = await self._apply_tenant_scoping(stmt, current_user, db)

        # Apply filters
        if tenant_id is not None:
            stmt = stmt.where(User.default_tenant_id == tenant_id)

        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)

        if role is not None:
            # Join with UserTenantRole to filter by role
            stmt = stmt.join(UserTenantRole).where(UserTenantRole.role == role)

        # Get total count (before pagination)
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await db.execute(count_stmt)
        total = count_result.scalar() or 0

        # Apply pagination
        stmt = stmt.limit(limit).offset(offset)

        # Execute query
        result = await db.execute(stmt)
        users = list(result.scalars().all())

        return users, total

    async def create_user_with_role(
        self,
        email: str,
        password: str,
        default_tenant_id: UUID,
        initial_role: RoleEnum,
        send_welcome_email: bool,
        current_user: User,
        db: AsyncSession,
    ) -> User:
        """
        Create new user with initial role assignment (AC-2).

        Steps:
        1. Validate password strength
        2. Create user (reuse existing create_user method)
        3. Assign initial role
        4. Log to AuditLog
        5. Queue welcome email (if send_welcome_email=True)

        Args:
            email: User email (unique, case-insensitive)
            password: Plain text password (validated for strength)
            default_tenant_id: UUID of default tenant
            initial_role: Role enum value to assign
            send_welcome_email: Whether to send welcome email
            current_user: User performing the creation (for audit)
            db: Database session

        Returns:
            Created User object

        Raises:
            ValueError: If password invalid or email exists
            IntegrityError: If email already exists

        Security:
            - Password validated with 5 security rules
            - Email normalized to lowercase
            - Audit log created for compliance

        Story: nextjs-story-22-users-api-crud (AC-2)
        """
        from src.database.models import AuditLog, AuditActionEnum

        # Create user (reuse existing method)
        user = await self.create_user(
            email=email,
            password=password,
            default_tenant_id=default_tenant_id,
            db=db,
        )

        # Assign initial role
        await self.assign_role(
            user_id=user.id,
            tenant_id=str(default_tenant_id),
            role=initial_role,
            db=db,
        )

        # Create audit log entry
        audit_log = AuditLog(
            user_id=current_user.id,
            tenant_id=current_user.default_tenant_id,
            action=AuditActionEnum.CREATE_USER,
            entity_type="User",
            entity_id=str(user.id),
            changes={
                "email": {"old": None, "new": email},
                "default_tenant_id": {"old": None, "new": str(default_tenant_id)},
                "initial_role": {"old": None, "new": initial_role.value},
            },
        )
        db.add(audit_log)
        await db.commit()

        # Queue welcome email (async via Celery)
        if send_welcome_email:
            from src.workers.tasks import send_welcome_email_task

            send_welcome_email_task.delay(
                user_email=email,
                user_id=str(user.id),
            )

        return user

    async def update_user_with_audit(
        self,
        user_id: UUID,
        email: Optional[str],
        is_active: Optional[bool],
        default_tenant_id: Optional[UUID],
        current_user: User,
        db: AsyncSession,
    ) -> User:
        """
        Update user with audit logging and last super_admin check (AC-3).

        Steps:
        1. Verify user exists
        2. Check if disabling last super_admin (prevent)
        3. Track changed fields (for audit)
        4. Update user fields
        5. Log to AuditLog with changed_fields

        Args:
            user_id: User UUID to update
            email: New email (optional, unique case-insensitive)
            is_active: New active status (optional)
            default_tenant_id: New default tenant UUID (optional)
            current_user: User performing the update (for audit)
            db: Database session

        Returns:
            Updated User object

        Raises:
            ValueError: If user not found or is last super_admin being disabled

        Security:
            - Cannot disable last super_admin (system integrity)
            - Email uniqueness enforced (case-insensitive)
            - Audit trail of all changes

        Story: nextjs-story-22-users-api-crud (AC-3)
        """
        from src.database.models import AuditLog, AuditActionEnum

        user = await self.get_user_by_id(user_id, db)
        if not user:
            raise ValueError(f"User not found: {user_id}")

        # Track changes for audit log
        changes = {}

        # Check if disabling last super_admin
        if is_active is not None and not is_active:
            if await self._is_last_super_admin(user, db):
                raise ValueError(
                    "Cannot disable the last active super_admin user. "
                    "Assign another super_admin first."
                )

        # Update fields and track changes
        if email is not None and email.lower() != user.email:
            changes["email"] = {"old": user.email, "new": email.lower()}
            user.email = email.lower()

        if is_active is not None and is_active != user.is_active:
            changes["is_active"] = {"old": user.is_active, "new": is_active}
            user.is_active = is_active
            user.updated_at = datetime.now(UTC)  # Triggers JWT revocation if disabled

        if default_tenant_id is not None and default_tenant_id != user.default_tenant_id:
            changes["default_tenant_id"] = {
                "old": str(user.default_tenant_id),
                "new": str(default_tenant_id),
            }
            user.default_tenant_id = default_tenant_id

        # Create audit log entry (only if changes made)
        if changes:
            audit_log = AuditLog(
                user_id=current_user.id,
                tenant_id=current_user.default_tenant_id,
                action=AuditActionEnum.UPDATE_USER,
                entity_type="User",
                entity_id=str(user_id),
                changes=changes,
            )
            db.add(audit_log)

        await db.commit()
        await db.refresh(user)

        return user

    async def reset_password_admin(
        self,
        user_id: UUID,
        current_user: User,
        db: AsyncSession,
    ) -> str:
        """
        Admin-initiated password reset with temporary password (AC-5).

        Steps:
        1. Verify user exists
        2. Generate secure 16-char temporary password
        3. Hash and set as user's password
        4. Set force_password_change = True
        5. Revoke JWT tokens (updated_at)
        6. Log to AuditLog
        7. Queue password reset email

        Args:
            user_id: User UUID to reset
            current_user: Admin performing the reset (for audit)
            db: Database session

        Returns:
            Temporary password (plain text, shown only once)

        Raises:
            ValueError: If user not found

        Security:
            - Temp password: 16 chars, uppercase, lowercase, digits, special chars
            - force_password_change flag enforced on next login
            - JWT revocation invalidates existing sessions
            - Audit log created for compliance

        Story: nextjs-story-22-users-api-crud (AC-5)
        """
        import secrets
        import string
        from src.database.models import AuditLog, AuditActionEnum, AuthAuditLog, AuthEventEnum

        user = await self.get_user_by_id(user_id, db)
        if not user:
            raise ValueError(f"User not found: {user_id}")

        # Generate secure 16-char temporary password
        # Format: 4 uppercase + 4 lowercase + 4 digits + 4 special chars (shuffled)
        chars = (
            "".join(secrets.choice(string.ascii_uppercase) for _ in range(4))
            + "".join(secrets.choice(string.ascii_lowercase) for _ in range(4))
            + "".join(secrets.choice(string.digits) for _ in range(4))
            + "".join(secrets.choice("!@#$%^&*") for _ in range(4))
        )
        temp_password = "".join(secrets.SystemRandom().sample(chars, len(chars)))

        # Hash and set password
        user.password_hash = hash_password(temp_password)
        user.force_password_change = True
        user.updated_at = datetime.now(UTC)  # Triggers JWT revocation

        # Set password expiration (90 days from now)
        settings = get_settings()
        user.password_expires_at = datetime.now(UTC) + timedelta(
            days=settings.password_expiration_days
        )

        # Create audit log entry
        audit_log = AuditLog(
            user_id=current_user.id,
            tenant_id=current_user.default_tenant_id,
            action=AuditActionEnum.RESET_PASSWORD,
            entity_type="User",
            entity_id=str(user_id),
            changes={
                "force_password_change": {"old": False, "new": True},
                "reset_by": {"old": None, "new": str(current_user.id)},
            },
        )
        db.add(audit_log)

        # Create auth audit log entry
        auth_audit_log = AuthAuditLog(
            user_id=user_id,
            tenant_id=user.default_tenant_id,
            event_type=AuthEventEnum.PASSWORD_RESET_ADMIN,
            ip_address="system",  # Admin action, not user-initiated
            user_agent="admin_api",
            success=True,
            metadata={"reset_by_user_id": str(current_user.id)},
        )
        db.add(auth_audit_log)

        await db.commit()

        # Queue password reset email (async via Celery)
        from src.workers.tasks import send_password_reset_email_task

        send_password_reset_email_task.delay(
            user_email=user.email,
            user_id=str(user.id),
            temporary_password=temp_password,
        )

        return temp_password

    # ==============================================================================
    # HELPER METHODS
    # ==============================================================================

    async def _is_last_super_admin(self, user: User, db: AsyncSession) -> bool:
        """
        Check if user is the last active super_admin.

        Used to prevent disabling/deleting the last super_admin, which would
        lock all admins out of the system.

        Args:
            user: User to check
            db: Database session

        Returns:
            True if user is the last active super_admin, False otherwise

        Story: nextjs-story-22-users-api-crud (AC-3, AC-4 business logic)
        """
        from sqlalchemy import func

        # Check if user has super_admin role
        stmt = (
            select(UserTenantRole)
            .where(UserTenantRole.user_id == user.id)
            .where(UserTenantRole.role == RoleEnum.SUPER_ADMIN)
        )
        result = await db.execute(stmt)
        user_role = result.scalar_one_or_none()

        if not user_role:
            # User is not a super_admin, safe to disable/delete
            return False

        # Count total active super_admins
        stmt = (
            select(func.count())
            .select_from(UserTenantRole)
            .join(User, UserTenantRole.user_id == User.id)
            .where(UserTenantRole.role == RoleEnum.SUPER_ADMIN)
            .where(User.is_active == True)  # noqa: E712
        )
        result = await db.execute(stmt)
        active_super_admin_count = result.scalar() or 0

        # If only 1 active super_admin and it's this user, return True
        return active_super_admin_count == 1

    async def _apply_tenant_scoping(
        self, stmt: select, current_user: User, db: AsyncSession
    ) -> select:
        """
        Apply tenant scoping to user query based on current user's role.

        RBAC rules:
        - super_admin: No scoping (see all users across all tenants)
        - tenant_admin: Scoped to users in their default_tenant_id only

        Args:
            stmt: Base SQLAlchemy SELECT statement
            current_user: User performing the query (for RBAC)
            db: Database session

        Returns:
            Modified SELECT statement with tenant scoping applied

        Story: nextjs-story-22-users-api-crud (AC-1 RBAC enforcement)
        """
        # Check if current user is super_admin
        stmt_role = (
            select(UserTenantRole)
            .where(UserTenantRole.user_id == current_user.id)
            .where(UserTenantRole.role == RoleEnum.SUPER_ADMIN)
            .limit(1)
        )
        result = await db.execute(stmt_role)
        is_super_admin = result.scalar_one_or_none() is not None

        if is_super_admin:
            # No scoping for super_admin
            return stmt

        # For tenant_admin: filter by their default_tenant_id
        stmt = stmt.where(User.default_tenant_id == current_user.default_tenant_id)

        return stmt
