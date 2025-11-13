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

    // Get today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    // Query conversations today
    const conversationsContainer = database.container('Conversations');
    const conversationsQuery = {
      query: `SELECT VALUE COUNT(1) FROM Conversations c 
              WHERE c.userId = @userId 
              AND c.startedAt >= @todayStart 
              AND c.startedAt < @todayEnd`,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@todayStart', value: todayStart },
        { name: '@todayEnd', value: todayEnd },
      ],
    };
    const { resources: conversationCount } = await conversationsContainer.items
      .query(conversationsQuery)
      .fetchAll();

    // Get last conversation time
    const lastConversationQuery = {
      query: `SELECT TOP 1 c.startedAt FROM Conversations c 
              WHERE c.userId = @userId 
              ORDER BY c.startedAt DESC`,
      parameters: [{ name: '@userId', value: userId }],
    };
    const { resources: lastConversations } = await conversationsContainer.items
      .query(lastConversationQuery)
      .fetchAll();

    // Query reminders today
    const remindersContainer = database.container('Reminders');
    const remindersQuery = {
      query: `SELECT * FROM Reminders r 
              WHERE r.userId = @userId 
              AND r.scheduledFor >= @todayStart 
              AND r.scheduledFor < @todayEnd
              AND r.type = 'medication'`,
      parameters: [
        { name: '@userId', value: userId },
        { name: '@todayStart', value: todayStart },
        { name: '@todayEnd', value: todayEnd },
      ],
    };
    const { resources: remindersToday } = await remindersContainer.items.query(remindersQuery).fetchAll();

    const medicationsScheduledToday = remindersToday.length;
    const medicationsTakenToday = remindersToday.filter(
      (r) => r.status === 'completed' || r.status === 'confirmed'
    ).length;
    const medicationComplianceRate =
      medicationsScheduledToday > 0
        ? Math.round((medicationsTakenToday / medicationsScheduledToday) * 100)
        : 100;

    // Query active alerts
    const safetyContainer = database.container('SafetyIncidents');
    const alertsQuery = {
      query: `SELECT VALUE COUNT(1) FROM SafetyIncidents s 
              WHERE s.userId = @userId 
              AND (s.resolved = false OR NOT IS_DEFINED(s.resolved))`,
      parameters: [{ name: '@userId', value: userId }],
    };
    const { resources: activeAlerts } = await safetyContainer.items.query(alertsQuery).fetchAll();

    return NextResponse.json({
      conversationsToday: conversationCount[0] || 0,
      medicationComplianceRate,
      activeAlerts: activeAlerts[0] || 0,
      lastConversationTime: lastConversations[0]?.startedAt || null,
      medicationsTakenToday,
      medicationsScheduledToday,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard stats' },
      { status: 500 }
    );
  }
}
