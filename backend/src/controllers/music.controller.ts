import { Controller, Post, Body, Logger, Get, Param } from '@nestjs/common';
import { MusicService } from '../services/music.service';
import { YouTubeAudioService } from '../services/youtube-audio.service';

interface SaveMusicPreferencesDto {
  userId: string;
  enabled: boolean;
  preferredArtists: string[];
  preferredSongs: string[];
  preferredGenres: string[];
  allowAutoPlay: boolean;
  playOnSadness: boolean;
  maxSongsPerSession: number;
}

@Controller('music')
export class MusicController {
  private readonly logger = new Logger(MusicController.name);
  private readonly youtubeAudioService = new YouTubeAudioService();

  constructor(private readonly musicService: MusicService) {}

  /**
   * POST /music/preferences
   * Save user's music preferences to Cosmos DB
   */
  @Post('preferences')
  async saveMusicPreferences(@Body() dto: SaveMusicPreferencesDto): Promise<any> {
    this.logger.log(`📥 POST /music/preferences - User: ${dto.userId}`);

    try {
      // Validate required fields
      if (!dto.userId) {
        return {
          success: false,
          error: 'userId is required',
        };
      }

      // Save to Cosmos DB
      const savedPreferences = await this.musicService.saveMusicPreferences(dto);

      this.logger.log(`✅ Music preferences saved for user ${dto.userId}`);

      return {
        success: true,
        data: savedPreferences,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to save music preferences: ${error.message}`);
      this.logger.error(error.stack);

      return {
        success: false,
        error: error.message || 'Failed to save music preferences',
      };
    }
  }

  /**
   * GET /music/spotify-credentials
   * Return Spotify client credentials for Flutter SDK connection
   */
  @Get('spotify-credentials')
  async getSpotifyCredentials(): Promise<any> {
    this.logger.log(`📥 GET /music/spotify-credentials`);

    try {
      return {
        success: true,
        clientId: process.env.SPOTIFY_CLIENT_ID,
        redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:8000/callback',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get Spotify credentials: ${error.message}`);
      return {
        success: false,
        error: error.message || 'Failed to get Spotify credentials',
      };
    }
  }

  /**
   * POST /music/playback-duration
   * Log playback duration for analytics
   */
  @Post('playback-duration')
  async logPlaybackDuration(@Body() dto: { trackId: string; durationSeconds: number }): Promise<any> {
    this.logger.log(`📥 POST /music/playback-duration - Track: ${dto.trackId}, Duration: ${dto.durationSeconds}s`);

    try {
      // TODO: Save to Cosmos DB playback history
      this.logger.log(`✅ Playback duration logged`);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to log playback duration: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * GET /music/audio-stream/:videoId
   * Extract audio-only stream URL from YouTube video (DEPRECATED - YouTube approach failed)
   * This bypasses embed restrictions and ads
   */
  @Get('audio-stream/:videoId')
  async getAudioStream(@Param('videoId') videoId: string): Promise<any> {
    this.logger.log(`📥 GET /music/audio-stream/${videoId}`);

    try {
      // Extract audio stream URL
      const audioUrl = await this.youtubeAudioService.getAudioStreamUrl(videoId);

      if (!audioUrl) {
        this.logger.warn(`⚠️ No audio stream found for video ${videoId}`);
        return {
          success: false,
          error: 'Could not extract audio stream',
        };
      }

      this.logger.log(`✅ Audio stream URL extracted for video ${videoId}`);

      return {
        success: true,
        audioUrl: audioUrl,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to extract audio stream: ${error.message}`);
      this.logger.error(error.stack);

      return {
        success: false,
        error: error.message || 'Failed to extract audio stream',
      };
    }
  }
}
