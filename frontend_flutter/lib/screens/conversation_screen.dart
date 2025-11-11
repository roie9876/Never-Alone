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
            const Expanded(
              child: TranscriptView(),
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
