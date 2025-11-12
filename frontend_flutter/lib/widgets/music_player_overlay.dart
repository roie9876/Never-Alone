import 'package:flutter/material.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

/// Music player overlay for displaying YouTube videos during conversation
/// 
/// Shows a full-screen semi-transparent overlay with:
/// - YouTube player (audio-focused, minimal UI)
/// - Song title and artist in Hebrew
/// - Large accessible control buttons (elderly-friendly)
/// - Hebrew labels: עצור (Stop), השהה (Pause), נגן (Play)
/// - Auto-dismiss after playback complete (optional)
/// 
/// Triggered by WebSocket 'play-music' events from backend when:
/// - User explicitly requests music ("תנגן ירושלים של זהב")
/// - AI detects sadness and suggests therapeutic music
/// - Conversation context indicates music would be appropriate
class MusicPlayerOverlay extends StatefulWidget {
  final String videoId;
  final String songTitle;
  final String artistName;
  final String reason; // 'user_requested', 'sadness_detected', 'celebration', etc.
  
  const MusicPlayerOverlay({
    Key? key,
    required this.videoId,
    required this.songTitle,
    required this.artistName,
    required this.reason,
  }) : super(key: key);
  
  @override
  State<MusicPlayerOverlay> createState() => _MusicPlayerOverlayState();
}

class _MusicPlayerOverlayState extends State<MusicPlayerOverlay> {
  late YoutubePlayerController _controller;
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
    debugPrint('🎵 MusicPlayerOverlay: Initializing player for video ${widget.videoId}');
    
    _controller = YoutubePlayerController(
      params: const YoutubePlayerParams(
        showControls: true, // Enable controls to help debug and play
        showFullscreenButton: false,
        mute: false,
        loop: false,
        enableCaption: false,
        strictRelatedVideos: true,
        autoPlay: true, // Ensure auto-play is enabled
      ),
    );
    
    // Load video
    _controller.loadVideoById(videoId: widget.videoId);
    
    // Listen to player state
    _controller.listen((event) {
      debugPrint('🎵 MusicPlayerOverlay: Player state changed to ${event.playerState}');
      
      if (event.playerState == PlayerState.playing && _isLoading) {
        setState(() {
          _isLoading = false;
        });
        debugPrint('🎵 MusicPlayerOverlay: Playback started');
      } else if (event.playerState == PlayerState.ended) {
        debugPrint('🎵 MusicPlayerOverlay: Playback ended');
        _onClose();
      } else if (event.playerState == PlayerState.buffering) {
        debugPrint('🎵 MusicPlayerOverlay: Buffering...');
      } else if (event.playerState == PlayerState.cued) {
        debugPrint('🎵 MusicPlayerOverlay: Video cued');
      } else if (event.hasError) {
        debugPrint('🎵 MusicPlayerOverlay: ERROR - ${event.error}');
      }
    });
  }
  
  void _togglePlayPause() {
    setState(() {
      if (_isPlaying) {
        _controller.pauseVideo();
        debugPrint('🎵 MusicPlayerOverlay: Paused');
      } else {
        _controller.playVideo();
        debugPrint('🎵 MusicPlayerOverlay: Resumed');
      }
      _isPlaying = !_isPlaying;
    });
  }
  
  void _onClose() {
    // Calculate playback duration
    if (_startTime != null) {
      _playbackDuration = DateTime.now().difference(_startTime!);
      debugPrint('🎵 MusicPlayerOverlay: Played for ${_playbackDuration.inSeconds} seconds');
      
      // TODO: Send playback duration to backend for analytics
      // This helps track which songs users enjoy (longer playback = more engagement)
    }
    
    Navigator.of(context).pop();
  }
  
  @override
  void dispose() {
    _controller.close();
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
                  
                  // YouTube player (sized properly for loading, but hidden from view)
                  // YouTube iframe requires minimum dimensions to initialize properly
                  SizedBox(
                    height: 180, // Minimum height for YouTube player to work
                    width: 320,  // Minimum width for YouTube player to work
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: YoutubePlayer(
                        controller: _controller,
                        aspectRatio: 16 / 9,
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Loading indicator
                  if (_isLoading)
                    Column(
                      children: [
                        const CircularProgressIndicator(),
                        const SizedBox(height: 16),
                        Text(
                          'טוען...',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: Colors.black54,
                          ),
                        ),
                      ],
                    ),
                  
                  // Control buttons (large and accessible)
                  if (!_isLoading) ...[
                    const SizedBox(height: 32),
                    
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Stop button
                        _buildControlButton(
                          icon: Icons.stop,
                          label: 'עצור', // Stop
                          color: Colors.red,
                          onPressed: _onClose,
                        ),
                        
                        const SizedBox(width: 24),
                        
                        // Play/Pause button
                        _buildControlButton(
                          icon: _isPlaying ? Icons.pause : Icons.play_arrow,
                          label: _isPlaying ? 'השהה' : 'נגן', // Pause / Play
                          color: Colors.blue,
                          onPressed: _togglePlayPause,
                        ),
                      ],
                    ),
                  ],
                  
                  // Context indicator (why music is playing)
                  const SizedBox(height: 24),
                  _buildContextIndicator(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  /// Build large accessible control button
  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 40),
      label: Text(
        label,
        style: const TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
        ),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        elevation: 4,
      ),
    );
  }
  
  /// Build context indicator (why music is playing)
  Widget _buildContextIndicator() {
    String contextText;
    IconData contextIcon;
    Color contextColor;
    
    switch (widget.reason) {
      case 'user_requested':
        contextText = 'מנגן לפי הבקשה שלך'; // Playing by your request
        contextIcon = Icons.music_note;
        contextColor = Colors.blue;
        break;
      case 'sadness_detected':
        contextText = 'מוזיקה מרגיעה כדי לשפר את המצב רוח'; // Calming music to improve mood
        contextIcon = Icons.favorite;
        contextColor = Colors.pink;
        break;
      case 'celebration':
        contextText = 'בואו נחגוג ביחד!'; // Let's celebrate together!
        contextIcon = Icons.celebration;
        contextColor = Colors.orange;
        break;
      case 'background_music':
        contextText = 'מוזיקת רקע נעימה'; // Pleasant background music
        contextIcon = Icons.headphones;
        contextColor = Colors.green;
        break;
      default:
        contextText = 'מנגן מוזיקה'; // Playing music
        contextIcon = Icons.music_note;
        contextColor = Colors.blue;
    }
    
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(contextIcon, color: contextColor, size: 20),
        const SizedBox(width: 8),
        Text(
          contextText,
          style: TextStyle(
            fontSize: 16,
            color: Colors.black54,
            fontStyle: FontStyle.italic,
          ),
        ),
      ],
    );
  }
}
