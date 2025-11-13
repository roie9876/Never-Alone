/**
 * Alerts API - PATCH to acknowledge/resolve an alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

const credential = new DefaultAzureCredential();
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: credential,
});

const database = cosmosClient.database(process.env.COSMOS_DATABASE || 'never-alone');
const safetyIncidentsContainer = database.container('SafetyIncidents');

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Decode Base64 token
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      userId = decoded.userId;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get alert ID from params
    const params = await context.params;
    const alertId = params.id;

    // Get update data from request body
    const body = await request.json();
    const { resolved, resolvedBy, resolvedAt } = body;

    // Fetch existing alert
    const { resource: existingAlert } = await safetyIncidentsContainer
      .item(alertId, userId)
      .read();

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Update alert
    const updatedAlert = {
      ...existingAlert,
      resolved: resolved ?? existingAlert.resolved,
      resolvedBy: resolvedBy ?? existingAlert.resolvedBy,
      resolvedAt: resolvedAt ?? existingAlert.resolvedAt,
    };

    const { resource: result } = await safetyIncidentsContainer
      .item(alertId, userId)
      .replace(updatedAlert);

    return NextResponse.json({
      success: true,
      alert: result,
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
