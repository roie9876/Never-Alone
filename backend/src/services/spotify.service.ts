import { Injectable, Logger } from '@nestjs/common';
import * as SpotifyWebApi from 'spotify-web-api-node';

export interface SpotifyTrack {
  trackId: string;
  title: string;
  artist: string;
  previewUrl: string | null; // 30-second preview (free tier)
  albumArt: string | null;
  spotifyUrl: string;
  durationMs: number;
}

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private spotifyApi: SpotifyWebApi;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    });

    // Initialize with client credentials flow (no user auth needed for search)
    this.refreshAccessToken();
  }

  /**
   * Refresh access token using Client Credentials flow
   * This allows us to search tracks without user authentication
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      this.logger.log('🔑 Refreshing Spotify access token...');
      const data = await this.spotifyApi.clientCredentialsGrant();

      this.spotifyApi.setAccessToken(data.body.access_token);
      this.tokenExpiresAt = Date.now() + (data.body.expires_in - 60) * 1000; // Refresh 1 min before expiry

      this.logger.log(`✅ Spotify access token refreshed, expires in ${data.body.expires_in}s`);
    } catch (error) {
      this.logger.error('❌ Failed to refresh Spotify access token:', error);
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (Date.now() >= this.tokenExpiresAt) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Search for a track on Spotify
   * @param query Search query (e.g., "ירושלים של זהב נעמי שמר")
   * @returns First matching track or null
   */
  async searchTrack(query: string): Promise<SpotifyTrack | null> {
    try {
      await this.ensureValidToken();

      this.logger.log(`🔍 Searching Spotify for: "${query}"`);

      const result = await this.spotifyApi.searchTracks(query, {
        limit: 1,
        market: 'IL', // Israel market for Hebrew songs
      });

      if (!result.body.tracks || result.body.tracks.items.length === 0) {
        this.logger.warn(`⚠️ No tracks found for query: "${query}"`);
        return null;
      }

      const track = result.body.tracks.items[0];

      const spotifyTrack: SpotifyTrack = {
        trackId: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        previewUrl: track.preview_url, // 30-second preview (may be null for some tracks)
        albumArt: track.album.images[0]?.url || null,
        spotifyUrl: track.external_urls.spotify,
        durationMs: track.duration_ms,
      };

      this.logger.log(`✅ Found track: "${spotifyTrack.title}" by ${spotifyTrack.artist}`);
      this.logger.log(`   Preview URL: ${spotifyTrack.previewUrl ? 'Available' : 'Not available'}`);
      this.logger.log(`   Album Art: ${spotifyTrack.albumArt ? 'Available' : 'Not available'}`);

      return spotifyTrack;
    } catch (error) {
      this.logger.error(`❌ Spotify search error for query "${query}":`, error);
      return null;
    }
  }

  /**
   * Search by song name and artist (recommended for better accuracy)
   */
  async searchByArtistAndSong(artist: string, song: string): Promise<SpotifyTrack | null> {
    const query = `track:${song} artist:${artist}`;
    return this.searchTrack(query);
  }

  /**
   * Search for Hebrew songs (adds context to improve results)
   */
  async searchHebrewTrack(query: string): Promise<SpotifyTrack | null> {
    // Try exact query first
    let result = await this.searchTrack(query);

    // If not found, try adding "Israeli music" context
    if (!result) {
      this.logger.log(`🔍 Retrying with "Israeli music" context...`);
      result = await this.searchTrack(`${query} Israeli music`);
    }

    return result;
  }

  /**
   * Get track details by Spotify track ID
   */
  async getTrackById(trackId: string): Promise<SpotifyTrack | null> {
    try {
      await this.ensureValidToken();

      const result = await this.spotifyApi.getTrack(trackId);
      const track = result.body;

      return {
        trackId: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        previewUrl: track.preview_url,
        albumArt: track.album.images[0]?.url || null,
        spotifyUrl: track.external_urls.spotify,
        durationMs: track.duration_ms,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get track by ID "${trackId}":`, error);
      return null;
    }
  }
}
