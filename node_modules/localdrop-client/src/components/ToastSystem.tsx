import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore, type Toast, type ToastType } from '../stores/useToastStore';

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500',
};

const bgMap: Record<ToastType, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  info: 'border-l-blue-500',
  warning: 'border-l-amber-500',
};

export default function ToastSystem() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none" id="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const Icon = iconMap[toast.type];

  return (
    <div
      className={`
        pointer-events-auto glass-card rounded-xl px-4 py-3 border-l-4
        animate-slide-up shadow-lg flex items-start gap-3
        ${bgMap[toast.type]}
      `}
      role="alert"
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${colorMap[toast.type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
      >
        <X size={14} className="text-gray-400" />
      </button>
    </div>
  );
}
