import 'dart:convert';
import 'dart:typed_data';
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
    
    _socket!.emit('join-session', {
      'sessionId': sessionId,
    });
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
