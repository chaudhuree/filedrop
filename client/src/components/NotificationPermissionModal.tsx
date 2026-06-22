import React from 'react';
import { Bell, Shield, X } from 'lucide-react';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export default function NotificationPermissionModal({
  isOpen,
  onAllow,
  onDeny,
}: NotificationPermissionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      id="notification-permission-modal"
      style={{
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="rounded-2xl w-full max-w-sm animate-scale-in relative flex flex-col overflow-hidden"
        style={{
          background: 'var(--notif-modal-bg, rgba(255,255,255,0.95))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--notif-modal-border, rgba(0,0,0,0.06))',
          boxShadow: '0 25px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onDeny}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors z-10"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-6 pb-5 flex flex-col items-center gap-4 text-center">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Bell size={26} className="text-white" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Enable Notifications?
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            LocalDrop needs notification permission to alert you when:
          </p>

          {/* Reasons list */}
          <div className="w-full text-left space-y-2.5 py-2">
            <div className="flex items-start gap-2.5 text-sm">
              <div className="mt-0.5 w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 dark:text-emerald-400 text-xs">📥</span>
              </div>
              <span className="text-gray-600 dark:text-gray-300">A device wants to <strong>send you a file</strong></span>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <div className="mt-0.5 w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 text-xs">📋</span>
              </div>
              <span className="text-gray-600 dark:text-gray-300">Someone shares <strong>clipboard content</strong> with you</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <div className="mt-0.5 w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-600 dark:text-amber-400 text-xs">🔔</span>
              </div>
              <span className="text-gray-600 dark:text-gray-300">The <strong>browser tab is in background</strong> and you need attention</span>
            </div>
          </div>

          {/* Privacy notice */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 w-full">
            <Shield size={14} className="text-primary-500 flex-shrink-0" />
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-left leading-snug">
              Notifications are local only. No data is stored on any server. You can change this anytime in browser settings.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onDeny}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
              text-gray-600 dark:text-gray-300
              bg-gray-100 dark:bg-white/5
              border border-gray-200 dark:border-white/10
              hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={onAllow}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
              bg-gradient-to-r from-primary-500 to-primary-600
              hover:from-primary-600 hover:to-primary-700
              shadow-md shadow-primary-500/30 transition-all"
          >
            Allow Notifications
          </button>
        </div>
      </div>

      <style>{`
        .dark #notification-permission-modal > div:first-child {
          --notif-modal-bg: rgba(20, 20, 45, 0.95);
          --notif-modal-border: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </div>
  );
}
