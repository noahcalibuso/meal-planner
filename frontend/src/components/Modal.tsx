import { useEffect } from 'react';
import { IconClose } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function Modal({ open, onClose, title, children, size = 'lg', footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-slideUp"
        onClick={onClose}
      />
      <div
        className={`relative card w-full ${SIZES[size]} animate-slideUp my-8`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.06]">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button
            className="rounded-lg p-1.5 hover:bg-black/5"
            onClick={onClose}
            aria-label="Close"
          >
            <IconClose />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto scroll-area">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-black/[0.06] flex justify-end gap-2 bg-canvas-subtle/40 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
