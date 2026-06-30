import 'package:flutter/material.dart';

class ConnectionProvider extends ChangeNotifier {
  bool _connected = false;
  String _status = 'disconnected';

  bool get connected => _connected;
  String get status => _status;

  void setConnected(bool value) {
    _connected = value;
    _status = value ? 'connected' : 'disconnected';
    notifyListeners();
  }

  void setStatus(String status) {
    _status = status;
    notifyListeners();
  }
}
