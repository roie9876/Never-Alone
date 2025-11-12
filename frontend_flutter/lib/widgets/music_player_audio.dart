import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Audio-only music player using direct audio stream
/// 
/// This player extracts audio-only stream from YouTube and plays it directly
/// in the app without ads, embed restrictions, or browser switching.
/// 
/// Benefits:
/// - No YouTube ads/commercials
/// - Plays inside app (no browser)
/// - No embed restrictions
/// - Lighter weight (audio-only)
/// - Better for elderly users (consistent UI)
class MusicPlayerAudio extends StatefulWidget {
  final String videoId;
  final String songTitle;
  final String artistName;
  final String reason;
  
  const MusicPlayerAudio({
    Key? key,
    required this.videoId,
    required this.songTitle,
    required this.artistName,
    required this.reason,
  }) : super(key: key);
  
  @override
  State<MusicPlayerAudio> createState() => _MusicPlayerAudioState();
}

class _MusicPlayerAudioState extends State<MusicPlayerAudio> {
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isPlaying = false;
  bool _isLoading = true;
  String? _errorMessage;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  DateTime? _startTime;
  
  @override
  void initState() {
    super.initState();
    _startTime = DateTime.now();
    _initializePlayer();
    _setupListeners();
  }
  
  void _setupListeners() {
    // Listen to player state changes
    _audioPlayer.onPlayerStateChanged.listen((state) {
      if (mounted) {
        setState(() {
          _isPlaying = state == PlayerState.playing;
          if (state == PlayerState.completed) {
            debugPrint('🎵 MusicPlayerAudio: Playback completed');
            _onClose();
          }
        });
      }
    });
    
    // Listen to position changes
    _audioPlayer.onPositionChanged.listen((position) {
      if (mounted) {
        setState(() {
          _position = position;
        });
      }
    });
    
    // Listen to duration changes
    _audioPlayer.onDurationChanged.listen((duration) {
      if (mounted) {
        setState(() {
          _duration = duration;
          if (_isLoading && duration > Duration.zero) {
            _isLoading = false;
          }
        });
      }
    });
  }
  
  Future<void> _initializePlayer() async {
    debugPrint('🎵 MusicPlayerAudio: Initializing player for video ${widget.videoId}');
    
    try {
      // Get audio stream URL from backend
      final audioUrl = await _getAudioStreamUrl(widget.videoId);
      
      if (audioUrl == null) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'לא ניתן למצוא את השיר';
        });
        return;
      }
      
      debugPrint('🎵 MusicPlayerAudio: Playing audio stream');
      
      // Play audio stream
      await _audioPlayer.play(UrlSource(audioUrl));
      
      setState(() {
        _isLoading = false;
        _isPlaying = true;
      });
      
      debugPrint('🎵 MusicPlayerAudio: Playback started');
    } catch (e) {
      debugPrint('🎵 MusicPlayerAudio: ERROR - $e');
      setState(() {
        _isLoading = false;
        _errorMessage = 'שגיאה בהפעלת המוזיקה';
      });
    }
  }
  
  Future<String?> _getAudioStreamUrl(String videoId) async {
    try {
      // Call backend endpoint to get audio stream URL
      final response = await http.get(
        Uri.parse('http://localhost:3000/music/audio-stream/$videoId'),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['audioUrl'] as String?;
      } else {
        debugPrint('🎵 MusicPlayerAudio: Backend error - ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('🎵 MusicPlayerAudio: Error getting audio URL - $e');
      return null;
    }
  }
  
  Future<void> _togglePlayPause() async {
    if (_isPlaying) {
      await _audioPlayer.pause();
      debugPrint('🎵 MusicPlayerAudio: Paused');
    } else {
      await _audioPlayer.resume();
      debugPrint('🎵 MusicPlayerAudio: Resumed');
    }
  }
  
  void _onClose() {
    // Calculate playback duration
    if (_startTime != null) {
      final playbackDuration = DateTime.now().difference(_startTime!);
      debugPrint('🎵 MusicPlayerAudio: Played for ${playbackDuration.inSeconds} seconds');
      
      // TODO: Send playback duration to backend for analytics
    }
    
    Navigator.of(context).pop();
  }
  
  @override
  void dispose() {
    _audioPlayer.dispose();
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
                  // Music icon
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withOpacity(0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.music_note,
                      size: 64,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  
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
                  
                  const SizedBox(height: 32),
                  
                  // Progress bar
                  if (!_isLoading && _errorMessage == null) ...[
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
                            value: _position.inSeconds.toDouble(),
                            max: _duration.inSeconds.toDouble().clamp(1, double.infinity),
                            onChanged: (value) async {
                              await _audioPlayer.seek(Duration(seconds: value.toInt()));
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
                                _formatDuration(_position),
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: Colors.black54,
                                ),
                              ),
                              Text(
                                _formatDuration(_duration),
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
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'טוען מוזיקה...',
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
                            backgroundColor: theme.colorScheme.primary,
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
  
  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes}:${seconds.toString().padLeft(2, '0')}';
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
