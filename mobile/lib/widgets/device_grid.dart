import 'package:flutter/material.dart';
import '../models/device_info.dart';
import 'device_card.dart';

class DeviceGrid extends StatelessWidget {
  final List<DeviceInfo> peers;
  final Set<String> selectedPeers;
  final Set<String> activeTransferPeers;
  final Function(String peerId) onPeerTap;
  final Function(String peerId) onPeerLongPress;

  const DeviceGrid({
    super.key,
    required this.peers,
    required this.selectedPeers,
    required this.activeTransferPeers,
    required this.onPeerTap,
    required this.onPeerLongPress,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        int crossAxisCount = 2;
        if (constraints.maxWidth > 600) crossAxisCount = 3;
        if (constraints.maxWidth > 900) crossAxisCount = 4;

        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.85,
          ),
          itemCount: peers.length,
          itemBuilder: (context, index) {
            final peer = peers[index];
            return DeviceCard(
              device: peer,
              selected: selectedPeers.contains(peer.id),
              hasActiveTransfer: activeTransferPeers.contains(peer.id),
              onTap: () => onPeerTap(peer.id),
              onLongPress: () => onPeerLongPress(peer.id),
            );
          },
        );
      },
    );
  }
}
