/**
 * API Route: POST /api/onboarding
 * Save safety configuration to Cosmos DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveSafetyConfig } from '@/lib/cosmos';
import type { SafetyConfig } from '@/types/onboarding';

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/onboarding - Request received');
  
  try {
    const body = await request.json();
    console.log('📝 Request body received, userId:', body.userId);

    // Validate required fields
    if (!body.userId || !body.emergencyContacts || !body.medications) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: userId, emergencyContacts, or medications' },
        { status: 400 }
      );
    }

    if (!body.patientBackground) {
      console.error('❌ Missing patientBackground field');
      return NextResponse.json(
        { error: 'Missing required field: patientBackground' },
        { status: 400 }
      );
    }

    // Prepare safety config
    const config: SafetyConfig = {
      id: body.id,
      userId: body.userId,
      patientBackground: body.patientBackground,
      emergencyContacts: body.emergencyContacts,
      medications: body.medications,
      routines: body.routines,
      boundaries: body.boundaries,
      crisisTriggers: body.crisisTriggers,
      yamlConfig: body.yamlConfig,
      createdAt: body.createdAt,
      updatedAt: body.updatedAt,
    };

    console.log('💾 Saving to Cosmos DB...');
    console.log('   - Patient:', config.patientBackground.fullName);
    console.log('   - Emergency contacts:', config.emergencyContacts.length);
    console.log('   - Medications:', config.medications.length);
    console.log('   - Photos:', body.photos?.length || 0);
    console.log('   - Music preferences:', body.musicPreferences?.enabled ? 'Enabled' : 'Disabled');

    // Save to Cosmos DB
    const savedConfig = await saveSafetyConfig(config);

    // If music preferences were configured, save them to backend
    if (body.musicPreferences) {
      console.log('🎵 Saving music preferences to backend...');
      try {
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const musicResponse = await fetch(`${backendUrl}/music/preferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: body.userId,
            ...body.musicPreferences,
          }),
        });

        if (!musicResponse.ok) {
          console.warn('⚠️ Failed to save music preferences to backend:', await musicResponse.text());
        } else {
          console.log('✅ Music preferences saved to Cosmos DB');
        }
      } catch (musicError) {
        console.warn('⚠️ Error saving music preferences to backend:', musicError);
        // Don't fail the whole onboarding if music preferences fail
      }
    }

    // If photos were uploaded, save them to Cosmos DB photos container
    if (body.photos && body.photos.length > 0) {
      console.log('📸 Saving photos to Cosmos DB...');
      try {
        // Call backend API to save photos
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        const photosResponse = await fetch(`${backendUrl}/photo/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: body.userId,
            photos: body.photos,
          }),
        });

        if (!photosResponse.ok) {
          console.warn('⚠️ Failed to save photos to backend:', await photosResponse.text());
        } else {
          console.log('✅ Photos saved to Cosmos DB');
        }
      } catch (photoError) {
        console.warn('⚠️ Error saving photos to backend:', photoError);
        // Don't fail the whole onboarding if photos fail
      }
    }

    if (!savedConfig) {
      throw new Error('Failed to save configuration - no data returned');
    }

    console.log('✅ Configuration saved successfully, ID:', savedConfig.id);

    return NextResponse.json({
      success: true,
      data: savedConfig,
    });
    
  } catch (error) {
    console.error('❌ Onboarding API error:', error);
    console.error('   Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to save configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
