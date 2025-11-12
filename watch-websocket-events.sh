#!/bin/bash

# Quick test to see what WebSocket events Flutter is receiving

echo "🔍 Watching for WebSocket events in Flutter console..."
echo ""
echo "Start your Flutter app and trigger stop music."
echo "This will show you every WebSocket event that arrives."
echo ""
echo "Looking for: 🌐 RAW WebSocket Event: \"stop-music\""
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Try to find Flutter log output
if [ -f /tmp/flutter-console.log ]; then
    tail -f /tmp/flutter-console.log | grep --line-buffered "🌐 RAW WebSocket Event"
else
    echo "⚠️  No Flutter log file found at /tmp/flutter-console.log"
    echo ""
    echo "To capture Flutter logs, run your app like this:"
    echo "  flutter run -d macos 2>&1 | tee /tmp/flutter-console.log"
    echo ""
fi
