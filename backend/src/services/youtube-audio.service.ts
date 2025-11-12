/**
 * YouTube Audio Stream Extractor
 *
 * Uses ytdl-core to extract audio-only stream URL from YouTube videos
 * This bypasses embed restrictions and YouTube ads
 */

import ytdl from 'ytdl-core';

export class YouTubeAudioService {
  /**
   * Get audio stream URL for a YouTube video
   * @param videoId YouTube video ID
   * @returns Audio stream URL or null if extraction fails
   */
  async getAudioStreamUrl(videoId: string): Promise<string | null> {
    try {
      console.log(`🎵 YouTubeAudioService: Extracting audio for video ${videoId}`);

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Get video info
      const info = await ytdl.getInfo(videoUrl);

      // Get audio-only formats
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

      if (audioFormats.length === 0) {
        console.error(`🎵 YouTubeAudioService: No audio formats found for video ${videoId}`);
        return null;
      }

      // Get highest quality audio format
      const bestAudio = audioFormats.reduce((best, format) => {
        const bestBitrate = parseInt(String(best.audioBitrate || '0'));
        const formatBitrate = parseInt(String(format.audioBitrate || '0'));
        return formatBitrate > bestBitrate ? format : best;
      });

      console.log(`🎵 YouTubeAudioService: Found audio stream (bitrate: ${bestAudio.audioBitrate}kbps)`);
      console.log(`🎵 YouTubeAudioService: Stream URL: ${bestAudio.url}`);

      return bestAudio.url;

    } catch (error) {
      console.error(`🎵 YouTubeAudioService: Error extracting audio - ${error.message}`);
      return null;
    }
  }

  /**
   * Validate if video is available and can be played
   * @param videoId YouTube video ID
   * @returns true if video is available
   */
  async validateVideo(videoId: string): Promise<boolean> {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await ytdl.getInfo(videoUrl);

      // Check if video is playable
      if (info.videoDetails.isPrivate) {
        console.warn(`🎵 YouTubeAudioService: Video ${videoId} is private`);
        return false;
      }

      if (!info.videoDetails.isLiveContent && info.videoDetails.lengthSeconds === '0') {
        console.warn(`🎵 YouTubeAudioService: Video ${videoId} is not available`);
        return false;
      }

      return true;

    } catch (error) {
      console.error(`🎵 YouTubeAudioService: Error validating video - ${error.message}`);
      return false;
    }
  }
}
