import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';

/// macOS-compatible music player using WebView
/// 
/// This replaces youtube_player_iframe which doesn't work properly on macOS desktop.
/// Uses WebView with YouTube IFrame API for reliable playback.
/// 
/// Shows a full-screen semi-transparent overlay with:
/// - YouTube player (WebView-based, works on macOS)
/// - Song title and artist in Hebrew
/// - Large accessible control buttons (elderly-friendly)
/// - Hebrew labels: עצור (Stop), השהה (Pause), נגן (Play)
/// 
/// Triggered by WebSocket 'play-music' events from backend.
class MusicPlayerWebView extends StatefulWidget {
  final String videoId;
  final String songTitle;
  final String artistName;
  final String reason; // 'user_requested', 'sadness_detected', 'celebration', etc.
  
  const MusicPlayerWebView({
    Key? key,
    required this.videoId,
    required this.songTitle,
    required this.artistName,
    required this.reason,
  }) : super(key: key);
  
  @override
  State<MusicPlayerWebView> createState() => _MusicPlayerWebViewState();
}

class _MusicPlayerWebViewState extends State<MusicPlayerWebView> {
  late WebViewController _controller;
  bool _isPlaying = true;
  bool _isLoading = true;
  Duration _playbackDuration = Duration.zero;
  DateTime? _startTime;
  
  @override
  void initState() {
    super.initState();
    _startTime = DateTime.now();
    _initializePlayer();
  }
  
  void _initializePlayer() {
    debugPrint('🎵 MusicPlayerWebView: Initializing player for video ${widget.videoId}');
    
    // Create WebView controller
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            debugPrint('🎵 MusicPlayerWebView: Page loaded');
            setState(() {
              _isLoading = false;
            });
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('🎵 MusicPlayerWebView: ERROR - ${error.description}');
          },
        ),
      )
      ..addJavaScriptChannel(
        'FlutterChannel',
        onMessageReceived: (JavaScriptMessage message) {
          debugPrint('🎵 MusicPlayerWebView: Message from JS - ${message.message}');
          
          // Handle player state changes from JavaScript
          final data = jsonDecode(message.message);
          if (data['event'] == 'onReady') {
            debugPrint('🎵 MusicPlayerWebView: Player ready, starting playback');
            setState(() {
              _isLoading = false;
            });
          } else if (data['event'] == 'onStateChange') {
            final state = data['state'];
            debugPrint('🎵 MusicPlayerWebView: Player state: $state');
            
            // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
            if (state == 1) {
              setState(() {
                _isPlaying = true;
                _isLoading = false;
              });
            } else if (state == 2) {
              setState(() {
                _isPlaying = false;
              });
            } else if (state == 0) {
              // Video ended
              debugPrint('🎵 MusicPlayerWebView: Playback ended');
              _onClose();
            }
          } else if (data['event'] == 'onError') {
            // YouTube embed error - open in system browser instead
            final error = data['error'];
            debugPrint('🎵 MusicPlayerWebView: Embed error $error - opening in browser');
            _openInBrowser();
          }
        },
      );
    
    // Load YouTube player HTML
    _loadYouTubePlayer();
  }
  
  void _loadYouTubePlayer() {
    final html = '''
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: black;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        #player {
          width: 100%;
          max-width: 640px;
          aspect-ratio: 16/9;
        }
      </style>
    </head>
    <body>
      <div id="player"></div>
      
      <script src="https://www.youtube.com/iframe_api"></script>
      <script>
        var player;
        
        function onYouTubeIframeAPIReady() {
          console.log('YouTube IFrame API ready');
          
          player = new YT.Player('player', {
            videoId: '${widget.videoId}',
            playerVars: {
              'autoplay': 1,
              'controls': 1,
              'rel': 0,
              'modestbranding': 1,
              'fs': 0,
              'playsinline': 1
            },
            events: {
              'onReady': onPlayerReady,
              'onStateChange': onPlayerStateChange,
              'onError': onPlayerError
            }
          });
        }
        
        function onPlayerReady(event) {
          console.log('Player ready');
          FlutterChannel.postMessage(JSON.stringify({event: 'onReady'}));
          event.target.playVideo();
        }
        
        function onPlayerStateChange(event) {
          console.log('Player state change: ' + event.data);
          FlutterChannel.postMessage(JSON.stringify({
            event: 'onStateChange',
            state: event.data
          }));
        }
        
        function onPlayerError(event) {
          console.error('Player error: ' + event.data);
          FlutterChannel.postMessage(JSON.stringify({
            event: 'onError',
            error: event.data
          }));
        }
        
        // Functions to control player from Flutter
        function playVideo() {
          if (player && player.playVideo) {
            player.playVideo();
          }
        }
        
        function pauseVideo() {
          if (player && player.pauseVideo) {
            player.pauseVideo();
          }
        }
        
        function stopVideo() {
          if (player && player.stopVideo) {
            player.stopVideo();
          }
        }
      </script>
    </body>
    </html>
    ''';
    
    _controller.loadHtmlString(html);
  }
  
  void _togglePlayPause() {
    debugPrint('🎵 MusicPlayerWebView: Toggle play/pause');
    
    if (_isPlaying) {
      _controller.runJavaScript('pauseVideo()');
      debugPrint('🎵 MusicPlayerWebView: Paused');
    } else {
      _controller.runJavaScript('playVideo()');
      debugPrint('🎵 MusicPlayerWebView: Resumed');
    }
    
    setState(() {
      _isPlaying = !_isPlaying;
    });
  }
  
  Future<void> _openInBrowser() async {
    final url = Uri.parse('https://www.youtube.com/watch?v=${widget.videoId}');
    debugPrint('🎵 MusicPlayerWebView: Opening in browser: $url');
    
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
      // Close the player overlay since we're opening externally
      if (mounted) {
        Navigator.of(context).pop();
      }
    } else {
      debugPrint('🎵 MusicPlayerWebView: ERROR - Cannot launch URL');
      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('לא ניתן לפתוח את הסרטון'),
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }
  
  void _onClose() {
    // Stop playback
    _controller.runJavaScript('stopVideo()');
    
    // Calculate playback duration
    if (_startTime != null) {
      _playbackDuration = DateTime.now().difference(_startTime!);
      debugPrint('🎵 MusicPlayerWebView: Played for ${_playbackDuration.inSeconds} seconds');
      
      // TODO: Send playback duration to backend for analytics
    }
    
    Navigator.of(context).pop();
  }
  
  @override
  void dispose() {
    debugPrint('🎵 MusicPlayerWebView: Disposing');
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    
    return Material(
      color: Colors.black87, // Semi-transparent background
      child: Stack(
        children: [
          // Close button (top-right)
          Positioned(
            top: 40,
            right: 40,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 40),
              onPressed: _onClose,
              tooltip: 'סגור', // Close
            ),
          ),
          
          // Main content (centered)
          Center(
            child: Container(
              width: size.width * 0.8,
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.95),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Song title (large, bold)
                  Text(
                    widget.songTitle,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Artist name
                  Text(
                    widget.artistName,
                    style: theme.textTheme.titleLarge?.copyWith(
                      color: Colors.black54,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // WebView player
                  SizedBox(
                    height: 360,
                    width: 640,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: _isLoading
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  CircularProgressIndicator(
                                    color: theme.colorScheme.primary,
                                    strokeWidth: 3,
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'טוען נגן...',
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      color: Colors.black54,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : WebViewWidget(controller: _controller),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Control buttons
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 16,
                    runSpacing: 16,
                    children: [
                      // Stop button
                      ElevatedButton.icon(
                        onPressed: _onClose,
                        icon: const Icon(Icons.stop, size: 32),
                        label: const Text(
                          'עצור',
                          style: TextStyle(fontSize: 20),
                        ),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 32,
                            vertical: 16,
                          ),
                          backgroundColor: Colors.red.shade400,
                          foregroundColor: Colors.white,
                        ),
                      ),
                      
                      // Play/Pause button
                      ElevatedButton.icon(
                        onPressed: _togglePlayPause,
                        icon: Icon(
                          _isPlaying ? Icons.pause : Icons.play_arrow,
                          size: 32,
                        ),
                        label: Text(
                          _isPlaying ? 'השהה' : 'נגן',
                          style: const TextStyle(fontSize: 20),
                        ),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 32,
                            vertical: 16,
                          ),
                          backgroundColor: theme.colorScheme.primary,
                          foregroundColor: Colors.white,
                        ),
                      ),
                      
                      // Open in browser button (fallback if embed fails)
                      OutlinedButton.icon(
                        onPressed: _openInBrowser,
                        icon: const Icon(Icons.open_in_browser, size: 28),
                        label: const Text(
                          'פתח ביוטיוב',
                          style: TextStyle(fontSize: 18),
                        ),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 16,
                          ),
                          side: BorderSide(color: theme.colorScheme.primary, width: 2),
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Context label (why music is playing)
                  Text(
                    _getReasonLabel(),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.black45,
                      fontStyle: FontStyle.italic,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  String _getReasonLabel() {
    switch (widget.reason) {
      case 'user_requested':
        return 'נגן לפי בקשתך';
      case 'sadness_detected':
        return 'מוזיקה להרגעה';
      case 'celebration':
        return 'שיר לחגיגה!';
      case 'therapeutic':
        return 'מוזיקה טיפולית';
      default:
        return 'מוזיקה מיוחדת בשבילך';
    }
  }
}
