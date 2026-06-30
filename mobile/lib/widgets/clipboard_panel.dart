import 'package:flutter/material.dart';
import '../models/clipboard_data.dart';

class ClipboardPanel extends StatefulWidget {
  final Function(ClipboardContentType contentType, String data) onSend;
  final bool autoSend;
  final bool autoAccept;
  final Function(bool autoSend) onAutoSendChanged;
  final Function(bool autoAccept) onAutoAcceptChanged;

  const ClipboardPanel({
    super.key,
    required this.onSend,
    this.autoSend = false,
    this.autoAccept = false,
    required this.onAutoSendChanged,
    required this.onAutoAcceptChanged,
  });

  static Future<void> show(
    BuildContext context, {
    required Function(ClipboardContentType, String) onSend,
    bool autoSend = false,
    bool autoAccept = false,
    required Function(bool) onAutoSendChanged,
    required Function(bool) onAutoAcceptChanged,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ClipboardPanel(
        onSend: onSend,
        autoSend: autoSend,
        autoAccept: autoAccept,
        onAutoSendChanged: onAutoSendChanged,
        onAutoAcceptChanged: onAutoAcceptChanged,
      ),
    );
  }

  @override
  State<ClipboardPanel> createState() => _ClipboardPanelState();
}

class _ClipboardPanelState extends State<ClipboardPanel> {
  final _controller = TextEditingController();
  ClipboardContentType _contentType = ClipboardContentType.text;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
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
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurface.withOpacity(0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 20),

          Text(
            'Share Clipboard',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),

          // Content type chips
          Wrap(
            spacing: 8,
            children: ClipboardContentType.values.map((type) {
              return ChoiceChip(
                label: Text(type.name.toUpperCase()),
                selected: _contentType == type,
                onSelected: (_) => setState(() => _contentType = type),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),

          // Text input
          TextField(
            controller: _controller,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Paste or type content here...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: isDark
                  ? Colors.white.withOpacity(0.05)
                  : Colors.grey.withOpacity(0.1),
            ),
          ),
          const SizedBox(height: 16),

          // Auto toggles
          Row(
            children: [
              Expanded(
                child: SwitchListTile(
                  title: const Text('Auto-Send', style: TextStyle(fontSize: 13)),
                  subtitle: const Text('On focus',
                      style: TextStyle(fontSize: 11)),
                  value: widget.autoSend,
                  onChanged: widget.onAutoSendChanged,
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
              Expanded(
                child: SwitchListTile(
                  title:
                      const Text('Auto-Accept', style: TextStyle(fontSize: 13)),
                  subtitle: const Text('Incoming',
                      style: TextStyle(fontSize: 11)),
                  value: widget.autoAccept,
                  onChanged: widget.onAutoAcceptChanged,
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Send button
          ElevatedButton.icon(
            onPressed: () {
              final data = _controller.text.trim();
              if (data.isNotEmpty) {
                widget.onSend(_contentType, data);
                Navigator.pop(context);
              }
            },
            icon: const Icon(Icons.send_rounded),
            label: const Text('Send Clipboard'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
