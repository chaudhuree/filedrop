import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/theme_provider.dart';
import '../providers/device_provider.dart';
import '../providers/transfer_provider.dart';
import '../providers/connection_provider.dart';
import '../models/transfer.dart';
import '../utils/formatters.dart';
import '../utils/constants.dart';
import 'profile_screen.dart';

class SettingsScreen extends StatelessWidget {
  final String serverUrl;

  const SettingsScreen({super.key, required this.serverUrl});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final themeProvider = Provider.of<ThemeProvider>(context);
    final deviceProvider = Provider.of<DeviceProvider>(context);
    final transferProvider = Provider.of<TransferProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          // Profile section
          _buildSection(context, 'Profile', [
            ListTile(
              leading: _buildAvatar(context, deviceProvider),
              title: Text(
                deviceProvider.myDevice?.name ?? 'Unknown',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                '${deviceProvider.myDevice?.os ?? ''} • ${deviceProvider.myDevice?.deviceType ?? ''}',
              ),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ProfileScreen(
                      currentName: deviceProvider.myDevice?.name ?? '',
                      currentAvatar: deviceProvider.myDevice?.avatar,
                      onSave: (name, avatar) {
                        deviceProvider.updateMyDevice(
                            name: name, avatar: avatar);
                      },
                    ),
                  ),
                );
              },
            ),
          ]),

          // Theme section
          _buildSection(context, 'Appearance', [
            _buildThemeTile(
              context,
              'Light',
              Icons.light_mode_rounded,
              ThemeMode.light,
              themeProvider,
            ),
            _buildThemeTile(
              context,
              'Dark',
              Icons.dark_mode_rounded,
              ThemeMode.dark,
              themeProvider,
            ),
            _buildThemeTile(
              context,
              'System',
              Icons.settings_brightness_rounded,
              ThemeMode.system,
              themeProvider,
            ),
          ]),

          // Transfer History
          _buildSection(context, 'Data', [
            ListTile(
              leading: const Icon(Icons.history_rounded),
              title: const Text('Transfer History'),
              subtitle: Text(
                '${transferProvider.transferHistory.length} transfers',
              ),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => _showHistory(context, transferProvider),
            ),
            if (transferProvider.transferHistory.isNotEmpty)
              ListTile(
                leading: Icon(Icons.delete_outline_rounded,
                    color: theme.colorScheme.error),
                title: Text('Clear History',
                    style: TextStyle(color: theme.colorScheme.error)),
                onTap: () {
                  transferProvider.clearHistory();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('History cleared')),
                  );
                },
              ),
          ]),

          // Connection info
          Consumer<ConnectionProvider>(
            builder: (_, conn, __) => _buildSection(context, 'Connection', [
              ListTile(
                leading: Icon(
                  conn.connected
                      ? Icons.wifi_rounded
                      : Icons.wifi_off_rounded,
                  color: conn.connected ? Colors.green : Colors.red,
                ),
                title: Text(
                  conn.connected ? 'Connected' : 'Disconnected',
                ),
              ),
            ]),
          ),

          // About
          _buildSection(context, 'About', [
            const ListTile(
              leading: Icon(Icons.info_outline_rounded),
              title: Text('Drop'),
              subtitle: Text('v1.0.0 • Local network file sharing'),
            ),
          ]),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildAvatar(BuildContext context, DeviceProvider deviceProvider) {
    final device = deviceProvider.myDevice;
    if (device?.avatar != null && device!.avatar!.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: CachedNetworkImage(
          imageUrl: device.avatar!,
          width: 40,
          height: 40,
          fit: BoxFit.cover,
          errorWidget: (_, __, ___) => _buildDefaultAvatar(context),
        ),
      );
    }
    return _buildDefaultAvatar(context);
  }

  Widget _buildDefaultAvatar(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: CachedNetworkImage(
        imageUrl: defaultAvatarUrl,
        width: 40,
        height: 40,
        fit: BoxFit.cover,
        errorWidget: (_, __, ___) => Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              colors: [
                Theme.of(context).colorScheme.primary,
                Theme.of(context).colorScheme.tertiary,
              ],
            ),
          ),
          child: const Icon(Icons.person_rounded, color: Colors.white, size: 24),
        ),
      ),
    );
  }

  Widget _buildSection(
      BuildContext context, String title, List<Widget> children) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
          child: Text(
            title.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
            ),
          ),
        ),
        Card(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Column(children: children),
        ),
      ],
    );
  }

  void _showHistory(BuildContext context, TransferProvider provider) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.3,
        builder: (context, scrollController) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          return Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                // Handle
                Container(
                  margin: const EdgeInsets.only(top: 12),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withOpacity(0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Transfer History',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
                Expanded(
                  child: provider.transferHistory.isEmpty
                      ? Center(
                          child: Text(
                            'No transfers yet',
                            style: TextStyle(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withOpacity(0.4),
                            ),
                          ),
                        )
                      : ListView.builder(
                          controller: scrollController,
                          itemCount: provider.transferHistory.length,
                          itemBuilder: (context, index) {
                            final t = provider.transferHistory[
                                provider.transferHistory.length - 1 - index];
                            return _buildHistoryItem(context, t);
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHistoryItem(BuildContext context, Transfer transfer) {
    final theme = Theme.of(context);
    final isOutgoing =
        transfer.direction == TransferDirection.outgoing;

    IconData statusIcon;
    Color statusColor;
    switch (transfer.status) {
      case TransferStatus.completed:
        statusIcon = Icons.check_circle_rounded;
        statusColor = Colors.green;
        break;
      case TransferStatus.cancelled:
        statusIcon = Icons.cancel_rounded;
        statusColor = Colors.orange;
        break;
      case TransferStatus.failed:
        statusIcon = Icons.error_rounded;
        statusColor = Colors.red;
        break;
      default:
        statusIcon = Icons.radio_button_unchecked;
        statusColor = Colors.grey;
    }

    return ListTile(
      leading: Icon(
        isOutgoing
            ? Icons.upload_rounded
            : Icons.download_rounded,
        color: theme.colorScheme.primary,
      ),
      title: Text(
        transfer.fileName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        '${formatBytes(transfer.fileSize)} • ${transfer.peerName}',
      ),
      trailing: Icon(statusIcon, color: statusColor, size: 20),
    );
  }

  Widget _buildThemeTile(
    BuildContext context,
    String title,
    IconData icon,
    ThemeMode mode,
    ThemeProvider themeProvider,
  ) {
    final isSelected = themeProvider.themeMode == mode;
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      trailing: isSelected
          ? Icon(Icons.check_rounded, color: Theme.of(context).colorScheme.primary)
          : null,
      onTap: () => themeProvider.setTheme(mode),
    );
  }
}
