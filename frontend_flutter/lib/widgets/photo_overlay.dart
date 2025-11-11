import 'package:flutter/material.dart';

class PhotoOverlay extends StatelessWidget {
  final String photoUrl;
  final String? caption;
  final VoidCallback onClose;

  const PhotoOverlay({
    super.key,
    required this.photoUrl,
    this.caption,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black.withOpacity(0.9),
      child: Stack(
        children: [
          // Photo
          Center(
            child: Image.network(
              photoUrl,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return const Text(
                  'Failed to load photo',
                  style: TextStyle(color: Colors.white, fontSize: 24),
                );
              },
            ),
          ),
          
          // Caption
          if (caption != null)
            Positioned(
              bottom: 40,
              left: 20,
              right: 20,
              child: Text(
                caption!,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  shadows: [
                    Shadow(
                      offset: Offset(0, 1),
                      blurRadius: 4,
                      color: Colors.black,
                    ),
                  ],
                ),
                textAlign: TextAlign.center,
              ),
            ),
          
          // Close button
          Positioned(
            top: 20,
            right: 20,
            child: IconButton(
              icon: const Icon(Icons.close, size: 40, color: Colors.white),
              onPressed: onClose,
            ),
          ),
        ],
      ),
    );
  }
}
