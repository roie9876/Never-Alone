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
      if (options.taggedPeople && options.taggedPeople.length > 0) {
        const tagConditions = options.taggedPeople.map((person, index) => {
          parameters.push({ name: `@person${index}`, value: person });
          return `ARRAY_CONTAINS(p.manualTags, @person${index}, true)`;
        });
        query += ` AND (${tagConditions.join(' OR ')})`;
      }

      // Filter by keywords in tags or caption
      // Note: Case-insensitive search by storing tags in lowercase during upload
      if (options.keywords && options.keywords.length > 0) {
        const keywordConditions = options.keywords.map((keyword, index) => {
          const paramNameExact = `@keyword${index}`;
          const paramNameLower = `@keywordLower${index}`;
          parameters.push({ name: paramNameExact, value: keyword });
          parameters.push({ name: paramNameLower, value: keyword.toLowerCase() });
          // Check exact match in tags OR lowercase match in caption
          return `(ARRAY_CONTAINS(p.manualTags, ${paramNameExact}, true) OR ARRAY_CONTAINS(p.manualTags, ${paramNameLower}, true) OR CONTAINS(LOWER(p.caption), ${paramNameLower}))`;
        });
        query += ` AND (${keywordConditions.join(' OR ')})`;
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
   * Handle photo trigger from AI conversation
   * Called when AI detects appropriate context to show photos
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

    // Build query options based on trigger reason
    const queryOptions: PhotoQueryOptions = {
      excludeRecentlyShown: true,
      limit: 5,
      sortBy: 'relevance',
    };

    // Add filters based on context
    if (mentionedNames && mentionedNames.length > 0) {
      queryOptions.taggedPeople = mentionedNames;
      this.logger.debug(`Filtering by tagged people: ${mentionedNames.join(', ')}`);
    }

    if (keywords && keywords.length > 0) {
      queryOptions.keywords = keywords;
      this.logger.debug(`Filtering by keywords: ${keywords.join(', ')}`);
    }

    // Query matching photos
    const photos = await this.queryPhotos(userId, queryOptions);

    if (photos.length === 0) {
      this.logger.log(`❌ No photos found matching criteria for user ${userId}`);
      return null;
    }

    // Update photo metadata (last shown, shown count)
    await this.updatePhotoMetadata(photos, keywords || []);

    // Build photo trigger event
    const photoDisplay: PhotoDisplay[] = photos.map((photo) => ({
      id: photo.id,
      url: photo.blobUrl,
      thumbnailUrl: photo.thumbnailUrl,
      caption: photo.caption,
      taggedPeople: photo.manualTags,
      dateTaken: photo.capturedDate,
      location: photo.location,
    }));

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
