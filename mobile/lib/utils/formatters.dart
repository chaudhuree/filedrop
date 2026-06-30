String formatBytes(int bytes) {
  if (bytes < 1024) return '$bytes B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  if (bytes < 1024 * 1024 * 1024) {
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
}

String formatSpeed(double bytesPerSecond) {
  if (bytesPerSecond < 1024) return '${bytesPerSecond.toStringAsFixed(0)} B/s';
  if (bytesPerSecond < 1024 * 1024) {
    return '${(bytesPerSecond / 1024).toStringAsFixed(1)} KB/s';
  }
  return '${(bytesPerSecond / (1024 * 1024)).toStringAsFixed(1)} MB/s';
}

String formatETA(double seconds) {
  if (seconds <= 0 || seconds.isInfinite || seconds.isNaN) return '--';
  if (seconds < 60) return '${seconds.ceil()}s';
  if (seconds < 3600) {
    final m = (seconds / 60).floor();
    final s = (seconds % 60).ceil();
    return '${m}m ${s}s';
  }
  final h = (seconds / 3600).floor();
  final m = ((seconds % 3600) / 60).floor();
  return '${h}h ${m}m';
}
