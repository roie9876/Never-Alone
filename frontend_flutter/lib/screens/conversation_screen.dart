import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/app_state.dart';
import '../widgets/transcript_view.dart';
import '../widgets/audio_waveform.dart';
import '../widgets/photo_overlay.dart';
import '../services/realtime_conversation_manager.dart';
import 'dart:async';

class ConversationScreen extends StatefulWidget {
  const ConversationScreen({super.key});

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  static const String testUserId = 'user-tiferet-001'; // Tiferet Nehemiah profile
  
  // Photo display state
  List<Map<String, dynamic>> _photoQueue = [];
  bool _isShowingPhoto = false;
  Timer? _photoTimer;
  
  @override
  void initState() {
    super.initState();
    
    // Set up photo trigger callback
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final conversationManager = Provider.of<RealtimeConversationManager>(
        context,
        listen: false,
      );
      
      conversationManager.onPhotosTriggered = (photos) {
        debugPrint('📷 ConversationScreen: Received ${photos.length} photos to display');
        setState(() {
          _photoQueue.addAll(photos);
        });
        
        // Start showing photos if not already showing
        if (!_isShowingPhoto && _photoQueue.isNotEmpty) {
          _showNextPhoto();
        }
      };
    });
  }
  
  @override
  void dispose() {
    _photoTimer?.cancel();
    super.dispose();
  }
  
  /// Show next photo from queue
  void _showNextPhoto() {
    if (_photoQueue.isEmpty) {
      setState(() {
        _isShowingPhoto = false;
      });
      return;
    }
    
    setState(() {
      _isShowingPhoto = true;
    });
    
    // Auto-dismiss after 10 seconds
    _photoTimer?.cancel();
    _photoTimer = Timer(const Duration(seconds: 10), () {
      _dismissCurrentPhoto();
    });
  }
  
  /// Dismiss current photo and show next
  void _dismissCurrentPhoto() {
    setState(() {
      if (_photoQueue.isNotEmpty) {
        _photoQueue.removeAt(0);
      }
    });
    
    _photoTimer?.cancel();
    
    if (_photoQueue.isNotEmpty) {
      _showNextPhoto();
    } else {
      setState(() {
        _isShowingPhoto = false;
      });
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: Stack(
        children: [
          // Main conversation UI
          SafeArea(
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
          
          // Photo overlay (shown when photos triggered)
          if (_isShowingPhoto && _photoQueue.isNotEmpty)
            PhotoOverlay(
              photoUrl: _photoQueue.first['url'] ?? '',
              caption: _photoQueue.first['caption'],
              onClose: _dismissCurrentPhoto,
            ),
        ],
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
          const Text(
            'לא לבד',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
            ),
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
    return Consumer2<AppState, RealtimeConversationManager>(
      builder: (context, appState, conversationManager, child) {
        final isConversationActive = conversationManager.isConversationActive;
        final isConnected = conversationManager.isConnected;
        final hasError = conversationManager.lastError != null;
        
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Connection status - only show when there's an actual error
              if (hasError)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error,
                        color: Colors.red,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        conversationManager.lastError!,
                        style: const TextStyle(
                          color: Colors.red,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                ),
              
              // Recording indicator
              if (isConversationActive && conversationManager.isRecording)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Recording...',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              
              // AI speaking indicator
              if (conversationManager.isPlayingAudio)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.volume_up,
                        color: Colors.blue[700],
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'AI speaking...',
                        style: TextStyle(
                          color: Colors.blue[700],
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Start/Stop conversation button
                  ElevatedButton.icon(
                    onPressed: isConnected || isConversationActive
                        ? () async {
                            if (isConversationActive) {
                              await conversationManager.stopConversation();
                              appState.stopListening();
                            } else {
                              try {
                                await conversationManager.startConversation(testUserId);
                                appState.startListening();
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text('Failed to start conversation: $e'),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                }
                              }
                            }
                          }
                        : null,
                    icon: Icon(
                      isConversationActive ? Icons.stop : Icons.mic,
                      size: 32,
                    ),
                    label: Text(
                      isConversationActive ? 'עצור' : 'התחל שיחה',
                      style: const TextStyle(fontSize: 24),
                    ),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(300, 100),
                      backgroundColor: isConversationActive ? Colors.red : Colors.blue,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey,
                      disabledForegroundColor: Colors.white70,
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
