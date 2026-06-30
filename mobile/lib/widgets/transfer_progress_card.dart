import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import '../models/transfer.dart';
import '../utils/formatters.dart';

class TransferProgressCard extends StatelessWidget {
  final Transfer transfer;
  final VoidCallback? onCancel;

  const TransferProgressCard({
    super.key,
    required this.transfer,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final progress = transfer.progress / 100;
    final isOutgoing =
        transfer.direction == TransferDirection.outgoing;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark
              ? Colors.white.withOpacity(0.08)
              : Colors.grey.withOpacity(0.15),
        ),
      ),
      child: Row(
        children: [
          // Progress circle
          CircularPercentIndicator(
            radius: 24,
            lineWidth: 3,
            percent: progress.clamp(0, 1),
            center: Icon(
              isOutgoing ? Icons.upload_rounded : Icons.download_rounded,
              size: 18,
              color: theme.colorScheme.primary,
            ),
            progressColor: theme.colorScheme.primary,
            backgroundColor:
                theme.colorScheme.primary.withOpacity(0.15),
            circularStrokeCap: CircularStrokeCap.round,
          ),
          const SizedBox(width: 12),

          // File info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  transfer.fileName,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      '${transfer.progress.toStringAsFixed(0)}%',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      ' • ${formatBytes(transfer.bytesTransferred)} / ${formatBytes(transfer.fileSize)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.5),
                      ),
                    ),
                  ],
                ),
                if (transfer.speed > 0)
                  Text(
                    '${formatSpeed(transfer.speed)} • ${formatETA(transfer.eta)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.4),
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),

          // Cancel button
          if (onCancel != null)
            IconButton(
              onPressed: onCancel,
              icon: Icon(
                Icons.close_rounded,
                size: 20,
                color: theme.colorScheme.error,
              ),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(
                minWidth: 36,
                minHeight: 36,
              ),
            ),
        ],
      ),
    );
  }
}
