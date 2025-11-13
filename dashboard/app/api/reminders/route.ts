import { NextRequest, NextResponse } from 'next/server';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

// Initialize Cosmos DB client with Azure AD authentication
const credential = new DefaultAzureCredential();
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  aadCredentials: credential,
});

const database = cosmosClient.database('never-alone');
const remindersContainer = database.container('Reminders');

export async function GET(request: NextRequest) {
  try {
    // Decode token to get userId
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    const userId = decoded.userId;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get filter parameter
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'today';

    // Calculate date ranges
    const now = new Date();
    let startDate: string;
    
    if (filter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (filter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString();
    } else {
      // All history - start from beginning of time
      startDate = new Date(0).toISOString();
    }

    // Query reminders
    const querySpec = {
      query: `SELECT * FROM Reminders r 
              WHERE r.userId = @userId 
              AND r.scheduledFor >= @startDate
              AND r.type = 'medication'
              ORDER BY r.scheduledFor DESC`,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@startDate', value: startDate },
      ],
    };

    const { resources: reminders } = await remindersContainer.items.query(querySpec).fetchAll();

    // Transform reminders to include medication name
    const transformedReminders = reminders.map((reminder) => ({
      id: reminder.id,
      medicationName: reminder.medicationName || reminder.metadata?.medicationName || 'תרופה',
      scheduledFor: reminder.scheduledFor,
      status: reminder.status,
      completedAt: reminder.completedAt || reminder.confirmedAt,
      declineCount: reminder.declineCount || 0,
    }));

    return NextResponse.json({
      reminders: transformedReminders,
      total: transformedReminders.length,
    });
  } catch (error) {
    console.error('Reminders API error:', error);
    return NextResponse.json(
      { error: 'Failed to load reminders' },
      { status: 500 }
    );
  }
}
