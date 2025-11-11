/**
 * Azure Configuration Service
 * Manages connections to Azure services (Cosmos DB, Redis, Blob Storage)
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { CosmosClient, Database, Container } from '@azure/cosmos';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { createClient, RedisClientType } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class AzureConfigService implements OnModuleInit {
  // Cosmos DB
  private cosmosClient: CosmosClient;
  private database: Database;
  public usersContainer: Container;
  public conversationsContainer: Container;
  public memoriesContainer: Container;
  public remindersContainer: Container;
  public photosContainer: Container;
  public safetyConfigContainer: Container;
  public safetyIncidentsContainer: Container;
  public musicPreferencesContainer: Container;
  public musicPlaybackHistoryContainer: Container;

  // Redis
  public redisClient: RedisClientType;

  // Blob Storage
  private blobServiceClient: BlobServiceClient;
  public audioContainer: ContainerClient;
  public photosBlob: ContainerClient;

  async onModuleInit() {
    await this.initializeCosmosDB();
    await this.initializeRedis();
    await this.initializeBlobStorage();
  }

  /**
   * Initialize Cosmos DB connection and containers
   */
  private async initializeCosmosDB() {
    const endpoint = process.env.COSMOS_ENDPOINT;
    const databaseName = process.env.COSMOS_DATABASE || 'never-alone';

    if (!endpoint) {
      throw new Error('Cosmos DB endpoint missing in environment variables');
    }

    // Use Azure AD authentication with DefaultAzureCredential
    // This will try: Azure CLI → Managed Identity → Environment Variables → etc.
    const credential = new DefaultAzureCredential();

    this.cosmosClient = new CosmosClient({
      endpoint,
      aadCredentials: credential
    });

    this.database = this.cosmosClient.database(databaseName);

    // Initialize container references
    this.usersContainer = this.database.container('users');
    this.conversationsContainer = this.database.container('conversations');
    this.memoriesContainer = this.database.container('memories');
    this.remindersContainer = this.database.container('reminders');
    this.photosContainer = this.database.container('photos');
    this.safetyConfigContainer = this.database.container('safety-config');
    this.safetyIncidentsContainer = this.database.container('safety-incidents');
    this.musicPreferencesContainer = this.database.container('user-music-preferences');
    this.musicPlaybackHistoryContainer = this.database.container('music-playback-history');

    console.log('✅ Cosmos DB initialized successfully');
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis() {
    const host = process.env.REDIS_HOST;
    const port = parseInt(process.env.REDIS_PORT || '6380');
    const password = process.env.REDIS_PASSWORD;
    const useTls = process.env.REDIS_TLS === 'true';

    if (!host || host.includes('<your-redis>')) {
      console.warn('⚠️  Redis configuration not provided - Redis features will be unavailable');
      return;
    }

    // Build Redis client config
    const clientConfig: any = {
      socket: {
        host,
        port,
      },
    };

    // Add TLS for Azure Redis (production)
    if (useTls) {
      clientConfig.socket.tls = true;
    }

    // Add password if provided (not needed for local Redis)
    if (password && password.trim() !== '') {
      clientConfig.password = password;
    }

    this.redisClient = createClient(clientConfig);

    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await this.redisClient.connect();
    console.log('✅ Redis connected successfully');
  }

  /**
   * Initialize Blob Storage connection
   */
  private async initializeBlobStorage() {
    const storageAccountName = process.env.BLOB_STORAGE_ACCOUNT_NAME || 'neveralone';
    const audioContainerName = process.env.BLOB_CONTAINER_AUDIO || 'audio-files';
    const photosContainerName = process.env.BLOB_CONTAINER_PHOTOS || 'photos';

    if (!storageAccountName) {
      throw new Error('Blob Storage account name missing in environment variables');
    }

    // Use Azure AD authentication with DefaultAzureCredential
    const credential = new DefaultAzureCredential();
    const blobServiceUrl = `https://${storageAccountName}.blob.core.windows.net`;

    this.blobServiceClient = new BlobServiceClient(blobServiceUrl, credential);
    this.audioContainer = this.blobServiceClient.getContainerClient(audioContainerName);
    this.photosBlob = this.blobServiceClient.getContainerClient(photosContainerName);

    console.log('✅ Blob Storage initialized successfully');
  }

  /**
   * Health check for all Azure services
  npm run check:containers   */
  async healthCheck(): Promise<{
    cosmosDb: boolean;
    redis: boolean;
    blobStorage: boolean;
  }> {
    const health = {
      cosmosDb: false,
      redis: false,
      blobStorage: false,
    };

    try {
      // Test Cosmos DB
      if (this.database) {
        await this.database.read();
        health.cosmosDb = true;
      }
    } catch (error) {
      console.error('Cosmos DB health check failed:', error.message);
    }

    try {
      // Test Redis
      if (this.redisClient) {
        await this.redisClient.ping();
        health.redis = true;
      }
    } catch (error) {
      console.error('Redis health check failed:', error.message);
    }

    try {
      // Test Blob Storage
      if (this.audioContainer) {
        await this.audioContainer.exists();
        health.blobStorage = true;
      }
    } catch (error) {
      console.error('Blob Storage health check failed:', error.message);
    }

    return health;
  }

  /**
   * Gracefully close all connections
   */
  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('Redis connection closed');
    }
  }
}
