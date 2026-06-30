import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/device_info.dart';
import '../utils/constants.dart';

class DeviceCard extends StatelessWidget {
  final DeviceInfo device;
  final bool selected;
  final bool hasActiveTransfer;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const DeviceCard({
    super.key,
    required this.device,
    this.selected = false,
    this.hasActiveTransfer = false,
    required this.onTap,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      onLongPress: onLongPress,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        decoration: BoxDecoration(
          color: selected
              ? theme.colorScheme.primaryContainer
              : isDark
                  ? const Color(0xFF1E1E1E)
                  : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected
                ? theme.colorScheme.primary
                : isDark
                    ? Colors.white.withOpacity(0.08)
                    : Colors.grey.withOpacity(0.2),
            width: selected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: selected
                  ? theme.colorScheme.primary.withOpacity(0.2)
                  : Colors.black.withOpacity(0.05),
              blurRadius: selected ? 12 : 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Main content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Avatar
                  _buildAvatar(theme),
                  const SizedBox(height: 12),
                  // Name
                  Text(
                    device.name,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  // OS + device type
                  Text(
                    '${device.os} • ${_deviceTypeLabel(device.deviceType)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.5),
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Selection indicator
            if (selected)
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check,
                    size: 16,
                    color: Colors.white,
                  ),
                ),
              ),

            // Active transfer shimmer
            if (hasActiveTransfer)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    color: theme.colorScheme.primary.withOpacity(0.05),
                  ),
                  child: Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                ),
              ),

            // Online indicator
            Positioned(
              top: 8,
              left: 8,
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  color: Colors.green,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDark
                        ? const Color(0xFF1E1E1E)
                        : Colors.white,
                    width: 2,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatar(ThemeData theme) {
    final avatarUrl = (device.avatar != null && device.avatar!.isNotEmpty)
        ? device.avatar!
        : defaultAvatarUrl;

    return Center(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: CachedNetworkImage(
          imageUrl: avatarUrl,
          width: 64,
          height: 64,
          fit: BoxFit.cover,
          placeholder: (_, __) => _buildGradientAvatar(theme),
          errorWidget: (_, __, ___) => _buildGradientAvatar(theme),
        ),
      ),
    );
  }

  Widget _buildGradientAvatar(ThemeData theme) {
    final hue = _parseHue(device.colorHash);
    return Center(
      child: Container(
        width: 64,
        height: 64,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              HSLColor.fromAHSL(1, hue.toDouble(), 0.7, 0.6).toColor(),
              theme.colorScheme.primary,
            ],
          ),
        ),
        child: Icon(
          _deviceIcon(device.deviceType),
          size: 32,
          color: Colors.white,
        ),
      ),
    );
  }

  int _parseHue(String colorHash) {
    final match = RegExp(r'hsl\((\d+)').firstMatch(colorHash);
    return match != null ? int.parse(match.group(1)!) : 200;
  }

  IconData _deviceIcon(String type) {
    switch (type) {
      case 'tablet':
        return Icons.tablet_mac;
      case 'desktop':
        return Icons.computer;
      default:
        return Icons.phone_iphone;
    }
  }

  String _deviceTypeLabel(String type) {
    switch (type) {
      case 'tablet':
        return 'Tablet';
      case 'desktop':
        return 'Desktop';
      default:
        return 'Phone';
    }
  }
}
