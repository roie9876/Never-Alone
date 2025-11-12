/**
 * Photo Service
 * Manages context-aware photo triggering during conversations
 *
 * Reference: docs/technical/reminder-system.md - Photo Context Triggering
 */

import { Injectable, Logger } from '@nestjs/common';
import { Container } from '@azure/cosmos';
import { AzureConfigService } from '@config/azure.config';
import {
  Photo,
  PhotoQueryOptions,
  PhotoTriggerEvent,
  PhotoDisplay,
  PhotoTriggerReason,
  PhotoMetadataUpdate,
} from '@interfaces/photo.interface';
import { v4 as uuidv4 } from 'uuid';
import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { DefaultAzureCredential } from '@azure/identity';

@Injectable()
export class PhotoService {
  private readonly logger = new Logger(PhotoService.name);

  constructor(private readonly azureConfig: AzureConfigService) {
    this.logger.log('✅ Photo service initialized with Cosmos DB');
  }

  /**
   * Get photosContainer from AzureConfigService
   */
  private get photosContainer(): Container {
    return this.azureConfig.photosContainer;
  }

  /**
   * Query photos based on conversation context
   * MVP: Simple keyword matching in tags and caption
   */
  async queryPhotos(userId: string, options: PhotoQueryOptions): Promise<Photo[]> {
    this.logger.debug(`Querying photos for user ${userId} with options: ${JSON.stringify(options)}`);

    try {
      let query = `SELECT * FROM p WHERE p.userId = @userId`;
      const parameters: any[] = [{ name: '@userId', value: userId }];

      // Filter by tagged people (OR condition - any match)
      // If specific people are mentioned, prioritize them and ignore generic keywords
      if (options.taggedPeople && options.taggedPeople.length > 0) {
        const tagConditions = options.taggedPeople.map((person, index) => {
          parameters.push({ name: `@person${index}`, value: person });
          return `ARRAY_CONTAINS(p.manualTags, @person${index}, true)`;
        });
        query += ` AND (${tagConditions.join(' OR ')})`;
        
        this.logger.debug(`✅ Filtering by specific people: ${options.taggedPeople.join(', ')} - ignoring generic keywords`);
      }
      // Only apply keyword filters if NO specific people mentioned
      // This prevents over-filtering (e.g., requiring both "Tzvia" AND "picture" tags)
      else if (options.keywords && options.keywords.length > 0) {
        const keywordConditions = options.keywords.map((keyword, index) => {
          const paramNameExact = `@keyword${index}`;
          const paramNameLower = `@keywordLower${index}`;
          parameters.push({ name: paramNameExact, value: keyword });
          parameters.push({ name: paramNameLower, value: keyword.toLowerCase() });
          // Check exact match in tags OR lowercase match in caption
          return `(ARRAY_CONTAINS(p.manualTags, ${paramNameExact}, true) OR ARRAY_CONTAINS(p.manualTags, ${paramNameLower}, true) OR CONTAINS(LOWER(p.caption), ${paramNameLower}))`;
        });
        query += ` AND (${keywordConditions.join(' OR ')})`;
        
        this.logger.debug(`✅ Filtering by keywords: ${options.keywords.join(', ')}`);
      }

      // Exclude recently shown (last 7 days)
      if (options.excludeRecentlyShown) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        parameters.push({ name: '@sevenDaysAgo', value: sevenDaysAgo });
        query += ` AND (NOT IS_DEFINED(p.lastShownAt) OR p.lastShownAt < @sevenDaysAgo)`;
      }

      // Sort by criteria
      // Note: ARRAY_LENGTH() and LOWER() cannot be used in ORDER BY with default indexing
      // Using simpler sorting for MVP
      const sortBy = options.sortBy || 'relevance';
      if (sortBy === 'least_shown') {
        query += ` ORDER BY p.shownCount ASC, p.uploadedAt DESC`;
      } else if (sortBy === 'recent') {
        query += ` ORDER BY p.capturedDate DESC`;
      } else {
        // Default for 'relevance' - sort by upload date
        query += ` ORDER BY p.uploadedAt DESC`;
      }

      // Limit results
      const limit = options.limit || 5;
      query += ` OFFSET 0 LIMIT ${limit}`;

      this.logger.debug(`Executing query: ${query}`);

      const { resources } = await this.photosContainer.items
        .query({ query, parameters })
        .fetchAll();

      this.logger.log(`✅ Found ${resources.length} photos for user ${userId}`);
      return resources as Photo[];
    } catch (error) {
      this.logger.error(`Failed to query photos: ${error.message}`);
      return [];
    }
  }

  /**
   * 🆕 SEMANTIC PHOTO SEARCH using GPT-4
   * Uses AI to understand the semantic meaning of user request and match with photo metadata
   * 
   * Example: User says "טיול באיטליה" (trip to Italy)
   * - Traditional search: looks for exact tags "איטליה" or "italy" → FAILS
   * - Semantic search: GPT-4 understands "ונציה" (Venice) IS in Italy → SUCCESS!
   * 
   * @param userId - User ID
   * @param userRequest - Natural language request (e.g., "show me photos from Italy trip")
   * @param mentionedNames - Optional: specific people mentioned
   * @param limit - Max photos to return (default: 5)
   * @returns Ranked photos by relevance score
   */
  async semanticPhotoSearch(
    userId: string,
    userRequest: string,
    mentionedNames?: string[],
    limit: number = 5,
  ): Promise<Photo[]> {
    this.logger.log(`🔍 Semantic search for user ${userId}: "${userRequest}"`);

    try {
      // Step 1: Load ALL photo metadata from Cosmos DB (not the actual images)
      const query = `SELECT p.id, p.filename, p.caption, p.manualTags, p.location, p.capturedDate, p.uploadedAt, p.lastShownAt FROM p WHERE p.userId = @userId`;
      const { resources: allPhotos } = await this.photosContainer.items
        .query({
          query,
          parameters: [{ name: '@userId', value: userId }],
        })
        .fetchAll();

      if (allPhotos.length === 0) {
        this.logger.warn(`No photos found for user ${userId}`);
        return [];
      }

      this.logger.debug(`📚 Loaded ${allPhotos.length} photo metadata entries`);

      // Step 2: Format photo metadata for GPT-4
      const photoDescriptions = allPhotos.map((photo, index) => {
        const tags = (photo.manualTags || []).join(', ');
        const caption = photo.caption || 'No caption';
        const location = photo.location || 'Unknown location';
        const date = photo.capturedDate ? new Date(photo.capturedDate).toLocaleDateString('he-IL') : 'Unknown date';
        
        return `Photo ${index + 1} (ID: ${photo.id}):
  Caption: ${caption}
  Tags: ${tags}
  Location: ${location}
  Date: ${date}`;
      }).join('\n\n');

      // Step 3: Build GPT-4 prompt
      const systemPrompt = `You are a photo search assistant. Your job is to find the most relevant photos based on the user's request.

The user has ${allPhotos.length} photos in their collection. You will receive metadata for each photo (caption, tags, location, date).

Your task:
1. Understand the semantic meaning of the user's request (e.g., "Italy trip" matches "Venice" because Venice is in Italy)
2. Consider synonyms, related concepts, and cultural context (Hebrew and English)
3. Rank photos by relevance (0-10 score, where 10 = perfect match)
4. Return the top ${limit} most relevant photos

IMPORTANT: Be intelligent about matching:
- "טיול באיטליה" (Italy trip) should match "ונציה" (Venice), "רומא" (Rome), "פירנצה" (Florence)
- "משפחה" (family) should match photos with multiple people tags
- "ים" (sea/ocean) should match "חוף" (beach), specific beach names
- Consider dates if user mentions time periods (e.g., "2019", "last year")

Return a JSON object with a "photos" array containing photo IDs ranked by relevance:
{
  "photos": [
    {"id": "photo-uuid-1", "score": 9, "reason": "Venice is in Italy"},
    {"id": "photo-uuid-2", "score": 7, "reason": "Family trip to Europe"}
  ]
}`;

      const userPrompt = `User request: "${userRequest}"
${mentionedNames && mentionedNames.length > 0 ? `Mentioned people: ${mentionedNames.join(', ')}\n` : ''}
Photo collection:

${photoDescriptions}

Return the top ${limit} most relevant photos as JSON array.`;

      // Step 4: Call GPT-4 for semantic matching
      this.logger.debug(`🤖 Calling GPT-4 with deployment: ${process.env.AZURE_OPENAI_CHAT_DEPLOYMENT}`);
      this.logger.debug(`📝 User prompt preview: ${userPrompt.substring(0, 200)}...`);

      const credential = new DefaultAzureCredential();
      const client = new OpenAIClient(
        process.env.AZURE_OPENAI_ENDPOINT,
        credential,
        {
          apiVersion: process.env.AZURE_OPENAI_CHAT_API_VERSION,
        },
      );

      const result = await client.getChatCompletions(
        process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: 0.3, // Lower temperature for more consistent matching
          maxTokens: 1000,
          responseFormat: { type: 'json_object' }, // Force JSON response
        },
      );

      this.logger.debug(`✅ GPT-4 call completed`);

      const responseText = result.choices[0]?.message?.content;
      if (!responseText) {
        this.logger.error('GPT-4 returned empty response');
        return [];
      }

      this.logger.debug(`🤖 GPT-4 raw response: ${responseText.substring(0, 500)}...`);

      // Step 5: Parse GPT-4 response and retrieve full photo objects
      let rankedPhotos;
      try {
        rankedPhotos = JSON.parse(responseText);
      } catch (parseError) {
        this.logger.error(`Failed to parse GPT-4 response: ${parseError.message}`);
        this.logger.error(`Response was: ${responseText}`);
        return [];
      }

      // Handle both array and object responses
      let photoIds = [];
      if (Array.isArray(rankedPhotos)) {
        photoIds = rankedPhotos.map(p => p.id);
      } else if (rankedPhotos.photos && Array.isArray(rankedPhotos.photos)) {
        photoIds = rankedPhotos.photos.map(p => p.id);
      } else if (rankedPhotos.results && Array.isArray(rankedPhotos.results)) {
        photoIds = rankedPhotos.results.map(p => p.id);
      } else {
        this.logger.warn(`Unexpected GPT-4 response format: ${JSON.stringify(rankedPhotos)}`);
      }

      this.logger.log(`✅ GPT-4 ranked ${photoIds.length} photos`);

      // Step 6: Retrieve full photo objects in ranked order
      const fullPhotos: Photo[] = [];
      for (const photoId of photoIds.slice(0, limit)) {
        const photo = allPhotos.find(p => p.id === photoId);
        if (photo) {
          // Fetch full photo document (with blobUrl)
          const { resource } = await this.photosContainer.item(photoId, userId).read();
          if (resource) {
            fullPhotos.push(resource as Photo);
          }
        }
      }

      this.logger.log(`📸 Returning ${fullPhotos.length} semantically matched photos`);
      return fullPhotos;

    } catch (error) {
      this.logger.error(`Semantic search failed: ${error.message}`);
      // Fallback to traditional search
      this.logger.warn('Falling back to traditional keyword search...');
      return this.queryPhotos(userId, { keywords: [userRequest], limit });
    }
  }

  /**
   * Handle photo trigger from AI conversation
   * Called when AI detects appropriate context to show photos
   *
   * INTELLIGENT FALLBACK STRATEGY:
   * 1. First try: Search with specific keywords/names
   * 2. If no results: Return ALL family photos (let AI decide what's relevant)
   * 3. This allows AI to offer alternatives naturally ("I found some family photos...")
   */
  async triggerPhotoDisplay(
    userId: string,
    reason: PhotoTriggerReason,
    mentionedNames?: string[],
    keywords?: string[],
    context?: string,
    emotionalState?: string,
  ): Promise<PhotoTriggerEvent | null> {
    this.logger.log(`📸 Photo trigger for user ${userId}: ${reason}`);

    // 🆕 NEW APPROACH: Use GPT-4 semantic search for better matching
    // Build natural language search query from context
    let searchQuery = '';
    
    if (context && context.trim().length > 0) {
      // Use the conversation context as search query
      searchQuery = context;
    } else if (keywords && keywords.length > 0) {
      // Fallback to keywords
      searchQuery = keywords.join(' ');
    } else if (mentionedNames && mentionedNames.length > 0) {
      // Fallback to mentioned names
      searchQuery = `photos with ${mentionedNames.join(', ')}`;
    } else {
      // Generic request
      searchQuery = 'family photos';
    }

    this.logger.log(`🔍 Semantic search query: "${searchQuery}"`);

    // Try semantic search first
    let photos = await this.semanticPhotoSearch(userId, searchQuery, mentionedNames, 5);

    // Fallback to traditional search if semantic search fails
    if (photos.length === 0) {
      this.logger.warn(`⚠️ Semantic search returned no results. Falling back to traditional search...`);
      
      const queryOptions: PhotoQueryOptions = {
        excludeRecentlyShown: true,
        limit: 5,
        sortBy: 'relevance',
      };

      if (mentionedNames && mentionedNames.length > 0) {
        queryOptions.taggedPeople = mentionedNames;
      }
      if (keywords && keywords.length > 0) {
        queryOptions.keywords = keywords;
      }

      photos = await this.queryPhotos(userId, queryOptions);
    }

    if (photos.length === 0) {
      this.logger.log(`❌ No photos found at all for user ${userId}`);
      return null;
    }

    // Update photo metadata (last shown, shown count)
    await this.updatePhotoMetadata(photos, keywords || []);

    // Build photo trigger event
    const photoDisplay: PhotoDisplay[] = photos.map((photo) => {
      // Convert relative URLs to absolute (for photos stored in dashboard API)
      let photoUrl = photo.blobUrl;
      if (photoUrl.startsWith('/api/photos/')) {
        // Dashboard stores photos in Next.js API routes
        const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3001';
        photoUrl = `${dashboardUrl}${photoUrl}`;
        this.logger.debug(`Converted relative URL to absolute: ${photoUrl}`);
      }

      return {
        id: photo.id,
        url: photoUrl,
        thumbnailUrl: photo.thumbnailUrl,
        caption: photo.caption,
        taggedPeople: photo.manualTags,
        dateTaken: photo.capturedDate,
        location: photo.location,
      };
    });

    const triggerEvent: PhotoTriggerEvent = {
      type: 'photo_trigger',
      photoIds: photos.map((p) => p.id),
      photos: photoDisplay,
      triggerReason: reason,
      mentionedNames,
      context: context || 'Conversation context',
      emotionalState: emotionalState as any,
    };

    this.logger.log(`✅ Photo trigger ready: ${photos.length} photos`);
    return triggerEvent;
  }

  /**
   * Update photo metadata after display
   */
  private async updatePhotoMetadata(photos: Photo[], triggerKeywords: string[]): Promise<void> {
    const now = new Date().toISOString();

    for (const photo of photos) {
      try {
        const update: PhotoMetadataUpdate = {
          lastShownAt: now,
          shownCount: photo.shownCount + 1,
          triggerKeywords: triggerKeywords.length > 0 ? triggerKeywords : photo.triggerKeywords,
        };

        // Patch photo document
        await this.photosContainer
          .item(photo.id, photo.userId)
          .patch([
            { op: 'set', path: '/lastShownAt', value: update.lastShownAt },
            { op: 'set', path: '/shownCount', value: update.shownCount },
            { op: 'set', path: '/triggerKeywords', value: update.triggerKeywords },
          ]);

        this.logger.debug(`Updated metadata for photo ${photo.id}`);
      } catch (error) {
        this.logger.error(`Failed to update photo ${photo.id}: ${error.message}`);
      }
    }
  }

  /**
   * Upload new photo (for family dashboard - Week 7)
   */
  async uploadPhoto(
    userId: string,
    fileName: string,
    blobUrl: string,
    uploadedBy: string,
    manualTags: string[],
    caption?: string,
    location?: string,
    capturedDate?: string,
  ): Promise<Photo> {
    const photo: Photo = {
      id: uuidv4(),
      userId,
      blobUrl,
      fileName,
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      manualTags,
      caption,
      location,
      capturedDate,
      shownCount: 0,
    };

    await this.photosContainer.items.create(photo);
    this.logger.log(`✅ Photo uploaded: ${photo.id} (${fileName})`);

    return photo;
  }

  /**
   * Get all photos for a user (for dashboard)
   */
  async getAllPhotos(userId: string, limit: number = 50): Promise<Photo[]> {
    const query = `
      SELECT * FROM p
      WHERE p.userId = @userId
      ORDER BY p.uploadedAt DESC
      OFFSET 0 LIMIT ${limit}
    `;

    const { resources } = await this.photosContainer.items
      .query({
        query,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    return resources as Photo[];
  }

  /**
   * Delete photo
   */
  async deletePhoto(photoId: string, userId: string): Promise<void> {
    await this.photosContainer.item(photoId, userId).delete();
    this.logger.log(`✅ Photo deleted: ${photoId}`);
  }

  /**
   * Update photo tags and metadata
   */
  async updatePhotoTags(
    photoId: string,
    userId: string,
    manualTags: string[],
    caption?: string,
    location?: string,
  ): Promise<void> {
    const operations: any[] = [{ op: 'set', path: '/manualTags', value: manualTags }];

    if (caption !== undefined) {
      operations.push({ op: 'set', path: '/caption', value: caption });
    }

    if (location !== undefined) {
      operations.push({ op: 'set', path: '/location', value: location });
    }

    await this.photosContainer.item(photoId, userId).patch(operations);

    this.logger.log(`✅ Photo ${photoId} tags updated`);
  }
}
