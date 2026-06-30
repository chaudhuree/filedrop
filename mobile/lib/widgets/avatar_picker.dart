import 'package:flutter/material.dart';
import '../utils/constants.dart';
import 'package:cached_network_image/cached_network_image.dart';

class AvatarPicker extends StatelessWidget {
  final String? selectedAvatar;
  final Function(String) onAvatarSelected;

  const AvatarPicker({
    super.key,
    this.selectedAvatar,
    required this.onAvatarSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Select Avatar',
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),

        // Female
        _buildCategory(theme, 'Female', femaleAvatars),
        const SizedBox(height: 12),

        // Male
        _buildCategory(theme, 'Male', maleAvatars),
        const SizedBox(height: 12),

        // Devices
        _buildCategory(theme, 'Devices', deviceAvatars),
      ],
    );
  }

  Widget _buildCategory(
      ThemeData theme, String label, Map<String, String> avatars) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurface.withOpacity(0.5),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1,
          ),
          itemCount: avatars.length,
          itemBuilder: (context, index) {
            final url = avatars.values.elementAt(index);
            final isSelected = selectedAvatar == url;

            return GestureDetector(
              onTap: () => onAvatarSelected(url),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.outline.withOpacity(0.2),
                    width: isSelected ? 2.5 : 1,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color:
                                theme.colorScheme.primary.withOpacity(0.25),
                            blurRadius: 8,
                          ),
                        ]
                      : null,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(11),
                  child: CachedNetworkImage(
                    imageUrl: url,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(
                      color: theme.colorScheme.surfaceContainerHighest,
                    ),
                    errorWidget: (_, __, ___) => Icon(
                      Icons.person_rounded,
                      color: theme.colorScheme.onSurface.withOpacity(0.3),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}
