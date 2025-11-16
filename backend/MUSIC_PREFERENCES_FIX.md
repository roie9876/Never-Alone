# 🎵 Music Preferences Fix - Dynamic Function Examples

**Date:** November 16, 2025  
**Issue:** Function definition had hardcoded music examples instead of using family portal preferences

---

## Problem Description

The user discovered that while music preferences from the family portal were being loaded into the **system prompt**, the **function definition** for `play_music()` had hardcoded example values:

```typescript
// ❌ BEFORE: Hardcoded examples
{
  type: 'function',
  name: 'play_music',
  description: 'Play a song...',
  parameters: {
    properties: {
      song_identifier: {
        description: 'Examples: "ירושלים של זהב", "Naomi Shemer", "Israeli classics"',
        //                      ^^^^^^^^^^^^^^ Always the same for every user!
      }
    }
  }
}
```

This meant:
- ✅ System prompt: Used real preferences (e.g., "User loves Arik Einstein, שלום חנוך")
- ❌ Function definition: Always showed same hardcoded examples

**Root cause:** The `getFunctionTools()` method didn't accept parameters, so it couldn't inject user-specific examples.

---

## Solution Implemented

### 1. Made `getFunctionTools()` accept music preferences parameter

**File:** `backend/src/services/realtime.service.ts`

```typescript
// ✅ AFTER: Dynamic examples based on user preferences
private getFunctionTools(musicPreferences?: any): any[] {
  // Build dynamic music examples from user's preferences
  let musicExamples = '"ירושלים של זהב", "Naomi Shemer", "Israeli classics"'; // Default fallback
  
  if (musicPreferences?.enabled) {
    const examples: string[] = [];
    
    // Add up to 2 preferred songs
    if (musicPreferences.preferredSongs?.length > 0) {
      examples.push(`"${musicPreferences.preferredSongs[0]}"`);
      if (musicPreferences.preferredSongs.length > 1) {
        examples.push(`"${musicPreferences.preferredSongs[1]}"`);
      }
    }
    
    // Add 1 preferred artist
    if (musicPreferences.preferredArtists?.length > 0) {
      examples.push(`"${musicPreferences.preferredArtists[0]}"`);
    }
    
    // Add 1 genre
    if (examples.length < 3 && musicPreferences.preferredGenres?.length > 0) {
      examples.push(`"${musicPreferences.preferredGenres[0]}"`);
    }
    
    // Use user's preferences if we got any
    if (examples.length > 0) {
      musicExamples = examples.join(', ');
      this.logger.log(`🎵 Using personalized music examples: ${musicExamples}`);
    }
  }
  
  return [
    // ... other functions ...
    {
      name: 'play_music',
      parameters: {
        properties: {
          song_identifier: {
            description: `Song name, artist name, or genre to search for. Examples: ${musicExamples}`,
            //                                                                         ^^^^^^^^^^^^^ Now dynamic!
          }
        }
      }
    }
  ];
}
```

### 2. Updated method signature and calls

**Changed:**
- `initializeWebSocket()` now accepts `musicPreferences` parameter
- `createSession()` passes `musicPreferences` to `initializeWebSocket()`
- `initializeWebSocket()` passes `musicPreferences` to `getFunctionTools()`

**Code flow:**
```typescript
async createSession(config) {
  // Load preferences from database
  musicPreferences = await this.musicService.loadMusicPreferences(userId);
  
  // Pass to WebSocket initialization
  await this.initializeWebSocket(session, systemPrompt, config, musicPreferences);
  //                                                             ^^^^^^^^^^^^^^^^^ Passed here
}

async initializeWebSocket(session, systemPrompt, config, musicPreferences) {
  //                                                      ^^^^^^^^^^^^^^^^^ Received here
  ws.send({
    tools: this.getFunctionTools(musicPreferences),
    //                           ^^^^^^^^^^^^^^^^^ Passed to function tools
  });
}
```

---

## What This Fixes

### Example: User configures preferences in family portal

**Family portal configuration:**
```json
{
  "enabled": true,
  "preferredSongs": ["שלום חנוך - יושב על הגדר", "אריק איינשטיין - אני ואתה"],
  "preferredArtists": ["Arik Einstein", "Shalom Hanoch"],
  "preferredGenres": ["Israeli rock", "1970s Hebrew songs"]
}
```

### Before fix:

**Function definition sent to GPT-4:**
```typescript
{
  song_identifier: {
    description: 'Examples: "ירושלים של זהב", "Naomi Shemer", "Israeli classics"'
    //                      ^^^^^^^^^^^^^^ Generic examples, not user-specific!
  }
}
```

**Problem:** AI sees generic examples that might not match user's taste.

### After fix:

**Function definition sent to GPT-4:**
```typescript
{
  song_identifier: {
    description: 'Examples: "שלום חנוך - יושב על הגדר", "אריק איינשטיין - אני ואתה", "Arik Einstein"'
    //                      ^^^^^^^^^^^^^^ USER'S ACTUAL PREFERENCES! ✅
  }
}
```

**Benefit:** AI now sees examples of songs the user actually loves, making it more likely to suggest relevant music.

---

## Verification

### Test the fix:

1. **Configure preferences in family portal:**
   - Go to: http://localhost:3000/onboarding/user-tiferet-001
   - Enable music, add your favorite songs/artists
   - Save configuration

2. **Start AI session:**
   ```bash
   cd backend
   npm run start:dev
   ```

3. **Check backend logs:**
   ```
   🎵 Music preferences loaded for user user-tiferet-001:
      - Enabled: true
      - Artists: 2 configured
      - Songs: 3 configured
   
   🎵 Using personalized music examples in function definition: "שיר 1", "שיר 2", "אמן 1"
   ```

4. **Ask AI to play music:**
   - User: "תנגן לי מוזיקה" (Play me music)
   - AI should mention YOUR configured songs, not generic ones

---

## Code Changes Summary

**Files modified:**
- `backend/src/services/realtime.service.ts`
  - Line 188: Pass `musicPreferences` to `initializeWebSocket()`
  - Line 197: Add `musicPreferences` parameter to method signature
  - Line 248: Pass `musicPreferences` to `getFunctionTools()`
  - Lines 1112-1147: Make `getFunctionTools()` dynamic with preferences
  - Line 1256: Use `${musicExamples}` instead of hardcoded string

**Lines changed:** ~40 lines  
**Behavior change:** Function definition examples now personalized per user

---

## Impact

**Before:**
- System prompt: ✅ Personalized
- Function definition: ❌ Generic hardcoded examples

**After:**
- System prompt: ✅ Personalized
- Function definition: ✅ Personalized examples from family portal

**Result:** AI now has CONSISTENT information about user's music preferences in both system prompt AND function definition!

---

## Related Documents

- [Music Integration](../docs/technical/music-integration.md) - Full music feature documentation
- [Onboarding Flow](../docs/planning/onboarding-flow.md) - Family portal configuration
- [Realtime API Integration](../docs/technical/realtime-api-integration.md) - Function calling details

---

*Fixed by: AI Assistant*  
*Reported by: robenhai*  
*Status: ✅ Complete - Ready for testing*
