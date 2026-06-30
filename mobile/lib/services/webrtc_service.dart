import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:http/http.dart' as http;
import 'socket_service.dart';

typedef DataChannelMessageHandler = void Function(String peerId, dynamic data);

class PeerConnectionState {
  final RTCPeerConnection connection;
  RTCDataChannel? dataChannel;
  final List<RTCIceCandidate> pendingCandidates = [];
  bool connected = false;
  bool makingOffer = false;

  PeerConnectionState({required this.connection});
}

class WebRTCService {
  final SocketService _socketService;
  final Map<String, PeerConnectionState> _peers = {};
  Map<String, dynamic> _config = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
    ],
  };
  String _myId = '';
  DataChannelMessageHandler? onMessageCallback;
  Function(String peerId)? onPeerConnectedCallback;
  Function(String peerId)? onPeerDisconnectedCallback;

  WebRTCService(this._socketService);

  String get myId => _myId;

  Future<void> initialize(String myId, String serverUrl) async {
    _myId = myId;

    // Fetch ICE config
    try {
      final response = await http.get(Uri.parse('$serverUrl/api/config'));
      if (response.statusCode == 200) {
        final config = jsonDecode(response.body);
        final iceServers = <Map<String, dynamic>>[];

        if (config['stunServers'] != null) {
          final List<dynamic> stuns = config['stunServers'];
          if (stuns.isNotEmpty) {
            iceServers.add({'urls': stuns.cast<String>()});
          }
        }

        if (config['turnServer'] != null &&
            (config['turnServer'] as String).isNotEmpty) {
          iceServers.add({
            'urls': [config['turnServer'] as String],
            'username': config['turnUsername'] as String? ?? '',
            'credential': config['turnPassword'] as String? ?? '',
          });
        }

        if (iceServers.isNotEmpty) {
          _config = {'iceServers': iceServers};
        }
      }
    } catch (e) {
      print('[WebRTC] Failed to fetch ICE config: $e');
    }

    // Listen for signaling
    _socketService.on('signal', (payload) {
      if (payload is Map) {
        _handleSignal(
          from: payload['from'] as String? ?? '',
          data: payload['data'],
        );
      }
    });
  }

  void onMessage(DataChannelMessageHandler handler) {
    onMessageCallback = handler;
  }

  void onPeerConnected(Function(String) handler) {
    onPeerConnectedCallback = handler;
  }

  void onPeerDisconnected(Function(String) handler) {
    onPeerDisconnectedCallback = handler;
  }

  Future<RTCDataChannel?> connectToPeer(String peerId) async {
    final existing = _peers[peerId];
    if (existing?.dataChannel != null &&
        existing!.dataChannel!.state == RTCDataChannelState.RTCDataChannelOpen) {
      return existing.dataChannel;
    }

    // Clean stale
    if (existing != null) {
      try {
        await existing.dataChannel?.close();
      } catch (_) {}
      try {
        await existing.connection.close();
      } catch (_) {}
      _peers.remove(peerId);
    }

    // First attempt
    var result = await _attemptConnection(peerId);
    if (result != null) return result;

    // Retry once
    print('[WebRTC] Retry connection to $peerId in 2s...');
    await Future.delayed(const Duration(seconds: 2));

    final failed = _peers[peerId];
    if (failed != null) {
      try {
        await failed.dataChannel?.close();
      } catch (_) {}
      try {
        await failed.connection.close();
      } catch (_) {}
      _peers.remove(peerId);
    }

    return _attemptConnection(peerId);
  }

  Future<RTCDataChannel?> _attemptConnection(String peerId) async {
    final pc = await _createPeerConnection(peerId);
    final dc = await pc.createDataChannel(
      'localdrop',
      RTCDataChannelInit()..ordered = true,
    );

    _setupDataChannel(dc, peerId);
    final peer = _peers[peerId]!;
    peer.dataChannel = dc;
    peer.makingOffer = true;

    try {
      final offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      _socketService.sendSignal(
        from: _myId,
        to: peerId,
        data: {'type': 'offer', 'sdp': offer.sdp},
      );
    } catch (e) {
      print('[WebRTC] Failed to create offer: $e');
      peer.makingOffer = false;
      return null;
    }
    peer.makingOffer = false;

    // Wait with timeout
    final completer = Completer<RTCDataChannel?>();
    final checkTimer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      final currentPeer = _peers[peerId];
      if (currentPeer?.dataChannel?.state ==
          RTCDataChannelState.RTCDataChannelOpen) {
        if (!completer.isCompleted) completer.complete(currentPeer!.dataChannel);
      }
    });

    Timer(const Duration(seconds: 10), () {
      checkTimer.cancel();
      if (!completer.isCompleted) {
        final currentPeer = _peers[peerId];
        if (currentPeer?.dataChannel?.state ==
            RTCDataChannelState.RTCDataChannelOpen) {
          completer.complete(currentPeer!.dataChannel);
        } else {
          print('[WebRTC] Connection timeout for $peerId');
          completer.complete(null);
        }
      }
    });

    final result = await completer.future;
    checkTimer.cancel();
    return result;
  }

  bool sendToPeer(String peerId, Map<String, dynamic> data) {
    final peer = _peers[peerId];
    if (peer?.dataChannel == null ||
        peer!.dataChannel!.state != RTCDataChannelState.RTCDataChannelOpen) {
      return false;
    }

    try {
      peer.dataChannel!.send(RTCDataChannelMessage(jsonEncode(data)));
      return true;
    } catch (e) {
      print('[WebRTC] Send error: $e');
      return false;
    }
  }

  bool sendBinaryToPeer(String peerId, Uint8List data) {
    final peer = _peers[peerId];
    if (peer?.dataChannel == null ||
        peer!.dataChannel!.state != RTCDataChannelState.RTCDataChannelOpen) {
      return false;
    }

    try {
      peer.dataChannel!.send(RTCDataChannelMessage.fromBinary(data));
      return true;
    } catch (e) {
      print('[WebRTC] Binary send error: $e');
      return false;
    }
  }

  int getBufferedAmount(String peerId) {
    return _peers[peerId]?.dataChannel?.bufferedAmount ?? 0;
  }

  bool isPeerConnected(String peerId) {
    return _peers[peerId]?.dataChannel?.state ==
        RTCDataChannelState.RTCDataChannelOpen;
  }

  Future<void> disconnectPeer(String peerId) async {
    final peer = _peers[peerId];
    if (peer != null) {
      await peer.dataChannel?.close();
      await peer.connection.close();
      _peers.remove(peerId);
    }
  }

  Future<void> destroy() async {
    for (final peer in _peers.values) {
      await peer.dataChannel?.close();
      await peer.connection.close();
    }
    _peers.clear();
  }

  Future<RTCPeerConnection> _createPeerConnection(String peerId) async {
    final pc = await createPeerConnection(_config);
    final peerState = PeerConnectionState(connection: pc);
    _peers[peerId] = peerState;

    pc.onIceCandidate = (candidate) {
      _socketService.sendSignal(
        from: _myId,
        to: peerId,
        data: {
          'type': 'ice-candidate',
          'candidate': {
            'candidate': candidate.candidate,
            'sdpMid': candidate.sdpMid,
            'sdpMLineIndex': candidate.sdpMLineIndex,
          },
        },
      );
    };

    pc.onConnectionState = (state) {
      print('[WebRTC] Connection state ($peerId): $state');
      if (state == RTCPeerConnectionState.RTCPeerConnectionStateConnected) {
        peerState.connected = true;
        onPeerConnectedCallback?.call(peerId);
      } else if (state ==
              RTCPeerConnectionState.RTCPeerConnectionStateDisconnected ||
          state == RTCPeerConnectionState.RTCPeerConnectionStateFailed ||
          state == RTCPeerConnectionState.RTCPeerConnectionStateClosed) {
        peerState.connected = false;
        onPeerDisconnectedCallback?.call(peerId);
        if (state == RTCPeerConnectionState.RTCPeerConnectionStateFailed) {
          _peers.remove(peerId);
        }
      }
    };

    pc.onDataChannel = (channel) {
      _setupDataChannel(channel, peerId);
      peerState.dataChannel = channel;
    };

    return pc;
  }

  void _setupDataChannel(RTCDataChannel dc, String peerId) {
    dc.onMessage = (message) {
      try {
        if (message.isBinary) {
          onMessageCallback?.call(peerId, message.binary);
        } else {
          final parsed = jsonDecode(message.text);
          onMessageCallback?.call(peerId, parsed);
        }
      } catch (e) {
        print('[WebRTC] Message parse error: $e');
      }
    };

    dc.onDataChannelState = (state) {
      print('[WebRTC] DataChannel state ($peerId): $state');
    };
  }

  Future<void> _handleSignal({
    required String from,
    required dynamic data,
  }) async {
    if (data is! Map) return;
    final signalData = data as Map<String, dynamic>;
    final type = signalData['type'] as String? ?? '';

    if (type == 'offer') {
      final existingPeer = _peers[from];

      final isCollision = existingPeer?.makingOffer == true ||
          (existingPeer != null &&
              existingPeer.connection.signalingState !=
                  RTCSignalingState.RTCSignalingStateStable);

      final isPolite = _myId.compareTo(from) < 0;

      if (isCollision && !isPolite) {
        print('[WebRTC] Glare with $from, ignoring (impolite)');
        return;
      }

      if (isCollision && isPolite) {
        print('[WebRTC] Glare with $from, yielding (polite)');
        if (existingPeer != null) {
          try {
            await existingPeer.dataChannel?.close();
          } catch (_) {}
          try {
            await existingPeer.connection.close();
          } catch (_) {}
          _peers.remove(from);
        }
      }

      final pc = await _createPeerConnection(from);
      await pc.setRemoteDescription(
        RTCSessionDescription(signalData['sdp'] as String?, 'offer'),
      );

      final peer = _peers[from]!;
      for (final c in peer.pendingCandidates) {
        await pc.addCandidate(c);
      }
      peer.pendingCandidates.clear();

      final answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      _socketService.sendSignal(
        from: _myId,
        to: from,
        data: {'type': 'answer', 'sdp': answer.sdp},
      );
    } else if (type == 'answer') {
      final peer = _peers[from];
      if (peer != null) {
        try {
          await peer.connection.setRemoteDescription(
            RTCSessionDescription(signalData['sdp'] as String?, 'answer'),
          );

          for (final c in peer.pendingCandidates) {
            await peer.connection.addCandidate(c);
          }
          peer.pendingCandidates.clear();
        } catch (e) {
          print('[WebRTC] Failed to set answer from $from: $e');
        }
      }
    } else if (type == 'ice-candidate') {
      final peer = _peers[from];
      if (peer == null) return;

      final candidateData =
          signalData['candidate'] as Map<String, dynamic>? ?? {};
      final candidate = RTCIceCandidate(
        candidateData['candidate'] as String? ?? '',
        candidateData['sdpMid'] as String?,
        candidateData['sdpMLineIndex'] as int?,
      );

      try {
        if (await peer.connection.getRemoteDescription() != null) {
          await peer.connection.addCandidate(candidate);
        } else {
          peer.pendingCandidates.add(candidate);
        }
      } catch (e) {
        print('[WebRTC] Failed to add ICE from $from: $e');
      }
    }
  }
}
