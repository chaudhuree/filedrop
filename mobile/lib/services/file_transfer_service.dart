import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:mime/mime.dart';
import '../utils/constants.dart';
import 'webrtc_service.dart';

typedef TransferProgressCallback = void Function(
  String transferId,
  int bytesTransferred,
  int totalBytes,
  double speed,
);

class FileTransferService {
  final WebRTCService _webrtcService;
  final Map<String, _OutgoingTransfer> _outgoing = {};
  final Map<String, _IncomingTransfer> _incoming = {};
  final Map<String, List<_SpeedSample>> _speedSamples = {};

  TransferProgressCallback? onProgressCallback;
  Function(String transferId)? onCompleteCallback;
  Function(String transferId, String error)? onErrorCallback;
  Function(String peerId, String peerName, String transferId, String fileName,
      int fileSize, String fileType)? onIncomingFileCallback;

  FileTransferService(this._webrtcService);

  bool handleMessage(String peerId, dynamic message) {
    if (message is! Map) return false;
    final msg = message as Map<String, dynamic>;
    final type = msg['type'] as String? ?? '';

    switch (type) {
      case 'file-request':
        _handleFileRequest(peerId, msg);
        return true;
      case 'file-response':
        _handleFileResponse(msg);
        return true;
      case 'file-chunk':
        _handleFileChunk(msg);
        return true;
      case 'file-complete':
        _handleFileComplete(msg);
        return true;
      case 'file-cancel':
        _handleFileCancel(msg);
        return true;
      default:
        return false;
    }
  }

  Future<String> sendFile(
    String peerId,
    String peerName,
    File file,
  ) async {
    final dc = await _webrtcService.connectToPeer(peerId);
    if (dc == null) {
      throw Exception('Failed to establish peer connection');
    }

    final transferId =
        'tf-${DateTime.now().millisecondsSinceEpoch}-${_randomString(9)}';
    final fileName = file.path.split('/').last;
    final fileSize = await file.length();
    final mimeType = lookupMimeType(file.path) ?? 'application/octet-stream';
    final totalChunks = (fileSize / chunkSize).ceil();

    _outgoing[transferId] = _OutgoingTransfer(
      file: file,
      peerId: peerId,
      transferId: transferId,
      fileName: fileName,
      fileSize: fileSize,
      fileType: mimeType,
      totalChunks: totalChunks,
    );

    _webrtcService.sendToPeer(peerId, {
      'type': 'file-request',
      'transferId': transferId,
      'fileName': fileName,
      'fileSize': fileSize,
      'fileType': mimeType,
      'totalChunks': totalChunks,
    });

    return transferId;
  }

  void acceptFile(String transferId, String peerId) {
    _webrtcService.sendToPeer(peerId, {
      'type': 'file-response',
      'transferId': transferId,
      'accepted': true,
    });
  }

  void declineFile(String transferId, String peerId) {
    _webrtcService.sendToPeer(peerId, {
      'type': 'file-response',
      'transferId': transferId,
      'accepted': false,
    });
    _incoming.remove(transferId);
  }

  void cancelTransfer(String transferId, String peerId) {
    _outgoing.remove(transferId);
    _incoming.remove(transferId);
    _webrtcService.sendToPeer(peerId, {
      'type': 'file-cancel',
      'transferId': transferId,
    });
  }

  void _handleFileRequest(String peerId, Map<String, dynamic> msg) {
    final transferId = msg['transferId'] as String? ?? '';
    final fileName = msg['fileName'] as String? ?? '';
    final fileSize = msg['fileSize'] as int? ?? 0;
    final fileType = msg['fileType'] as String? ?? '';

    _incoming[transferId] = _IncomingTransfer(
      fileName: fileName,
      fileSize: fileSize,
      fileType: fileType,
    );

    onIncomingFileCallback?.call(
        peerId, '', transferId, fileName, fileSize, fileType);
  }

  void _handleFileResponse(Map<String, dynamic> msg) {
    final transferId = msg['transferId'] as String? ?? '';
    final accepted = msg['accepted'] as bool? ?? false;

    if (accepted) {
      _sendChunks(transferId);
    } else {
      _outgoing.remove(transferId);
      onErrorCallback?.call(transferId, 'Transfer declined by receiver');
    }
  }

  Future<void> _sendChunks(String transferId) async {
    final transfer = _outgoing[transferId];
    if (transfer == null || transfer.cancelled) return;

    final file = transfer.file;
    final peerId = transfer.peerId;
    int offset = transfer.offset;
    var lastSpeedCheck = DateTime.now().millisecondsSinceEpoch;
    int bytesSinceLastCheck = 0;

    final raf = file.openSync(mode: FileMode.read);

    try {
      while (offset < transfer.fileSize && !transfer.cancelled) {
        // Flow control
        final buffered = _webrtcService.getBufferedAmount(peerId);
        if (buffered > maxBufferSize) {
          await Future.delayed(const Duration(milliseconds: 50));
          continue;
        }

        final end = (offset + chunkSize).clamp(0, transfer.fileSize);
        final length = end - offset;
        raf.setPositionSync(offset);
        final bytes = raf.readSync(length);

        _webrtcService.sendToPeer(peerId, {
          'type': 'file-chunk',
          'transferId': transferId,
          'chunkIndex': offset ~/ chunkSize,
          'data': base64Encode(bytes),
        });

        offset += bytes.length;
        transfer.offset = offset;
        bytesSinceLastCheck += bytes.length;

        final now = DateTime.now().millisecondsSinceEpoch;
        final elapsed = now - lastSpeedCheck;
        if (elapsed >= speedSampleInterval) {
          final speed = (bytesSinceLastCheck / elapsed) * 1000;
          onProgressCallback?.call(transferId, offset, transfer.fileSize, speed);
          lastSpeedCheck = now;
          bytesSinceLastCheck = 0;
        }

        if (offset % (chunkSize * 16) == 0) {
          await Future.delayed(Duration.zero);
        }
      }

      if (!transfer.cancelled && offset >= transfer.fileSize) {
        _webrtcService.sendToPeer(peerId, {
          'type': 'file-complete',
          'transferId': transferId,
          'hash': '',
        });
        onCompleteCallback?.call(transferId);
        _outgoing.remove(transferId);
      }
    } finally {
      await raf.close();
    }
  }

  void _handleFileChunk(Map<String, dynamic> msg) {
    final transferId = msg['transferId'] as String? ?? '';
    final transfer = _incoming[transferId];
    if (transfer == null || transfer.cancelled) return;

    final data = msg['data'] as String? ?? '';
    final chunk = base64Decode(data);

    transfer.chunks.add(chunk);
    transfer.bytesReceived += chunk.length;

    final speed = _calculateSpeed(transferId, chunk.length);
    onProgressCallback?.call(
        transferId, transfer.bytesReceived, transfer.fileSize, speed);
  }

  Future<void> _handleFileComplete(Map<String, dynamic> msg) async {
    final transferId = msg['transferId'] as String? ?? '';
    final transfer = _incoming[transferId];
    if (transfer == null) return;

    try {
      final dir = await getApplicationDocumentsDirectory();
      final filePath = '${dir.path}/${transfer.fileName}';
      final file = File(filePath);

      // Write chunks to file
      final sink = file.openSync(mode: FileMode.write);
      for (final chunk in transfer.chunks) {
        sink.writeFromSync(chunk);
      }
      await sink.close();

      print('[FileTransfer] File saved: $filePath');
      onCompleteCallback?.call(transferId);
    } catch (e) {
      print('[FileTransfer] Error saving file: $e');
      onErrorCallback?.call(transferId, 'Failed to save file');
    }

    _incoming.remove(transferId);
    _speedSamples.remove(transferId);
  }

  void _handleFileCancel(Map<String, dynamic> msg) {
    final transferId = msg['transferId'] as String? ?? '';
    _outgoing.remove(transferId);
    _incoming.remove(transferId);
    onErrorCallback?.call(transferId, 'Transfer cancelled by peer');
  }

  double _calculateSpeed(String transferId, int bytes) {
    if (!_speedSamples.containsKey(transferId)) {
      _speedSamples[transferId] = [];
    }
    final samples = _speedSamples[transferId]!;
    final now = DateTime.now().millisecondsSinceEpoch;
    samples.add(_SpeedSample(timestamp: now, bytes: bytes));

    final cutoff = now - 2000;
    samples.removeWhere((s) => s.timestamp < cutoff);

    if (samples.length < 2) return 0;

    final totalBytes = samples.fold<int>(0, (sum, s) => sum + s.bytes);
    final elapsed =
        (samples.last.timestamp - samples.first.timestamp) / 1000;
    return elapsed > 0 ? totalBytes / elapsed : 0;
  }

  String _randomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final rng = DateTime.now().millisecondsSinceEpoch;
    return List.generate(
      length,
      (i) => chars[(rng + i) % chars.length],
    ).join();
  }
}

class _OutgoingTransfer {
  final File file;
  final String peerId;
  final String transferId;
  final String fileName;
  final int fileSize;
  final String fileType;
  final int totalChunks;
  int offset = 0;
  bool cancelled = false;

  _OutgoingTransfer({
    required this.file,
    required this.peerId,
    required this.transferId,
    required this.fileName,
    required this.fileSize,
    required this.fileType,
    required this.totalChunks,
  });
}

class _IncomingTransfer {
  final String fileName;
  final int fileSize;
  final String fileType;
  final List<Uint8List> chunks = [];
  int bytesReceived = 0;
  bool cancelled = false;

  _IncomingTransfer({
    required this.fileName,
    required this.fileSize,
    required this.fileType,
  });
}

class _SpeedSample {
  final int timestamp;
  final int bytes;

  _SpeedSample({required this.timestamp, required this.bytes});
}
