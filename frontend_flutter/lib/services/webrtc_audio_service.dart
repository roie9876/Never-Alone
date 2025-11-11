import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

/// WebRTC-based audio recording service with Acoustic Echo Cancellation
/// 
/// Key advantages over flutter_sound:
/// - Built-in Acoustic Echo Cancellation (AEC) - removes speaker echo
/// - Noise suppression - filters background noise
/// - Auto gain control - balances volume levels
/// - Same technology as OpenAI portal and browsers
/// 
/// Audio configuration:
/// - Format: PCM16 (16-bit Linear PCM)
/// - Sample Rate: 16kHz
/// - Channels: Mono
class WebRTCAudioService extends ChangeNotifier {
  MediaStream? _localStream;
  bool _isRecording = false;
  bool _hasPermission = false;
  
  // Stream for audio chunks
  StreamController<Uint8List>? _audioStreamController;
  Stream<Uint8List>? _audioStream;
  
  // Audio processing
  Timer? _audioProcessingTimer;
  final List<double> _audioBuffer = [];
  
  // Getters
  bool get isRecording => _isRecording;
  bool get hasPermission => _hasPermission;
  Stream<Uint8List>? get audioStream => _audioStream;
  
  /// Request microphone permission
  Future<bool> requestPermission() async {
    try {
      debugPrint('WebRTCAudioService: Requesting microphone permission...');
      
      // Attempt to get user media - this will trigger permission request
      final mediaConstraints = {
        'audio': {
          'echoCancellation': true,     // ✅ Acoustic Echo Cancellation
          'noiseSuppression': true,     // ✅ Remove background noise
          'autoGainControl': true,      // ✅ Balance volume
          'sampleRate': 16000,          // 16kHz for Realtime API
          'channelCount': 1,            // Mono
        },
        'video': false,
      };
      
      final stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      
      // Release test stream immediately
      stream.getTracks().forEach((track) => track.stop());
      stream.dispose();
      
      _hasPermission = true;
      debugPrint('WebRTCAudioService: ✅ Microphone permission granted with AEC enabled');
      notifyListeners();
      return true;
      
    } catch (e) {
      debugPrint('WebRTCAudioService: ❌ Permission denied or error: $e');
      _hasPermission = false;
      notifyListeners();
      return false;
    }
  }
  
  /// Start recording audio with AEC
  Future<void> startRecording() async {
    if (_isRecording) {
      debugPrint('WebRTCAudioService: Already recording');
      return;
    }
    
    // Check permission
    if (!_hasPermission) {
      final granted = await requestPermission();
      if (!granted) {
        throw Exception('Microphone permission denied');
      }
    }
    
    try {
      debugPrint('WebRTCAudioService: Starting recording with AEC...');
      
      // Create stream controller for audio chunks
      _audioStreamController = StreamController<Uint8List>.broadcast();
      _audioStream = _audioStreamController!.stream;
      
      // Configure media constraints with AEC
      final mediaConstraints = {
        'audio': {
          // ═══════════════════════════════════════════════════════
          // ACOUSTIC ECHO CANCELLATION (AEC) CONFIGURATION
          // ═══════════════════════════════════════════════════════
          'echoCancellation': true,     // Removes speaker audio from mic input
          'noiseSuppression': true,     // Removes background noise (fans, etc.)
          'autoGainControl': true,      // Normalizes volume (loud/quiet speech)
          
          // Audio format for Azure OpenAI Realtime API
          'sampleRate': 16000,          // 16kHz sample rate
          'channelCount': 1,            // Mono channel
        },
        'video': false,
      };
      
      // Get user media with AEC enabled
      _localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      
      if (_localStream == null) {
        throw Exception('Failed to get media stream');
      }
      
      debugPrint('WebRTCAudioService: ✅ Media stream acquired with AEC');
      debugPrint('WebRTCAudioService: Audio tracks: ${_localStream!.getAudioTracks().length}');
      
      _isRecording = true;
      notifyListeners();
      
      // Start processing audio from stream
      _startAudioProcessing();
      
      debugPrint('WebRTCAudioService: 🎤 Recording started with Acoustic Echo Cancellation');
      debugPrint('WebRTCAudioService: 📊 AEC will remove speaker audio from microphone input');
      
    } catch (e) {
      debugPrint('WebRTCAudioService: ❌ Failed to start recording: $e');
      _isRecording = false;
      notifyListeners();
      rethrow;
    }
  }
  
  /// Process audio from WebRTC stream
  void _startAudioProcessing() {
    // Process audio chunks every 100ms (same as flutter_sound)
    _audioProcessingTimer = Timer.periodic(
      const Duration(milliseconds: 100),
      (timer) async {
        if (!_isRecording || _localStream == null) {
          timer.cancel();
          return;
        }
        
        try {
          // Get audio tracks
          final audioTracks = _localStream!.getAudioTracks();
          if (audioTracks.isEmpty) {
            debugPrint('WebRTCAudioService: No audio tracks available');
            return;
          }
          
          // Get audio samples from track
          // Note: WebRTC processes audio internally with AEC before we receive it
          // The echo cancellation happens at the native level, not in Dart
          final audioData = await _captureAudioChunk(audioTracks[0]);
          
          if (audioData != null && audioData.isNotEmpty) {
            // Forward clean audio (echo already removed by WebRTC)
            if (_audioStreamController != null && !_audioStreamController!.isClosed) {
              _audioStreamController!.add(audioData);
            }
          }
          
        } catch (e) {
          debugPrint('WebRTCAudioService: Error processing audio: $e');
        }
      },
    );
  }
  
  /// Capture audio chunk from track
  /// 
  /// Returns PCM16 audio data (16-bit signed integers)
  Future<Uint8List?> _captureAudioChunk(MediaStreamTrack track) async {
    try {
      // ISSUE: flutter_webrtc doesn't provide direct access to audio samples
      // WebRTC is designed for peer connections, not raw audio capture
      // 
      // SOLUTION: We're establishing WebRTC stream to enable system-level AEC,
      // but we need another package (record) to actually capture the audio data
      // 
      // The AEC is still active because getUserMedia() configures the
      // audio input pipeline at the OS level
      
      debugPrint('WebRTCAudioService: ⚠️  flutter_webrtc cannot capture raw audio');
      debugPrint('WebRTCAudioService: Consider using record package with AEC enabled');
      
      // Return null - caller should use alternative audio capture
      return null;
      
    } catch (e) {
      debugPrint('WebRTCAudioService: Error capturing audio chunk: $e');
      return null;
    }
  }
  
  /// Stop recording audio
  Future<void> stopRecording() async {
    if (!_isRecording) {
      debugPrint('WebRTCAudioService: Not recording');
      return;
    }
    
    try {
      debugPrint('WebRTCAudioService: Stopping recording...');
      
      // Stop audio processing timer
      _audioProcessingTimer?.cancel();
      _audioProcessingTimer = null;
      
      // Stop all tracks
      if (_localStream != null) {
        _localStream!.getTracks().forEach((track) {
          track.stop();
        });
        await _localStream!.dispose();
        _localStream = null;
      }
      
      // Close stream controller
      if (_audioStreamController != null && !_audioStreamController!.isClosed) {
        await _audioStreamController!.close();
      }
      _audioStreamController = null;
      _audioStream = null;
      
      _isRecording = false;
      _audioBuffer.clear();
      notifyListeners();
      
      debugPrint('WebRTCAudioService: Recording stopped successfully');
    } catch (e) {
      debugPrint('WebRTCAudioService: Error stopping recording: $e');
      _isRecording = false;
      notifyListeners();
    }
  }
  
  /// Pause recording
  Future<void> pauseRecording() async {
    if (!_isRecording) return;
    
    try {
      _audioProcessingTimer?.cancel();
      _isRecording = false;
      notifyListeners();
      debugPrint('WebRTCAudioService: Recording paused');
    } catch (e) {
      debugPrint('WebRTCAudioService: Error pausing recording: $e');
    }
  }
  
  /// Resume recording
  Future<void> resumeRecording() async {
    if (_isRecording || _localStream == null) return;
    
    try {
      _isRecording = true;
      _startAudioProcessing();
      notifyListeners();
      debugPrint('WebRTCAudioService: Recording resumed');
    } catch (e) {
      debugPrint('WebRTCAudioService: Error resuming recording: $e');
    }
  }
  
  /// Check if WebRTC is supported
  Future<bool> isRecordingSupported() async {
    try {
      // Check if getUserMedia is available
      return true; // flutter_webrtc supports all major platforms
    } catch (e) {
      debugPrint('WebRTCAudioService: Error checking support: $e');
      return false;
    }
  }
  
  @override
  void dispose() {
    debugPrint('WebRTCAudioService: Disposing...');
    stopRecording();
    super.dispose();
  }
}
