import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/**
 * NextAuth v4 configuration for AI Agents Platform
 *
 * Security Features:
 * - JWT-based authentication (lean tokens per tech-spec)
 * - Credentials provider integrating with FastAPI backend
 * - Roles fetched during login for default tenant via /api/v1/users/me/role
 * - Role stored in session for RBAC (enables pages to check session.user.role)
 * - Token versioning for password change revocation support
 *
 * Reference: docs/nextjs-ui-migration-tech-spec-v2.md Section 2.1.1
 */

// Server-side API URL (for NextAuth) - uses Docker network
// Client-side uses NEXT_PUBLIC_API_URL which goes through nginx
const API_BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface JWTPayload {
  sub: string;  // User ID
  email: string;
  default_tenant_id: string | null;  // Default tenant ID
  token_version: number;
  exp: number;
  jti: string;
}

/**
 * Decode JWT token payload without verification
 * Safe to use since token comes from our own backend
 */
function decodeJWT(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token format');
  }

  const payload = parts[1];
  const decoded = Buffer.from(payload, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // Call FastAPI backend /api/auth/token endpoint (OAuth2 password flow)
          const response = await fetch(`${API_BASE_URL}/api/auth/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            console.error("Login failed:", response.statusText);
            return null;
          }

          const data: LoginResponse = await response.json();

          // Decode JWT to extract user information from token payload
          // FastAPI JWT contains: sub (user_id), email, default_tenant_id, token_version, exp, jti
          const jwtPayload = decodeJWT(data.access_token);

          // Fetch full user profile with all roles from /api/v1/users/me
          // This returns all roles across all tenants with tenant names
          let userProfile = null;
          try {
            const profileResponse = await fetch(
              `${API_BASE_URL}/api/v1/users/me`,
              {
                headers: {
                  Authorization: `Bearer ${data.access_token}`,
                },
              }
            );

            if (profileResponse.ok) {
              userProfile = await profileResponse.json();
            } else {
              console.warn("Failed to fetch user profile:", profileResponse.statusText);
            }
          } catch (profileError) {
            console.error("Error fetching user profile:", profileError);
          }

          // Return user object with access_token and full profile
          // NextAuth will include this in the JWT token
          return {
            id: jwtPayload.sub,
            email: jwtPayload.email,
            name: jwtPayload.email, // Use email as display name
            accessToken: data.access_token,
            tokenVersion: jwtPayload.token_version,
            defaultTenantId: jwtPayload.default_tenant_id,
            // Include full user profile with roles array
            ...(userProfile || {}),
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in - add user data to token
      if (user && "accessToken" in user && "tokenVersion" in user) {
        token.accessToken = user.accessToken as string;
        token.userId = user.id;
        token.tokenVersion = user.tokenVersion as number;

        // Add default tenant ID
        if ("defaultTenantId" in user) {
          token.defaultTenantId = user.defaultTenantId;
        }

        // Add roles array if available
        if ("roles" in user) {
          token.roles = user.roles;
        }

        // Add other profile fields
        if ("is_active" in user) {
          token.is_active = user.is_active;
        }
        if ("last_login_at" in user) {
          token.last_login_at = user.last_login_at;
        }
        if ("created_at" in user) {
          token.created_at = user.created_at;
        }
        if ("default_tenant_name" in user) {
          token.default_tenant_name = user.default_tenant_name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Add user data to session object
      if (session.user) {
        session.user.id = token.userId as string;
        session.accessToken = token.accessToken as string;
        session.tokenVersion = token.tokenVersion as number;

        // Add default tenant ID
        if (token.defaultTenantId) {
          session.user.default_tenant_id = token.defaultTenantId as string;
        }

        // Add roles array
        if (token.roles) {
          session.user.roles = token.roles as any[];
        }

        // Add other profile fields
        if (token.is_active !== undefined) {
          session.user.is_active = token.is_active as boolean;
        }
        if (token.last_login_at) {
          session.user.last_login_at = token.last_login_at as string;
        }
        if (token.created_at) {
          session.user.created_at = token.created_at as string;
        }
        if (token.default_tenant_name) {
          session.user.default_tenant_name = token.default_tenant_name as string;
        }
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
