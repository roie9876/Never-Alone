import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'screens/conversation_screen.dart';
import 'models/app_state.dart';
import 'services/websocket_service.dart';
import 'services/audio_service.dart';
import 'services/audio_playback_service.dart';
import 'services/realtime_conversation_manager.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        // Core services
        ChangeNotifierProvider(create: (_) => WebSocketService()),
        ChangeNotifierProvider(create: (_) => AudioService()),
        ChangeNotifierProvider(create: (_) => AudioPlaybackService()),
        
        // Conversation manager (depends on other services)
        ChangeNotifierProxyProvider3<WebSocketService, AudioService, AudioPlaybackService, RealtimeConversationManager>(
          create: (context) => RealtimeConversationManager(
            websocketService: context.read<WebSocketService>(),
            audioService: context.read<AudioService>(),
            playbackService: context.read<AudioPlaybackService>(),
          ),
          update: (context, ws, audio, playback, previous) =>
              previous ?? RealtimeConversationManager(
                websocketService: ws,
                audioService: audio,
                playbackService: playback,
              ),
        ),
        
        // App state (legacy, can be removed later)
        ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: const NeverAloneApp(),
    ),
  );
}

class NeverAloneApp extends StatelessWidget {
  const NeverAloneApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'לא לבד',
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
