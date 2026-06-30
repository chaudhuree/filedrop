import 'dart:math';
import 'package:flutter/material.dart';

class EmptyState extends StatefulWidget {
  final bool connected;
  final bool searching;

  const EmptyState({
    super.key,
    required this.connected,
    this.searching = true,
  });

  @override
  State<EmptyState> createState() => _EmptyStateState();
}

class _EmptyStateState extends State<EmptyState>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _rippleController;
  late AnimationController _rotateController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _rippleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    _rotateController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3000),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _rippleController.dispose();
    _rotateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!widget.connected) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 80,
              height: 80,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Connecting to network...',
              style: theme.textTheme.titleMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Please wait while we connect',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
            ),
          ],
        ),
      );
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 160,
            height: 160,
            child: AnimatedBuilder(
              animation: Listenable.merge([
                _pulseController,
                _rippleController,
                _rotateController,
              ]),
              builder: (context, child) {
                return CustomPaint(
                  painter: _RadarPainter(
                    pulseValue: _pulseController.value,
                    rippleValue: _rippleController.value,
                    rotateValue: _rotateController.value,
                    primaryColor: theme.colorScheme.primary,
                  ),
                  child: Center(
                    child: AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, child) {
                        final scale =
                            1.0 + (_pulseController.value * 0.1);
                        return Transform.scale(
                          scale: scale,
                          child: Container(
                            width: 56,
                            height: 56,
                            decoration: BoxDecoration(
                              color: theme.colorScheme.primaryContainer
                                  .withValues(alpha: 0.4),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: theme.colorScheme.primary
                                      .withValues(
                                          alpha: 0.3 * _pulseController.value),
                                  blurRadius: 20,
                                  spreadRadius: 5,
                                ),
                              ],
                            ),
                            child: Icon(
                              Icons.wifi_find_rounded,
                              size: 28,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 32),
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final dotCount =
                  ((_pulseController.value * 4) % 4).floor();
              final dots = '.' * (dotCount + 1);
              return Text(
                'Searching for devices$dots',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  fontWeight: FontWeight.w500,
                ),
              );
            },
          ),
          const SizedBox(height: 8),
          Text(
            'Make sure other devices are on the same WiFi',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _RadarPainter extends CustomPainter {
  final double pulseValue;
  final double rippleValue;
  final double rotateValue;
  final Color primaryColor;

  _RadarPainter({
    required this.pulseValue,
    required this.rippleValue,
    required this.rotateValue,
    required this.primaryColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius = size.width / 2;

    // Draw concentric ripple circles expanding outward
    for (int i = 0; i < 3; i++) {
      final progress = (rippleValue + i / 3) % 1.0;
      final radius = maxRadius * progress;
      final opacity = (1.0 - progress) * 0.3;

      final paint = Paint()
        ..color = primaryColor.withValues(alpha: opacity)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5;

      canvas.drawCircle(center, radius, paint);
    }

    // Draw rotating scan line
    final angle = rotateValue * 2 * pi;
    final scanPaint = Paint()
      ..shader = SweepGradient(
        startAngle: angle,
        endAngle: angle + pi / 3,
        colors: [
          primaryColor.withValues(alpha: 0.0),
          primaryColor.withValues(alpha: 0.4),
        ],
        transform: GradientRotation(angle),
      ).createShader(
          Rect.fromCircle(center: center, radius: maxRadius));

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: maxRadius - 2),
      angle,
      pi / 3,
      true,
      scanPaint,
    );

    // Draw subtle cross lines
    final gridPaint = Paint()
      ..color = primaryColor.withValues(alpha: 0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5;

    canvas.drawLine(
      Offset(0, center.dy),
      Offset(size.width, center.dy),
      gridPaint,
    );
    canvas.drawLine(
      Offset(center.dx, 0),
      Offset(center.dx, size.height),
      gridPaint,
    );

    // Draw pulsing outer ring
    final ringRadius = maxRadius * (0.9 + pulseValue * 0.1);
    final ringPaint = Paint()
      ..color = primaryColor.withValues(alpha: 0.15 + pulseValue * 0.1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    canvas.drawCircle(center, ringRadius, ringPaint);
  }

  @override
  bool shouldRepaint(covariant _RadarPainter oldDelegate) =>
      oldDelegate.pulseValue != pulseValue ||
      oldDelegate.rippleValue != rippleValue ||
      oldDelegate.rotateValue != rotateValue;
}
