import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../models/clipboard_data.dart' as models;

class IncomingClipboardSheet extends StatelessWidget {
  final models.ClipboardData clipboard;
  final VoidCallback onCopy;
  final VoidCallback? onDecline;
  final VoidCallback? onOpenUrl;

  const IncomingClipboardSheet({
    super.key,
    required this.clipboard,
    required this.onCopy,
    this.onDecline,
    this.onOpenUrl,
  });

  static Future<void> show(
    BuildContext context, {
    required models.ClipboardData clipboard,
    required VoidCallback onCopy,
    VoidCallback? onDecline,
    VoidCallback? onOpenUrl,
  }) {
    return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      isDismissible: false,
      builder: (_) => IncomingClipboardSheet(
        clipboard: clipboard,
        onCopy: onCopy,
        onDecline: onDecline,
        onOpenUrl: onOpenUrl,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: theme.colorScheme.onSurface.withOpacity(0.2),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),

          // Icon
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer.withOpacity(0.3),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              Icons.content_paste_rounded,
              size: 28,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 12),

          Text(
            'Clipboard from ${clipboard.senderName}',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),

          // Content type badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              clipboard.contentType.name.toUpperCase(),
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.primary,
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Content preview
          if (clipboard.contentType == models.ClipboardContentType.image)
            _buildImagePreview(clipboard.data, isDark)
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withOpacity(0.05)
                    : Colors.grey.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                clipboard.data.length > 500
                    ? '${clipboard.data.substring(0, 500)}...'
                    : clipboard.data,
                style: theme.textTheme.bodySmall,
                maxLines: 8,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          const SizedBox(height: 20),

          // Buttons
          Row(
            children: [
              // Decline button
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    onDecline?.call();
                  },
                  icon: const Icon(Icons.close_rounded, size: 18),
                  label: const Text('Decline'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    foregroundColor: theme.colorScheme.error,
                    side: BorderSide(
                      color: theme.colorScheme.error.withOpacity(0.5),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Copy / Save button
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    onCopy();
                  },
                  icon: Icon(
                    clipboard.contentType == models.ClipboardContentType.image
                        ? Icons.save_alt_rounded
                        : Icons.copy_rounded,
                    size: 18,
                  ),
                  label: Text(
                    clipboard.contentType == models.ClipboardContentType.image
                        ? 'Save Image'
                        : 'Copy',
                  ),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),

          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
      ),
    );
  }

  Widget _buildImagePreview(String dataUrl, bool isDark) {
    Uint8List? imageBytes;
    try {
      // Parse data URL: "data:image/png;base64,..."
      final base64Part = dataUrl.contains(',') ? dataUrl.split(',').last : dataUrl;
      imageBytes = base64Decode(base64Part);
    } catch (_) {}

    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(maxHeight: 250),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withOpacity(0.05)
            : Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: imageBytes != null
          ? ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.memory(
                imageBytes,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Text(
                  'Failed to render image',
                  style: TextStyle(color: Colors.grey.shade500),
                ),
              ),
            )
          : Text(
              dataUrl.length > 500
                  ? '${dataUrl.substring(0, 500)}...'
                  : dataUrl,
              style: const TextStyle(fontSize: 12),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
    );
  }
}
