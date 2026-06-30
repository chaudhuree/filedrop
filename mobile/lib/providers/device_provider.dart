import 'package:flutter/material.dart';
import '../models/device_info.dart';

class DeviceProvider extends ChangeNotifier {
  DeviceInfo? _myDevice;
  final Map<String, DeviceInfo> _peers = {};
  final Set<String> _selectedPeers = {};

  DeviceInfo? get myDevice => _myDevice;
  List<DeviceInfo> get peers => _peers.values.toList();
  Set<String> get selectedPeers => _selectedPeers;
  bool get hasPeers => _peers.isNotEmpty;

  void setMyDevice(DeviceInfo device) {
    _myDevice = device;
    notifyListeners();
  }

  void updateMyDevice({
    String? name,
    String? avatar,
  }) {
    if (_myDevice == null) return;
    _myDevice = _myDevice!.copyWith(
      name: name ?? _myDevice!.name,
      avatar: avatar ?? _myDevice!.avatar,
    );
    notifyListeners();
  }

  void addPeer(DeviceInfo peer) {
    _peers[peer.id] = peer;
    notifyListeners();
  }

  void removePeer(String peerId) {
    _peers.remove(peerId);
    _selectedPeers.remove(peerId);
    notifyListeners();
  }

  void updatePeer(DeviceInfo peer) {
    if (_peers.containsKey(peer.id)) {
      _peers[peer.id] = peer;
      notifyListeners();
    }
  }

  void setPeers(List<DeviceInfo> peers) {
    _peers.clear();
    for (final peer in peers) {
      _peers[peer.id] = peer;
    }
    notifyListeners();
  }

  void togglePeerSelection(String peerId) {
    if (_selectedPeers.contains(peerId)) {
      _selectedPeers.remove(peerId);
    } else {
      _selectedPeers.add(peerId);
    }
    notifyListeners();
  }

  void clearSelection() {
    _selectedPeers.clear();
    notifyListeners();
  }

  DeviceInfo? getPeer(String peerId) => _peers[peerId];
}
