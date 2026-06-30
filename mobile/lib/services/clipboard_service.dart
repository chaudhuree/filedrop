import 'dart:convert';
import 'package:flutter/services.dart' as flutter_services;
import '../models/clipboard_data.dart';
import '../utils/constants.dart';
import 'socket_service.dart';
import 'webrtc_service.dart';

class ClipboardService {
  final WebRTCService _webrtcService;
  final SocketService _socketService;

  Function(String senderId, String senderName, ClipboardContentType contentType,
      String data)? onIncomingCallback;

  final Map<String, _ClipboardTransfer> _pendingTransfers = {};

  ClipboardService(this._webrtcService, this._socketService);

  bool handleMessage(String peerId, dynamic message) {
    if (message is! Map) return false;
    final msg = message as Map<String, dynamic>;
    final type = msg['type'] as String? ?? '';

    if (type == 'clipboard-data') {
      final contentTypeStr = msg['contentType'] as String? ?? 'text';
      final contentType = ClipboardContentType.values.firstWhere(
        (t) => t.name == contentTypeStr,
        orElse: () => ClipboardContentType.text,
      );
      onIncomingCallback?.call(
        msg['senderId'] as String? ?? '',
        msg['senderName'] as String? ?? '',
        contentType,
        msg['data'] as String? ?? '',
      );
      return true;
    }

    if (type == 'start' || type == 'clipboard-start') {
      final transferId = msg['transferId'] as String? ?? '';
      final totalChunks = msg['totalChunks'] as int? ?? 1;
      final contentTypeStr = msg['contentType'] as String? ?? 'text';
      final senderName = msg['senderName'] as String? ?? '';
      final senderId = msg['senderId'] as String? ?? '';

      final existing = _pendingTransfers[transferId];
      if (existing != null) {
        existing
          ..contentType = contentTypeStr
          ..totalChunks = totalChunks
          ..senderName = senderName
          ..senderId = senderId
          ..started = true;
        _tryComplete(transferId);
      } else {
        _pendingTransfers[transferId] = _ClipboardTransfer(
          transferId: transferId,
          contentType: contentTypeStr,
          totalChunks: totalChunks,
          senderName: senderName,
          senderId: senderId,
        )..started = true;
      }
      return true;
    }

    if (type == 'chunk' || type == 'clipboard-chunk') {
      final transferId = msg['transferId'] as String? ?? '';
      final chunkIndex = msg['chunkIndex'] as int? ?? 0;
      final data = msg['data'] as String? ?? '';

      var transfer = _pendingTransfers[transferId];
      if (transfer == null) {
        transfer = _ClipboardTransfer(
          transferId: transferId,
          contentType: 'text',
          totalChunks: 1,
          senderName: '',
          senderId: '',
        );
        _pendingTransfers[transferId] = transfer;
      }
      transfer.chunks[chunkIndex] = data;
      _tryComplete(transferId);
      return true;
    }

    if (type == 'end' || type == 'clipboard-end') {
      final transferId = msg['transferId'] as String? ?? '';

      var transfer = _pendingTransfers[transferId];
      if (transfer == null) {
        transfer = _ClipboardTransfer(
          transferId: transferId,
          contentType: 'text',
          totalChunks: 1,
          senderName: '',
          senderId: '',
        );
        _pendingTransfers[transferId] = transfer;
      }
      transfer.ended = true;
      _tryComplete(transferId);
      return true;
    }

    return false;
  }

  void _tryComplete(String transferId) {
    final transfer = _pendingTransfers[transferId];
    if (transfer == null) return;

    if (transfer.ended && transfer.started && transfer.chunks.isNotEmpty) {
      final fullData = List.generate(
        transfer.totalChunks,
        (i) => transfer.chunks[i] ?? '',
      ).join();
      final contentType = ClipboardContentType.values.firstWhere(
        (t) => t.name == transfer.contentType,
        orElse: () => ClipboardContentType.text,
      );
      onIncomingCallback?.call(
        transfer.senderId,
        transfer.senderName,
        contentType,
        fullData,
      );
      _pendingTransfers.remove(transferId);
    } else if (transfer.ended &&
        transfer.started &&
        transfer.totalChunks == 0) {
      final contentType = ClipboardContentType.values.firstWhere(
        (t) => t.name == transfer.contentType,
        orElse: () => ClipboardContentType.text,
      );
      onIncomingCallback?.call(
        transfer.senderId,
        transfer.senderName,
        contentType,
        '',
      );
      _pendingTransfers.remove(transferId);
    }
  }

  void handleRelayMessage(Map<String, dynamic> payload) {
    final rawData = payload['data'];

    // Check if data contains a chunked protocol message (start/chunk/end)
    Map<String, dynamic>? protocolMsg;
    if (rawData is Map<String, dynamic>) {
      protocolMsg = rawData;
    } else if (rawData is String) {
      try {
        final parsed = jsonDecode(rawData);
        if (parsed is Map<String, dynamic>) {
          protocolMsg = parsed;
        }
      } catch (_) {}
    }

    if (protocolMsg != null && protocolMsg.containsKey('type')) {
      final type = protocolMsg['type'] as String;
      if (type == 'start' ||
          type == 'clipboard-start' ||
          type == 'chunk' ||
          type == 'clipboard-chunk' ||
          type == 'end' ||
          type == 'clipboard-end') {
        handleMessage(payload['senderId'] as String? ?? '', protocolMsg);
        return;
      }
    }

    final data = rawData as String? ?? '';
    final contentTypeStr = payload['contentType'] as String? ?? 'text';
    final contentType = ClipboardContentType.values.firstWhere(
      (t) => t.name == contentTypeStr,
      orElse: () => ClipboardContentType.text,
    );
    onIncomingCallback?.call(
      payload['senderId'] as String? ?? '',
      payload['senderName'] as String? ?? '',
      contentType,
      data,
    );
  }

  Future<bool> sendClipboard(
    String peerId,
    ClipboardContentType contentType,
    String data,
    String senderName,
    String senderId,
  ) async {
    final dc = await _webrtcService.connectToPeer(peerId);
    if (dc != null) {
      final sent = _webrtcService.sendToPeer(peerId, {
        'type': 'clipboard-data',
        'contentType': contentType.name,
        'data': data,
        'senderName': senderName,
        'senderId': senderId,
      });
      if (sent) {
        print('[Clipboard] Sent via WebRTC to $peerId');
        return true;
      }
    }

    print('[Clipboard] WebRTC failed, using relay for $peerId');
    if (data.length > maxRelaySize) {
      print('[Clipboard] Payload too large for relay');
      return false;
    }

    if (!_socketService.connected) {
      print('[Clipboard] Socket not connected');
      return false;
    }

    _socketService.sendClipboardRelay(
      to: peerId,
      contentType: contentType.name,
      data: data,
      senderName: senderName,
      senderId: senderId,
    );

    return true;
  }

  Future<String?> readClipboard() async {
    try {
      final data = await flutter_services.Clipboard.getData(
          flutter_services.Clipboard.kTextPlain);
      return data?.text;
    } catch (e) {
      print('[Clipboard] Read error: $e');
      return null;
    }
  }

  Future<void> writeToClipboard(String text) async {
    await flutter_services.Clipboard.setData(
        flutter_services.ClipboardData(text: text));
  }
}

class _ClipboardTransfer {
  final String transferId;
  String contentType;
  int totalChunks;
  String senderName;
  String senderId;
  final Map<int, String> chunks = {};
  bool started = false;
  bool ended = false;

  _ClipboardTransfer({
    required this.transferId,
    required this.contentType,
    required this.totalChunks,
    required this.senderName,
    required this.senderId,
  });
}
