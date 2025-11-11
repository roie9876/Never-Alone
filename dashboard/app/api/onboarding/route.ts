/**
 * API Route: POST /api/onboarding
 * Save safety configuration to Cosmos DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveSafetyConfig } from '@/lib/cosmos';
import type { SafetyConfig } from '@/types/onboarding';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.emergencyContacts || !body.medications) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prepare safety config
    const config: SafetyConfig = {
      id: body.id,
      userId: body.userId,
      emergencyContacts: body.emergencyContacts,
      medications: body.medications,
      routines: body.routines,
      boundaries: body.boundaries,
      crisisTriggers: body.crisisTriggers,
      yamlConfig: body.yamlConfig,
      createdAt: body.createdAt,
      updatedAt: body.updatedAt,
    };

    // Save to Cosmos DB
    const savedConfig = await saveSafetyConfig(config);

    return NextResponse.json({
      success: true,
      data: savedConfig,
    });
    
  } catch (error) {
    console.error('Onboarding API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
