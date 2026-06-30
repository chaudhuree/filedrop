import 'package:socket_io_client/socket_io_client.dart' as io;
import '../models/device_info.dart';

class SocketService {
  io.Socket? _socket;
  final Map<String, List<Function(dynamic)>> _listeners = {};

  bool get connected => _socket?.connected ?? false;
  String? get id => _socket?.id;

  io.Socket connect(String serverUrl) {
    _socket = io.io(
      serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(1000)
          .setReconnectionDelayMax(5000)
          .setTimeout(10000)
          .enableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) {
      print('[Socket] Connected: ${_socket?.id}');
    });

    _socket!.onDisconnect((reason) {
      print('[Socket] Disconnected: $reason');
    });

    _socket!.onConnectError((err) {
      print('[Socket] Connection error: $err');
    });

    // Re-attach stored listeners
    _listeners.forEach((event, callbacks) {
      for (final cb in callbacks) {
        _socket!.on(event, cb);
      }
    });

    return _socket!;
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }

  void joinRoom(DeviceInfo device) {
    _socket?.emit('join-room', {'device': device.toJson()});
  }

  void leaveRoom() {
    _socket?.emit('leave-room');
  }

  void sendSignal({
    required String from,
    required String to,
    required dynamic data,
  }) {
    _socket?.emit('signal', {'from': from, 'to': to, 'data': data});
  }

  void updateName(String name) {
    _socket?.emit('update-name', {'name': name});
  }

  void updateAvatar(String avatar) {
    _socket?.emit('update-avatar', {'avatar': avatar});
  }

  void sendClipboardRelay({
    required String to,
    required String contentType,
    required String data,
    required String senderName,
    required String senderId,
  }) {
    _socket?.emit('clipboard-relay', {
      'to': to,
      'contentType': contentType,
      'data': data,
      'senderName': senderName,
      'senderId': senderId,
    });
  }

  void on(String event, Function(dynamic) callback) {
    if (!_listeners.containsKey(event)) {
      _listeners[event] = [];
    }
    _listeners[event]!.add(callback);
    _socket?.on(event, callback);
  }

  void off(String event, [Function(dynamic)? callback]) {
    if (callback != null) {
      _listeners[event]?.remove(callback);
      _socket?.off(event, callback);
    } else {
      _listeners.remove(event);
      _socket?.off(event);
    }
  }
}
