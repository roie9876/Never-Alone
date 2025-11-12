import 'dart:convert';
import 'dart:typed_data';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../models/conversation_turn.dart';

/// WebSocket service for Realtime API communication
/// 
/// Handles bidirectional communication with backend gateway:
/// - Sends audio chunks to backend
/// - Receives AI audio responses
/// - Manages transcripts and session state
/// - Handles connection lifecycle and errors
class WebSocketService extends ChangeNotifier {
  // Configuration
  static const String defaultBackendUrl = 'http://localhost:3000';
  static const String namespace = '/realtime';
  
  // Socket.IO client
  IO.Socket? _socket;
  
  // Connection state
  bool _isConnected = false;
  bool _isInSession = false;
  String? _sessionId;
  String? _clientId;
  
  // Session readiness (WebSocket to Azure OpenAI connected)
  Completer<void>? _sessionReadyCompleter;
  
  // Transcript history
  final List<ConversationTurn> _transcripts = [];
  
  // Audio buffer for AI responses (base64 encoded chunks)
  final List<String> _aiAudioChunks = [];
  
  // Error state
  String? _lastError;
  
  // Callbacks for events
  Function(String base64Audio)? onAIAudioReceived;
  Function(ConversationTurn transcript)? onTranscriptReceived;
  Function(Map<String, dynamic> status)? onSessionStatusUpdated;
  Function(List<Map<String, dynamic>> photos)? onPhotosTriggered;
  Function(Map<String, dynamic> musicData)? onMusicPlayback;
  Function(String reason)? onStopMusic;
  Function(String error)? onError;
  
  // Getters
  bool get isConnected => _isConnected;
  bool get isInSession => _isInSession;
  String? get sessionId => _sessionId;
  String? get clientId => _clientId;
  List<ConversationTurn> get transcripts => List.unmodifiable(_transcripts);
  String? get lastError => _lastError;
  
  /// Connect to backend WebSocket gateway
  Future<void> connect({String? backendUrl}) async {
    if (_isConnected) {
      debugPrint('WebSocketService: Already connected');
      return;
    }
    
    final url = backendUrl ?? defaultBackendUrl;
    debugPrint('WebSocketService: Connecting to $url$namespace');
    
    try {
      // For socket.io-client v3.0.x, namespace is part of the URL
      final fullUrl = namespace.isNotEmpty ? '$url$namespace' : url;
      
      _socket = IO.io(
        fullUrl,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .setReconnectionAttempts(5)
            .setReconnectionDelay(2000)
            .setReconnectionDelayMax(10000)
            .enableAutoConnect()
            .build(),
      );
      
      _setupEventListeners();
      
      _socket!.connect();
    } catch (e) {
      _lastError = 'Failed to connect: $e';
      onError?.call(_lastError!);
      notifyListeners();
      rethrow;
    }
  }
  
  /// Set up Socket.IO event listeners
  void _setupEventListeners() {
    if (_socket == null) return;
    
    // 🔍 DEBUG: Catch ALL events to see what's coming through
    _socket!.onAny((event, data) {
      debugPrint('🌐 RAW WebSocket Event: "$event"');
      if (event == 'stop-music') {
        debugPrint('🎵🎵🎵 STOP-MUSIC EVENT DETECTED IN onAny!');
      }
    });
    
    // Connection established
    _socket!.on('connect', (_) {
      debugPrint('WebSocketService: Connected successfully');
      _isConnected = true;
      _lastError = null;
      notifyListeners();
    });
    
    // Connection lost
    _socket!.on('disconnect', (_) {
      debugPrint('WebSocketService: Disconnected');
      _isConnected = false;
      _isInSession = false;
      notifyListeners();
    });
    
    // Connection confirmation from server
    _socket!.on('connected', (data) {
      debugPrint('WebSocketService: Server confirmed connection: $data');
      _clientId = data['clientId'];
      notifyListeners();
    });
    
    // Session joined successfully
    _socket!.on('session-joined', (data) {
      debugPrint('WebSocketService: Joined session: $data');
      _sessionId = data['sessionId'];
      _isInSession = true;
      notifyListeners();
    });
    
    // AI audio response
    _socket!.on('ai-audio', (data) {
      debugPrint('🔊 WebSocketService: Received ai-audio event with data: ${data.toString().substring(0, 100)}...');
      final String audioBase64 = data['audio'];
      debugPrint('🔊 WebSocketService: Audio base64 length: ${audioBase64.length}');
      _aiAudioChunks.add(audioBase64);
      
      // Notify callback
      debugPrint('🔊 WebSocketService: Calling onAIAudioReceived callback');
      onAIAudioReceived?.call(audioBase64);
    });
    
    // Transcript received (user or AI)
    _socket!.on('transcript', (data) {
      debugPrint('WebSocketService: Transcript received: ${data['role']}: ${data['text']}');
      
      final turn = ConversationTurn(
        speaker: data['role'],
        transcript: data['text'],
        timestamp: DateTime.parse(data['timestamp']),
      );
      
      // NOTE: Echo filter removed - WebRTC AEC eliminates echo at source
      // No need for post-processing timing/content similarity checks
      // flutter_webrtc handles echo cancellation at native level
      
      _transcripts.add(turn);
      
      // Notify callback
      onTranscriptReceived?.call(turn);
      notifyListeners();
    });
    
    // Session status update
    _socket!.on('session-status', (data) {
      debugPrint('WebSocketService: Session status: $data');
      onSessionStatusUpdated?.call(data);
      notifyListeners();
    });
    
    // Photos triggered by AI during conversation
    _socket!.on('display-photos', (data) {
      debugPrint('📷 WebSocketService: Photos triggered: ${data['photos']?.length ?? 0} photos');
      
      if (data['photos'] != null && data['photos'] is List) {
        final photos = (data['photos'] as List)
            .map((p) => p as Map<String, dynamic>)
            .toList();
        
        debugPrint('📷 WebSocketService: Parsed ${photos.length} photos');
        onPhotosTriggered?.call(photos);
      } else {
        debugPrint('📷 WebSocketService: Invalid photos data format');
      }
      
      notifyListeners();
    });
    
    // Music playback triggered by AI during conversation
    _socket!.on('play-music', (data) {
      debugPrint('🎵 WebSocketService: Music playback triggered');
      debugPrint('🎵 WebSocketService: Music Service: ${data['musicService']}');
      debugPrint('🎵 WebSocketService: Track ID: ${data['trackId']}');
      debugPrint('🎵 WebSocketService: Title: ${data['title']}');
      debugPrint('🎵 WebSocketService: Artist: ${data['artist']}');
      debugPrint('🎵 WebSocketService: Reason: ${data['reason']}');
      
      // Handle both Spotify and YouTube formats
      if ((data['trackId'] != null || data['videoId'] != null) && data['title'] != null) {
        final musicData = {
          'musicService': data['musicService'] as String? ?? 'youtube-music',
          'trackId': data['trackId'] as String? ?? data['videoId'] as String?, // Spotify track ID or YouTube video ID
          'videoId': data['videoId'] as String?, // Legacy YouTube support
          'title': data['title'] as String,
          'artist': data['artist'] as String? ?? 'Unknown Artist',
          'reason': data['reason'] as String? ?? 'user_requested',
          'albumArt': data['albumArt'] as String?,
          'thumbnail': data['thumbnail'] as String?, // Legacy
          'spotifyUrl': data['spotifyUrl'] as String?,
          'durationMs': data['durationMs'] as int?,
        };
        
        debugPrint('🎵 WebSocketService: Calling onMusicPlayback callback with ${musicData['musicService']} data');
        onMusicPlayback?.call(musicData);
      } else {
        debugPrint('🎵 WebSocketService: Invalid music data format - missing trackId/videoId or title');
      }
      
      notifyListeners();
    });
    
    // Stop music command from AI
    _socket!.on('stop-music', (data) {
      debugPrint('🎵🎵🎵 WebSocketService: ===== STOP MUSIC EVENT RECEIVED =====');
      debugPrint('🎵 WebSocketService: Raw data: $data');
      debugPrint('🎵 WebSocketService: Reason: ${data['reason']}');
      debugPrint('🎵 WebSocketService: Callback exists: ${onStopMusic != null}');
      
      // Call stop music callback
      onStopMusic?.call(data['reason'] as String? ?? 'user requested');
      debugPrint('🎵 WebSocketService: Callback invoked successfully');
      
      notifyListeners();
    });
    
    // Session ready - Backend WebSocket to Azure OpenAI is connected
    _socket!.on('session-ready', (data) {
      debugPrint('🎤 WebSocketService: Session ready signal received: $data');
      
      if (_sessionReadyCompleter != null && !_sessionReadyCompleter!.isCompleted) {
        _sessionReadyCompleter!.complete();
        debugPrint('🎤 WebSocketService: Session ready completer completed');
      }
      
      notifyListeners();
    });
    
    // Error from server
    _socket!.on('error', (data) {
      final errorMsg = data['message'] ?? 'Unknown error';
      debugPrint('WebSocketService: Error from server: $errorMsg');
      _lastError = errorMsg;
      onError?.call(errorMsg);
      notifyListeners();
    });
    
    // Connection error
    _socket!.on('connect_error', (error) {
      debugPrint('WebSocketService: Connection error: $error');
      _lastError = 'Connection error: $error';
      onError?.call(_lastError!);
      notifyListeners();
    });
  }
  
  /// Join a Realtime API session
  Future<void> joinSession(String sessionId) async {
    if (!_isConnected) {
      throw Exception('Not connected to server');
    }
    
    debugPrint('WebSocketService: Joining session $sessionId');
    
    // Reset session ready completer for new session
    _sessionReadyCompleter = Completer<void>();
    debugPrint('WebSocketService: Created new session ready completer');
    
    _socket!.emit('join-session', {
      'sessionId': sessionId,
    });
  }
  
  /// Wait for backend to signal that Azure OpenAI WebSocket is ready
  /// 
  /// This ensures the WebSocket connection to Azure is established before
  /// we start sending audio chunks. Backend emits 'session-ready' when connected.
  /// 
  /// [timeout] - Maximum time to wait (default: 10 seconds)
  /// 
  /// Throws [TimeoutException] if session doesn't become ready within timeout
  Future<void> waitForSessionReady({Duration timeout = const Duration(seconds: 10)}) async {
    if (_sessionReadyCompleter == null) {
      debugPrint('WebSocketService: ⚠️ No session ready completer - creating one');
      _sessionReadyCompleter = Completer<void>();
    }
    
    if (_sessionReadyCompleter!.isCompleted) {
      debugPrint('WebSocketService: Session already ready');
      return;
    }
    
    debugPrint('WebSocketService: ⏳ Waiting for session ready signal (timeout: ${timeout.inSeconds}s)...');
    
    try {
      await _sessionReadyCompleter!.future.timeout(timeout);
      debugPrint('WebSocketService: ✅ Session ready signal received!');
    } on TimeoutException {
      final error = 'Session ready timeout after ${timeout.inSeconds} seconds';
      debugPrint('WebSocketService: ❌ $error');
      throw Exception(error);
    } catch (e) {
      debugPrint('WebSocketService: ❌ Error waiting for session ready: $e');
      rethrow;
    }
  }
  
  /// Send audio chunk to backend
  /// 
  /// [audioData] - PCM16 audio bytes
  /// [sessionId] - Active session ID
  void sendAudioChunk(Uint8List audioData, String sessionId) {
    if (!_isConnected || !_isInSession) {
      debugPrint('WebSocketService: Cannot send audio - not connected or not in session');
      return;
    }
    
    // Convert to base64
    final String audioBase64 = base64Encode(audioData);
    
    _socket!.emit('audio-chunk', {
      'sessionId': sessionId,
      'audio': audioBase64,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }
  
  /// Commit audio buffer (signal end of user speech)
  void commitAudioBuffer(String sessionId) {
    if (!_isConnected || !_isInSession) {
      debugPrint('WebSocketService: Cannot commit audio - not connected or not in session');
      return;
    }
    
    debugPrint('WebSocketService: Committing audio buffer');
    
    _socket!.emit('commit-audio', {
      'sessionId': sessionId,
    });
  }
  
  /// Cancel AI response (for interruption support)
  void sendCancelResponse(String sessionId) {
    if (!_isConnected || !_isInSession) {
      debugPrint('WebSocketService: Cannot cancel response - not connected or not in session');
      return;
    }
    
    debugPrint('WebSocketService: 🛑 Sending cancel response');
    
    _socket!.emit('cancel-response', {
      'sessionId': sessionId,
    });
  }
  
  /// Disconnect from server and end session
  Future<void> disconnect() async {
    if (_socket == null) return;
    
    debugPrint('WebSocketService: Disconnecting...');
    
    _socket!.disconnect();
    _socket!.dispose();
    _socket = null;
    
    _isConnected = false;
    _isInSession = false;
    _sessionId = null;
    _clientId = null;
    _sessionReadyCompleter = null;
    _aiAudioChunks.clear();
    
    notifyListeners();
  }
  
  /// Clear transcript history
  void clearTranscripts() {
    _transcripts.clear();
    notifyListeners();
  }
  
  /// Get all AI audio chunks concatenated
  String getAllAIAudio() {
    return _aiAudioChunks.join('');
  }
  
  /// Clear AI audio buffer
  void clearAIAudioBuffer() {
    _aiAudioChunks.clear();
  }
  
  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
