import React from 'react';
import { formatBytes } from '../utils/formatBytes';
import { formatTime } from '../utils/formatTime';

interface TransferProgressProps {
  progress: number;
  speed: number;
  eta: number;
  bytesTransferred: number;
  totalBytes: number;
  onCancel?: () => void;
}

export default function TransferProgress({
  progress,
  speed,
  eta,
  bytesTransferred,
  totalBytes,
  onCancel,
}: TransferProgressProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const isComplete = progress >= 100;

  return (
    <div className="flex items-center gap-4">
      {/* Circular progress */}
      <div className="relative flex-shrink-0">
        <svg width="88" height="88" className="-rotate-90">
          {/* Background circle */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-300 ${
              isComplete ? 'text-green-500' : 'text-primary-500'
            }`}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${isComplete ? 'text-green-500' : 'text-primary-500'}`}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatBytes(bytesTransferred)} / {formatBytes(totalBytes)}
          </span>
        </div>

        {/* Linear progress bar */}
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isComplete
                ? 'bg-green-500'
                : 'bg-gradient-to-r from-primary-500 to-primary-400'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{formatBytes(speed)}/s</span>
          {!isComplete && <span>ETA: {formatTime(eta)}</span>}
          {isComplete && <span className="text-green-500 font-medium">Complete!</span>}
        </div>

        {onCancel && !isComplete && (
          <button
            onClick={onCancel}
            className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Cancel transfer
          </button>
        )}
      </div>
    </div>
  );
}
