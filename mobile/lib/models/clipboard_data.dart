enum ClipboardContentType { text, url, html, image }

class ClipboardData {
  final String id;
  final ClipboardContentType contentType;
  final String data;
  final String senderId;
  final String senderName;
  final int timestamp;

  ClipboardData({
    required this.id,
    required this.contentType,
    required this.data,
    required this.senderId,
    required this.senderName,
    required this.timestamp,
  });

  factory ClipboardData.fromJson(Map<String, dynamic> json) {
    return ClipboardData(
      id: json['id'] as String? ?? '',
      contentType: ClipboardContentType.values.firstWhere(
        (t) => t.name == json['contentType'],
        orElse: () => ClipboardContentType.text,
      ),
      data: json['data'] as String? ?? '',
      senderId: json['senderId'] as String? ?? '',
      senderName: json['senderName'] as String? ?? '',
      timestamp: json['timestamp'] as int? ?? 0,
    );
  }

  static ClipboardContentType detectContentType(String data) {
    final urlRegex = RegExp(
      r'^https?:\/\/[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$',
    );
    if (urlRegex.hasMatch(data.trim())) return ClipboardContentType.url;
    if (data.contains('<') && data.contains('>')) return ClipboardContentType.html;
    return ClipboardContentType.text;
  }
}
