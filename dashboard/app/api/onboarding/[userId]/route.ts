/**
 * API Route: GET /api/onboarding/[userId]
 * Load existing safety configuration from Cosmos DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  
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
        blobUrl: p.blobUrl,
        manualTags: p.manualTags || [],
        caption: p.caption || '',
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
    
    return NextResponse.json({
      success: true,
      data: formData,
    });
    
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
