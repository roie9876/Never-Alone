// TODO: Re-implement with working audio recording package in Task 5.2
// Temporarily disabled due to record_linux compatibility issue

class AudioService {
  bool _isRecording = false;
  
  bool get isRecording => _isRecording;
  
  Future<bool> requestPermission() async {
    // TODO: Implement actual permission check in Task 5.2
    // For now, assume permission granted for UI testing
    return true;
  }
  
  Future<void> startRecording() async {
    if (!await requestPermission()) {
      throw Exception('Microphone permission denied');
    }
    
    // TODO: Implement actual recording in Task 5.2
    // This is just a stub for UI testing
    _isRecording = true;
    print('AudioService: Recording started (stub)');
  }
  
  Future<String?> stopRecording() async {
    // TODO: Implement actual recording stop in Task 5.2
    _isRecording = false;
    print('AudioService: Recording stopped (stub)');
    return null;
  }
  
  void dispose() {
    // TODO: Implement cleanup in Task 5.2
  }
}
