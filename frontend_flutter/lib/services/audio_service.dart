import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';

/// Audio recording service for Realtime API
/// 
/// Handles microphone input with specific requirements:
/// - Format: PCM16 (16-bit Linear PCM)
/// - Sample Rate: 16kHz
/// - Channels: Mono
/// - Chunk size: ~100ms worth of audio
class AudioService extends ChangeNotifier {
  final AudioRecorder _recorder = AudioRecorder();
  
  bool _isRecording = false;
  bool _hasPermission = false;
  
  // Stream for audio chunks
  StreamController<Uint8List>? _audioStreamController;
  Stream<Uint8List>? _audioStream;
  
  // Getters
  bool get isRecording => _isRecording;
  bool get hasPermission => _hasPermission;
  Stream<Uint8List>? get audioStream => _audioStream;
  
  /// Request microphone permission
  Future<bool> requestPermission() async {
    try {
      _hasPermission = await _recorder.hasPermission();
      
      if (!_hasPermission) {
        debugPrint('AudioService: Microphone permission denied');
      } else {
        debugPrint('AudioService: Microphone permission granted');
      }
      
      notifyListeners();
      return _hasPermission;
    } catch (e) {
      debugPrint('AudioService: Error requesting permission: $e');
      return false;
    }
  }
  
  /// Start recording audio
  /// 
  /// Configures recorder for Realtime API requirements:
  /// - PCM16 format
  /// - 16kHz sample rate
  /// - Mono channel
  Future<void> startRecording() async {
    if (_isRecording) {
      debugPrint('AudioService: Already recording');
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
      debugPrint('AudioService: Starting recording...');
      
      // Create stream controller for audio chunks
      _audioStreamController = StreamController<Uint8List>.broadcast();
      _audioStream = _audioStreamController!.stream;
      
      // Configure for PCM16, 16kHz, mono
    const config = RecordConfig(
      encoder: AudioEncoder.pcm16bits,
      sampleRate: 16000,
      numChannels: 1,
      bitRate: 256000,
      echoCancel: true,       // Enable echo cancellation
      autoGain: true,         // Enable automatic gain control
      noiseSuppress: true,    // Enable noise suppression
    );      // Start recording with stream
      final stream = await _recorder.startStream(config);
      
      _isRecording = true;
      notifyListeners();
      
      debugPrint('AudioService: Recording started successfully');
      
      // Listen to audio stream and forward to controller
      stream.listen(
        (data) {
          if (_audioStreamController != null && !_audioStreamController!.isClosed) {
            // Convert List<int> to Uint8List
            final audioData = Uint8List.fromList(data);
            _audioStreamController!.add(audioData);
          }
        },
        onError: (error) {
          debugPrint('AudioService: Stream error: $error');
          stopRecording();
        },
        onDone: () {
          debugPrint('AudioService: Stream done');
          stopRecording();
        },
      );
      
    } catch (e) {
      debugPrint('AudioService: Failed to start recording: $e');
      _isRecording = false;
      notifyListeners();
      rethrow;
    }
  }
  
  /// Stop recording audio
  Future<void> stopRecording() async {
    if (!_isRecording) {
      debugPrint('AudioService: Not recording');
      return;
    }
    
    try {
      debugPrint('AudioService: Stopping recording...');
      
      await _recorder.stop();
      
      // Close stream controller
      if (_audioStreamController != null && !_audioStreamController!.isClosed) {
        await _audioStreamController!.close();
      }
      _audioStreamController = null;
      _audioStream = null;
      
      _isRecording = false;
      notifyListeners();
      
      debugPrint('AudioService: Recording stopped successfully');
    } catch (e) {
      debugPrint('AudioService: Error stopping recording: $e');
      _isRecording = false;
      notifyListeners();
    }
  }
  
  /// Pause recording (if needed)
  Future<void> pauseRecording() async {
    if (!_isRecording) return;
    
    try {
      await _recorder.pause();
      _isRecording = false;
      notifyListeners();
      debugPrint('AudioService: Recording paused');
    } catch (e) {
      debugPrint('AudioService: Error pausing recording: $e');
    }
  }
  
  /// Resume recording
  Future<void> resumeRecording() async {
    if (_isRecording) return;
    
    try {
      await _recorder.resume();
      _isRecording = true;
      notifyListeners();
      debugPrint('AudioService: Recording resumed');
    } catch (e) {
      debugPrint('AudioService: Error resuming recording: $e');
    }
  }
  
  /// Check if recording is supported on this platform
  Future<bool> isRecordingSupported() async {
    try {
      return await _recorder.isEncoderSupported(AudioEncoder.pcm16bits);
    } catch (e) {
      debugPrint('AudioService: Error checking encoder support: $e');
      return false;
    }
  }
  
  @override
  void dispose() {
    debugPrint('AudioService: Disposing...');
    stopRecording();
    _recorder.dispose();
    super.dispose();
  }
}
