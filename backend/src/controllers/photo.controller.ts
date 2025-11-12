/**
 * Photo Controller
 * REST API endpoints for photo management and testing
 *
 * Reference: docs/technical/reminder-system.md - Photo Context Triggering
 */

import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { PhotoService } from '@services/photo.service';
import { PhotoTriggerReason } from '@interfaces/photo.interface';

@Controller('photo')
export class PhotoController {
  private readonly logger = new Logger(PhotoController.name);

  constructor(private readonly photoService: PhotoService) {}

  /**
   * Upload new photo (for testing and family dashboard)
   * POST /photo/upload
   */
  @Post('upload')
  async uploadPhoto(@Body() body: any) {
    this.logger.log(`Uploading photo for user ${body.userId}: ${body.fileName}`);

    const photo = await this.photoService.uploadPhoto(
      body.userId,
      body.fileName,
      body.blobUrl,
      body.uploadedBy,
      body.manualTags || [],
      body.caption,
      body.location,
      body.capturedDate,
    );

    return photo;
  }

  /**
   * Bulk import photos from dashboard
   * POST /photo/bulk
   */
  @Post('bulk')
  async bulkUploadPhotos(@Body() body: { userId: string; photos: any[] }) {
    this.logger.log(`Bulk uploading ${body.photos.length} photos for user ${body.userId}`);

    const results = [];
    for (const photoData of body.photos) {
      try {
        const photo = await this.photoService.uploadPhoto(
          body.userId,
          photoData.fileName || 'unknown',
          photoData.blobUrl,
          'family-dashboard',
          photoData.manualTags || [],
          photoData.caption || '',
          photoData.location || '',
          photoData.capturedDate || photoData.uploadedAt,
        );
        results.push({ success: true, photoId: photo.id });
      } catch (error) {
        this.logger.error(`Failed to upload photo ${photoData.fileName}: ${error.message}`);
        results.push({ success: false, fileName: photoData.fileName, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    this.logger.log(`Bulk upload complete: ${successCount}/${body.photos.length} photos saved to Cosmos DB`);

    return {
      success: true,
      message: `${successCount}/${body.photos.length} photos saved successfully`,
      results,
    };
  }

  /**
   * Query photos by criteria (for testing)
   * GET /photo/:userId?taggedPeople=Sarah&keywords=family,birthday&limit=5
   */
  @Get(':userId')
  async queryPhotos(
    @Param('userId') userId: string,
    @Query('taggedPeople') taggedPeople?: string,
    @Query('keywords') keywords?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`Querying photos for user ${userId}`);

    const options: any = {
      excludeRecentlyShown: false, // For testing, show all
      limit: limit ? parseInt(limit) : 5,
    };

    if (taggedPeople) {
      options.taggedPeople = taggedPeople.split(',').map((s) => s.trim());
    }

    if (keywords) {
      options.keywords = keywords.split(',').map((s) => s.trim());
    }

    const photos = await this.photoService.queryPhotos(userId, options);
    return photos;
  }

  /**
   * Get all photos for user (for dashboard)
   * GET /photo/:userId/all
   */
  @Get(':userId/all')
  async getAllPhotos(@Param('userId') userId: string, @Query('limit') limit?: string) {
    this.logger.log(`Getting all photos for user ${userId}`);

    const photos = await this.photoService.getAllPhotos(userId, limit ? parseInt(limit) : 50);
    return photos;
  }

  /**
   * Trigger photo display (simulate AI function call)
   * POST /photo/trigger
   */
  @Post('trigger')
  async triggerPhotoDisplay(@Body() body: any) {
    this.logger.log(`Photo trigger for user ${body.userId}: ${body.trigger_reason}`);

    const photoEvent = await this.photoService.triggerPhotoDisplay(
      body.userId,
      body.trigger_reason as PhotoTriggerReason,
      body.mentioned_names,
      body.keywords,
      body.context,
      body.emotional_state,
    );

    if (photoEvent) {
      return {
        success: true,
        photos_shown: photoEvent.photos.length,
        photo_descriptions: photoEvent.photos.map((p) =>
          `Photo of ${p.taggedPeople.join(', ')}${p.dateTaken ? ` taken on ${new Date(p.dateTaken).toLocaleDateString('he-IL')}` : ''}${p.location ? ` at ${p.location}` : ''}`,
        ),
        photos: photoEvent.photos,
      };
    } else {
      return {
        success: false,
        photos_shown: 0,
        message: 'No photos match the criteria or all recent photos already shown',
      };
    }
  }

  /**
   * Update photo tags and metadata
   * PATCH /photo/:userId/:photoId
   */
  @Patch(':userId/:photoId')
  async updatePhotoTags(
    @Param('userId') userId: string,
    @Param('photoId') photoId: string,
    @Body() body: any,
  ) {
    this.logger.log(`Updating photo ${photoId} for user ${userId}`);

    await this.photoService.updatePhotoTags(
      photoId,
      userId,
      body.manualTags,
      body.caption,
      body.location,
    );

    return { success: true, message: 'Photo updated successfully' };
  }

  /**
   * Delete photo
   * DELETE /photo/:userId/:photoId
   */
  @Delete(':userId/:photoId')
  async deletePhoto(@Param('userId') userId: string, @Param('photoId') photoId: string) {
    this.logger.log(`Deleting photo ${photoId} for user ${userId}`);

    await this.photoService.deletePhoto(photoId, userId);
    return { success: true, message: 'Photo deleted successfully' };
  }
}
