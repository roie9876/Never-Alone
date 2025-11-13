# 🐛 Debug Guide: Music Stop Not Working

## Quick Diagnosis Steps

### Step 1: Check if AI is calling stop_music function

When you say "stop music", check the **Flutter console** for these logs:

```
🎵🎵🎵 WebSocketService: ===== STOP MUSIC EVENT RECEIVED =====
🎵 WebSocketService: Reason: user requested
```

**If you see these logs**: ✅ Backend is working, problem is in Flutter's AppleScript execution
**If you DON'T see these logs**: ❌ Problem is with AI not calling the function

### Step 2: Check backend logs

In a terminal, run:
```bash
tail -f /Users/robenhai/Never\ Alone/backend/dist/logs/combined.log
```

Look for:
```
🎵 Stopping music for session <session-id>
```

**If you see this**: ✅ Backend received function call
**If you don't see this**: ❌ AI didn't call stop_music()

### Step 3: Test AppleScript directly

While music is playing, run this in terminal:
```bash
osascript -e 'tell application "Spotify" to pause'
```

**If music stops**: ✅ AppleScript works
**If music doesn't stop**: ❌ Spotify or macOS permission issue

## Common Issues & Fixes

### Issue 1: AI not calling stop_music function

**Symptoms**: No WebSocket event, no backend logs

**Possible causes**:
1. AI doesn't understand "stop music" command
2. System prompt missing stop_music function definition
3. AI is waiting for explicit permission

**Fix**: Try these exact phrases:
- "עצור את המוזיקה עכשיו" (stop the music now)
- "תפסיק את המוזיקה" (stop the music - different verb)
- "די מוזיקה" (enough music)

### Issue 2: WebSocket event not reaching Flutter

**Symptoms**: Backend logs show "Stopping music" but Flutter shows no WebSocket event

**Fix**: Check Flutter console for connection errors:
```bash
flutter run -d macos --verbose
```

Look for WebSocket disconnection messages.

### Issue 3: AppleScript fails silently

**Symptoms**: WebSocket event received, but Spotify keeps playing

**Check Flutter console for**:
```
🎵 ConversationScreen: AppleScript exit code: 0
✅ Spotify pause command sent successfully
```

**If exit code is NOT 0**: Check the stderr output for error details

### Issue 4: Spotify not responding

**Symptoms**: AppleScript exit code 0, but music still plays

**Try manually**:
1. Check Spotify Desktop app is actually running (not web player)
2. Test: `osascript -e 'tell application "Spotify" to get player state'`
3. If returns error: Spotify needs to be restarted

## Test Procedure

1. **Start backend** (if not running):
   ```bash
   cd /Users/robenhai/Never\ Alone/backend
   npm run start:dev
   ```

2. **Start Flutter app** with verbose logging:
   ```bash
   cd /Users/robenhai/Never\ Alone/frontend_flutter
   flutter run -d macos --verbose | grep -E "(🎵|stop|music)"
   ```

3. **Say**: "תנגן לי מוזיקה" (play music)
   - Wait for Spotify to start playing
   - Verify you hear music

4. **Say**: "עצור את המוזיקה" (stop music)
   - Watch Flutter console for WebSocket event
   - Watch for AppleScript execution
   - Check if music actually stops

5. **Document results**:
   - Did you see WebSocket event? (yes/no)
   - Did you see AppleScript execution? (yes/no)
   - Did music stop? (yes/no)
   - Any error messages? (copy/paste)

## Quick Fix: Force Stop via Terminal

If AI isn't calling the function, you can manually test the Flutter code path:

1. While app is running and music is playing
2. Find the Flutter app process
3. Trigger stop via WebSocket manually (advanced - requires curl or socket.io client)

OR just test AppleScript directly:
```bash
osascript -e 'tell application "Spotify" to pause'
```

## What to Report

Please provide:

1. **Flutter console output** (last 50 lines when you say "stop music")
2. **Backend logs** (grep for "stop_music")
3. **Terminal test result** (does manual AppleScript work?)
4. **Exact Hebrew phrase** you used to request stop

This will help identify exactly where the chain is breaking.
