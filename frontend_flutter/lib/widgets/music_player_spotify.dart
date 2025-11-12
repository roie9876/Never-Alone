import 'package:flutter/material.dart';
import 'package:spotify_sdk/spotify_sdk.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Spotify Premium music player using Web Playback SDK
/// 
/// This player uses Spotify Premium account for full song playback:
/// - No 30-second preview limitation
/// - No advertisements
/// - Full playback control (play, pause, seek)
/// - High quality audio
/// 
/// Requires: Spotify Premium account with OAuth tokens configured
class MusicPlayerSpotify extends StatefulWidget {
  final String trackId;
  final String songTitle;
  final String artistName;
  final String? albumArt;
  final String spotifyUrl;
  final int? durationMs;
  final String reason;
  
  const MusicPlayerSpotify({
    Key? key,
    required this.trackId,
    required this.songTitle,
    required this.artistName,
    this.albumArt,
    required this.spotifyUrl,
    this.durationMs,
    required this.reason,
  }) : super(key: key);
  
  @override
  State<MusicPlayerSpotify> createState() => _MusicPlayerSpotifyState();
}

class _MusicPlayerSpotifyState extends State<MusicPlayerSpotify> {
  bool _isPlaying = false;
  bool _isLoading = true;
  bool _isConnected = false;
  String? _errorMessage;
  int _positionMs = 0;
  DateTime? _startTime;
  
  @override
  void initState() {
    super.initState();
    _startTime = DateTime.now();
    _connectAndPlay();
  }
  
  Future<void> _connectAndPlay() async {
    debugPrint('🎵 MusicPlayerSpotify: Connecting to Spotify...');
    
    try {
      // Get Spotify credentials from backend
      final credentials = await _getSpotifyCredentials();
      
      if (credentials == null) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'לא ניתן להתחבר ל-Spotify';
        });
        return;
      }
      
      debugPrint('🎵 MusicPlayerSpotify: Credentials obtained');
      
      // Connect to Spotify Remote
      final connected = await SpotifySdk.connectToSpotifyRemote(
        clientId: credentials['clientId']!,
        redirectUrl: credentials['redirectUri']!,
      );
      
      if (!connected) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'לא ניתן להתחבר ל-Spotify';
        });
        return;
      }
      
      debugPrint('🎵 MusicPlayerSpotify: Connected to Spotify Remote');
      
      setState(() {
        _isConnected = true;
      });
      
      // Play the track
      await _playTrack();
      
    } catch (e) {
      debugPrint('🎵 MusicPlayerSpotify: ERROR - $e');
      setState(() {
        _isLoading = false;
        _errorMessage = 'שגיאה בהפעלת Spotify: $e';
      });
    }
  }
  
  Future<Map<String, String>?> _getSpotifyCredentials() async {
    try {
      final response = await http.get(
        Uri.parse('http://localhost:3000/music/spotify-credentials'),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {
          'clientId': data['clientId'] as String,
          'redirectUri': data['redirectUri'] as String,
        };
      } else {
        debugPrint('🎵 MusicPlayerSpotify: Backend error - ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('🎵 MusicPlayerSpotify: Error getting credentials - $e');
      return null;
    }
  }
  
  Future<void> _playTrack() async {
    try {
      debugPrint('🎵 MusicPlayerSpotify: Playing track ${widget.trackId}');
      
      // Play Spotify track
      await SpotifySdk.play(spotifyUri: 'spotify:track:${widget.trackId}');
      
      setState(() {
        _isLoading = false;
        _isPlaying = true;
      });
      
      debugPrint('🎵 MusicPlayerSpotify: Playback started');
      
      // Start position polling
      _startPositionPolling();
      
    } catch (e) {
      debugPrint('🎵 MusicPlayerSpotify: Error playing track - $e');
      setState(() {
        _isLoading = false;
        _errorMessage = 'שגיאה בהפעלת השיר';
      });
    }
  }
  
  void _startPositionPolling() {
    // Poll playback position every second
    Future.doWhile(() async {
      if (!mounted || !_isConnected) return false;
      
      try {
        final playerState = await SpotifySdk.getPlayerState();
        
        if (playerState != null) {
          setState(() {
            _positionMs = playerState.playbackPosition;
            _isPlaying = !playerState.isPaused;
          });
          
          // Check if track finished
          if (widget.durationMs != null && 
              _positionMs >= widget.durationMs! - 1000) {
            debugPrint('🎵 MusicPlayerSpotify: Track finished');
            _onClose();
            return false;
          }
        }
        
        await Future.delayed(const Duration(seconds: 1));
        return true;
      } catch (e) {
        debugPrint('🎵 MusicPlayerSpotify: Error polling position - $e');
        return false;
      }
    });
  }
  
  Future<void> _togglePlayPause() async {
    try {
      if (_isPlaying) {
        await SpotifySdk.pause();
        debugPrint('🎵 MusicPlayerSpotify: Paused');
      } else {
        await SpotifySdk.resume();
        debugPrint('🎵 MusicPlayerSpotify: Resumed');
      }
      
      setState(() {
        _isPlaying = !_isPlaying;
      });
    } catch (e) {
      debugPrint('🎵 MusicPlayerSpotify: Error toggling playback - $e');
    }
  }
  
  Future<void> _seekTo(int positionMs) async {
    try {
      await SpotifySdk.seekTo(positionedMilliseconds: positionMs);
      setState(() {
        _positionMs = positionMs;
      });
      debugPrint('🎵 MusicPlayerSpotify: Seeked to $positionMs ms');
    } catch (e) {
      debugPrint('🎵 MusicPlayerSpotify: Error seeking - $e');
    }
  }
  
  void _onClose() {
    // Calculate playback duration
    if (_startTime != null) {
      final playbackDuration = DateTime.now().difference(_startTime!);
      debugPrint('🎵 MusicPlayerSpotify: Played for ${playbackDuration.inSeconds} seconds');
      
      // Send playback duration to backend for analytics
      _sendPlaybackDuration(playbackDuration.inSeconds);
    }
    
    // Disconnect from Spotify
    SpotifySdk.disconnect();
    
    Navigator.of(context).pop();
  }
  
  Future<void> _sendPlaybackDuration(int durationSeconds) async {
    try {
      await http.post(
        Uri.parse('http://localhost:3000/music/playback-duration'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'trackId': widget.trackId,
          'durationSeconds': durationSeconds,
        }),
      );
    } catch (e) {
      debugPrint('🎵 MusicPlayerSpotify: Error sending duration - $e');
    }
  }
  
  @override
  void dispose() {
    SpotifySdk.disconnect();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    
    return Material(
      color: Colors.black87,
      child: Stack(
        children: [
          // Close button
          Positioned(
            top: 40,
            right: 40,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 40),
              onPressed: _onClose,
              tooltip: 'סגור',
            ),
          ),
          
          // Main content
          Center(
            child: Container(
              width: size.width * 0.7,
              padding: const EdgeInsets.all(48),
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
                  // Album art or music icon
                  if (widget.albumArt != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        widget.albumArt!,
                        width: 200,
                        height: 200,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return _buildMusicIcon(theme);
                        },
                      ),
                    )
                  else
                    _buildMusicIcon(theme),
                  
                  const SizedBox(height: 32),
                  
                  // Song title
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
                  
                  const SizedBox(height: 8),
                  
                  // Spotify logo
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.music_note,
                        size: 16,
                        color: Colors.green.shade600,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Spotify',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.green.shade600,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 32),
                  
                  // Progress bar
                  if (!_isLoading && _errorMessage == null && widget.durationMs != null) ...[
                    Column(
                      children: [
                        SliderTheme(
                          data: SliderThemeData(
                            trackHeight: 6,
                            thumbShape: const RoundSliderThumbShape(
                              enabledThumbRadius: 12,
                            ),
                            overlayShape: const RoundSliderOverlayShape(
                              overlayRadius: 24,
                            ),
                          ),
                          child: Slider(
                            value: _positionMs.toDouble(),
                            max: widget.durationMs!.toDouble(),
                            onChanged: (value) async {
                              await _seekTo(value.toInt());
                            },
                          ),
                        ),
                        
                        // Time labels
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _formatDurationMs(_positionMs),
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: Colors.black54,
                                ),
                              ),
                              Text(
                                _formatDurationMs(widget.durationMs!),
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: Colors.black54,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 32),
                  ],
                  
                  // Loading indicator
                  if (_isLoading) ...[
                    CircularProgressIndicator(
                      strokeWidth: 3,
                      color: Colors.green.shade600,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'מתחבר ל-Spotify...',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.black54,
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                  
                  // Error message
                  if (_errorMessage != null) ...[
                    Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Colors.red.shade300,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _errorMessage!,
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: Colors.red.shade700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 32),
                  ],
                  
                  // Control buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
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
                      
                      const SizedBox(width: 24),
                      
                      // Play/Pause button
                      if (!_isLoading && _errorMessage == null)
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
                            backgroundColor: Colors.green.shade600,
                            foregroundColor: Colors.white,
                          ),
                        ),
                    ],
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Context label
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
  
  Widget _buildMusicIcon(ThemeData theme) {
    return Container(
      width: 200,
      height: 200,
      decoration: BoxDecoration(
        color: Colors.green.shade600.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Icon(
        Icons.music_note,
        size: 100,
        color: Colors.green.shade600,
      ),
    );
  }
  
  String _formatDurationMs(int durationMs) {
    final seconds = (durationMs / 1000).floor();
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    return '${minutes}:${remainingSeconds.toString().padLeft(2, '0')}';
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
