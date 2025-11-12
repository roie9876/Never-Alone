# 🎙️ Audio Testing Guide - Complete Validation

**Date:** November 12, 2025  
**Purpose:** Comprehensive audio capture and playback testing for Flutter app  
**Status:** Ready to Execute

---

## 📊 Current State

### ✅ Already Complete
- Backend Realtime API integration working
- Flutter app running on macOS
- WebSocket connection established
- Audio services implemented (file-based recording with polling)

### 🎯 What We're Testing Now
1. **Audio Capture Quality** - Is microphone recording clear PCM16 audio?
2. **Audio Streaming** - Are chunks being sent to backend correctly?
3. **Backend Reception** - Does backend receive and forward audio to Azure?
4. **Azure Response** - Does Azure OpenAI return audio correctly?
5. **Audio Playback** - Does AI voice play smoothly in Flutter?
6. **End-to-End Latency** - How long from user speech to AI response?

---

## 🔧 Test Setup (5 minutes)

### Prerequisites Check
```bash
# 1. Backend must be running
ps aux | grep "npm run start:dev" | grep -v grep
# Expected: Should see backend process

# 2. Flutter app must be running
ps aux | grep "never_alone_app" | grep -v grep
# Expected: Should see Flutter process

# 3. Backend logs should show Realtime API ready
curl http://localhost:3000/health 2>/dev/null
# Expected: "OK" or health status
```

### If Backend Not Running
```bash
cd /Users/robenhai/Never\ Alone
./start.sh
# Wait for: "✅ Server running on: http://localhost:3000"
```

### If Flutter App Not Running
```bash
cd /Users/robenhai/Never\ Alone/frontend_flutter
flutter run -d macos

# Wait for app window to appear
```

---

## 🎯 Test 1: Audio Capture Validation (10 minutes)

### Objective
Verify microphone captures audio and records to temporary WAV file.

### Steps
1. **Start Conversation**
   - Click "התחל שיחה" (Start Conversation) in Flutter app
   - Watch terminal for: `AudioService: Recording started`

2. **Speak Test Phrase**
   - Say clearly in Hebrew: "שלום, קוראים לי תפארת"
   - Speak for 3-5 seconds
   - Watch for: `AudioService: Polling file at: /var/folders/.../temp_recording.wav`

3. **Check Audio File**
   ```bash
   # Find the temp file
   ls -lh /var/folders/*/T/audio_recordings/*.wav 2>/dev/null || \
   ls -lh ~/Library/Application\ Support/com.example.neverAloneApp/*.wav 2>/dev/null
   
   # Expected output:
   # -rw-r--r-- 1 robenhai staff 64K Nov 12 14:23 temp_recording.wav
   # File size should grow while speaking
   ```

4. **Play Audio Back (Optional)**
   ```bash
   # Find the exact path from Flutter logs, then:
   afplay /path/to/temp_recording.wav
   
   # Expected: Should hear your voice clearly
   # Quality check: No distortion, clear words, proper volume
   ```

### Expected Results
- ✅ Terminal shows: `AudioService: Recording started`
- ✅ Terminal shows: `AudioService: Read X bytes from file`
- ✅ Terminal shows: `AudioService: Sending audio chunk (X bytes)`
- ✅ Temp WAV file exists and grows during recording
- ✅ Playback sounds clear (if tested manually)

### Troubleshooting
**If no file created:**
- Check microphone permission: System Settings → Privacy → Microphone → Allow never_alone_app
- Restart Flutter app after granting permission

**If file is empty (0 bytes):**
- Microphone might not be default input device
- Check: System Settings → Sound → Input → Select correct microphone

**If file has distortion:**
- Reduce microphone input volume
- Check: System Settings → Sound → Input → Reduce input volume slider

---

## 🎯 Test 2: Audio Chunk Streaming (10 minutes)

### Objective
Verify audio chunks are sent to backend via WebSocket.

### Steps
1. **Monitor Backend Logs**
   ```bash
   # Open second terminal
   tail -f /Users/robenhai/Never\ Alone/backend/logs/app.log 2>/dev/null || \
   echo "Watching backend terminal output..."
   ```

2. **Start Recording in Flutter**
   - Click "התחל שיחה"
   - Speak for 5 seconds: "שלום, אני תפארת, קוראים לי תפארת בת שמונים"

3. **Watch Both Terminals**
   
   **Flutter Terminal Should Show:**
   ```
   AudioService: Recording started
   AudioService: Polling file at: /var/.../temp_recording.wav
   AudioService: Read 3200 bytes from file (position: 0 -> 3200)
   AudioService: Sending audio chunk (3200 bytes)
   WebSocketService: Emitting audio-chunk event (3200 bytes)
   AudioService: Read 3200 bytes from file (position: 3200 -> 6400)
   AudioService: Sending audio chunk (3200 bytes)
   WebSocketService: Emitting audio-chunk event (3200 bytes)
   ... (repeats every ~100ms)
   ```
   
   **Backend Terminal Should Show:**
   ```
   [RealtimeGateway] Client audio-chunk received (3200 bytes)
   [RealtimeService] Forwarding audio chunk to Azure OpenAI (3200 bytes)
   [RealtimeGateway] Client audio-chunk received (3200 bytes)
   [RealtimeService] Forwarding audio chunk to Azure OpenAI (3200 bytes)
   ... (repeats for each chunk)
   ```

4. **Stop Recording**
   - Click "עצור שיחה" (Stop Conversation)
   - Watch for: `AudioService: commit-audio emitted`
   - Backend should show: `[RealtimeGateway] Client commit-audio received`

### Expected Results
- ✅ Flutter sends chunks every ~100ms (3200 bytes each)
- ✅ Backend receives all chunks (count matches Flutter sent count)
- ✅ Backend forwards chunks to Azure OpenAI immediately
- ✅ No "buffer overflow" or "connection lost" errors
- ✅ commit-audio signal sent when user stops speaking

### Metrics to Record
| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Chunk send frequency | ~10 chunks/sec | ___ | ___ |
| Chunk size | 3200 bytes | ___ | ___ |
| Backend reception delay | <50ms | ___ ms | ___ |
| Chunks lost | 0 | ___ | ___ |

### Troubleshooting
**If chunks not reaching backend:**
- Check WebSocket connection: Look for `WebSocketService: Connected successfully`
- Verify backend URL: Should be `http://localhost:3000`
- Check for errors in Flutter console

**If chunks delayed (>200ms):**
- Check system CPU usage (Activity Monitor)
- Close other applications
- Reduce polling frequency in AudioService (change 100ms → 150ms)

---

## 🎯 Test 3: Azure OpenAI Response (15 minutes)

### Objective
Verify Azure OpenAI receives audio, transcribes, and returns AI response.

### Steps
1. **Start Fresh Session**
   ```bash
   # In Flutter: Click "התחל שיחה"
   # Backend terminal should show:
   ```
   ```
   [RealtimeService] Creating Azure OpenAI session for user: user-tiferet-001
   [RealtimeService] ✅ Session created successfully
   [RealtimeService] WebSocket connection to Azure established
   ```

2. **Speak Full Test Phrase**
   - Speak clearly: "שלום, קוראים לי תפארת, אני בת שמונים, ויש לי נכדה בשם רחלי"
   - Speak at normal pace (not too fast)
   - Allow 2-3 seconds of silence after finishing

3. **Watch Backend Logs for Azure Response**
   
   **Expected sequence:**
   ```
   [RealtimeService] User audio input complete (commit-audio)
   [RealtimeService] Azure event: conversation.item.input_audio_transcription.completed
   [RealtimeService] User transcript: "שלום, קוראים לי תפארת..."
   [RealtimeService] Azure event: response.audio_transcript.delta
   [RealtimeService] AI transcript: "שלום תפארת..."
   [RealtimeService] Azure event: response.audio.delta
   [RealtimeService] Forwarding AI audio chunk to client (X bytes)
   [RealtimeService] Azure event: response.audio.done
   [RealtimeService] ✅ AI response complete
   ```

4. **Verify Transcript in Flutter UI**
   - Flutter app should display:
     ```
     תפארת: שלום, קוראים לי תפארת, אני בת שמונים, ויש לי נכדה בשם רחלי
     AI: שלום תפארת! נעים להכיר. איזה נחמד שיש לך נכדה בשם רחלי! ספרי לי עליה...
     ```

### Expected Results
- ✅ Azure receives audio within 1 second of commit-audio
- ✅ User transcript appears in backend logs (Hebrew correctly displayed)
- ✅ AI response generated (Hebrew transcript)
- ✅ AI audio chunks sent to Flutter
- ✅ Transcript displayed in Flutter UI (both user and AI)

### Key Metrics
| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Azure connection time | <2s | ___ s | ___ |
| Transcription accuracy | 95%+ | ___% | ___ |
| AI response latency | <3s | ___ s | ___ |
| Hebrew display | Correct | ___ | ___ |

### Troubleshooting
**If Azure connection fails:**
- Check Azure OpenAI key: `echo $AZURE_OPENAI_KEY` (should not be empty)
- Verify deployment name: Should be `gpt-4o-realtime-preview`
- Check Azure quota: May have hit rate limit

**If transcription is gibberish:**
- Audio format issue - verify PCM16 16kHz
- Check audio file quality (Test 1)
- Increase microphone input volume

**If AI doesn't respond:**
- Check backend logs for Azure errors
- Verify system prompt loaded correctly
- Check token usage (may have exceeded limit)

---

## 🎯 Test 4: Audio Playback Quality (10 minutes)

### Objective
Verify AI voice plays clearly and smoothly in Flutter.

### Steps
1. **Trigger AI Response**
   - Ask a simple question: "מה השעה?" (What time is it?)
   - Wait for AI audio response

2. **Listen Carefully**
   - Check for: Clear voice, no distortion, no robotic sound
   - Verify: Hebrew pronunciation correct
   - Volume: Comfortable level (not too loud/quiet)

3. **Check Flutter Logs**
   ```
   AudioPlaybackService: Received audio chunk (X bytes)
   AudioPlaybackService: Playing audio file: /var/.../ai_response_XXX.wav
   AudioPlaybackService: Playback started
   AudioPlaybackService: Playback completed
   ```

4. **Test Interruption**
   - While AI is speaking, start speaking yourself
   - Expected: AI should pause/stop (interruption handling)

### Expected Results
- ✅ AI voice plays immediately after response received
- ✅ Voice is clear, natural, conversational
- ✅ Hebrew pronunciation correct
- ✅ No audio glitches or stuttering
- ✅ Volume appropriate (not distorted)
- ✅ Can interrupt AI by speaking (if implemented)

### Audio Quality Checklist
- [ ] Voice gender correct (should be warm, female-like)
- [ ] Speaking pace appropriate for elderly (not too fast)
- [ ] Emotional tone matches context (warm, empathetic)
- [ ] Background noise minimal
- [ ] No echo or reverb
- [ ] Hebrew intonation natural (not flat/robotic)

### Troubleshooting
**If no audio plays:**
- Check system volume (not muted)
- Verify audioplayers package installed: `flutter pub get`
- Check for playback errors in Flutter logs

**If audio is distorted:**
- May need WAV header (see TASK_5.2_STATUS.md mitigation)
- Check sample rate: Should be 16kHz or 24kHz
- Reduce system volume

**If audio cuts off:**
- Check chunk reassembly in AudioPlaybackService
- Verify all chunks received before playback
- Increase buffer size

---

## 🎯 Test 5: End-to-End Latency (10 minutes)

### Objective
Measure total latency from user stops speaking to AI starts speaking.

### Methodology
Use stopwatch or phone timer to measure:
1. **Start timing:** When you STOP speaking (last word ends)
2. **Stop timing:** When AI audio STARTS playing (first sound heard)
3. **Record result:** Time in seconds (e.g., 2.3s)

### Test Phrases (Run 5 times each)

**Short phrase (2 seconds):**
- "שלום" (Hello)
- Expected latency: <2s

**Medium phrase (4 seconds):**
- "מה השעה?" (What time is it?)
- Expected latency: <3s

**Long phrase (8 seconds):**
- "ספרי לי משהו על העבר שלי" (Tell me something about my past)
- Expected latency: <4s

### Results Table
| Test # | Phrase Length | Latency (seconds) | Pass (<4s)? | Notes |
|--------|---------------|-------------------|-------------|-------|
| 1 | Short | ___ | ___ | ___ |
| 2 | Short | ___ | ___ | ___ |
| 3 | Medium | ___ | ___ | ___ |
| 4 | Medium | ___ | ___ | ___ |
| 5 | Long | ___ | ___ | ___ |

**Average Latency:** ___ seconds  
**P95 Latency:** ___ seconds (95% of requests faster than this)

### Target vs. Actual
| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Average latency | <3s | ___ s | ___ |
| P95 latency | <4s | ___ s | ___ |
| Maximum latency | <6s | ___ s | ___ |

### Latency Breakdown (if high)
Use backend logs timestamps to identify bottlenecks:

```
[14:30:00.000] User stops speaking (commit-audio)
[14:30:00.500] Azure receives audio (+500ms)
[14:30:02.200] Azure response starts (+1700ms)
[14:30:02.400] First audio chunk to Flutter (+200ms)
[14:30:02.500] Flutter starts playback (+100ms)
---
TOTAL: 2.5 seconds
```

**Breakdown:**
- Audio upload: 500ms (acceptable if <1s)
- Azure processing: 1700ms (acceptable if <2.5s)
- Network transfer: 200ms (acceptable if <500ms)
- Flutter playback: 100ms (acceptable if <200ms)

### Optimization Actions (if latency >4s)
1. **If audio upload >1s:** Reduce chunk size or increase send frequency
2. **If Azure processing >3s:** Check model deployment (may need higher throughput tier)
3. **If network transfer >500ms:** Check WiFi quality, restart router
4. **If Flutter playback >500ms:** Optimize AudioPlaybackService buffering

---

## 🎯 Test 6: Stress Test - Long Conversation (15 minutes)

### Objective
Verify audio system handles extended conversation without degradation.

### Steps
1. **Start Conversation**
   - Click "התחל שיחה"

2. **Have Natural Conversation (20 turns)**
   - User: "שלום, מה שלומך?"
   - Wait for AI response
   - User: "ספרי לי על הנכדה שלי רחלי"
   - Wait for AI response
   - Continue for 10 minutes (aim for 20 turns total)

3. **Monitor During Conversation**
   - CPU usage (Activity Monitor): Should stay <50%
   - Memory usage: Should not grow significantly
   - Audio quality: Should remain consistent
   - Latency: Should not increase over time

4. **Check for Issues**
   - Audio glitches after 5+ minutes?
   - Memory leaks (RAM usage climbing)?
   - Connection drops?
   - Transcript display overflow?

### Expected Results
- ✅ All 20 turns complete without errors
- ✅ Audio quality consistent throughout
- ✅ Latency stable (no increase over time)
- ✅ Memory usage stable (<500MB growth)
- ✅ CPU usage reasonable (<50% average)
- ✅ No WebSocket disconnections
- ✅ Transcript scrolls smoothly

### Metrics to Record
| Metric | Start | After 10 turns | After 20 turns |
|--------|-------|----------------|----------------|
| CPU usage (%) | ___ | ___ | ___ |
| Memory (MB) | ___ | ___ | ___ |
| Latency (s) | ___ | ___ | ___ |
| Audio glitches | 0 | ___ | ___ |

---

## 📊 Final Test Results Summary

### Test Completion Checklist
- [ ] Test 1: Audio Capture Validation (PASS/FAIL: ___)
- [ ] Test 2: Audio Chunk Streaming (PASS/FAIL: ___)
- [ ] Test 3: Azure OpenAI Response (PASS/FAIL: ___)
- [ ] Test 4: Audio Playback Quality (PASS/FAIL: ___)
- [ ] Test 5: End-to-End Latency (PASS/FAIL: ___)
- [ ] Test 6: Stress Test (PASS/FAIL: ___)

### Overall Assessment
**Audio System Status:** ⏳ PASS / ❌ FAIL  
**Ready for MVP Launch:** ⏳ YES / ❌ NO (needs fixes)

### Critical Issues Found
1. ___ (High Priority)
2. ___ (Medium Priority)
3. ___ (Low Priority)

### Action Items
- [ ] Fix issue #1: ___
- [ ] Fix issue #2: ___
- [ ] Optimize: ___
- [ ] Document: ___

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅
1. **Update documentation:**
   ```bash
   echo "✅ Audio testing complete - ALL PASS" >> /Users/robenhai/Never\ Alone/docs/AUDIO_TEST_RESULTS.md
   ```

2. **Mark Task 5.2 complete:**
   - Update PROGRESS_TRACKER.md
   - Update IMPLEMENTATION_TASKS.md
   - Create TASK_5.2_AUDIO_COMPLETE.md

3. **Move to Test Scenario 2:** Medication Reminders

### If Tests Fail ❌
1. **Document failures:**
   - Which test failed?
   - What was the error?
   - Backend logs showing issue

2. **Create bug report:**
   ```bash
   # Create detailed bug report
   cat > /Users/robenhai/Never\ Alone/docs/BUG_AUDIO_ISSUE.md << 'EOF'
   # 🐛 Audio Issue Report
   
   **Test:** ___
   **Failure:** ___
   **Backend Logs:** ___
   **Expected:** ___
   **Actual:** ___
   EOF
   ```

3. **Prioritize fix:**
   - Critical (blocks launch): Fix immediately
   - High (degrades UX): Fix before launch
   - Medium (minor issue): Document as known issue

---

## 📞 Need Help?

**If stuck, check these common issues:**

1. **No microphone permission:**
   - System Settings → Privacy → Microphone → Enable never_alone_app

2. **Backend not connecting to Azure:**
   ```bash
   # Check Azure OpenAI credentials
   cd /Users/robenhai/Never\ Alone/backend
   grep AZURE_OPENAI .env
   # Verify key is not empty
   ```

3. **Audio file not created:**
   ```bash
   # Check Flutter logs for permission errors
   flutter logs | grep -i "permission\|audio"
   ```

4. **WebSocket connection fails:**
   ```bash
   # Verify backend is running
   curl http://localhost:3000/health
   # Should return: OK
   ```

---

**Created:** November 12, 2025  
**Last Updated:** November 12, 2025  
**Ready to Start Testing!** 🎉
