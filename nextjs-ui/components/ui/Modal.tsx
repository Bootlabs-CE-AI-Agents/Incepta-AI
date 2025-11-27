import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description, CloseButton } from '@headlessui/react';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

export interface ModalProps {
  /**
   * Controls the modal's open/closed state
   */
  isOpen: boolean;
  /**
   * Callback fired when the modal should be closed (backdrop click or Escape key)
   */
  onClose: () => void;
  /**
   * Modal title (rendered in Dialog.Title for accessibility)
   */
  title?: string;
  /**
   * Modal description (rendered in Dialog.Description for screen readers)
   */
  description?: string;
  /**
   * Modal body content
   */
  children: ReactNode;
  /**
   * Optional footer content (typically action buttons)
   */
  footer?: ReactNode;
  /**
   * Size variant: 'sm' (384px), 'md' (512px), 'lg' (768px), 'xl' (896px), '2xl' (1024px)
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /**
   * If true, constrains modal height to viewport with scrollable content (default: false)
   */
  scrollable?: boolean;
  /**
   * If true, clicking the backdrop will NOT close the modal
   */
  preventBackdropClose?: boolean;
  /**
   * Additional CSS classes for the modal panel
   */
  className?: string;
  /**
   * Show close button in top-right corner (default: true)
   */
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-4xl', // Wider for execution details (was max-w-xl = 576px, now 896px)
  '2xl': 'max-w-5xl', // Even wider option for complex content
};

/**
 * Modal component using Headless UI Dialog
 *
 * Features:
 * - Focus trap (keyboard navigation stays within modal)
 * - Scroll lock (prevents body scrolling)
 * - Accessible (ARIA labels, keyboard navigation)
 * - Backdrop blur with glassmorphism
 * - Responsive sizing
 * - Optional close button
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Delete Account"
 *   description="This action cannot be undone."
 *   footer={
 *     <>
 *       <button onClick={() => setIsOpen(false)}>Cancel</button>
 *       <button onClick={handleDelete}>Delete</button>
 *     </>
 *   }
 * >
 *   <p>Are you sure you want to delete your account?</p>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  scrollable = false,
  preventBackdropClose = false,
  className = '',
  showCloseButton = true,
}: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={preventBackdropClose ? () => {} : onClose}
      className="relative z-50"
    >
      {/* Backdrop with glassmorphism blur */}
      <DialogBackdrop
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={`
            ${sizeClasses[size]} w-full
            glass-card p-6 shadow-2xl
            transform transition-all duration-300
            ${scrollable ? 'max-h-[85vh] flex flex-col overflow-hidden' : ''}
            ${className}
          `}
        >
          {/* Header with title and close button */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between mb-4 flex-shrink-0">
              <div className="flex-1">
                {title && (
                  <DialogTitle className="text-lg font-semibold text-text-primary dark:text-white">
                    {title}
                  </DialogTitle>
                )}
                {description && (
                  <Description className="mt-1 text-sm text-text-secondary dark:text-text-secondary">
                    {description}
                  </Description>
                )}
              </div>

              {showCloseButton && (
                <CloseButton
                  className="ml-4 p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-text-secondary dark:text-text-secondary" />
                </CloseButton>
              )}
            </div>
          )}

          {/* Body - scrollable when scrollable prop is true */}
          <div className={`text-text-secondary dark:text-text-secondary ${scrollable ? 'flex-1 overflow-y-auto min-h-0' : ''}`}>
            {children}
          </div>

          {/* Footer (optional) */}
          {footer && (
            <div className="mt-6 flex gap-3 justify-end flex-shrink-0">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
