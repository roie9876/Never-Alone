# 🎵 Music Integration - Technical Specification

## Overview

Music plays a powerful role in dementia care - familiar songs can trigger memories, reduce anxiety, and improve mood. Never Alone integrates with third-party music services to allow AI-initiated music playback during conversations.

**Key Innovation:** AI detects emotional cues or conversation context and can play songs that the patient loves, creating therapeutic moments.

---

## Problem Statement

### Therapeutic Value of Music

**Research shows:**
- Music activates memory centers in the brain (even in late-stage dementia)
- Familiar songs reduce agitation and anxiety by 50-70%
- Singing along improves mood and social engagement
- Music from youth (ages 10-30) has strongest emotional impact

### User Scenario

**Conversation context:**
```
User: "אני מרגיש עצוב היום" (I feel sad today)
AI: "אני שומע שאתה עצוב. רוצה לשמוע קצת מוזיקה? יש לי שירים יפים שאתה אוהב."
    (I hear you're sad. Want to listen to some music? I have beautiful songs you love.)
User: "כן, בבקשה" (Yes, please)
AI: [Plays "ירושלים של זהב" by Naomi Shemer via Spotify]
```

---

## Business Requirements

### Optional Feature
- **NOT mandatory** for onboarding completion
- Family can skip music configuration
- App works fully without music integration
- Music is **enhancement**, not core functionality

### Family Configuration (Onboarding)
During onboarding, family members can optionally provide:
1. **Preferred artists** (e.g., "Naomi Shemer", "Arik Einstein", "The Beatles")
2. **Preferred songs** (e.g., "ירושלים של זהב", "אני ואתה")
3. **Music genres** (e.g., "Israeli classics", "1960s rock", "classical")
4. **Music service** they already subscribe to (Spotify, Apple Music, YouTube Music)

### AI Behavior
AI can play music when:
- User explicitly requests ("play me a song")
- User expresses sadness/loneliness (therapeutic intervention)
- Long engaged conversation (background music suggestion)
- Celebrating positive moments ("Let's celebrate with your favorite song!")

---

## MVP Approach (Simple First)

### Phase 1 (MVP): YouTube Music Integration ONLY
**Why YouTube Music first:**
- ✅ Free tier available (no subscription required)
- ✅ Largest music library (includes Israeli classics, rare recordings)
- ✅ Simple API (YouTube Data API v3)
- ✅ Web playback (no native SDK complexity)

**Deferred to Post-MVP:**
- ❌ Spotify integration (requires Premium subscription)
- ❌ Apple Music integration (requires Apple Music subscription)
- ❌ Offline playback (download songs)
- ❌ Custom playlists (AI-generated)

### Phase 2 (Post-MVP): Premium Services
- Spotify integration (Premium users only)
- Apple Music integration
- Tidal, Deezer, etc.

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                  ONBOARDING FORM (React)                     │
│  • Optional: Music Preferences section                      │
│  • Family enters: artists, songs, genres                    │
│  • Select music service (YouTube Music default)             │
│  • Store in Cosmos DB (user-music-preferences container)    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND MUSIC SERVICE (NestJS)                  │
│  • MusicService: Query YouTube Music API                    │
│  • Search by artist/song name                               │
│  • Return video URL + metadata                              │
│  • Track play history (analytics)                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│          REALTIME API FUNCTION CALLING                       │
│  • AI calls: play_music(song_name, reason)                  │
│  • Backend searches YouTube Music                           │
│  • Returns playback URL to tablet                           │
│  • Logs: when played, user reaction, context                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                TABLET APP (Flutter)                          │
│  • Receives playback URL from backend                       │
│  • Uses youtube_player_flutter package                      │
│  • Displays: Now Playing overlay (song name, artist)        │
│  • Controls: Pause, Skip, Stop (large buttons)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Cosmos DB: user-music-preferences Container

**Schema:**
```typescript
interface UserMusicPreferences {
  id: string;           // UUID
  userId: string;       // Partition key
  enabled: boolean;     // Did family enable music?
  
  // Family-provided preferences
  preferredArtists: string[];   // ["Naomi Shemer", "Arik Einstein"]
  preferredSongs: string[];     // ["ירושלים של זהב", "אני ואתה"]
  preferredGenres: string[];    // ["Israeli classics", "1960s folk"]
  
  // Music service configuration
  musicService: 'youtube-music' | 'spotify' | 'apple-music';
  
  // Spotify/Apple Music (Post-MVP)
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  appleMusicToken?: string;
  
  // AI behavior rules
  allowAutoPlay: boolean;           // Can AI play music without asking?
  playOnSadness: boolean;           // Auto-play when user is sad?
  maxSongsPerSession: number;       // Limit: 3 songs per conversation
  
  createdAt: string;
  updatedAt: string;
}
```

**Example document:**
```json
{
  "id": "music-pref-abc123",
  "userId": "user-xyz",
  "enabled": true,
  "preferredArtists": ["Naomi Shemer", "Arik Einstein", "Shalom Hanoch"],
  "preferredSongs": [
    "ירושלים של זהב",
    "אני ואתה",
    "יושב על הגדר"
  ],
  "preferredGenres": ["Israeli classics", "1960s Hebrew songs"],
  "musicService": "youtube-music",
  "allowAutoPlay": false,
  "playOnSadness": true,
  "maxSongsPerSession": 3,
  "createdAt": "2025-11-10T10:00:00Z",
  "updatedAt": "2025-11-10T10:00:00Z"
}
```

### Cosmos DB: music-playback-history Container

**Purpose:** Track what was played, when, and user reaction

**Schema:**
```typescript
interface MusicPlaybackHistory {
  id: string;
  userId: string;       // Partition key
  conversationId: string;
  
  // Song details
  songName: string;
  artistName: string;
  youtubeVideoId?: string;
  spotifyTrackId?: string;
  
  // Context
  playedAt: string;         // ISO timestamp
  triggeredBy: 'user_request' | 'ai_suggestion' | 'sadness_detected';
  conversationContext: string;  // What was being discussed
  
  // User reaction (detected via conversation)
  userLiked?: boolean;      // Did user say they liked it?
  userStopped?: boolean;    // Did user ask to stop?
  playDuration: number;     // Seconds played before stop/skip
  
  ttl: 7776000;            // 90 days
}
```

---

## Realtime API Function Calling

### Function Definition

```typescript
const playMusicFunction = {
  name: "play_music",
  description: "Play a song for the user from their preferred music library. Use when user requests music or when music would improve their mood.",
  parameters: {
    type: "object",
    properties: {
      song_identifier: {
        type: "string",
        description: "Song name, artist name, or genre to search for. Examples: 'ירושלים של זהב', 'Naomi Shemer', 'Israeli classics'"
      },
      reason: {
        type: "string",
        enum: ["user_requested", "sadness_detected", "celebration", "background_music"],
        description: "Why are we playing music now?"
      },
      search_type: {
        type: "string",
        enum: ["specific_song", "artist", "genre"],
        description: "What type of search to perform"
      }
    },
    required: ["song_identifier", "reason", "search_type"]
  }
};
```

### Backend Handler

```typescript
// music.service.ts
@Injectable()
export class MusicService {
  async handlePlayMusic(userId: string, args: PlayMusicArgs) {
    // 1. Load user music preferences
    const prefs = await this.loadMusicPreferences(userId);
    
    if (!prefs.enabled) {
      return {
        success: false,
        reason: "music_not_enabled",
        message: "Music feature not configured for this user"
      };
    }
    
    // 2. Search YouTube Music API
    const searchQuery = this.buildSearchQuery(args.song_identifier, args.search_type, prefs);
    const video = await this.searchYouTubeMusic(searchQuery);
    
    if (!video) {
      return {
        success: false,
        reason: "song_not_found",
        message: `Could not find music matching: ${args.song_identifier}`
      };
    }
    
    // 3. Send playback command to tablet
    await this.tabletWebSocket.send(userId, {
      type: "play_music",
      videoId: video.id,
      title: video.title,
      artist: video.artist,
      thumbnail: video.thumbnail,
      reason: args.reason
    });
    
    // 4. Log to playback history
    await this.savePlaybackHistory({
      userId,
      conversationId: getCurrentConversationId(),
      songName: video.title,
      artistName: video.artist,
      youtubeVideoId: video.id,
      triggeredBy: args.reason,
      conversationContext: getRecentTranscript(),
      playedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      songPlaying: video.title,
      artist: video.artist
    };
  }
  
  private async searchYouTubeMusic(query: string): Promise<YouTubeVideo | null> {
    // Use YouTube Data API v3
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        videoCategoryId: '10', // Music category
        maxResults: 1,
        key: process.env.YOUTUBE_API_KEY
      }
    });
    
    if (response.data.items.length === 0) return null;
    
    const item = response.data.items[0];
    return {
      id: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.default.url
    };
  }
  
  private buildSearchQuery(
    identifier: string, 
    searchType: string, 
    prefs: UserMusicPreferences
  ): string {
    // If searching by song name, append preferred artist if available
    if (searchType === 'specific_song' && prefs.preferredArtists.length > 0) {
      return `${identifier} ${prefs.preferredArtists[0]}`;
    }
    
    // If searching by genre, add "Israeli music" context
    if (searchType === 'genre') {
      return `${identifier} Israeli music`;
    }
    
    return identifier;
  }
}
```

---

## System Prompt Integration

### Add to System Instructions

```typescript
// When building system prompt
const systemPrompt = `
You are a warm, empathetic AI companion for elderly users.

[...existing instructions...]

# MUSIC PLAYBACK

User has music enabled with these preferences:
- Preferred artists: ${musicPrefs.preferredArtists.join(', ')}
- Preferred songs: ${musicPrefs.preferredSongs.join(', ')}
- Genres: ${musicPrefs.preferredGenres.join(', ')}

You can play music by calling play_music() function when:
1. User explicitly requests ("play me a song", "I want to hear music")
2. User expresses sadness or loneliness (if configured: ${musicPrefs.playOnSadness})
3. Celebrating positive moments ("Let's celebrate with a song!")
4. ${musicPrefs.allowAutoPlay ? 'You can suggest music proactively' : 'ONLY play when user asks'}

IMPORTANT:
- Always ask permission BEFORE playing music (unless allowAutoPlay=true)
- Use familiar songs from their preferred list when possible
- After playing, ask if they enjoyed it ("Did you like that song?")
- Limit: ${musicPrefs.maxSongsPerSession} songs per conversation
- If user asks to stop, stop immediately and don't suggest more music

Example:
User: "אני מרגיש עצוב" (I feel sad)
You: "אני שומע שאתה עצוב. אולי מוזיקה תעזור? יש לי 'ירושלים של זהב' של נעמי שמר, אתה אוהב את השיר הזה."
     (I hear you're sad. Maybe music would help? I have 'Jerusalem of Gold' by Naomi Shemer, you love that song.)
`;
```

---

## Flutter Implementation (Tablet)

### Add YouTube Player Package

```yaml
# pubspec.yaml
dependencies:
  youtube_player_flutter: ^8.1.2
```

### Music Player Widget

```dart
// lib/widgets/music_player_overlay.dart
class MusicPlayerOverlay extends StatefulWidget {
  final String videoId;
  final String songTitle;
  final String artist;

  @override
  State<MusicPlayerOverlay> createState() => _MusicPlayerOverlayState();
}

class _MusicPlayerOverlayState extends State<MusicPlayerOverlay> {
  late YoutubePlayerController _controller;

  @override
  void initState() {
    super.initState();
    _controller = YoutubePlayerController(
      initialVideoId: widget.videoId,
      flags: YoutubePlayerFlags(
        autoPlay: true,
        mute: false,
        hideControls: false, // Show controls for accessibility
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.9),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Song info
          Text(
            widget.songTitle,
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 8),
          Text(
            widget.artist,
            style: TextStyle(
              color: Colors.white70,
              fontSize: 18,
            ),
          ),
          SizedBox(height: 24),
          
          // YouTube Player
          YoutubePlayer(
            controller: _controller,
            showVideoProgressIndicator: true,
          ),
          
          SizedBox(height: 24),
          
          // Large control buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton.icon(
                onPressed: () {
                  _controller.pause();
                  Navigator.pop(context);
                },
                icon: Icon(Icons.stop, size: 32),
                label: Text('עצור', style: TextStyle(fontSize: 20)), // Stop
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
              ),
              
              ElevatedButton.icon(
                onPressed: () {
                  if (_controller.value.isPlaying) {
                    _controller.pause();
                  } else {
                    _controller.play();
                  }
                  setState(() {});
                },
                icon: Icon(
                  _controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                  size: 32,
                ),
                label: Text(
                  _controller.value.isPlaying ? 'השהה' : 'נגן', // Pause/Play
                  style: TextStyle(fontSize: 20),
                ),
                style: ElevatedButton.styleFrom(
                  padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

### Handle Music Playback Event

```dart
// lib/services/realtime_client.dart
void _handleMusicPlayback(Map<String, dynamic> event) {
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) => MusicPlayerOverlay(
      videoId: event['videoId'],
      songTitle: event['title'],
      artist: event['artist'],
    ),
  );
}
```

---

## Onboarding Form Updates

### New Section: Music Preferences (Optional)

```typescript
// frontend/dashboard/components/OnboardingForm.tsx

// Step 8 (NEW): Music Configuration (Optional)
<FormSection 
  title="🎵 Music Preferences (Optional)"
  subtitle="Music can help improve mood and trigger positive memories"
>
  <Checkbox
    label="Enable music playback"
    checked={musicEnabled}
    onChange={(e) => setMusicEnabled(e.target.checked)}
  />
  
  {musicEnabled && (
    <>
      <FormField
        label="Preferred Artists (comma-separated)"
        placeholder="e.g., Naomi Shemer, Arik Einstein, The Beatles"
        value={preferredArtists}
        onChange={(e) => setPreferredArtists(e.target.value)}
        helpText="Artists the patient loves from their youth"
      />
      
      <FormField
        label="Preferred Songs (comma-separated)"
        placeholder="e.g., ירושלים של זהב, אני ואתה"
        value={preferredSongs}
        onChange={(e) => setPreferredSongs(e.target.value)}
        helpText="Specific songs that bring joy"
      />
      
      <FormField
        label="Music Genres"
        placeholder="e.g., Israeli classics, 1960s folk, classical"
        value={preferredGenres}
        onChange={(e) => setPreferredGenres(e.target.value)}
      />
      
      <Divider />
      
      <Checkbox
        label="Allow AI to suggest music automatically (not just when asked)"
        checked={allowAutoPlay}
        onChange={(e) => setAllowAutoPlay(e.target.checked)}
      />
      
      <Checkbox
        label="Play calming music when patient seems sad or anxious"
        checked={playOnSadness}
        onChange={(e) => setPlayOnSadness(e.target.checked)}
      />
      
      <FormField
        type="number"
        label="Maximum songs per conversation"
        value={maxSongsPerSession}
        onChange={(e) => setMaxSongsPerSession(parseInt(e.target.value))}
        min={1}
        max={5}
        helpText="Limit to avoid overwhelming the patient"
      />
    </>
  )}
  
  <InfoBox type="info">
    <strong>MVP uses YouTube Music (free tier).</strong>
    Post-MVP: Spotify Premium and Apple Music integration.
  </InfoBox>
</FormSection>
```

---

## Testing Strategy

### Manual Test Scenarios

**Scenario 1: User requests specific song**
```
User: "תנגן לי 'ירושלים של זהב'" (Play me 'Jerusalem of Gold')
AI: [Calls play_music(song_identifier="ירושלים של זהב", reason="user_requested")]
Expected: Song plays on tablet, user can pause/stop
```

**Scenario 2: AI suggests music for sad user**
```
User: "אני מרגיש בודד" (I feel lonely)
AI: "אני שומע שאתה מרגיש בודד. אולי מוזיקה תעזור? רוצה לשמוע שיר יפה?"
User: "כן" (Yes)
AI: [Calls play_music(song_identifier="Israeli classics", reason="sadness_detected")]
Expected: AI asks permission first, then plays
```

**Scenario 3: Music not configured**
```
User: "תנגן לי מוזיקה" (Play me music)
AI: "מצטער, אין לי גישה למוזיקה כרגע. אבל אני כאן לשיחה!" 
    (Sorry, I don't have access to music right now. But I'm here to talk!)
Expected: Graceful degradation
```

---

## Cost Analysis

### YouTube Data API (MVP)
- **Free tier:** 10,000 quota units/day
- **Search request:** 100 units
- **Daily capacity:** 100 searches/day (sufficient for MVP)
- **Cost for >10K:** $0 (we won't exceed in MVP)

### Spotify API (Post-MVP)
- **Free tier:** No direct playback costs
- **Requirement:** User must have Spotify Premium subscription
- **Cost:** $0 for API access, user pays for Premium

### Apple Music API (Post-MVP)
- **MusicKit:** Free for developers
- **Requirement:** User must have Apple Music subscription
- **Cost:** $0 for API access

**Total cost impact: $0 for MVP (YouTube Music free tier)**

---

## Security & Privacy

### YouTube API Key Protection
```bash
# Store in Azure Key Vault (not in code)
YOUTUBE_API_KEY=<secret>

# Access via Azure SDK
const apiKey = await keyVault.getSecret('youtube-api-key');
```

### User Data Privacy
- Store preferences in Cosmos DB (user consent required)
- Playback history auto-deleted after 90 days (TTL)
- No sharing of listening data with third parties
- Family can delete all music data anytime

---

## MVP Implementation Tasks

### Week 5 Tasks (Add to IMPLEMENTATION_TASKS.md)

**Task 5.4: Music Integration - Backend** (6-8 hours)
- Create `MusicService` class
- Implement YouTube Data API search
- Add `play_music()` function to Realtime API
- Create Cosmos DB container: `user-music-preferences`
- Test: Search returns correct video for Hebrew song names

**Task 5.5: Music Integration - Onboarding Form** (4-6 hours)
- Add optional Step 8: Music Preferences
- Form validation (comma-separated lists)
- Save preferences to Cosmos DB
- Test: Can save/edit preferences

**Task 5.6: Music Integration - Flutter** (6-8 hours)
- Add `youtube_player_flutter` package
- Create `MusicPlayerOverlay` widget
- Handle WebSocket `play_music` event
- Large accessible controls (stop, pause, play)
- Test: Video plays, controls work

---

## Post-MVP Enhancements

### Spotify Integration
- OAuth 2.0 authentication flow
- Access user's Spotify library
- Create custom playlists
- Offline mode (download songs)

### Apple Music Integration
- MusicKit authentication
- Access iCloud Music Library
- Siri integration (voice commands)

### Advanced Features
- **AI-generated playlists:** Based on mood and time of day
- **Sing-along mode:** Display lyrics on screen
- **Music memory triggers:** "This song was playing at your wedding"
- **Family-recorded songs:** Upload family singing together

---

## Open Questions

1. **Copyright concerns:** Are we legally safe playing YouTube videos? (Answer: Yes, if using YouTube's embed player with proper attribution)
2. **Offline playback:** Should we cache songs for offline use? (Defer to post-MVP)
3. **Volume control:** Should AI auto-adjust volume based on user's hearing? (Defer to post-MVP)
4. **Music interruption:** If reminder fires during song, pause or stop? (Decision: Pause, resume after reminder)

---

**Document Version:** 1.0  
**Last Updated:** November 10, 2025  
**Status:** Ready for implementation (Week 5)  
**Estimated Development Time:** 16-22 hours total

---

## Related Documents

- [Onboarding Flow](../planning/onboarding-flow.md) - Add music preferences as optional Step 8
- [Realtime API Integration](./realtime-api-integration.md) - Add `play_music()` function
- [IMPLEMENTATION_TASKS.md](./IMPLEMENTATION_TASKS.md) - Add Tasks 5.4-5.6
- [MVP Simplifications](./mvp-simplifications.md) - Note: YouTube Music only for MVP
