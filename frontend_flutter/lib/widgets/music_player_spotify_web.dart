import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'dart:async';

/// Spotify Web Player for macOS (uses Spotify Web Player in WebView)
/// Reuses same player instance to avoid multiple songs playing
class MusicPlayerSpotifyWeb extends StatefulWidget {
  final String spotifyUrl;
  final String songTitle;
  final String artistName;
  final String? reason;

  const MusicPlayerSpotifyWeb({
    super.key,
    required this.spotifyUrl,
    required this.songTitle,
    required this.artistName,
    this.reason,
  });

  @override
  State<MusicPlayerSpotifyWeb> createState() => _MusicPlayerSpotifyWebState();
}

class _MusicPlayerSpotifyWebState extends State<MusicPlayerSpotifyWeb> {
  late WebViewController _controller;
  bool _isLoading = true;
  
  @override
  void initState() {
    super.initState();
    
    debugPrint('🎵 MusicPlayerSpotifyWeb: Loading ${widget.spotifyUrl}');
    
    // Initialize WebView controller
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            debugPrint('🎵 MusicPlayerSpotifyWeb: Page started loading: $url');
          },
          onPageFinished: (String url) {
            debugPrint('🎵 MusicPlayerSpotifyWeb: Page finished loading: $url');
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('❌ MusicPlayerSpotifyWeb: Error loading page: ${error.description}');
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.spotifyUrl));
  }
  
  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.black,
      insetPadding: const EdgeInsets.all(40),
      child: Container(
        constraints: const BoxConstraints(
          maxWidth: 800,
          maxHeight: 600,
        ),
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header with close button
            _buildHeader(),
            
            // WebView content
            Expanded(
              child: Stack(
                children: [
                  // Spotify Web Player
                  ClipRRect(
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                    child: WebViewWidget(controller: _controller),
                  ),
                  
                  // Loading indicator
                  if (_isLoading)
                    Container(
                      color: Colors.black87,
                      child: const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(
                              color: Color(0xFF1DB954), // Spotify green
                            ),
                            SizedBox(height: 16),
                            Text(
                              'טוען נגן ספוטיפיי...',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                              ),
                              textDirection: TextDirection.rtl,
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Color(0xFF1DB954), // Spotify green
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(16),
          topRight: Radius.circular(16),
        ),
      ),
      child: Row(
        children: [
          // Song info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.songTitle,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textDirection: TextDirection.rtl,
                ),
                const SizedBox(height: 4),
                Text(
                  widget.artistName,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 16,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textDirection: TextDirection.rtl,
                ),
              ],
            ),
          ),
          
          // Close button
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white, size: 32),
            onPressed: () {
              debugPrint('🎵 MusicPlayerSpotifyWeb: User closed player');
              Navigator.of(context).pop();
            },
            tooltip: 'סגור',
          ),
        ],
      ),
    );
  }
}
