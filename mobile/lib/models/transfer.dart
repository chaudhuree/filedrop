enum TransferStatus {
  pending,
  awaitingResponse,
  transferring,
  completed,
  cancelled,
  failed,
}

enum TransferDirection { incoming, outgoing }

class Transfer {
  final String id;
  final String fileName;
  final int fileSize;
  final String fileType;
  final String peerId;
  final String peerName;
  final TransferDirection direction;
  TransferStatus status;
  double progress; // 0-100
  double speed; // bytes per second
  double eta; // seconds remaining
  int bytesTransferred;
  final int startTime;
  int? endTime;

  Transfer({
    required this.id,
    required this.fileName,
    required this.fileSize,
    required this.fileType,
    required this.peerId,
    required this.peerName,
    required this.direction,
    this.status = TransferStatus.pending,
    this.progress = 0,
    this.speed = 0,
    this.eta = 0,
    this.bytesTransferred = 0,
    required this.startTime,
    this.endTime,
  });

  Map<String, dynamic> toHistoryJson() {
    return {
      'id': id,
      'fileName': fileName,
      'fileSize': fileSize,
      'fileType': fileType,
      'peerId': peerId,
      'peerName': peerName,
      'direction': direction == TransferDirection.incoming ? 'incoming' : 'outgoing',
      'status': status.name,
      'startTime': startTime,
      'endTime': endTime,
    };
  }

  factory Transfer.fromHistoryJson(Map<String, dynamic> json) {
    return Transfer(
      id: json['id'] as String,
      fileName: json['fileName'] as String,
      fileSize: json['fileSize'] as int,
      fileType: json['fileType'] as String? ?? '',
      peerId: json['peerId'] as String? ?? '',
      peerName: json['peerName'] as String? ?? '',
      direction: json['direction'] == 'incoming'
          ? TransferDirection.incoming
          : TransferDirection.outgoing,
      status: TransferStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => TransferStatus.completed,
      ),
      startTime: json['startTime'] as int? ?? 0,
      endTime: json['endTime'] as int?,
    );
  }
}
