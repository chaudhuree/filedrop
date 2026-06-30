import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/connection_provider.dart';
import '../providers/device_provider.dart';
import '../providers/transfer_provider.dart';
import '../widgets/device_grid.dart';
import '../widgets/empty_state.dart';
import '../widgets/transfer_progress_card.dart';
import '../widgets/clipboard_panel.dart';
import '../models/clipboard_data.dart';
import '../utils/constants.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  final String serverUrl;
  final Function(File file) onSendFile;
  final Function(String peerId) onSendFileToPeer;
  final Function(ClipboardContentType type, String data) onSendClipboard;
  final Function(String transferId, String peerId) onAcceptFile;
  final Function(String transferId, String peerId) onDeclineFile;
  final Function(String transferId, String peerId) onCancelTransfer;
  final bool autoSend;
  final bool autoAccept;
  final Function(bool) onAutoSendChanged;
  final Function(bool) onAutoAcceptChanged;

  const HomeScreen({
    super.key,
    required this.serverUrl,
    required this.onSendFile,
    required this.onSendFileToPeer,
    required this.onSendClipboard,
    required this.onAcceptFile,
    required this.onDeclineFile,
    required this.onCancelTransfer,
    this.autoSend = false,
    this.autoAccept = false,
    required this.onAutoSendChanged,
    required this.onAutoAcceptChanged,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    final connection = Provider.of<ConnectionProvider>(context);
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final transferProvider = Provider.of<TransferProvider>(context);
    final theme = Theme.of(context);

    final selectedPeers = deviceProvider.selectedPeers;
    final peers = deviceProvider.peers;

    return Scaffold(
      // AppBar
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(
              'asstes/drop_logo-withoutbg.png',
              width: 32,
              height: 32,
            ),
            const SizedBox(width: 10),
            const Text('Drop'),
          ],
        ),
        actions: [
          // Connection status
          Container(
            margin: const EdgeInsets.only(right: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: connection.connected
                  ? Colors.green.withValues(alpha: 0.1)
                  : Colors.red.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  connection.connected
                      ? Icons.wifi_rounded
                      : Icons.wifi_off_rounded,
                  size: 16,
                  color: connection.connected ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 4),
                Text(
                  connection.connected ? 'Online' : 'Offline',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: connection.connected ? Colors.green : Colors.red,
                  ),
                ),
              ],
            ),
          ),

          // Profile
          if (deviceProvider.myDevice != null)
            Consumer<DeviceProvider>(
              builder: (_, dp, __) => IconButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => SettingsScreen(serverUrl: widget.serverUrl),
                    ),
                  );
                },
                icon: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: CachedNetworkImage(
                    imageUrl: (dp.myDevice?.avatar != null && dp.myDevice!.avatar!.isNotEmpty)
                        ? dp.myDevice!.avatar!
                        : defaultAvatarUrl,
                    width: 28,
                    height: 28,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => const Icon(Icons.person_rounded, size: 28),
                  ),
                ),
              ),
            ),
        ],
      ),

      // Body
      body: Column(
        children: [
          // Device name bar
          if (deviceProvider.myDevice != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
              child: Row(
                children: [
                  Icon(
                    Icons.phone_iphone_rounded,
                    size: 16,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    deviceProvider.myDevice!.name,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '${peers.length} device${peers.length == 1 ? '' : 's'} found',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                    ),
                  ),
                ],
              ),
            ),

          // Active transfers
          if (transferProvider.hasActiveTransfers)
            Container(
              constraints: const BoxConstraints(maxHeight: 120),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: transferProvider.activeTransfers.length,
                itemBuilder: (context, index) {
                  final transfer = transferProvider.activeTransfers[index];
                  return TransferProgressCard(
                    transfer: transfer,
                    onCancel: () => widget.onCancelTransfer(
                      transfer.id,
                      transfer.peerId,
                    ),
                  );
                },
              ),
            ),

          // Device grid or empty state
          Expanded(
            child: peers.isEmpty
                ? EmptyState(
                    connected: connection.connected,
                    searching: connection.connected,
                  )
                : DeviceGrid(
                    peers: peers,
                    selectedPeers: selectedPeers,
                    activeTransferPeers: transferProvider.activeTransfers
                        .map((t) => t.peerId)
                        .toSet(),
                    onPeerTap: (peerId) {
                      deviceProvider.togglePeerSelection(peerId);
                    },
                    onPeerLongPress: (peerId) {
                      _showPeerActions(context, peerId);
                    },
                  ),
          ),
        ],
      ),

      // Bottom action bar
      bottomNavigationBar: selectedPeers.isNotEmpty
          ? Container(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 12,
                bottom: MediaQuery.of(context).padding.bottom + 12,
              ),
              decoration: BoxDecoration(
                color: theme.colorScheme.surface,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Selection count
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${selectedPeers.length} selected',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: theme.colorScheme.onPrimaryContainer,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  const Spacer(),

                  // Clipboard button
                  IconButton(
                    onPressed: () {
                      ClipboardPanel.show(
                        context,
                        onSend: widget.onSendClipboard,
                        autoSend: widget.autoSend,
                        autoAccept: widget.autoAccept,
                        onAutoSendChanged: widget.onAutoSendChanged,
                        onAutoAcceptChanged: widget.onAutoAcceptChanged,
                      );
                    },
                    icon: Icon(
                      Icons.content_paste_rounded,
                      color: theme.colorScheme.primary,
                    ),
                    tooltip: 'Send Clipboard',
                  ),
                  const SizedBox(width: 8),

                  // Send files button
                  ElevatedButton.icon(
                    onPressed: () => _pickAndSendFiles(),
                    icon: const Icon(Icons.send_rounded, size: 18),
                    label: const Text('Send Files'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
            )
          : null,
    );
  }

  void _showPeerActions(BuildContext context, String peerId) {
    final deviceProvider = Provider.of<DeviceProvider>(context, listen: false);
    final peer = deviceProvider.getPeer(peerId);
    if (peer == null) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                peer.name,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                '${peer.os} • ${peer.browser}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.5),
                    ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: const Icon(Icons.send_rounded),
                title: const Text('Send Files'),
                onTap: () {
                  Navigator.pop(context);
                  deviceProvider.clearSelection();
                  deviceProvider.togglePeerSelection(peerId);
                  _pickAndSendFiles();
                },
              ),
              ListTile(
                leading: const Icon(Icons.content_paste_rounded),
                title: const Text('Send Clipboard'),
                onTap: () {
                  Navigator.pop(context);
                  deviceProvider.clearSelection();
                  deviceProvider.togglePeerSelection(peerId);
                  ClipboardPanel.show(
                    context,
                    onSend: widget.onSendClipboard,
                    autoSend: widget.autoSend,
                    autoAccept: widget.autoAccept,
                    onAutoSendChanged: widget.onAutoSendChanged,
                    onAutoAcceptChanged: widget.onAutoAcceptChanged,
                  );
                },
              ),
              SizedBox(height: MediaQuery.of(context).padding.bottom),
            ],
          ),
        );
      },
    );
  }

  Future<void> _pickAndSendFiles() async {
    try {
      final result = await FilePicker.platform.pickFiles(allowMultiple: true);
      if (result != null && result.files.isNotEmpty) {
        for (final file in result.files) {
          if (file.path != null) {
            widget.onSendFile(File(file.path!));
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking files: $e')),
        );
      }
    }
  }
}
