import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:audioplayers/audioplayers.dart';

/// Audio playback service for AI responses
/// 
/// Handles playing base64-encoded PCM16 audio from Realtime API
class AudioPlaybackService extends ChangeNotifier {
  final AudioPlayer _player = AudioPlayer();
  
  bool _isPlaying = false;
  final List<Uint8List> _audioChunks = [];
  bool _isAccumulating = true;
  DateTime _lastChunkTime = DateTime.now();
  
  // Callbacks
  Function()? onPlaybackComplete;
  
  // Getters
  bool get isPlaying => _isPlaying;
  int get queueSize => _audioChunks.length;
  
  AudioPlaybackService() {
    _setupPlayerListeners();
  }
  
  /// Set up audio player event listeners
  void _setupPlayerListeners() {
    _player.onPlayerStateChanged.listen((state) {
      _isPlaying = state == PlayerState.playing;
      notifyListeners();
      
      // When playback completes, ready for next batch
      if (state == PlayerState.completed) {
        _isAccumulating = true;
        
        // Notify completion callback (to resume recording)
        onPlaybackComplete?.call();
      }
    });
  }
  
  /// Play base64-encoded PCM16 audio
  /// 
  /// [audioBase64] - Base64 encoded PCM16 audio data
  /// Strategy: Accumulate chunks for 500ms, then play as single file
  Future<void> playAudioBase64(String audioBase64) async {
    debugPrint('🔊 AudioPlaybackService: playAudioBase64 called with ${audioBase64.length} chars');
    try {
      // Decode base64 to bytes
      debugPrint('🔊 AudioPlaybackService: Decoding base64...');
      final audioBytes = base64Decode(audioBase64);
      debugPrint('🔊 AudioPlaybackService: Decoded to ${audioBytes.length} bytes');
      
      // Add to accumulation buffer
      _audioChunks.add(audioBytes);
      _lastChunkTime = DateTime.now();
      debugPrint('🔊 AudioPlaybackService: Added chunk. Total chunks: ${_audioChunks.length}');
      
      // If this is the first chunk, start accumulation timer
      if (_audioChunks.length == 1 && _isAccumulating) {
        _startAccumulationTimer();
      }
    } catch (e) {
      debugPrint('AudioPlaybackService: Error queuing audio: $e');
    }
  }
  
  /// Start timer to accumulate chunks before playing
  void _startAccumulationTimer() async {
    // Wait 300ms for chunks to accumulate (reduced from 500ms for lower latency)
    await Future.delayed(Duration(milliseconds: 300));
    
    // Check if more chunks arrived recently (within last 150ms)
    final timeSinceLastChunk = DateTime.now().difference(_lastChunkTime);
    if (timeSinceLastChunk.inMilliseconds < 150 && _audioChunks.length < 50) {
      // Still receiving chunks, wait a bit more
      _startAccumulationTimer();
      return;
    }
    
    // Play accumulated chunks
    if (_audioChunks.isNotEmpty) {
      await _playAccumulatedChunks();
    }
  }
  
  /// Play all accumulated audio chunks as one continuous stream
  Future<void> _playAccumulatedChunks() async {
    if (_audioChunks.isEmpty) return;
    
    try {
      debugPrint('AudioPlaybackService: Playing ${_audioChunks.length} accumulated chunks');
      
      // Combine all chunks into single buffer
      int totalLength = _audioChunks.fold(0, (sum, chunk) => sum + chunk.length);
      final combinedBuffer = Uint8List(totalLength);
      
      int offset = 0;
      for (final chunk in _audioChunks) {
        combinedBuffer.setRange(offset, offset + chunk.length, chunk);
        offset += chunk.length;
      }
      
      debugPrint('AudioPlaybackService: Combined ${_audioChunks.length} chunks into ${totalLength} bytes');
      
      // Clear buffer
      _audioChunks.clear();
      
      // Play the combined audio
      await _playAudioBytes(combinedBuffer);
      
      // Reset for next batch
      _isAccumulating = true;
    } catch (e) {
      debugPrint('AudioPlaybackService: Error playing accumulated chunks: $e');
      _audioChunks.clear();
    }
  }
  
  /// Play audio bytes (converts PCM16 to WAV)
  Future<void> _playAudioBytes(Uint8List audioBytes) async {
    try {
      debugPrint('AudioPlaybackService: Converting ${audioBytes.length} bytes of PCM16 to WAV');
      
      // Convert PCM16 to WAV format
      final wavBytes = _convertPCM16ToWAV(audioBytes);
      
      debugPrint('AudioPlaybackService: Playing ${wavBytes.length} bytes of WAV audio');
      
      // BytesSource doesn't work on macOS/iOS, so write to temp file instead
      final tempDir = Directory.systemTemp;
      final tempFile = File('${tempDir.path}/ai_audio_${DateTime.now().millisecondsSinceEpoch}.wav');
      await tempFile.writeAsBytes(wavBytes);
      
      await _player.play(DeviceFileSource(tempFile.path));
      
      // Schedule cleanup after playback
      Future.delayed(Duration(seconds: 10), () async {
        try {
          if (await tempFile.exists()) {
            await tempFile.delete();
          }
        } catch (e) {
          debugPrint('AudioPlaybackService: Error deleting temp file: $e');
        }
      });
    } catch (e) {
      debugPrint('AudioPlaybackService: Error playing bytes: $e');
      rethrow;
    }
  }
  
  /// Convert raw PCM16 audio to WAV format
  /// 
  /// PCM16 specs from Azure Realtime API:
  /// - Sample rate: 24kHz (24000 Hz)
  /// - Bit depth: 16-bit
  /// - Channels: Mono (1 channel)
  Uint8List _convertPCM16ToWAV(Uint8List pcmData) {
    const int sampleRate = 24000; // Azure Realtime API uses 24kHz
    const int numChannels = 1;    // Mono
    const int bitsPerSample = 16; // 16-bit PCM
    
    final int dataSize = pcmData.length;
    final int fileSize = 36 + dataSize; // Header (44 bytes) - 8 + data
    
    // Create WAV file byte buffer
    final ByteData header = ByteData(44);
    
    // RIFF header
    header.setUint8(0, 0x52); // 'R'
    header.setUint8(1, 0x49); // 'I'
    header.setUint8(2, 0x46); // 'F'
    header.setUint8(3, 0x46); // 'F'
    header.setUint32(4, fileSize, Endian.little);
    
    // WAVE header
    header.setUint8(8, 0x57);  // 'W'
    header.setUint8(9, 0x41);  // 'A'
    header.setUint8(10, 0x56); // 'V'
    header.setUint8(11, 0x45); // 'E'
    
    // fmt subchunk
    header.setUint8(12, 0x66); // 'f'
    header.setUint8(13, 0x6d); // 'm'
    header.setUint8(14, 0x74); // 't'
    header.setUint8(15, 0x20); // ' '
    header.setUint32(16, 16, Endian.little); // Subchunk1Size (16 for PCM)
    header.setUint16(20, 1, Endian.little);  // AudioFormat (1 = PCM)
    header.setUint16(22, numChannels, Endian.little);
    header.setUint32(24, sampleRate, Endian.little);
    header.setUint32(28, sampleRate * numChannels * bitsPerSample ~/ 8, Endian.little); // ByteRate
    header.setUint16(32, numChannels * bitsPerSample ~/ 8, Endian.little); // BlockAlign
    header.setUint16(34, bitsPerSample, Endian.little);
    
    // data subchunk
    header.setUint8(36, 0x64); // 'd'
    header.setUint8(37, 0x61); // 'a'
    header.setUint8(38, 0x74); // 't'
    header.setUint8(39, 0x61); // 'a'
    header.setUint32(40, dataSize, Endian.little);
    
    // Combine header + PCM data
    final wavBytes = Uint8List(44 + dataSize);
    wavBytes.setRange(0, 44, header.buffer.asUint8List());
    wavBytes.setRange(44, 44 + dataSize, pcmData);
    
    return wavBytes;
  }
  
  /// Wait for current playback to complete
  Future<void> _waitForPlaybackComplete() async {
    // Wait until player is no longer playing
    while (_isPlaying) {
      await Future.delayed(const Duration(milliseconds: 100));
    }
  }
  
  /// Stop playback
  Future<void> stop() async {
    try {
      await _player.stop();
      _audioChunks.clear();
      _isAccumulating = true;
      _isPlaying = false;
      notifyListeners();
      debugPrint('AudioPlaybackService: Stopped playback');
    } catch (e) {
      debugPrint('AudioPlaybackService: Error stopping playback: $e');
    }
  }
  
  /// Pause playback
  Future<void> pause() async {
    try {
      await _player.pause();
      debugPrint('AudioPlaybackService: Paused playback');
    } catch (e) {
      debugPrint('AudioPlaybackService: Error pausing playback: $e');
    }
  }
  
  /// Resume playback
  Future<void> resume() async {
    try {
      await _player.resume();
      debugPrint('AudioPlaybackService: Resumed playback');
    } catch (e) {
      debugPrint('AudioPlaybackService: Error resuming playback: $e');
    }
  }
  
  /// Clear audio buffer
  void clearQueue() {
    _audioChunks.clear();
    _isAccumulating = true;
    notifyListeners();
    debugPrint('AudioPlaybackService: Cleared audio buffer');
  }
  
  /// Stop playback immediately (for interruption)
  Future<void> stopPlayback() async {
    debugPrint('AudioPlaybackService: 🛑 Stopping playback for interruption');
    clearQueue();
    await stop();
  }
  
  /// Set volume (0.0 to 1.0)
  Future<void> setVolume(double volume) async {
    try {
      await _player.setVolume(volume.clamp(0.0, 1.0));
      debugPrint('AudioPlaybackService: Set volume to $volume');
    } catch (e) {
      debugPrint('AudioPlaybackService: Error setting volume: $e');
    }
  }
  
  @override
  void dispose() {
    debugPrint('AudioPlaybackService: Disposing...');
    stop();
    _player.dispose();
    super.dispose();
  }
}
