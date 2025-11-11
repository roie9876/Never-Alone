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
