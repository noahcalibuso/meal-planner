import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { IconCheck, IconClose } from './Icons';

export function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 no-print">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'animate-pop card flex items-center gap-3 px-4 py-3 pr-2 max-w-sm',
            t.tone === 'success' && 'bg-brand-50 border-brand-200',
            t.tone === 'error' && 'bg-rose-50 border-rose-200',
            t.tone === 'info' && 'bg-white'
          )}
        >
          {t.tone === 'success' && (
            <span className="text-brand-700">
              <IconCheck size={18} />
            </span>
          )}
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button
            className="rounded-lg p-1 hover:bg-black/5"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
          >
            <IconClose size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
