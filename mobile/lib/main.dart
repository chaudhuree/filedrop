import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'services/storage_service.dart';
import 'services/socket_service.dart';
import 'services/webrtc_service.dart';
import 'services/file_transfer_service.dart';
import 'services/clipboard_service.dart';
import 'services/device_identity_service.dart';
import 'models/device_info.dart';
import 'models/transfer.dart';
import 'models/clipboard_data.dart';
import 'providers/connection_provider.dart';
import 'providers/device_provider.dart';
import 'providers/transfer_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/home_screen.dart';
import 'widgets/incoming_file_sheet.dart';
import 'widgets/incoming_clipboard_sheet.dart';
import 'utils/constants.dart';

const String defaultServerUrl = 'http://drop.aiteamtwo.com';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize storage
  await StorageService.init();

  // Initialize services
  final socketService = SocketService();
  final webrtcService = WebRTCService(socketService);
  final fileTransferService = FileTransferService(webrtcService);
  final clipboardService = ClipboardService(webrtcService, socketService);

  // Get or create device identity
  final deviceInfo = await DeviceIdentityService.getOrCreateIdentity();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ConnectionProvider()),
        ChangeNotifierProvider(create: (_) => DeviceProvider()),
        ChangeNotifierProvider(create: (_) => TransferProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: LocalDropApp(
        home: _AppLifecycle(
          socketService: socketService,
          webrtcService: webrtcService,
          fileTransferService: fileTransferService,
          clipboardService: clipboardService,
          deviceInfo: deviceInfo,
          serverUrl: defaultServerUrl,
        ),
      ),
    ),
  );
}

class _AppLifecycle extends StatefulWidget {
  final SocketService socketService;
  final WebRTCService webrtcService;
  final FileTransferService fileTransferService;
  final ClipboardService clipboardService;
  final DeviceInfo deviceInfo;
  final String serverUrl;

  const _AppLifecycle({
    required this.socketService,
    required this.webrtcService,
    required this.fileTransferService,
    required this.clipboardService,
    required this.deviceInfo,
    required this.serverUrl,
  });

  @override
  State<_AppLifecycle> createState() => _AppLifecycleState();
}

class _AppLifecycleState extends State<_AppLifecycle>
    with WidgetsBindingObserver {
  bool _autoSend = false;
  bool _autoAccept = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadSettings();
    _initialize();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    widget.socketService.leaveRoom();
    widget.socketService.disconnect();
    widget.webrtcService.destroy();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _autoSend) {
      _autoSendClipboard();
    }
  }

  void _loadSettings() {
    _autoSend = StorageService.getBool(autoSendKey);
    _autoAccept = StorageService.getBool(autoAcceptKey);
  }

  Future<void> _initialize() async {
    final connectionProvider =
        Provider.of<ConnectionProvider>(context, listen: false);
    final deviceProvider =
        Provider.of<DeviceProvider>(context, listen: false);
    final transferProvider =
        Provider.of<TransferProvider>(context, listen: false);

    // Set my device
    deviceProvider.setMyDevice(widget.deviceInfo);

    // Initialize WebRTC
    await widget.webrtcService.initialize(
      widget.deviceInfo.id,
      widget.serverUrl,
    );

    // Set up WebRTC callbacks
    widget.webrtcService.onMessage((peerId, data) {
      if (data is Map) {
        final msg = data as Map<String, dynamic>;
        final handled = widget.fileTransferService.handleMessage(peerId, msg);
        if (!handled) {
          widget.clipboardService.handleMessage(peerId, msg);
        }
      }
    });

    widget.webrtcService.onPeerConnected((peerId) {
      print('[App] Peer connected: $peerId');
    });

    widget.webrtcService.onPeerDisconnected((peerId) {
      print('[App] Peer disconnected: $peerId');
    });

    // Set up file transfer callbacks
    widget.fileTransferService.onProgressCallback =
        (transferId, bytesTransferred, totalBytes, speed) {
      transferProvider.updateProgress(
          transferId, bytesTransferred, totalBytes, speed);
    };

    widget.fileTransferService.onCompleteCallback = (transferId) {
      transferProvider.completeTransfer(transferId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Transfer completed'),
            backgroundColor: Colors.green,
          ),
        );
      }
    };

    widget.fileTransferService.onErrorCallback = (transferId, error) {
      transferProvider.failTransfer(transferId, error);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Transfer error: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    };

    widget.fileTransferService.onIncomingFileCallback =
        (peerId, peerName, transferId, fileName, fileSize, fileType) {
      final transfer = Transfer(
        id: transferId,
        fileName: fileName,
        fileSize: fileSize,
        fileType: fileType,
        peerId: peerId,
        peerName: deviceProvider.getPeer(peerId)?.name ?? 'Unknown',
        direction: TransferDirection.incoming,
        status: TransferStatus.awaitingResponse,
        startTime: DateTime.now().millisecondsSinceEpoch,
      );

      transferProvider.addIncomingRequest(transfer);

      if (mounted) {
        final sender = deviceProvider.getPeer(peerId);
        IncomingFileSheet.show(
          context,
          transfer: transfer,
          sender: sender,
          onAccept: () {
            widget.fileTransferService.acceptFile(transferId, peerId);
            transferProvider.removeIncomingRequest(transferId);
            transfer.status = TransferStatus.transferring;
            transferProvider.addTransfer(transfer);
          },
          onDecline: () {
            widget.fileTransferService.declineFile(transferId, peerId);
            transferProvider.removeIncomingRequest(transferId);
          },
        );
      }
    };

    // Set up clipboard callbacks
    widget.clipboardService.onIncomingCallback =
        (senderId, senderName, contentType, data) {
      final clipboard = ClipboardData(
        id: 'clip-${DateTime.now().millisecondsSinceEpoch}',
        contentType: contentType,
        data: data,
        senderId: senderId,
        senderName: senderName,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      );

      if (_autoAccept) {
        if (contentType == ClipboardContentType.image) {
          _saveImageToFile(data, senderName);
        } else {
          widget.clipboardService.writeToClipboard(data);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Clipboard from $senderName copied'),
                backgroundColor: Colors.green,
              ),
            );
          }
        }
      } else if (mounted) {
        IncomingClipboardSheet.show(
          context,
          clipboard: clipboard,
          onCopy: () {
            if (contentType == ClipboardContentType.image) {
              _saveImageToFile(data, senderName);
            } else {
              widget.clipboardService.writeToClipboard(data);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Copied to clipboard')),
              );
            }
          },
          onDecline: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Clipboard declined')),
            );
          },
        );
      }
    };

    // Connect to server
    widget.socketService.connect(widget.serverUrl);

    // Use socket service listeners for connection events
    widget.socketService.on('connect', (_) {
      connectionProvider.setConnected(true);
      widget.socketService.joinRoom(widget.deviceInfo);
    });

    widget.socketService.on('disconnect', (_) {
      connectionProvider.setConnected(false);
    });

    // Handle server events
    widget.socketService.on('device-info', (data) {
      if (data is Map) {
        final device = DeviceInfo.fromJson(Map<String, dynamic>.from(data));
        deviceProvider.updateMyDevice(
          name: device.name,
          avatar: device.avatar,
        );
      }
    });

    widget.socketService.on('peers-list', (data) {
      if (data is List) {
        final peers = data
            .map((e) => DeviceInfo.fromJson(Map<String, dynamic>.from(e)))
            .toList();
        deviceProvider.setPeers(peers);
      }
    });

    widget.socketService.on('peer-joined', (data) {
      if (data is Map) {
        final peer = DeviceInfo.fromJson(Map<String, dynamic>.from(data));
        deviceProvider.addPeer(peer);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${peer.name} joined'),
              duration: const Duration(seconds: 2),
            ),
          );
        }
      }
    });

    widget.socketService.on('peer-left', (data) {
      if (data is String) {
        final peer = deviceProvider.getPeer(data);
        deviceProvider.removePeer(data);
        if (mounted && peer != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${peer.name} left'),
              duration: const Duration(seconds: 2),
            ),
          );
        }
      }
    });

    widget.socketService.on('peer-updated', (data) {
      if (data is Map) {
        final peer = DeviceInfo.fromJson(Map<String, dynamic>.from(data));
        deviceProvider.updatePeer(peer);
      }
    });

    widget.socketService.on('clipboard-relay', (data) {
      if (data is Map) {
        widget.clipboardService.handleRelayMessage(Map<String, dynamic>.from(data));
      }
    });
  }

  void _autoSendClipboard() async {
    final text = await widget.clipboardService.readClipboard();
    if (text != null && text.isNotEmpty) {
      final deviceProvider =
          Provider.of<DeviceProvider>(context, listen: false);
      final selectedPeers = deviceProvider.selectedPeers;
      if (selectedPeers.isNotEmpty) {
        final contentType = ClipboardData.detectContentType(text);
        for (final peerId in selectedPeers) {
          widget.clipboardService.sendClipboard(
            peerId,
            contentType,
            text,
            widget.deviceInfo.name,
            widget.deviceInfo.id,
          );
        }
      }
    }
  }

  Future<void> _saveImageToFile(String dataUrl, String senderName) async {
    try {
      final base64Part =
          dataUrl.contains(',') ? dataUrl.split(',').last : dataUrl;
      final bytes = base64Decode(base64Part);

      final dir = await getApplicationDocumentsDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final file = File('${dir.path}/clipboard_image_$timestamp.png');
      await file.writeAsBytes(bytes);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Image saved to ${file.path}'),
            backgroundColor: Colors.green,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save image: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return HomeScreen(
      serverUrl: widget.serverUrl,
      onSendFile: (file) async {
        final deviceProvider =
            Provider.of<DeviceProvider>(context, listen: false);
        final transferProvider =
            Provider.of<TransferProvider>(context, listen: false);
        final selectedPeers = deviceProvider.selectedPeers;

        for (final peerId in selectedPeers) {
          final peer = deviceProvider.getPeer(peerId);
          if (peer == null) continue;

          try {
            final transferId = await widget.fileTransferService.sendFile(
              peerId,
              peer.name,
              file,
            );

            final fileName = file.path.split('/').last;
            final fileSize = await file.length();

            transferProvider.addTransfer(Transfer(
              id: transferId,
              fileName: fileName,
              fileSize: fileSize,
              fileType: '',
              peerId: peerId,
              peerName: peer.name,
              direction: TransferDirection.outgoing,
              status: TransferStatus.awaitingResponse,
              startTime: DateTime.now().millisecondsSinceEpoch,
            ));
          } catch (e) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Failed to send to ${peer.name}: $e'),
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
        }
      },
      onSendFileToPeer: (peerId) async {},
      onSendClipboard: (contentType, data) async {
        final deviceProvider =
            Provider.of<DeviceProvider>(context, listen: false);
        final selectedPeers = deviceProvider.selectedPeers;

        for (final peerId in selectedPeers) {
          await widget.clipboardService.sendClipboard(
            peerId,
            contentType,
            data,
            widget.deviceInfo.name,
            widget.deviceInfo.id,
          );
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Clipboard sent'),
              backgroundColor: Colors.green,
            ),
          );
        }
      },
      onAcceptFile: (transferId, peerId) {
        widget.fileTransferService.acceptFile(transferId, peerId);
      },
      onDeclineFile: (transferId, peerId) {
        widget.fileTransferService.declineFile(transferId, peerId);
      },
      onCancelTransfer: (transferId, peerId) {
        widget.fileTransferService.cancelTransfer(transferId, peerId);
        Provider.of<TransferProvider>(context, listen: false)
            .cancelTransfer(transferId);
      },
      autoSend: _autoSend,
      autoAccept: _autoAccept,
      onAutoSendChanged: (value) {
        setState(() => _autoSend = value);
        StorageService.setBool(autoSendKey, value);
      },
      onAutoAcceptChanged: (value) {
        setState(() => _autoAccept = value);
        StorageService.setBool(autoAcceptKey, value);
      },
    );
  }
}
