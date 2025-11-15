/**
 * API Route: GET /api/onboarding/[userId]
 * Load existing safety configuration from Cosmos DB
 * 
 * API Route: PUT /api/onboarding/[userId]
 * Update existing safety configuration in Cosmos DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Next.js 15+: params is now a Promise that must be awaited
  const { userId } = await params;
  
  console.log(`🔍 GET /api/onboarding/${userId} - Loading existing configuration`);
  
  try {
    // Initialize Cosmos client
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      aadCredentials: credential,
    });
    
    const database = client.database('never-alone');
    
    // Load safety config
    const safetyContainer = database.container('safety-config');
    const { resources: safetyConfigs } = await safetyContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();
    
    if (safetyConfigs.length === 0) {
      console.log(`⚠️ No safety config found for user ${userId}`);
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }
    
    const safetyConfig = safetyConfigs[0];
    console.log(`✅ Safety config loaded for user ${userId}`);
    
    // Load music preferences
    let musicPreferences = null;
    try {
      const musicContainer = database.container('user-music-preferences');
      const { resources: musicPrefs } = await musicContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: userId }],
        })
        .fetchAll();
      
      if (musicPrefs.length > 0) {
        musicPreferences = musicPrefs[0];
        console.log(`✅ Music preferences loaded for user ${userId}`);
        console.log(`   - Enabled: ${musicPreferences.enabled}`);
        console.log(`   - Artists: ${musicPreferences.preferredArtists?.length || 0}`);
        console.log(`   - Songs: ${musicPreferences.preferredSongs?.length || 0}`);
      } else {
        console.log(`⚠️ No music preferences found for user ${userId}`);
      }
    } catch (musicError) {
      console.warn(`⚠️ Error loading music preferences: ${musicError instanceof Error ? musicError.message : 'Unknown error'}`);
    }
    
    // Load photos
    let photos = [];
    try {
      const photosContainer = database.container('photos');
      const { resources: photoResources } = await photosContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: userId }],
        })
        .fetchAll();
      
      photos = photoResources;
      console.log(`✅ Loaded ${photos.length} photos for user ${userId}`);
    } catch (photoError) {
      console.warn(`⚠️ Error loading photos: ${photoError instanceof Error ? photoError.message : 'Unknown error'}`);
    }
    
    // Transform data for form (with defaults for missing fields)
    const formData = {
      userId: safetyConfig.userId,
      patientBackground: safetyConfig.patientBackground || {
        fullName: '',
        age: 0,
        medicalCondition: '',
        personality: '',
        hobbies: '',
      },
      emergencyContacts: safetyConfig.emergencyContacts || [],
      medications: safetyConfig.medications || [],
      routines: safetyConfig.routines || {
        wakeUpTime: '',
        breakfastTime: '',
        lunchTime: '',
        dinnerTime: '',
        bedTime: '',
      },
      boundaries: safetyConfig.boundaries || safetyConfig.neverAllow || [],
      crisisTriggers: safetyConfig.crisisTriggers || [],
      photos: photos.map(p => ({
        id: p.id || `photo-${Date.now()}-${Math.random()}`,
        fileName: p.fileName || p.blobUrl.split('/').pop() || 'unknown',
        blobUrl: p.blobUrl,
        uploadedAt: p.uploadedAt || p._ts ? new Date(p._ts * 1000).toISOString() : new Date().toISOString(),
        manualTags: p.manualTags || [],
        caption: p.caption || '',
        size: p.size || 0,
      })),
      musicPreferences: musicPreferences ? {
        enabled: musicPreferences.enabled,
        preferredArtists: musicPreferences.preferredArtists?.join(', ') || '',
        preferredSongs: musicPreferences.preferredSongs?.join(', ') || '',
        preferredGenres: musicPreferences.preferredGenres?.join(', ') || '',
        allowAutoPlay: musicPreferences.allowAutoPlay || false,
        playOnSadness: musicPreferences.playOnSadness || false,
        maxSongsPerSession: musicPreferences.maxSongsPerSession || 3,
      } : {
        enabled: false,
        preferredArtists: '',
        preferredSongs: '',
        preferredGenres: '',
        allowAutoPlay: false,
        playOnSadness: false,
        maxSongsPerSession: 3,
      },
      createdAt: safetyConfig.createdAt,
      updatedAt: safetyConfig.updatedAt,
    };
    
    console.log(`✅ Configuration loaded successfully for user ${userId}`);
    
    // Return with no-cache headers to prevent stale data on refresh
    return NextResponse.json(
      {
        success: true,
        data: formData,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
    
  } catch (error) {
    console.error(`❌ Error loading configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to load configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/onboarding/[userId]
 * Update existing configuration (upsert)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  console.log(`🔄 PUT /api/onboarding/${userId} - Updating configuration`);
  
  try {
    const body = await request.json();
    console.log('📝 Update data received');
    
    // Initialize Cosmos client
    const credential = new DefaultAzureCredential();
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_ENDPOINT!,
      aadCredentials: credential,
    });
    
    const database = client.database('never-alone');
    
    // Update safety config
    const safetyContainer = database.container('safety-config');
    
    // First, find the existing document
    const { resources: existingConfigs } = await safetyContainer.items
      .query({
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();
    
    // Prepare updated config
    const updatedConfig = {
      id: existingConfigs.length > 0 ? existingConfigs[0].id : `config-${userId}-${Date.now()}`,
      userId: userId,
      patientBackground: body.patientBackground,
      emergencyContacts: body.emergencyContacts,
      medications: body.medications,
      routines: body.routines,
      boundaries: body.boundaries,
      crisisTriggers: body.crisisTriggers,
      yamlConfig: body.yamlConfig,
      createdAt: existingConfigs.length > 0 ? existingConfigs[0].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Upsert (update or insert)
    const { resource: savedConfig } = await safetyContainer.items.upsert(updatedConfig);
    console.log('✅ Safety config updated');
    
    // Update music preferences if provided
    if (body.musicPreferences) {
      console.log('🎵 Updating music preferences...');
      const musicContainer = database.container('user-music-preferences');
      
      // Find existing music prefs
      const { resources: existingMusic } = await musicContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.userId = @userId',
          parameters: [{ name: '@userId', value: userId }],
        })
        .fetchAll();
      
      const musicPrefs = {
        id: existingMusic.length > 0 ? existingMusic[0].id : `music-${userId}-${Date.now()}`,
        userId: userId,
        enabled: body.musicPreferences.enabled,
        preferredArtists: body.musicPreferences.preferredArtists ? 
          body.musicPreferences.preferredArtists.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        preferredSongs: body.musicPreferences.preferredSongs ?
          body.musicPreferences.preferredSongs.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        preferredGenres: body.musicPreferences.preferredGenres ?
          body.musicPreferences.preferredGenres.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        allowAutoPlay: body.musicPreferences.allowAutoPlay || false,
        playOnSadness: body.musicPreferences.playOnSadness || false,
        maxSongsPerSession: body.musicPreferences.maxSongsPerSession || 3,
        updatedAt: new Date().toISOString(),
      };
      
      await musicContainer.items.upsert(musicPrefs);
      console.log('✅ Music preferences updated');
    }
    
    console.log(`✅ Configuration updated successfully for user ${userId}`);
    
    return NextResponse.json(
      {
        success: true,
        data: savedConfig,
        message: 'Configuration updated successfully',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
    
  } catch (error) {
    console.error(`❌ Error updating configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
