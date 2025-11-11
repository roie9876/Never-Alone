import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';

/// Audio recording service for Realtime API
/// 
/// Uses file-based recording with polling due to macOS stream bug in record v6.0.0
/// 
/// Requirements:
/// - Format: PCM16 (16-bit Linear PCM)
/// - Sample Rate: 16kHz
/// - Channels: Mono
/// - Chunk size: ~100ms worth of audio (3200 bytes)
class AudioService extends ChangeNotifier {
  final AudioRecorder _recorder = AudioRecorder();
  
  bool _isRecording = false;
  bool _hasPermission = false;
  
  // Stream for audio chunks
  StreamController<Uint8List>? _audioStreamController;
  Stream<Uint8List>? _audioStream;
  
  // File-based capture
  String? _tempFilePath;
  int _lastReadPosition = 0;
  Timer? _pollingTimer;
  
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
  
  /// Start recording audio using file-based capture
  /// 
  /// NOTE: Using file recording + polling instead of streaming due to
  /// macOS bug in record v6.0.0 where startStream() never emits data
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
      debugPrint('AudioService: Starting file-based recording...');
      
      // Create stream controller for audio chunks
      _audioStreamController = StreamController<Uint8List>.broadcast();
      _audioStream = _audioStreamController!.stream;
      
      // Get temporary directory for audio file
      final tempDir = await getTemporaryDirectory();
      _tempFilePath = '${tempDir.path}/audio_recording_${DateTime.now().millisecondsSinceEpoch}.pcm';
      _lastReadPosition = 0;
      
      // Configure for PCM16, 16kHz, mono
      const config = RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
        bitRate: 256000,
        echoCancel: true,       // Enable echo cancellation
        autoGain: true,         // Enable automatic gain control
        noiseSuppress: true,    // Enable noise suppression
      );
      
      // Start recording to file
      await _recorder.start(config, path: _tempFilePath!);
      
      _isRecording = true;
      notifyListeners();
      
      debugPrint('AudioService: ✅ Recording started to: $_tempFilePath');
      
      // Start polling timer to read audio chunks from file
      _pollingTimer = Timer.periodic(Duration(milliseconds: 100), (timer) async {
        await _pollAudioFile();
      });
      
      debugPrint('AudioService: ✅ Audio polling started (100ms intervals)');
      
    } catch (e) {
      debugPrint('AudioService: ❌ Failed to start recording: $e');
      _isRecording = false;
      notifyListeners();
      rethrow;
    }
  }
  
  /// Poll audio file for new data
  Future<void> _pollAudioFile() async {
    if (!_isRecording || _tempFilePath == null) return;
    
    try {
      final file = File(_tempFilePath!);
      if (!await file.exists()) return;
      
      // Read entire file
      final allBytes = await file.readAsBytes();
      
      // Extract only NEW bytes since last read
      if (allBytes.length > _lastReadPosition) {
        final newBytes = allBytes.sublist(_lastReadPosition);
        _lastReadPosition = allBytes.length;
        
        // Forward to stream
        if (_audioStreamController != null && !_audioStreamController!.isClosed) {
          _audioStreamController!.add(Uint8List.fromList(newBytes));
          debugPrint('AudioService: 🎙️ Captured ${newBytes.length} bytes (total: ${allBytes.length})');
        }
      }
    } catch (e) {
      debugPrint('AudioService: ⚠️ Error polling audio file: $e');
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
      
      // Cancel polling timer
      _pollingTimer?.cancel();
      _pollingTimer = null;
      
      // Stop recorder
      await _recorder.stop();
      
      // Close stream controller
      if (_audioStreamController != null && !_audioStreamController!.isClosed) {
        await _audioStreamController!.close();
      }
      _audioStreamController = null;
      _audioStream = null;
      
      // Clean up temp file
      if (_tempFilePath != null) {
        try {
          final file = File(_tempFilePath!);
          if (await file.exists()) {
            await file.delete();
            debugPrint('AudioService: ✅ Temp file deleted: $_tempFilePath');
          }
        } catch (e) {
          debugPrint('AudioService: ⚠️ Failed to delete temp file: $e');
        }
        _tempFilePath = null;
        _lastReadPosition = 0;
      }
      
      _isRecording = false;
      notifyListeners();
      
      debugPrint('AudioService: ✅ Recording stopped successfully');
    } catch (e) {
      debugPrint('AudioService: ❌ Error stopping recording: $e');
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
