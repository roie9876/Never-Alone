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
