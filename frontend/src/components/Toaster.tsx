import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { IconCheck, IconClose } from './Icons';

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toast-wrap no-print">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'toast',
            t.tone === 'success' && 'success',
            t.tone === 'error' && 'error'
          )}
        >
          {t.tone === 'success' && <IconCheck size={14} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            style={{
              background: 'transparent',
              border: 0,
              color: 'inherit',
              opacity: 0.7,
              cursor: 'pointer',
              padding: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <IconClose size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
