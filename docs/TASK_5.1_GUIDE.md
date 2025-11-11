# 🚀 Task 5.1: Flutter Mac Desktop Setup - Getting Started

**Status:** Ready to Start  
**Estimated Time:** 6-8 hours  
**Priority:** P0 (Critical)  
**Dependencies:** None  

---

## 📋 Overview

This task initializes the Never Alone Mac desktop application using Flutter. This will be the primary user interface for elderly patients to interact with the AI companion.

**What we're building:**
- Native macOS desktop app
- Microphone access for voice input
- Audio playback for AI responses
- Basic UI layout with accessibility features
- WebSocket client skeleton (detailed implementation in Task 5.2)

---

## ✅ Prerequisites

### 1. Install Flutter SDK (if not already installed)

```bash
# Download Flutter SDK
cd ~
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:`pwd`/flutter/bin"

# Add to ~/.zshrc permanently
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.zshrc
source ~/.zshrc

# Verify installation
flutter --version
flutter doctor
```

Expected output:
```
Flutter 3.x.x • channel stable
Framework • revision xxx
Engine • revision xxx
Tools • Dart 3.x.x
```

### 2. Install Xcode (for macOS development)

```bash
# Check if Xcode is installed
xcode-select -p

# If not installed, download from App Store or:
xcode-select --install

# Accept Xcode license
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

### 3. Enable macOS Desktop Support

```bash
flutter config --enable-macos-desktop
flutter doctor
```

Should show:
```
[✓] Flutter (Channel stable, 3.x.x)
[✓] Xcode - develop for iOS and macOS
[✓] Chrome - develop for the web
```

---

## 🏗️ Step-by-Step Implementation

### Step 1: Create Flutter Project (15 minutes)

```bash
# Navigate to project root
cd /Users/robenhai/Never\ Alone

# Create Flutter project with macOS support
flutter create --platforms=macos --org=com.neveralone --project-name=never_alone_app frontend_flutter

# Navigate to new project
cd frontend_flutter

# Verify it runs
flutter run -d macos
```

**Expected:** Empty Flutter app opens on macOS with counter demo.

---

### Step 2: Configure macOS Entitlements (30 minutes)

**File:** `macos/Runner/DebugProfile.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.app-sandbox</key>
	<true/>
	<key>com.apple.security.cs.allow-jit</key>
	<true/>
	<key>com.apple.security.network.server</key>
	<true/>
	<key>com.apple.security.network.client</key>
	<true/>
	<!-- MICROPHONE ACCESS -->
	<key>com.apple.security.device.audio-input</key>
	<true/>
	<!-- CAMERA ACCESS (for future photo features) -->
	<key>com.apple.security.device.camera</key>
	<true/>
	<!-- FILE ACCESS (for audio playback) -->
	<key>com.apple.security.files.user-selected.read-write</key>
	<true/>
</dict>
</plist>
```

**File:** `macos/Runner/Release.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.app-sandbox</key>
	<true/>
	<key>com.apple.security.network.client</key>
	<true/>
	<key>com.apple.security.network.server</key>
	<true/>
	<key>com.apple.security.device.audio-input</key>
	<true/>
	<key>com.apple.security.device.camera</key>
	<true/>
</dict>
</plist>
```

**File:** `macos/Runner/Info.plist` (add microphone usage description)

```xml
<!-- Add inside <dict> tag -->
<key>NSMicrophoneUsageDescription</key>
<string>Never Alone needs microphone access to hear your voice and have conversations with you.</string>
<key>NSCameraUsageDescription</key>
<string>Never Alone may use the camera for future video features.</string>
```

---

### Step 3: Add Dependencies (15 minutes)

**File:** `pubspec.yaml`

```yaml
name: never_alone_app
description: AI companion for elderly and dementia patients
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # UI & Styling
  cupertino_icons: ^1.0.2
  google_fonts: ^6.1.0
  
  # WebSocket for Realtime API
  web_socket_channel: ^2.4.0
  
  # Audio recording & playback
  record: ^5.0.4
  audioplayers: ^5.2.1
  
  # State management
  provider: ^6.1.1
  
  # HTTP requests
  http: ^1.1.2
  
  # Utilities
  path_provider: ^2.1.1
  intl: ^0.18.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  
  assets:
    - assets/images/
    - assets/audio/
```

**Install dependencies:**

```bash
flutter pub get
```

---

### Step 4: Create Project Structure (30 minutes)

```bash
cd lib

# Create directory structure
mkdir -p screens widgets services models utils

# Create initial files
touch screens/conversation_screen.dart
touch screens/settings_screen.dart
touch widgets/transcript_view.dart
touch widgets/audio_waveform.dart
touch widgets/photo_overlay.dart
touch services/websocket_service.dart
touch services/audio_service.dart
touch models/conversation_turn.dart
touch models/app_state.dart
touch utils/constants.dart
```

---

### Step 5: Implement Basic UI Layout (2-3 hours)

**File:** `lib/main.dart`

```dart
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'screens/conversation_screen.dart';
import 'models/app_state.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => AppState(),
      child: const NeverAloneApp(),
    ),
  );
}

class NeverAloneApp extends StatelessWidget {
  const NeverAloneApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Never Alone',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        // High contrast theme for elderly users
        brightness: Brightness.light,
        primarySwatch: Colors.blue,
        textTheme: GoogleFonts.notoSansHebrewTextTheme(
          Theme.of(context).textTheme.apply(
            bodyColor: Colors.black,
            displayColor: Colors.black,
          ),
        ).copyWith(
          // Large text for accessibility
          bodyLarge: const TextStyle(fontSize: 24, fontWeight: FontWeight.w500),
          bodyMedium: const TextStyle(fontSize: 20),
          headlineMedium: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            minimumSize: const Size(200, 80), // Large buttons
            textStyle: const TextStyle(fontSize: 24),
          ),
        ),
      ),
      home: const ConversationScreen(),
    );
  }
}
```

**File:** `lib/screens/conversation_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';
import '../widgets/transcript_view.dart';
import '../widgets/audio_waveform.dart';

class ConversationScreen extends StatefulWidget {
  const ConversationScreen({super.key});

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: SafeArea(
        child: Column(
          children: [
            // Header with title
            _buildHeader(),
            
            // Transcript view (scrollable)
            Expanded(
              child: const TranscriptView(),
            ),
            
            // Audio waveform visualization
            const AudioWaveform(),
            
            // Control buttons
            _buildControls(),
          ],
        ),
      ),
    );
  }
  
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Never Alone', // Hebrew: לעולם לא לבד
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          IconButton(
            icon: const Icon(Icons.settings, size: 32),
            onPressed: () {
              // Navigate to settings (Task 5.3)
            },
          ),
        ],
      ),
    );
  }
  
  Widget _buildControls() {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.1),
                blurRadius: 4,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Start/Stop conversation button
              ElevatedButton.icon(
                onPressed: () {
                  // TODO: Implement in Task 5.2
                  if (appState.isListening) {
                    appState.stopListening();
                  } else {
                    appState.startListening();
                  }
                },
                icon: Icon(
                  appState.isListening ? Icons.stop : Icons.mic,
                  size: 32,
                ),
                label: Text(
                  appState.isListening ? 'עצור' : 'התחל שיחה',
                  style: const TextStyle(fontSize: 24),
                ),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(300, 100),
                  backgroundColor: appState.isListening ? Colors.red : Colors.blue,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
```

**File:** `lib/widgets/transcript_view.dart`

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';
import '../models/conversation_turn.dart';

class TranscriptView extends StatelessWidget {
  const TranscriptView({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        if (appState.transcript.isEmpty) {
          return Center(
            child: Text(
              'לחץ על "התחל שיחה" כדי להתחיל',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                color: Colors.grey[600],
              ),
              textAlign: TextAlign.center,
            ),
          );
        }
        
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: appState.transcript.length,
          itemBuilder: (context, index) {
            final turn = appState.transcript[index];
            return _buildTranscriptBubble(context, turn);
          },
        );
      },
    );
  }
  
  Widget _buildTranscriptBubble(BuildContext context, ConversationTurn turn) {
    final isUser = turn.speaker == 'user';
    
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.all(16),
        constraints: const BoxConstraints(maxWidth: 600),
        decoration: BoxDecoration(
          color: isUser ? Colors.blue[100] : Colors.grey[300],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isUser ? 'אתה' : 'נורה', // "You" / "Nora"
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              turn.transcript,
              style: const TextStyle(fontSize: 22),
            ),
            const SizedBox(height: 4),
            Text(
              _formatTime(turn.timestamp),
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  String _formatTime(DateTime timestamp) {
    return '${timestamp.hour}:${timestamp.minute.toString().padLeft(2, '0')}';
  }
}
```

**File:** `lib/widgets/audio_waveform.dart`

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';

class AudioWaveform extends StatelessWidget {
  const AudioWaveform({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        if (!appState.isListening) {
          return const SizedBox.shrink();
        }
        
        return Container(
          height: 80,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(20, (index) {
              return Container(
                width: 8,
                height: 40 + (index % 3) * 20.0, // Simple animation placeholder
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: Colors.blue,
                  borderRadius: BorderRadius.circular(4),
                ),
              );
            }),
          ),
        );
      },
    );
  }
}
```

**File:** `lib/models/conversation_turn.dart`

```dart
class ConversationTurn {
  final String speaker; // 'user' or 'assistant'
  final String transcript;
  final DateTime timestamp;

  ConversationTurn({
    required this.speaker,
    required this.transcript,
    required this.timestamp,
  });

  factory ConversationTurn.fromJson(Map<String, dynamic> json) {
    return ConversationTurn(
      speaker: json['speaker'] as String,
      transcript: json['transcript'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'speaker': speaker,
      'transcript': transcript,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}
```

**File:** `lib/models/app_state.dart`

```dart
import 'package:flutter/foundation.dart';
import 'conversation_turn.dart';

class AppState extends ChangeNotifier {
  bool _isListening = false;
  List<ConversationTurn> _transcript = [];
  
  bool get isListening => _isListening;
  List<ConversationTurn> get transcript => _transcript;
  
  void startListening() {
    _isListening = true;
    notifyListeners();
    // TODO: Implement actual audio recording in Task 5.2
  }
  
  void stopListening() {
    _isListening = false;
    notifyListeners();
  }
  
  void addTranscriptTurn(ConversationTurn turn) {
    _transcript.add(turn);
    notifyListeners();
  }
  
  void clearTranscript() {
    _transcript.clear();
    notifyListeners();
  }
}
```

**File:** `lib/utils/constants.dart`

```dart
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
```

---

### Step 6: Test Basic UI (30 minutes)

```bash
# Run the app
flutter run -d macos

# Hot reload changes
# Press 'r' in terminal after code changes
```

**Test checklist:**
- ✅ App opens without errors
- ✅ Hebrew text displays correctly
- ✅ "התחל שיחה" (Start conversation) button visible
- ✅ Button changes to "עצור" (Stop) when clicked
- ✅ Large text is readable
- ✅ High contrast UI

---

### Step 7: Request Microphone Permissions (1 hour)

**File:** `lib/services/audio_service.dart`

```dart
import 'package:record/record.dart';

class AudioService {
  final AudioRecorder _recorder = AudioRecorder();
  bool _isRecording = false;
  
  bool get isRecording => _isRecording;
  
  Future<bool> requestPermission() async {
    final hasPermission = await _recorder.hasPermission();
    return hasPermission;
  }
  
  Future<void> startRecording() async {
    if (!await requestPermission()) {
      throw Exception('Microphone permission denied');
    }
    
    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
      ),
    );
    
    _isRecording = true;
  }
  
  Future<String?> stopRecording() async {
    final path = await _recorder.stop();
    _isRecording = false;
    return path;
  }
  
  void dispose() {
    _recorder.dispose();
  }
}
```

**Test:**

```bash
flutter run -d macos
# Click "התחל שיחה" button
# You should see a macOS permission dialog
```

---

## ✅ Acceptance Criteria Checklist

Before marking Task 5.1 complete, verify:

- [✓] App runs on macOS in debug mode
- [⚠️] Microphone permission dialog appears (disabled temporarily - will implement in Task 5.2)
- [✓] Basic UI layout displays correctly
- [✓] Hebrew text renders properly
- [✓] Large buttons are accessible (min 80x80 points)
- [✓] High contrast theme applied
- [✓] "Start/Stop" conversation button works (state management)
- [✓] Transcript view placeholder visible
- [✓] No console errors or warnings (only info: "Running with merged UI and platform thread")

**Status:** 8/9 criteria met (microphone permission deferred to Task 5.2 with proper audio library)

---

## 📊 Time Breakdown

| Task | Estimated | Notes |
|------|-----------|-------|
| Install Flutter SDK | 30 min | If not already installed |
| Create project | 15 min | `flutter create` |
| Configure entitlements | 30 min | Microphone access |
| Add dependencies | 15 min | `pubspec.yaml` |
| Project structure | 30 min | Folders and files |
| Basic UI implementation | 3 hours | Screens, widgets, state |
| Test UI | 30 min | Hot reload testing |
| Microphone permissions | 1 hour | Audio service skeleton |
| **TOTAL** | **6-7 hours** | |

---

## 🔗 Next Steps

After completing Task 5.1, you'll be ready for:

**Task 5.2: Realtime API WebSocket Client** (8-10 hours)
- Implement WebSocket connection to backend
- Send audio input via WebSocket
- Receive and play AI audio responses
- Display live transcript

---

## 📚 References

- [Flutter macOS Setup](https://docs.flutter.dev/platform-integration/macos/building)
- [UX Design](../docs/product/ux-design.md)
- [Realtime API Integration](../docs/technical/realtime-api-integration.md)

---

## 🆘 Troubleshooting

### Issue: `flutter: command not found`
**Solution:** Add Flutter to PATH in `~/.zshrc`

### Issue: Microphone permission not requested
**Solution:** Check entitlements files and Info.plist

### Issue: Hebrew text displays as boxes
**Solution:** Ensure `google_fonts` package is installed with Noto Sans Hebrew

---

*Task 5.1 Guide created: November 11, 2025*
