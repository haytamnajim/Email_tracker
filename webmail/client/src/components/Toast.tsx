import { X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 pointer-events-none select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-4 rounded-lg bg-[#323232] text-white px-4 py-3 shadow-2xl animate-fade-slide min-w-[280px] max-w-md text-xs font-medium"
        >
          <span className="truncate flex-1">{toast.message}</span>

          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onDismiss(toast.id);
              }}
              className="font-bold text-[#8ab4f8] hover:underline shrink-0"
            >
              {toast.actionLabel}
            </button>
          )}

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-[#9aa0a6] hover:text-white shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
