class AppConstants {
  // Backend WebSocket URL (update after deployment)
  static const String websocketUrl = 'ws://localhost:3000/realtime';
  
  // Audio settings
  static const int sampleRate = 16000;
  static const String audioFormat = 'pcm16';
  
  // UI settings
  static const double minButtonSize = 80.0;
  static const double largeTextSize = 24.0;
  static const double extraLargeTextSize = 32.0;
}
