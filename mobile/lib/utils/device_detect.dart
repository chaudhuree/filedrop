import 'dart:io';

String detectDeviceType() {
  return 'phone';
}

Future<String> detectOS() async {
  if (Platform.isAndroid) return 'Android';
  if (Platform.isIOS) return 'iOS';
  return 'Unknown';
}

String detectBrowser() {
  return 'Drop';
}

String generateColorHash(String str) {
  int hash = 0;
  for (int i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.codeUnitAt(i);
    hash = hash & hash;
  }
  final hue = hash.abs() % 360;
  return 'hsl($hue, 70%, 60%)';
}
