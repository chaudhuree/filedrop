import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/transfer.dart';
import '../services/storage_service.dart';
import '../utils/constants.dart';

class TransferProvider extends ChangeNotifier {
  final Map<String, Transfer> _activeTransfers = {};
  final List<Transfer> _transferHistory = [];
  final List<Transfer> _incomingRequests = [];

  List<Transfer> get activeTransfers => _activeTransfers.values.toList();
  List<Transfer> get transferHistory => List.unmodifiable(_transferHistory);
  List<Transfer> get incomingRequests =>
      List.unmodifiable(_incomingRequests);
  bool get hasActiveTransfers => _activeTransfers.isNotEmpty;

  TransferProvider() {
    _loadHistory();
  }

  void _loadHistory() {
    try {
      final raw = StorageService.getString(transferHistoryKey);
      if (raw != null && raw.isNotEmpty) {
        final list = jsonDecode(raw) as List;
        _transferHistory.addAll(
          list.map((e) => Transfer.fromHistoryJson(e as Map<String, dynamic>)),
        );
      }
    } catch (e) {
      print('[TransferProvider] Error loading history: $e');
    }
  }

  Future<void> _saveHistory() async {
    try {
      final jsonList = _transferHistory.map((t) => t.toHistoryJson()).toList();
      await StorageService.setString(transferHistoryKey, jsonEncode(jsonList));
    } catch (e) {
      print('[TransferProvider] Error saving history: $e');
    }
  }

  void addTransfer(Transfer transfer) {
    _activeTransfers[transfer.id] = transfer;
    notifyListeners();
  }

  void updateProgress(String transferId, int bytesTransferred, int totalBytes,
      double speed) {
    final transfer = _activeTransfers[transferId];
    if (transfer == null) return;

    transfer.bytesTransferred = bytesTransferred;
    transfer.progress = totalBytes > 0
        ? (bytesTransferred / totalBytes * 100).clamp(0, 100)
        : 0;
    transfer.speed = speed;
    transfer.eta = speed > 0 ? (totalBytes - bytesTransferred) / speed : 0;
    transfer.status = TransferStatus.transferring;
    notifyListeners();
  }

  void completeTransfer(String transferId) {
    final transfer = _activeTransfers.remove(transferId);
    if (transfer != null) {
      transfer.status = TransferStatus.completed;
      transfer.progress = 100;
      transfer.endTime = DateTime.now().millisecondsSinceEpoch;
      _transferHistory.add(transfer);
      if (_transferHistory.length > maxTransferHistory) {
        _transferHistory.removeAt(0);
      }
      _saveHistory();
      notifyListeners();
    }
  }

  void failTransfer(String transferId, String error) {
    final transfer = _activeTransfers.remove(transferId);
    if (transfer != null) {
      transfer.status = TransferStatus.failed;
      transfer.endTime = DateTime.now().millisecondsSinceEpoch;
      _transferHistory.add(transfer);
      _saveHistory();
      notifyListeners();
    }
  }

  void cancelTransfer(String transferId) {
    final transfer = _activeTransfers.remove(transferId);
    if (transfer != null) {
      transfer.status = TransferStatus.cancelled;
      transfer.endTime = DateTime.now().millisecondsSinceEpoch;
      _transferHistory.add(transfer);
      _saveHistory();
      notifyListeners();
    }
  }

  void addIncomingRequest(Transfer transfer) {
    _incomingRequests.add(transfer);
    notifyListeners();
  }

  void removeIncomingRequest(String transferId) {
    _incomingRequests.removeWhere((t) => t.id == transferId);
    notifyListeners();
  }

  void clearHistory() {
    _transferHistory.clear();
    _saveHistory();
    notifyListeners();
  }
}
