import 'package:flutter/foundation.dart';
import '../models/conversation_turn.dart';
import 'websocket_service.dart';
import 'audio_service.dart';
import 'audio_playback_service.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

/// Orchestrates Realtime API conversation flow
/// 
/// Manages the complete conversation lifecycle:
/// - WebSocket connection
/// - Audio recording and streaming (native echo cancellation)
/// - AI audio playback
/// - Transcript management
class RealtimeConversationManager extends ChangeNotifier {
  final WebSocketService _websocketService;
  final AudioService _audioService;
  final AudioPlaybackService _playbackService;
  
  // State
  bool _isConversationActive = false;
  String? _activeSessionId;
  StreamSubscription? _audioStreamSubscription;
  
  // Configuration
  final String backendUrl;
  
  // Callbacks
  Function(List<Map<String, dynamic>> photos)? onPhotosTriggered;
  
  // Getters
  bool get isConversationActive => _isConversationActive;
  bool get isConnected => _websocketService.isConnected;
  bool get isRecording => _audioService.isRecording;
  bool get isPlayingAudio => _playbackService.isPlaying;
  String? get sessionId => _activeSessionId;
  List<ConversationTurn> get transcripts => _websocketService.transcripts;
  String? get lastError => _websocketService.lastError;
  
  RealtimeConversationManager({
    required WebSocketService websocketService,
    required AudioService audioService,
    required AudioPlaybackService playbackService,
    this.backendUrl = 'http://localhost:3000',
  })  : _websocketService = websocketService,
        _audioService = audioService,
        _playbackService = playbackService {
    _setupCallbacks();
    _initializeConnection();
    
    // Set up playback completion callback to resume recording
    _playbackService.onPlaybackComplete = () {
      debugPrint('🔊 RealtimeConversationManager: AI playback complete, resuming recording');
      if (_isConversationActive && !_audioService.isRecording) {
        _audioService.resumeRecording();
      }
    };
  }
  
  /// Initialize WebSocket connection on startup
  Future<void> _initializeConnection() async {
    try {
      debugPrint('RealtimeConversationManager: Initializing connection...');
      await _websocketService.connect(backendUrl: backendUrl);
      debugPrint('RealtimeConversationManager: Connection initialized successfully');
    } catch (e) {
      debugPrint('RealtimeConversationManager: Failed to initialize connection: $e');
      // Don't rethrow - connection will retry when starting conversation
    }
  }
  
  /// Set up callbacks for WebSocket events
  void _setupCallbacks() {
    // Handle AI audio responses
    _websocketService.onAIAudioReceived = (audioBase64) {
      debugPrint('🔊 RealtimeConversationManager: Received AI audio chunk (${audioBase64.length} chars)');
      
      // PAUSE RECORDING while AI speaks to prevent echo/feedback loop
      if (_audioService.isRecording) {
        debugPrint('🔊 RealtimeConversationManager: Pausing recording to prevent echo');
        _audioService.pauseRecording();
      }
      
      // Play audio
      debugPrint('🔊 RealtimeConversationManager: Calling playback service...');
      _playbackService.playAudioBase64(audioBase64);
      debugPrint('🔊 RealtimeConversationManager: Playback service called');
    };
    
    // Handle transcripts
    _websocketService.onTranscriptReceived = (transcript) {
      debugPrint('RealtimeConversationManager: Transcript: ${transcript.speaker}: ${transcript.transcript}');
      notifyListeners();
    };
    
    // Handle photos triggered by AI
    _websocketService.onPhotosTriggered = (photos) {
      debugPrint('📷 RealtimeConversationManager: Photos triggered - ${photos.length} photos');
      onPhotosTriggered?.call(photos);
    };
    
    // Handle errors
    _websocketService.onError = (error) {
      debugPrint('RealtimeConversationManager: Error: $error');
      notifyListeners();
    };
    
    // Listen to WebSocket connection state changes
    _websocketService.addListener(() {
      notifyListeners();
    });
    
    // Listen to audio service state changes
    _audioService.addListener(() {
      notifyListeners();
    });
    
    // Listen to playback service state changes
    _playbackService.addListener(() {
      notifyListeners();
    });
    
    // INTERRUPTION SUPPORT: Listen for user audio input during AI speech
    _audioService.audioStream?.listen((audioData) {
      // If AI is speaking and user starts talking, cancel AI response
      if (_playbackService.isPlaying && audioData.isNotEmpty) {
        debugPrint('RealtimeConversationManager: 🛑 User interruption detected, canceling AI response');
        _handleUserInterruption();
      }
    });
  }
  
  /// Handle user interruption during AI speech
  void _handleUserInterruption() {
    // Stop AI audio playback immediately
    _playbackService.stopPlayback();
    
    // Send cancel response to backend
    if (_activeSessionId != null) {
      _websocketService.sendCancelResponse(_activeSessionId!);
    }
  }
  
  /// Start a new conversation
  Future<void> startConversation(String userId) async {
    if (_isConversationActive) {
      debugPrint('RealtimeConversationManager: Conversation already active');
      return;
    }
    
    try {
      debugPrint('RealtimeConversationManager: Starting conversation for user $userId');
      
      // 1. Connect to WebSocket if not already connected
      if (!_websocketService.isConnected) {
        await _websocketService.connect(backendUrl: backendUrl);
        
        // Wait for connection to establish
        await Future.delayed(const Duration(milliseconds: 500));
      }
      
      // 2. Request backend to create a Realtime session
      // Using production endpoint - Cosmos DB firewall resolved (Nov 11, 2025)
      debugPrint('RealtimeConversationManager: Creating production session via REST API for user $userId');
      final response = await http.post(
        Uri.parse('$backendUrl/realtime/session'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
        }),
      );
      
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception('Failed to create session: ${response.body}');
      }
      
      final sessionData = jsonDecode(response.body);
      _activeSessionId = sessionData['session']['id'];
      debugPrint('RealtimeConversationManager: Session created: $_activeSessionId');
      
      // 3. Join the session via WebSocket
      await _websocketService.joinSession(_activeSessionId!);
      
      // 🎯 Wait for backend to signal that Azure OpenAI WebSocket is ready
      // Backend emits 'session-ready' event when WebSocket connection established
      // This prevents "Failed to send audio" errors from sending too early
      debugPrint('RealtimeConversationManager: ⏳ Waiting for session ready signal...');
      await _websocketService.waitForSessionReady();
      debugPrint('RealtimeConversationManager: ✅ Session ready! Starting audio recording...');
      
      // 4. Start audio recording
      await _audioService.startRecording();
      
      // 5. Subscribe to audio stream and forward chunks to backend
      _audioStreamSubscription = _audioService.audioStream?.listen(
        (audioData) {
          if (_activeSessionId != null) {
            _websocketService.sendAudioChunk(audioData, _activeSessionId!);
          }
        },
        onError: (error) {
          debugPrint('RealtimeConversationManager: Audio stream error: $error');
        },
      );
      
      _isConversationActive = true;
      notifyListeners();
      
      debugPrint('RealtimeConversationManager: Conversation started successfully');
    } catch (e) {
      debugPrint('RealtimeConversationManager: Failed to start conversation: $e');
      _isConversationActive = false;
      notifyListeners();
      rethrow;
    }
  }
  
  /// Stop the current conversation
  Future<void> stopConversation() async {
    if (!_isConversationActive) {
      debugPrint('RealtimeConversationManager: No active conversation');
      return;
    }
    
    try {
      debugPrint('RealtimeConversationManager: Stopping conversation');
      
      // 1. Stop audio recording
      await _audioService.stopRecording();
      
      // 2. Cancel audio stream subscription
      await _audioStreamSubscription?.cancel();
      _audioStreamSubscription = null;
      
      // 3. Commit final audio buffer
      if (_activeSessionId != null) {
        _websocketService.commitAudioBuffer(_activeSessionId!);
      }
      
      // 4. Wait a bit for final AI response
      await Future.delayed(const Duration(seconds: 2));
      
      // 5. Stop audio playback
      await _playbackService.stop();
      
      _isConversationActive = false;
      _activeSessionId = null;
      notifyListeners();
      
      debugPrint('RealtimeConversationManager: Conversation stopped');
    } catch (e) {
      debugPrint('RealtimeConversationManager: Error stopping conversation: $e');
      _isConversationActive = false;
      notifyListeners();
    }
  }
  
  /// Pause recording (user not speaking)
  Future<void> pauseRecording() async {
    if (!_isConversationActive) return;
    
    await _audioService.pauseRecording();
    
    // Commit audio buffer to signal end of user turn
    if (_activeSessionId != null) {
      _websocketService.commitAudioBuffer(_activeSessionId!);
    }
    
    notifyListeners();
  }
  
  /// Resume recording
  Future<void> resumeRecording() async {
    if (!_isConversationActive) return;
    
    await _audioService.resumeRecording();
    notifyListeners();
  }
  
  /// Clear conversation history
  void clearHistory() {
    _websocketService.clearTranscripts();
    notifyListeners();
  }
  
  /// Disconnect from backend
  Future<void> disconnect() async {
    await stopConversation();
    await _websocketService.disconnect();
    notifyListeners();
  }
  
  @override
  void dispose() {
    debugPrint('RealtimeConversationManager: Disposing...');
    disconnect();
    _audioStreamSubscription?.cancel();
    super.dispose();
  }
}
