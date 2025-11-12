import { Injectable, Logger } from '@nestjs/common';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import axios from 'axios';
import { SpotifyService, SpotifyTrack } from './spotify.service';

interface UserMusicPreferences {
  id: string;
  userId: string;
  enabled: boolean;
  preferredArtists: string[];
  preferredSongs: string[];
  preferredGenres: string[];
  musicService: 'youtube-music' | 'spotify' | 'apple-music';
  allowAutoPlay: boolean;
  playOnSadness: boolean;
  maxSongsPerSession: number;
  createdAt: string;
  updatedAt: string;
}

interface YouTubeVideo {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
}

interface PlayMusicArgs {
  song_identifier: string;
  reason: 'user_requested' | 'sadness_detected' | 'celebration' | 'background_music';
  search_type: 'specific_song' | 'artist' | 'genre';
}

interface MusicPlaybackHistory {
  id: string;
  userId: string;
  conversationId: string;
  songName: string;
  artistName: string;
  youtubeVideoId?: string;
  spotifyTrackId?: string;
  spotifyPreviewUrl?: string;
  playedAt: string;
  triggeredBy: string;
  conversationContext: string;
  userLiked?: boolean;
  userStopped?: boolean;
  playDuration?: number;
  ttl: number;
}

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private cosmosClient: CosmosClient;
  private database: any;
  private readonly youtubeApiKey: string;
  private spotifyService: SpotifyService;

  constructor() {
    // Initialize Cosmos DB with Azure AD
    const credential = new DefaultAzureCredential();
    this.cosmosClient = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT,
      aadCredentials: credential,
    });
    this.database = this.cosmosClient.database(
      process.env.COSMOS_DATABASE || 'never-alone',
    );

    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!this.youtubeApiKey) {
      this.logger.warn('YouTube API key not found - YouTube music features will be disabled');
    }

    // Initialize Spotify service
    this.spotifyService = new SpotifyService();
    this.logger.log('✅ Spotify service initialized');
  }

  /**
   * Save user's music preferences to Cosmos DB
   */
  async saveMusicPreferences(preferences: Partial<UserMusicPreferences> & { userId: string }): Promise<UserMusicPreferences> {
    try {
      const container = this.database.container('user-music-preferences');

      const now = new Date().toISOString();
      const musicPrefs: UserMusicPreferences = {
        id: `music-pref-${preferences.userId}`,
        userId: preferences.userId,
        enabled: preferences.enabled ?? false,
        preferredArtists: preferences.preferredArtists ?? [],
        preferredSongs: preferences.preferredSongs ?? [],
        preferredGenres: preferences.preferredGenres ?? [],
        musicService: preferences.musicService ?? 'youtube-music',
        allowAutoPlay: preferences.allowAutoPlay ?? false,
        playOnSadness: preferences.playOnSadness ?? false,
        maxSongsPerSession: preferences.maxSongsPerSession ?? 3,
        createdAt: preferences.createdAt ?? now,
        updatedAt: now,
      };

      this.logger.log(`💾 Saving music preferences for user ${preferences.userId}...`);
      this.logger.log(`   - Enabled: ${musicPrefs.enabled}`);
      this.logger.log(`   - Artists: ${musicPrefs.preferredArtists.length}`);
      this.logger.log(`   - Songs: ${musicPrefs.preferredSongs.length}`);
      this.logger.log(`   - Genres: ${musicPrefs.preferredGenres.length}`);

      const { resource } = await container.items.upsert(musicPrefs);

      this.logger.log(`✅ Music preferences saved successfully`);
      return resource as UserMusicPreferences;
    } catch (error) {
      this.logger.error(`Failed to save music preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load user's music preferences from Cosmos DB
   */
  async loadMusicPreferences(userId: string): Promise<UserMusicPreferences | null> {
    try {
      const container = this.database.container('user-music-preferences');

      // Query for user's preferences
      const { resources } = await container.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: userId }],
        })
        .fetchAll();

      if (resources.length === 0) {
        this.logger.log(`No music preferences found for user ${userId}`);
        return null;
      }

      return resources[0] as UserMusicPreferences;
    } catch (error) {
      this.logger.error(`Failed to load music preferences: ${error.message}`);
      return null;
    }
  }

  /**
   * Search YouTube Music API for a song/artist/genre
   */
  async searchYouTubeMusic(query: string): Promise<YouTubeVideo | null> {
    if (!this.youtubeApiKey) {
      this.logger.error('YouTube API key not configured');
      return null;
    }

    try {
      this.logger.log(`🔍 Searching YouTube for: "${query}"`);

      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          videoCategoryId: '10', // Music category
          maxResults: 1,
          key: this.youtubeApiKey,
        },
      });

      if (response.data.items.length === 0) {
        this.logger.warn(`No results found for: "${query}"`);
        return null;
      }

      const item = response.data.items[0];
      const video: YouTubeVideo = {
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.default.url,
      };

      this.logger.log(`✅ Found: "${video.title}" by ${video.artist}`);
      return video;
    } catch (error) {
      this.logger.error(`YouTube search failed: ${error.message}`);
      if (error.response) {
        this.logger.error(`YouTube API error: ${JSON.stringify(error.response.data)}`);
      }
      return null;
    }
  }

  /**
   * Build search query based on user preferences
   */
  buildSearchQuery(
    identifier: string,
    searchType: string,
    prefs: UserMusicPreferences,
  ): string {
    // If searching by song name, append preferred artist if available
    if (searchType === 'specific_song' && prefs.preferredArtists.length > 0) {
      return `${identifier} ${prefs.preferredArtists[0]}`;
    }

    // If searching by genre, add "Israeli music" context for better results
    if (searchType === 'genre') {
      return `${identifier} Israeli music`;
    }

    return identifier;
  }

  /**
   * Handle play_music function call from Realtime API
   * NOW USES SPOTIFY INSTEAD OF YOUTUBE
   */
  async handlePlayMusic(
    userId: string,
    conversationId: string,
    args: PlayMusicArgs,
  ): Promise<any> {
    this.logger.log(`🎵 Play music request: ${args.song_identifier} (${args.reason})`);

    // 1. Load user music preferences
    const prefs = await this.loadMusicPreferences(userId);

    if (!prefs || !prefs.enabled) {
      this.logger.warn(`Music not enabled for user ${userId}`);
      return {
        success: false,
        reason: 'music_not_enabled',
        message: 'Music feature not configured for this user',
      };
    }

    // 2. Build search query with context
    const searchQuery = this.buildSearchQuery(
      args.song_identifier,
      args.search_type,
      prefs,
    );

    // 3. Search Spotify (NEW - replaces YouTube)
    const track = await this.spotifyService.searchTrack(searchQuery);

    if (!track) {
      this.logger.warn(`No Spotify track found for: "${searchQuery}"`);
      return {
        success: false,
        reason: 'song_not_found',
        message: `Could not find music matching: ${args.song_identifier}`,
      };
    }

    // NOTE: For Spotify Premium SDK playback, we don't need preview URLs
    // The Flutter app will use SpotifySdk.play() with the track ID
    this.logger.log(`✅ Track found: "${track.title}" by ${track.artist} (ID: ${track.trackId})`);
    if (!track.previewUrl) {
      this.logger.log(`   ℹ️ No preview URL (will use Spotify SDK for full playback)`);
    }

    // 4. Save to playback history
    await this.savePlaybackHistory({
      userId,
      conversationId,
      songName: track.title,
      artistName: track.artist,
      spotifyTrackId: track.trackId,
      spotifyPreviewUrl: track.previewUrl,
      triggeredBy: args.reason,
    });

    // 5. Return playback info (will be sent to Flutter via WebSocket)
    this.logger.log(`✅ Sending Spotify track to Flutter: "${track.title}" by ${track.artist}`);
    return {
      success: true,
      musicService: 'spotify', // NEW: Tell Flutter it's Spotify
      trackId: track.trackId,
      previewUrl: track.previewUrl, // NEW: Direct audio URL (30-second preview)
      title: track.title,
      artist: track.artist,
      albumArt: track.albumArt,
      spotifyUrl: track.spotifyUrl,
      durationMs: track.durationMs,
      reason: args.reason,
    };
  }

  /**
   * Save playback history to Cosmos DB
   */
  async savePlaybackHistory(data: {
    userId: string;
    conversationId: string;
    songName: string;
    artistName: string;
    youtubeVideoId?: string;
    spotifyTrackId?: string;
    spotifyPreviewUrl?: string;
    triggeredBy: string;
  }): Promise<void> {
    try {
      const container = this.database.container('music-playback-history');

      const historyEntry: MusicPlaybackHistory = {
        id: `playback-${Date.now()}-${data.userId}`,
        userId: data.userId,
        conversationId: data.conversationId,
        songName: data.songName,
        artistName: data.artistName,
        youtubeVideoId: data.youtubeVideoId,
        spotifyTrackId: data.spotifyTrackId,
        spotifyPreviewUrl: data.spotifyPreviewUrl,
        playedAt: new Date().toISOString(),
        triggeredBy: data.triggeredBy,
        conversationContext: '', // TODO: Get from conversation service
        ttl: 7776000, // 90 days
      };

      await container.items.create(historyEntry);
      this.logger.log(`📝 Saved playback history: ${data.songName}`);
    } catch (error) {
      this.logger.error(`Failed to save playback history: ${error.message}`);
    }
  }

  /**
   * Get playback history for a user
   */
  async getPlaybackHistory(
    userId: string,
    limit: number = 10,
  ): Promise<MusicPlaybackHistory[]> {
    try {
      const container = this.database.container('music-playback-history');

      const { resources } = await container.items
        .query({
          query: `
            SELECT * FROM c
            WHERE c.userId = @userId
            ORDER BY c.playedAt DESC
            OFFSET 0 LIMIT @limit
          `,
          parameters: [
            { name: '@userId', value: userId },
            { name: '@limit', value: limit },
          ],
        })
        .fetchAll();

      return resources as MusicPlaybackHistory[];
    } catch (error) {
      this.logger.error(`Failed to get playback history: ${error.message}`);
      return [];
    }
  }
}
