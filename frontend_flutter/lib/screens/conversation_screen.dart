import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import 'package:flutter/foundation.dart' show kIsWeb;

class ConversationScreen extends StatefulWidget {
  const ConversationScreen({super.key});

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _AppleScriptResult {
  final bool success;
  final String output;
  final int? errorCode;
  final String? errorMessage;

  const _AppleScriptResult({
    required this.success,
    required this.output,
    this.errorCode,
    this.errorMessage,
  });
}

class _ConversationScreenState extends State<ConversationScreen> {
  static const String testUserId = 'user-tiferet-001'; // Tiferet Nehemiah profile
  static const MethodChannel _appleScriptChannel = MethodChannel('com.neveralone/appleScript');
  
  // Photo display state
  List<Map<String, dynamic>> _photoQueue = [];
  bool _isShowingPhoto = false;
  Timer? _photoTimer;
  
  // Music playback state
  Map<String, dynamic>? _currentMusicData;
  bool _isMusicPlayerOpen = false;
  OverlayEntry? _musicNotificationOverlay;
  bool _spotifyPermissionRequested = false;
  
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

  Future<_AppleScriptResult> _runAppleScript(String script) async {
    try {
      final response = await _appleScriptChannel.invokeMethod<Map<dynamic, dynamic>>(
        'run',
        {'source': script},
      );

      if (response == null) {
        return const _AppleScriptResult(
          success: false,
          output: '',
          errorCode: -1,
          errorMessage: 'No response from AppleScript channel',
        );
      }

      final status = response['status'] as String? ?? '';
      if (status == 'ok') {
        final output = (response['output'] as String?) ?? '';
        if (output.startsWith('ERR:')) {
          final parts = output.split(':');
          final code = parts.length > 1 ? int.tryParse(parts[1]) : null;
          final message = parts.length > 2 ? parts.sublist(2).join(':') : null;
          return _AppleScriptResult(
            success: false,
            output: output,
            errorCode: code,
            errorMessage: message,
          );
        }
        return _AppleScriptResult(success: true, output: output);
      }

      return _AppleScriptResult(
        success: false,
        output: '',
        errorCode: (response['code'] as num?)?.toInt(),
        errorMessage: response['message'] as String?,
      );
    } catch (e) {
      return _AppleScriptResult(
        success: false,
        output: '',
        errorCode: -1,
        errorMessage: e.toString(),
      );
    }
  }

  Future<void> _requestSpotifyAutomationPermission() async {
    if (_spotifyPermissionRequested) {
      return;
    }

    _spotifyPermissionRequested = true;
    const requestScript = 'tell application id "com.spotify.client" to activate';
    final result = await _runAppleScript(requestScript);

    if (!result.success) {
      debugPrint(
        '⚠️ ConversationScreen: Spotify automation activation error code=${result.errorCode} message=${result.errorMessage}',
      );
      _spotifyPermissionRequested = false;
    } else if (result.output.trim().startsWith('ERR:')) {
      debugPrint('⚠️ ConversationScreen: Spotify automation activation returned ${result.output.trim()}');
      _spotifyPermissionRequested = false;
    } else {
      debugPrint('✅ ConversationScreen: Spotify automation activation succeeded (${result.output.trim()})');
    }
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
    if (musicService == 'spotify' && !kIsWeb && Platform.isMacOS) {
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
          await _requestSpotifyAutomationPermission();
          final played = await _playSpotifyTrack(spotifyUri);

          if (!played) {
            debugPrint('⚠️ AppleScript play failed, falling back to open command');
            final fallback = await Process.run('open', [
              '-b',
              'com.spotify.client',
              spotifyUri,
            ]);

            if (fallback.exitCode == 0) {
              debugPrint('✅ Fallback open command succeeded');
            } else {
              debugPrint('❌ Fallback open command failed: ${fallback.stderr}');
            }
          }
        } catch (e) {
          debugPrint('❌ Error playing Spotify track: $e');
          if (spotifyUrl != null && spotifyUrl.isNotEmpty) {
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
  
  /// Ensures Spotify is launched and visible to AppleScript (macOS only)
  Future<bool> _ensureSpotifyLaunched() async {
    const script = '''
      set appId to "com.spotify.client"
      tell application id appId
        if it is running then
          return "running"
        end if
      end tell
      tell application id appId
        launch
      end tell
      repeat 40 times
        delay 0.25
        tell application id appId
          if it is running then
            return "launched"
          end if
        end tell
      end repeat
      return "timeout"
    ''';

    final scriptResult = await _runAppleScript(script);
    if (!scriptResult.success) {
      debugPrint(
        '⚠️ ConversationScreen: _ensureSpotifyLaunched AppleScript error code=${scriptResult.errorCode} message=${scriptResult.errorMessage}',
      );
      return false;
    }

    final status = scriptResult.output.trim();
    debugPrint('🎵 ConversationScreen: _ensureSpotifyLaunched status=$status');
    return status == 'running' || status == 'launched';
  }

  Future<bool> _playSpotifyTrack(String spotifyUri) async {
    final escapedUri = spotifyUri.replaceAll('"', '\\"');

    // Ensure Spotify is awake before we fire the track command
    final launched = await _ensureSpotifyLaunched();
    if (!launched) {
      debugPrint('⚠️ Spotify did not report as launched before play command');
    }

    final script = '''
set trackUri to "$escapedUri"
set bundleId to "com.spotify.client"

tell application id bundleId
  if it is not running then
    launch
  end if
end tell

set attempts to 0
repeat while attempts < 40
  tell application id bundleId
    if it is running then exit repeat
  end tell
  set attempts to attempts + 1
  delay 0.25
end repeat

tell application id bundleId
  activate
  delay 0.4
  try
    play track trackUri
    delay 0.2
    if player state is not playing then play
    return "OK"
  on error errMsg number errNum
    return "ERR:" & errNum & ":" & errMsg
  end try
end tell
''';

    final result = await _runAppleScript(script);
    if (!result.success) {
      debugPrint(
        '🎵 ConversationScreen: _playSpotifyTrack AppleScript error code=${result.errorCode} message=${result.errorMessage}',
      );
      return false;
    }

    final output = result.output.trim();
    debugPrint('🎵 ConversationScreen: _playSpotifyTrack stdout="$output"');
    return output.isEmpty || output == 'OK';
  }

  /// Stop Spotify playback when AI requests it
  Future<void> _stopSpotifyPlayback(String reason) async {
    debugPrint('🎵🎵🎵 ConversationScreen: ===== EXECUTING STOP SPOTIFY PLAYBACK =====');
    debugPrint('🎵 ConversationScreen: Stopping Spotify - reason: $reason');

    try {
      final launched = await _ensureSpotifyLaunched();
      if (!launched) {
        debugPrint('⚠️ Spotify did not launch in time; cannot pause');
      }

      const pauseScript = '''
        tell application id "com.spotify.client"
          if it is running then
            try
              if player state is playing then
                pause
                return "PAUSED"
              else
                return "ALREADY_PAUSED"
              end if
            on error errMsg number errNum
              return "ERR:" & errNum & ":" & errMsg
            end try
          else
            return "NOT_RUNNING"
          end if
        end tell
      ''';

      debugPrint('🎵 ConversationScreen: Pausing Spotify via AppleScript (bundle id)...');
      final pauseResult = await _runAppleScript(pauseScript);
      final output = pauseResult.output.trim();
      debugPrint(
        '🎵 ConversationScreen: pause AppleScript success=${pauseResult.success} output="$output" code=${pauseResult.errorCode} message=${pauseResult.errorMessage}',
      );

      if (pauseResult.success && (output == 'PAUSED' || output == 'ALREADY_PAUSED' || output.isEmpty)) {
        debugPrint('✅✅✅ Spotify music paused successfully!');
        setState(() {
          _isMusicPlayerOpen = false;
          _currentMusicData = null;
        });
        _musicNotificationOverlay?.remove();
        _musicNotificationOverlay = null;
        _showMusicNotification('✅ המוזיקה הופסקה');
        Future.delayed(const Duration(milliseconds: 1500), () {
          _musicNotificationOverlay?.remove();
          _musicNotificationOverlay = null;
        });
        return;
      }

      // Handle errors from initial pause attempt
      if (output.startsWith('ERR:')) {
        debugPrint('⚠️ Initial pause attempt returned error: $output');
      }

      const activateScript = '''
        try
          tell application id "com.spotify.client"
            activate
            delay 0.3
            if it is running then
              if player state is playing then
                pause
                return "PAUSED"
              else
                return "ALREADY_PAUSED"
              end if
            else
              return "NOT_RUNNING"
            end if
          end tell
        on error errMsg number errNum
          return "ERR:" & errNum & ":" & errMsg
        end try
      ''';

      final alt = await _runAppleScript(activateScript);
      final altOutput = alt.output.trim();
      debugPrint(
        '🎵 ConversationScreen: activate AppleScript success=${alt.success} output="$altOutput" code=${alt.errorCode} message=${alt.errorMessage}',
      );

      if (alt.success && (altOutput == 'PAUSED' || altOutput == 'ALREADY_PAUSED' || altOutput.isEmpty)) {
        debugPrint('✅ Spotify paused after activate sequence');
        setState(() {
          _isMusicPlayerOpen = false;
          _currentMusicData = null;
        });
        _showMusicNotification('✅ המוזיקה הופסקה');
        Future.delayed(const Duration(milliseconds: 1500), () {
          _musicNotificationOverlay?.remove();
          _musicNotificationOverlay = null;
        });
      } else {
  debugPrint('⚠️ Could not pause Spotify via AppleScript. Result: $altOutput');
        setState(() {
          _isMusicPlayerOpen = false;
          _currentMusicData = null;
        });
        _showMusicNotification('⚠️ לא הצלחתי לעצור את המוזיקה');
        Future.delayed(const Duration(seconds: 2), () {
          _musicNotificationOverlay?.remove();
          _musicNotificationOverlay = null;
        });
      }
    } catch (e) {
      debugPrint('❌ Error stopping Spotify: $e');
      setState(() {
        _isMusicPlayerOpen = false;
        _currentMusicData = null;
      });
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
    return Consumer2<AppState, RealtimeConversationManager>(
      builder: (context, appState, conversationManager, child) {
        final isConversationActive = conversationManager.isConversationActive;
        
        return Scaffold(
          backgroundColor: const Color(0xFFF5F7FA),
          body: Stack(
            children: [
              // Main conversation UI
              SafeArea(
                child: isConversationActive
                    ? _buildActiveConversationView(conversationManager)
                    : _buildIdleView(conversationManager),
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
      },
    );
  }
  
  /// Build the idle view (when not in conversation)
  Widget _buildIdleView(RealtimeConversationManager conversationManager) {
    final hasError = conversationManager.lastError != null;
    final isConnected = conversationManager.isConnected;
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Spacer(flex: 2),
          
          // App icon/logo area
          Container(
            width: 180,
            height: 180,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.blue[400]!,
                  Colors.blue[700]!,
                ],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.blue.withOpacity(0.3),
                  blurRadius: 30,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: const Icon(
              Icons.favorite,
              size: 90,
              color: Colors.white,
            ),
          ),
          
          const SizedBox(height: 40),
          
          // Welcome message
          const Text(
            'שלום תפארת',
            style: TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2C3E50),
            ),
            textDirection: TextDirection.rtl,
          ),
          
          const SizedBox(height: 16),
          
          const Text(
            'אני כאן לשיחה',
            style: TextStyle(
              fontSize: 28,
              color: Color(0xFF7F8C8D),
            ),
            textDirection: TextDirection.rtl,
          ),
          
          const Spacer(flex: 1),
          
          // Error message if any
          if (hasError)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.red[200]!),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 28),
                    const SizedBox(width: 12),
                    Flexible(
                      child: Text(
                        conversationManager.lastError!,
                        style: const TextStyle(
                          color: Colors.red,
                          fontSize: 18,
                        ),
                        textDirection: TextDirection.rtl,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          
          // Large start button
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.95, end: 1.0),
            duration: const Duration(milliseconds: 1000),
            curve: Curves.easeInOut,
            builder: (context, scale, child) {
              return Transform.scale(
                scale: scale,
                child: child,
              );
            },
            onEnd: () {
              // Pulse animation effect
              if (mounted) {
                setState(() {});
              }
            },
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(80),
              shadowColor: Colors.blue.withOpacity(0.5),
              child: InkWell(
                onTap: isConnected
                    ? () async {
                        try {
                          await conversationManager.startConversation(testUserId);
                          context.read<AppState>().startListening();
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('שגיאה בהתחלת השיחה: $e'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        }
                      }
                    : null,
                borderRadius: BorderRadius.circular(80),
                child: Container(
                  width: 400,
                  height: 160,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: isConnected
                          ? [Colors.blue[400]!, Colors.blue[700]!]
                          : [Colors.grey[300]!, Colors.grey[400]!],
                    ),
                    borderRadius: BorderRadius.circular(80),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.mic,
                        size: 56,
                        color: isConnected ? Colors.white : Colors.white70,
                      ),
                      const SizedBox(width: 20),
                      Text(
                        'התחל שיחה',
                        style: TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.bold,
                          color: isConnected ? Colors.white : Colors.white70,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          
          const Spacer(flex: 2),
          
          // Settings button at bottom
          Padding(
            padding: const EdgeInsets.only(bottom: 40),
            child: IconButton(
              icon: const Icon(Icons.settings_outlined, size: 36),
              color: const Color(0xFF95A5A6),
              onPressed: () {
                // Navigate to settings
              },
            ),
          ),
        ],
      ),
    );
  }
  
  /// Build the active conversation view
  Widget _buildActiveConversationView(RealtimeConversationManager conversationManager) {
    return Column(
      children: [
        // Top bar with minimal info
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 4,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Connection indicator
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: conversationManager.isConnected 
                          ? Colors.green 
                          : Colors.red,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    conversationManager.isConnected ? 'מחובר' : 'מנותק',
                    style: TextStyle(
                      fontSize: 16,
                      color: conversationManager.isConnected 
                          ? Colors.green[700] 
                          : Colors.red[700],
                    ),
                  ),
                ],
              ),
              
              // Stop button
              IconButton(
                icon: const Icon(Icons.close, size: 32, color: Colors.red),
                onPressed: () async {
                  await conversationManager.stopConversation();
                  context.read<AppState>().stopListening();
                },
              ),
            ],
          ),
        ),
        
        // Transcript view (scrollable)
        const Expanded(
          child: TranscriptView(),
        ),
        
        // Audio visualization and status
        _buildAudioVisualization(conversationManager),
        
        // Bottom controls
        _buildActiveControls(conversationManager),
      ],
    );
  }
  
  /// Build audio visualization section
  Widget _buildAudioVisualization(RealtimeConversationManager conversationManager) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFFF5F7FA),
            Colors.grey[200]!,
          ],
        ),
      ),
      child: Column(
        children: [
          // Status text
          if (conversationManager.isRecording)
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: Text(
                'אני מקשיב...',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF3498DB),
                ),
                textDirection: TextDirection.rtl,
              ),
            ),
          
          if (conversationManager.isPlayingAudio)
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: Text(
                'אני מדבר...',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF2ECC71),
                ),
                textDirection: TextDirection.rtl,
              ),
            ),
          
          // Animated waveform
          const SizedBox(
            height: 100,
            child: AudioWaveform(),
          ),
        ],
      ),
    );
  }
  
  /// Build active conversation controls
  Widget _buildActiveControls(RealtimeConversationManager conversationManager) {
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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Stop conversation button
          ElevatedButton.icon(
            onPressed: () async {
              await conversationManager.stopConversation();
              context.read<AppState>().stopListening();
            },
            icon: const Icon(Icons.stop_circle, size: 36),
            label: const Text(
              'סיים שיחה',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            ),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(300, 100),
              backgroundColor: Colors.red[600],
              foregroundColor: Colors.white,
              elevation: 4,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(50),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

