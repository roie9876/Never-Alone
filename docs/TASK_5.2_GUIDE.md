# 🚀 Task 5.2: Realtime API WebSocket Client - Implementation Guide

**Status:** Ready to Start  
**Estimated Time:** 8-10 hours  
**Priority:** P0 (Critical - Blocks all other frontend work)  
**Dependencies:** Task 5.1 Complete ✅

---

## 📋 Overview

This task implements the WebSocket client that connects the Flutter frontend to the backend Realtime API gateway. This enables bidirectional audio streaming and real-time transcript display.

**What we're building:**
- WebSocket connection to backend (`ws://localhost:3000/realtime`)
- Audio recording from microphone (PCM16, 16kHz, mono)
- Audio streaming to backend in real-time
- Receiving AI audio responses and playing them
- Displaying live transcript with timestamps
- Handling function calls (memory extraction, photo triggers, crisis detection)

---

## 🏗️ Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUTTER APP (Frontend)                        │
│                                                                  │
│  1. User clicks "התחל שיחה"                                      │
│  2. AudioService starts recording microphone (16kHz PCM16)      │
│  3. WebSocketService connects to ws://localhost:3000/realtime  │
│  4. Audio chunks sent every 100ms                               │
│  5. Backend processes through Azure OpenAI Realtime API         │
│  6. Receive AI audio chunks → Play via audioplayers            │
│  7. Receive transcript events → Display in TranscriptView      │
│  8. Receive function calls → Trigger actions (photos, memory)  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ WebSocket (Binary + JSON)
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND (NestJS + Realtime Gateway)                │
│                                                                  │
│  • RealtimeGateway receives WebSocket connections               │
│  • Proxies audio to Azure OpenAI Realtime API                   │
│  • Forwards AI responses back to Flutter                        │
│  • Logs transcripts to Cosmos DB                                │
│  • Handles function calls (memory, safety, photos)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Prerequisites

Before starting, verify:
- ✅ Task 5.1 complete (app running on macOS)
- ✅ Backend running on `http://localhost:3000`
- ✅ Dependencies installed: `web_socket_channel`, `audioplayers`

---

## 🎯 Implementation Steps

### Step 1: Implement Audio Recording Service (2-3 hours)

**Challenge:** The `record` package had compatibility issues. We need a reliable alternative.

**Solution Options:**
1. **Option A (Recommended):** Use `flutter_sound` package (stable, well-maintained)
2. **Option B:** Use platform channels to call native AVFoundation (macOS)
3. **Option C:** Use `microphone` package (simpler but less control)

**Let's go with Option A: flutter_sound**

#### 1.1: Add flutter_sound dependency

```yaml
# pubspec.yaml
dependencies:
  flutter_sound: ^9.2.13
```

#### 1.2: Update AudioService implementation

```dart
// lib/services/audio_service.dart
import 'dart:async';
import 'dart:typed_data';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:permission_handler/permission_handler.dart';

class AudioService {
  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  final StreamController<Uint8List> _audioStreamController = StreamController<Uint8List>.broadcast();
  
  bool _isRecording = false;
  bool _isInitialized = false;
  
  bool get isRecording => _isRecording;
  Stream<Uint8List> get audioStream => _audioStreamController.stream;
  
  Future<void> initialize() async {
    if (_isInitialized) return;
    
    await _recorder.openRecorder();
    _isInitialized = true;
  }
  
  Future<bool> requestPermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }
  
  Future<void> startRecording() async {
    if (!_isInitialized) {
      await initialize();
    }
    
    if (!await requestPermission()) {
      throw Exception('Microphone permission denied');
    }
    
    await _recorder.startRecorder(
      toStream: _audioStreamController.sink,
      codec: Codec.pcm16,
      sampleRate: 16000,
      numChannels: 1,
    );
    
    _isRecording = true;
    print('AudioService: Recording started');
  }
  
  Future<void> stopRecording() async {
    if (!_isRecording) return;
    
    await _recorder.stopRecorder();
    _isRecording = false;
    print('AudioService: Recording stopped');
  }
  
  Future<void> dispose() async {
    await stopRecording();
    await _recorder.closeRecorder();
    await _audioStreamController.close();
    _isInitialized = false;
  }
}
```

---

### Step 2: Implement WebSocket Service (3-4 hours)

#### 2.1: WebSocket Connection Management

```dart
// lib/services/websocket_service.dart
import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../utils/constants.dart';

class WebSocketService {
  WebSocketChannel? _channel;
  StreamSubscription? _messageSubscription;
  
  bool _isConnected = false;
  bool get isConnected => _isConnected;
  
  // Event streams
  final StreamController<Map<String, dynamic>> _transcriptController = 
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Uint8List> _audioResponseController = 
      StreamController<Uint8List>.broadcast();
  final StreamController<Map<String, dynamic>> _functionCallController = 
      StreamController<Map<String, dynamic>>.broadcast();
  
  Stream<Map<String, dynamic>> get transcriptStream => _transcriptController.stream;
  Stream<Uint8List> get audioResponseStream => _audioResponseController.stream;
  Stream<Map<String, dynamic>> get functionCallStream => _functionCallController.stream;
  
  Future<void> connect() async {
    if (_isConnected) return;
    
    try {
      print('WebSocketService: Connecting to ${AppConstants.websocketUrl}');
      
      _channel = WebSocketChannel.connect(
        Uri.parse(AppConstants.websocketUrl),
      );
      
      // Listen for messages
      _messageSubscription = _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDisconnect,
      );
      
      _isConnected = true;
      print('WebSocketService: Connected successfully');
    } catch (e) {
      print('WebSocketService: Connection error: $e');
      _isConnected = false;
      rethrow;
    }
  }
  
  void _handleMessage(dynamic message) {
    if (message is String) {
      // JSON message (transcript, function calls, control messages)
      try {
        final data = jsonDecode(message) as Map<String, dynamic>;
        final type = data['type'] as String?;
        
        switch (type) {
          case 'transcript':
            _transcriptController.add(data);
            break;
          case 'function_call':
            _functionCallController.add(data);
            break;
          case 'error':
            print('WebSocketService: Server error: ${data['message']}');
            break;
          default:
            print('WebSocketService: Unknown message type: $type');
        }
      } catch (e) {
        print('WebSocketService: Failed to parse JSON: $e');
      }
    } else if (message is Uint8List) {
      // Binary message (audio data)
      _audioResponseController.add(message);
    }
  }
  
  void _handleError(error) {
    print('WebSocketService: Error: $error');
    _isConnected = false;
  }
  
  void _handleDisconnect() {
    print('WebSocketService: Disconnected');
    _isConnected = false;
  }
  
  void sendAudioChunk(Uint8List audioData) {
    if (!_isConnected || _channel == null) {
      print('WebSocketService: Cannot send audio - not connected');
      return;
    }
    
    // Send as binary message
    _channel!.sink.add(audioData);
  }
  
  void sendCommand(String command, {Map<String, dynamic>? data}) {
    if (!_isConnected || _channel == null) {
      print('WebSocketService: Cannot send command - not connected');
      return;
    }
    
    final message = {
      'type': 'command',
      'command': command,
      if (data != null) 'data': data,
    };
    
    _channel!.sink.add(jsonEncode(message));
  }
  
  Future<void> disconnect() async {
    if (!_isConnected) return;
    
    await _messageSubscription?.cancel();
    await _channel?.sink.close();
    
    _isConnected = false;
    print('WebSocketService: Disconnected');
  }
  
  Future<void> dispose() async {
    await disconnect();
    await _transcriptController.close();
    await _audioResponseController.close();
    await _functionCallController.close();
  }
}
```

---

### Step 3: Implement Audio Playback Service (1-2 hours)

```dart
// lib/services/audio_playback_service.dart
import 'dart:async';
import 'dart:typed_data';
import 'package:audioplayers/audioplayers.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';

class AudioPlaybackService {
  final AudioPlayer _player = AudioPlayer();
  final List<Uint8List> _audioQueue = [];
  bool _isPlaying = false;
  
  Future<void> playAudioChunk(Uint8List audioData) async {
    _audioQueue.add(audioData);
    
    if (!_isPlaying) {
      _processQueue();
    }
  }
  
  Future<void> _processQueue() async {
    if (_audioQueue.isEmpty) {
      _isPlaying = false;
      return;
    }
    
    _isPlaying = true;
    final chunk = _audioQueue.removeAt(0);
    
    try {
      // Save to temporary file
      final tempDir = await getTemporaryDirectory();
      final tempFile = File('${tempDir.path}/audio_chunk_${DateTime.now().millisecondsSinceEpoch}.pcm');
      await tempFile.writeAsBytes(chunk);
      
      // Play the audio
      await _player.play(DeviceFileSource(tempFile.path));
      
      // Wait for playback to complete
      await _player.onPlayerComplete.first;
      
      // Delete temp file
      await tempFile.delete();
      
      // Process next chunk
      _processQueue();
    } catch (e) {
      print('AudioPlaybackService: Error playing audio: $e');
      _isPlaying = false;
    }
  }
  
  Future<void> stop() async {
    await _player.stop();
    _audioQueue.clear();
    _isPlaying = false;
  }
  
  Future<void> dispose() async {
    await stop();
    await _player.dispose();
  }
}
```

---

### Step 4: Update AppState with WebSocket Integration (1-2 hours)

```dart
// lib/models/app_state.dart
import 'package:flutter/foundation.dart';
import '../services/audio_service.dart';
import '../services/websocket_service.dart';
import '../services/audio_playback_service.dart';
import 'conversation_turn.dart';
import 'dart:async';

class AppState extends ChangeNotifier {
  // Services
  final AudioService _audioService = AudioService();
  final WebSocketService _wsService = WebSocketService();
  final AudioPlaybackService _playbackService = AudioPlaybackService();
  
  // State
  bool _isListening = false;
  List<ConversationTurn> _transcript = [];
  StreamSubscription? _audioStreamSubscription;
  StreamSubscription? _transcriptStreamSubscription;
  StreamSubscription? _audioResponseSubscription;
  
  // Getters
  bool get isListening => _isListening;
  List<ConversationTurn> get transcript => _transcript;
  
  AppState() {
    _initialize();
  }
  
  Future<void> _initialize() async {
    // Initialize audio service
    await _audioService.initialize();
    
    // Subscribe to transcript events
    _transcriptStreamSubscription = _wsService.transcriptStream.listen((data) {
      final turn = ConversationTurn(
        speaker: data['speaker'] as String,
        transcript: data['transcript'] as String,
        timestamp: DateTime.parse(data['timestamp'] as String),
      );
      addTranscriptTurn(turn);
    });
    
    // Subscribe to audio responses
    _audioResponseSubscription = _wsService.audioResponseStream.listen((audioData) {
      _playbackService.playAudioChunk(audioData);
    });
  }
  
  Future<void> startListening() async {
    if (_isListening) return;
    
    try {
      // Connect WebSocket
      if (!_wsService.isConnected) {
        await _wsService.connect();
      }
      
      // Start recording
      await _audioService.startRecording();
      
      // Stream audio to WebSocket
      _audioStreamSubscription = _audioService.audioStream.listen((audioChunk) {
        _wsService.sendAudioChunk(audioChunk);
      });
      
      _isListening = true;
      notifyListeners();
      
      print('AppState: Started listening');
    } catch (e) {
      print('AppState: Error starting listening: $e');
      await stopListening();
      rethrow;
    }
  }
  
  Future<void> stopListening() async {
    if (!_isListening) return;
    
    // Stop audio recording
    await _audioService.stopRecording();
    await _audioStreamSubscription?.cancel();
    
    // Stop audio playback
    await _playbackService.stop();
    
    _isListening = false;
    notifyListeners();
    
    print('AppState: Stopped listening');
  }
  
  void addTranscriptTurn(ConversationTurn turn) {
    _transcript.add(turn);
    notifyListeners();
  }
  
  void clearTranscript() {
    _transcript.clear();
    notifyListeners();
  }
  
  @override
  void dispose() {
    _audioStreamSubscription?.cancel();
    _transcriptStreamSubscription?.cancel();
    _audioResponseSubscription?.cancel();
    _audioService.dispose();
    _wsService.dispose();
    _playbackService.dispose();
    super.dispose();
  }
}
```

---

### Step 5: Update Dependencies (15 minutes)

```yaml
# pubspec.yaml
dependencies:
  # Audio recording & playback
  flutter_sound: ^9.2.13
  audioplayers: ^5.2.1
  permission_handler: ^11.0.1
  
  # Keep existing dependencies...
```

---

### Step 6: Update macOS Entitlements (15 minutes)

Ensure microphone permission is properly configured:

```xml
<!-- macos/Runner/DebugProfile.entitlements -->
<!-- Already added in Task 5.1, verify it's present -->
<key>com.apple.security.device.audio-input</key>
<true/>
```

---

## 🧪 Testing Plan

### Test 1: WebSocket Connection
```dart
// Test in main.dart
void main() async {
  final ws = WebSocketService();
  await ws.connect();
  print('Connected: ${ws.isConnected}');
}
```

### Test 2: Audio Recording
```dart
final audio = AudioService();
await audio.initialize();
await audio.startRecording();
await Future.delayed(Duration(seconds: 3));
await audio.stopRecording();
```

### Test 3: End-to-End
1. Start backend: `cd backend && npm run start:dev`
2. Run Flutter app: `flutter run -d macos`
3. Click "התחל שיחה" button
4. Speak into microphone
5. Verify:
   - Audio recording starts
   - WebSocket connected
   - Backend receives audio
   - AI responds with audio
   - Transcript displays

---

## 📊 Time Breakdown

| Task | Estimated | Notes |
|------|-----------|-------|
| Audio recording service | 2-3 hours | flutter_sound integration |
| WebSocket service | 3-4 hours | Connection, streaming, events |
| Audio playback service | 1-2 hours | Queue management |
| AppState integration | 1-2 hours | Connect all services |
| Testing & debugging | 1-2 hours | End-to-end testing |
| **TOTAL** | **8-13 hours** | |

---

## ✅ Acceptance Criteria

- [ ] WebSocket connects to backend successfully
- [ ] Audio recording starts and captures microphone input
- [ ] Audio chunks sent to backend via WebSocket
- [ ] AI audio responses received and played
- [ ] Transcript displays in real-time
- [ ] Function calls handled (photos, memory)
- [ ] Latency < 2 seconds (user speaks → AI responds)
- [ ] No memory leaks (proper disposal)
- [ ] No audio artifacts or glitches

---

## 🔗 Next Steps

After Task 5.2 completion:
- **Task 5.3:** Photo Display Overlay (4-6 hours)
- **Task 5.4-5.6:** Music Integration (optional, 16-22 hours)

---

**Let's build the real-time conversation system! 🚀**
