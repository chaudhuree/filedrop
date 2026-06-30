class DeviceInfo {
  final String id;
  final String name;
  final String deviceType; // 'desktop' | 'tablet' | 'phone'
  final String browser;
  final String os;
  final String colorHash;
  final String? avatar;

  DeviceInfo({
    required this.id,
    required this.name,
    required this.deviceType,
    required this.browser,
    required this.os,
    required this.colorHash,
    this.avatar,
  });

  factory DeviceInfo.fromJson(Map<String, dynamic> json) {
    return DeviceInfo(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unknown',
      deviceType: json['deviceType'] as String? ?? 'phone',
      browser: json['browser'] as String? ?? '',
      os: json['os'] as String? ?? '',
      colorHash: json['colorHash'] as String? ?? 'hsl(0, 70%, 60%)',
      avatar: json['avatar'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'deviceType': deviceType,
      'browser': browser,
      'os': os,
      'colorHash': colorHash,
      'avatar': avatar,
    };
  }

  DeviceInfo copyWith({
    String? id,
    String? name,
    String? deviceType,
    String? browser,
    String? os,
    String? colorHash,
    String? avatar,
  }) {
    return DeviceInfo(
      id: id ?? this.id,
      name: name ?? this.name,
      deviceType: deviceType ?? this.deviceType,
      browser: browser ?? this.browser,
      os: os ?? this.os,
      colorHash: colorHash ?? this.colorHash,
      avatar: avatar ?? this.avatar,
    );
  }
}
