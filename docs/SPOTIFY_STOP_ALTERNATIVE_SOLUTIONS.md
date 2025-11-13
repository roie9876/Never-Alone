# Potential Solution: Two-Step Spotify Launch

## The Problem
Using AppleScript `play track "spotify:track:XXX"` makes Spotify invisible to subsequent AppleScript commands.

## Proposed Solution
Use `open` command to launch Spotify, then immediately save a reference we can control later.

## Test This Approach

### Step 1: Start Spotify with `open` (not AppleScript)
```dart
// Instead of AppleScript play track, use open command
final spotifyUri = 'spotify:track:$trackId';
await Process.run('open', [spotifyUri]);
```

### Step 2: Wait for Spotify to fully launch
```dart
await Future.delayed(const Duration(milliseconds: 1500));
```

### Step 3: NOW AppleScript can see it
```dart
// This should work now
await Process.run('osascript', ['-e', 'tell application "Spotify" to pause']);
```

## Alternative: Store PID and Kill by PID

### When Starting:
```dart
// Get Spotify PID after launching
final pidResult = await Process.run('pgrep', ['Spotify']);
final spotifyPid = pidResult.stdout.toString().trim();
// Store this PID
```

### When Stopping:
```dart
// Kill by PID (might have better permissions)
await Process.run('kill', ['-9', spotifyPid]);
```

## Try This in Terminal First

```bash
# Test 1: Open with URI
open "spotify:track:0bXtwwYn1Q9M1a4NfK4V7d"
sleep 2

# Test 2: Can we pause now?
osascript -e 'tell application "Spotify" to pause'
# Does this work? ^

# Test 3: Get PID approach
open "spotify:track:0bXtwwYn1Q9M1a4NfK4V7d"
SPOTIFY_PID=$(pgrep Spotify)
echo "Spotify PID: $SPOTIFY_PID"
kill -9 $SPOTIFY_PID  # Does this work without sudo?
```

Test these in your terminal and let me know results!
