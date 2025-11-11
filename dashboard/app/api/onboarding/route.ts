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

    // Save to Cosmos DB
    const savedConfig = await saveSafetyConfig(config);

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
