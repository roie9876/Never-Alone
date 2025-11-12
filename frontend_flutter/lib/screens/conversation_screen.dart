import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/app_state.dart';
import '../widgets/transcript_view.dart';
import '../widgets/audio_waveform.dart';
import '../widgets/photo_overlay.dart';
import '../widgets/music_player_spotify.dart'; // Spotify Premium player (mobile only)
import '../widgets/music_player_spotify_web.dart'; // Spotify Web Player (macOS)
import '../widgets/music_player_webview.dart'; // YouTube player (macOS compatible)
import '../services/realtime_conversation_manager.dart';
import 'dart:async';
import 'dart:io'; // For Process.run (AppleScript control)

class ConversationScreen extends StatefulWidget {
  const ConversationScreen({super.key});

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  static const String testUserId = 'user-tiferet-001'; // Tiferet Nehemiah profile
  
  // Photo display state
  List<Map<String, dynamic>> _photoQueue = [];
  bool _isShowingPhoto = false;
  Timer? _photoTimer;
  
  // Music playback state
  Map<String, dynamic>? _currentMusicData;
  bool _isMusicPlayerOpen = false;
  OverlayEntry? _musicNotificationOverlay;
  
  @override
  void initState() {
    super.initState();
    
    // Set up photo trigger callback
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final conversationManager = Provider.of<RealtimeConversationManager>(
        context,
        listen: false,
      );
      
      conversationManager.onPhotosTriggered = (photos) {
        debugPrint('📷 ConversationScreen: Received ${photos.length} photos to display');
        setState(() {
          _photoQueue.addAll(photos);
        });
        
        // Start showing photos if not already showing
        if (!_isShowingPhoto && _photoQueue.isNotEmpty) {
          _showNextPhoto();
        }
      };
      
      // Set up music playback callback
      conversationManager.onMusicPlayback = (musicData) {
        debugPrint('🎵 ConversationScreen: Music playback triggered');
        debugPrint('🎵 ConversationScreen: Music service: ${musicData['musicService']}');
        debugPrint('🎵 ConversationScreen: Track ID: ${musicData['trackId']}');
        debugPrint('🎵 ConversationScreen: Title: ${musicData['title']}');
        
        // Show music player overlay
        _showMusicPlayer(musicData);
      };
      
      // Set up stop music callback
      conversationManager.onStopMusic = (reason) {
        debugPrint('🎵🎵🎵 ConversationScreen: ===== STOP MUSIC CALLBACK TRIGGERED =====');
        debugPrint('🎵 ConversationScreen: Stop music requested - reason: $reason');
        debugPrint('🎵 ConversationScreen: Current music state: _isMusicPlayerOpen=$_isMusicPlayerOpen');
        debugPrint('🎵 ConversationScreen: Current music data: $_currentMusicData');
        _stopSpotifyPlayback(reason);
      };
    });
  }
  
  @override
  void dispose() {
    _photoTimer?.cancel();
    _musicNotificationOverlay?.remove();
    _musicNotificationOverlay = null;
    super.dispose();
  }
  
  /// Show next photo from queue
  void _showNextPhoto() {
    if (_photoQueue.isEmpty) {
      setState(() {
        _isShowingPhoto = false;
      });
      return;
    }
    
    setState(() {
      _isShowingPhoto = true;
    });
    
    // Auto-dismiss after 10 seconds
    _photoTimer?.cancel();
    _photoTimer = Timer(const Duration(seconds: 10), () {
      _dismissCurrentPhoto();
    });
  }
  
  /// Dismiss current photo and show next
  void _dismissCurrentPhoto() {
    setState(() {
      if (_photoQueue.isNotEmpty) {
        _photoQueue.removeAt(0);
      }
    });
    
    _photoTimer?.cancel();
    
    if (_photoQueue.isNotEmpty) {
      _showNextPhoto();
    } else {
      setState(() {
        _isShowingPhoto = false;
      });
    }
  }
  
  /// Show music player overlay - handles stopping previous song before playing new one
  void _showMusicPlayer(Map<String, dynamic> musicData) async {
    final musicService = musicData['musicService'] as String? ?? 'youtube-music';
    
    // CRITICAL: Close any existing music player FIRST (prevent multiple songs playing)
    if (_isMusicPlayerOpen) {
      debugPrint('🎵 ConversationScreen: Stopping previous music before playing new song');
      
      // Close any open dialogs (music players)
      if (Navigator.canPop(context)) {
        Navigator.pop(context);
      }
      
      // Remove notification overlay if exists
      _musicNotificationOverlay?.remove();
      _musicNotificationOverlay = null;
      
      _isMusicPlayerOpen = false;
      
      // Brief pause to allow previous player to close and stop playback
      await Future.delayed(const Duration(milliseconds: 500));
    }
    
    // For macOS: Open in Spotify desktop app using AppleScript
    if (musicService == 'spotify' && Theme.of(context).platform == TargetPlatform.macOS) {
      final spotifyUrl = musicData['spotifyUrl'] as String?;
      final trackId = musicData['trackId'] as String?;
      
      if (trackId != null) {
        final spotifyUri = 'spotify:track:$trackId';
        debugPrint('🎵 ConversationScreen: Opening Spotify track: $spotifyUri');
        
        _isMusicPlayerOpen = true;
        
        // Show notification
        _showMusicNotification(
          '${_currentMusicData != null ? "מחליף שיר" : "מפעיל מוזיקה"}...\n"${musicData['title']}"\nשל ${musicData['artist']}',
        );
        
        // Use AppleScript to launch Spotify and play track (keeps full control)
        try {
          debugPrint('🎵 Using AppleScript to play Spotify track: $spotifyUri');
          
          // AppleScript command to launch Spotify and play track
          final appleScript = '''
            tell application "Spotify"
              activate
              play track "$spotifyUri"
            end tell
          ''';
          
          final result = await Process.run('osascript', ['-e', appleScript]);
          
          if (result.exitCode == 0) {
            debugPrint('✅ Spotify track playing via AppleScript');
          } else {
            debugPrint('⚠️ AppleScript failed: ${result.stderr}');
            // Fallback to open command
            debugPrint('🎵 Fallback: Using open command');
            final openResult = await Process.run('open', [spotifyUri]);
            
            if (openResult.exitCode != 0) {
              debugPrint('⚠️ Open command also failed, trying web URL');
              // Last resort: open in web browser
              if (spotifyUrl != null && spotifyUrl.isNotEmpty) {
                final webUri = Uri.parse(spotifyUrl);
                await launchUrl(webUri, mode: LaunchMode.externalApplication);
              }
            }
          }
        } catch (e) {
          debugPrint('❌ Error playing Spotify track: $e');
          // Fallback to web browser
          if (spotifyUrl != null && spotifyUrl.isNotEmpty) {
            debugPrint('🎵 Fallback: Opening in web browser: $spotifyUrl');
            final webUri = Uri.parse(spotifyUrl);
            await launchUrl(webUri, mode: LaunchMode.externalApplication);
          }
        }
        
        // Store current track info
        _currentMusicData = musicData;
        
        // Auto-dismiss notification after 2 seconds
        Future.delayed(const Duration(seconds: 2), () {
          _musicNotificationOverlay?.remove();
          _musicNotificationOverlay = null;
        });
      }
      return;
    }
    
    // For mobile (iOS/Android): Use Spotify SDK
    if (musicService == 'spotify') {
      _isMusicPlayerOpen = true;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => WillPopScope(
          onWillPop: () async {
            _isMusicPlayerOpen = false;
            return true;
          },
          child: MusicPlayerSpotify(
            trackId: musicData['trackId'] as String,
            songTitle: musicData['title'] as String,
            artistName: musicData['artist'] as String? ?? 'Unknown Artist',
            albumArt: musicData['albumArt'] as String?,
            spotifyUrl: musicData['spotifyUrl'] as String,
            durationMs: musicData['durationMs'] as int?,
            reason: musicData['reason'] as String? ?? 'user_requested',
          ),
        ),
      );
      return;
    }
    
    // For YouTube Music: Use WebView player
    final videoId = musicData['videoId'] as String? ?? musicData['trackId'] as String?;
    if (videoId != null) {
      _isMusicPlayerOpen = true;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => WillPopScope(
          onWillPop: () async {
            _isMusicPlayerOpen = false;
            return true;
          },
          child: MusicPlayerWebView(
            videoId: videoId,
            songTitle: musicData['title'] as String,
            artistName: musicData['artist'] as String? ?? 'Unknown Artist',
            reason: musicData['reason'] as String? ?? 'user_requested',
          ),
        ),
      );
    }
  }
  
  /// Stop Spotify playback when AI requests it
  Future<void> _stopSpotifyPlayback(String reason) async {
    debugPrint('🎵🎵🎵 ConversationScreen: ===== EXECUTING STOP SPOTIFY PLAYBACK =====');
    debugPrint('🎵 ConversationScreen: Stopping Spotify - reason: $reason');
    
    try {
      // First check if Spotify is running
      final checkRunning = await Process.run('osascript', [
        '-e',
        'tell application "System Events" to (name of processes) contains "Spotify"',
      ]);
      
      final isRunning = checkRunning.stdout.toString().trim() == 'true';
      debugPrint('🎵 ConversationScreen: Spotify running check: $isRunning');
      
      if (!isRunning) {
        debugPrint('⚠️ Spotify is not running - attempting to activate...');
        
        // Activate Spotify (bring to foreground without starting playback)
        await Process.run('osascript', [
          '-e',
          'tell application "Spotify" to activate',
        ]);
        
        // Wait a moment for Spotify to fully launch
        await Future.delayed(Duration(milliseconds: 800));
      }
      
      debugPrint('🎵 ConversationScreen: Attempting AppleScript pause command...');
      
      // Use AppleScript to pause Spotify (keeps app running)
      final result = await Process.run('osascript', [
        '-e', 'tell application "Spotify" to pause'
      ]);
      
      debugPrint('🎵 ConversationScreen: AppleScript exit code: ${result.exitCode}');
      debugPrint('🎵 ConversationScreen: AppleScript stdout: ${result.stdout}');
      debugPrint('🎵 ConversationScreen: AppleScript stderr: ${result.stderr}');
      
      if (result.exitCode == 0) {
        debugPrint('✅✅✅ Spotify paused successfully!');
        
        // Update state
        setState(() {
          _isMusicPlayerOpen = false;
          _currentMusicData = null;
        });
        
        // Remove any music notification overlay
        _musicNotificationOverlay?.remove();
        _musicNotificationOverlay = null;
        
        // Show brief confirmation
        _showMusicNotification('✅ המוזיקה הופסקה');
        
        // Auto-dismiss after 1.5 seconds
        Future.delayed(const Duration(milliseconds: 1500), () {
          _musicNotificationOverlay?.remove();
          _musicNotificationOverlay = null;
        });
      } else {
        debugPrint('⚠️ Failed to pause Spotify: ${result.stderr}');
        // Show error notification
        _showMusicNotification('⚠️ לא הצלחתי לעצור את המוזיקה');
        Future.delayed(const Duration(seconds: 2), () {
          _musicNotificationOverlay?.remove();
          _musicNotificationOverlay = null;
        });
      }
    } catch (e) {
      debugPrint('❌ Error stopping Spotify: $e');
      _showMusicNotification('❌ שגיאה בעצירת המוזיקה');
      Future.delayed(const Duration(seconds: 2), () {
        _musicNotificationOverlay?.remove();
        _musicNotificationOverlay = null;
      });
    }
  }
  
  /// Show music notification overlay (non-blocking, can be replaced easily)
  void _showMusicNotification(String message) {
    // Remove existing notification if any
    _musicNotificationOverlay?.remove();
    
    // Create new overlay
    _musicNotificationOverlay = OverlayEntry(
      builder: (context) => Positioned(
        top: 100,
        left: 0,
        right: 0,
        child: Center(
          child: Material(
            color: Colors.transparent,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black26,
                    blurRadius: 10,
                    spreadRadius: 2,
                  ),
                ],
              ),
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    '🎵 מוזיקה',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                    textDirection: TextDirection.rtl,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    message,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                    ),
                    textAlign: TextAlign.center,
                    textDirection: TextDirection.rtl,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    
    // Insert overlay
    Overlay.of(context).insert(_musicNotificationOverlay!);
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: Stack(
        children: [
          // Main conversation UI
          SafeArea(
            child: Column(
              children: [
                // Header with title
                _buildHeader(),
                
                // Transcript view (scrollable)
                const Expanded(
                  child: TranscriptView(),
                ),
                
                // Audio waveform visualization
                const AudioWaveform(),
                
                // Control buttons
                _buildControls(),
              ],
            ),
          ),
          
          // Photo overlay (shown when photos triggered)
          if (_isShowingPhoto && _photoQueue.isNotEmpty)
            PhotoOverlay(
              photoUrl: _photoQueue.first['url'] ?? '',
              caption: _photoQueue.first['caption'],
              onClose: _dismissCurrentPhoto,
            ),
        ],
      ),
    );
  }
  
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'לא לבד',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.settings, size: 32),
            onPressed: () {
              // Navigate to settings (Task 5.3)
            },
          ),
        ],
      ),
    );
  }
  
  Widget _buildControls() {
    return Consumer2<AppState, RealtimeConversationManager>(
      builder: (context, appState, conversationManager, child) {
        final isConversationActive = conversationManager.isConversationActive;
        final isConnected = conversationManager.isConnected;
        final hasError = conversationManager.lastError != null;
        
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 4,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Connection status - only show when there's an actual error
              if (hasError)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error,
                        color: Colors.red,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        conversationManager.lastError!,
                        style: const TextStyle(
                          color: Colors.red,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              
              // Recording indicator
              if (isConversationActive && conversationManager.isRecording)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Recording...',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              
              // AI speaking indicator
              if (conversationManager.isPlayingAudio)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.volume_up,
                        color: Colors.blue[700],
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'AI speaking...',
                        style: TextStyle(
                          color: Colors.blue[700],
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Start/Stop conversation button
                  ElevatedButton.icon(
                    onPressed: isConnected || isConversationActive
                        ? () async {
                            if (isConversationActive) {
                              await conversationManager.stopConversation();
                              appState.stopListening();
                            } else {
                              try {
                                await conversationManager.startConversation(testUserId);
                                appState.startListening();
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Failed to start conversation: $e'),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              }
                            }
                          }
                        : null,
                    icon: Icon(
                      isConversationActive ? Icons.stop : Icons.mic,
                      size: 32,
                    ),
                    label: Text(
                      isConversationActive ? 'עצור' : 'התחל שיחה',
                      style: const TextStyle(fontSize: 24),
                    ),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(300, 100),
                      backgroundColor: isConversationActive ? Colors.red : Colors.blue,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey,
                      disabledForegroundColor: Colors.white70,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
