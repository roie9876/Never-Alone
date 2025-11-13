/**
 * Alerts Page - View Safety Incidents

 */ * Shows SafetyIncidents from Cosmos DB with filtering and acknowledge functionality

 */

import { NextRequest, NextResponse } from 'next/server';

import { CosmosClient } from '@azure/cosmos';'use client';

import { DefaultAzureCredential } from '@azure/identity';

import { useState, useEffect } from 'react';

const credential = new DefaultAzureCredential();import { useRouter } from 'next/navigation';

const cosmosClient = new CosmosClient({import Link from 'next/link';

  endpoint: process.env.COSMOS_ENDPOINT!,

  aadCredentials: credential,interface SafetyIncident {

});  id: string;

  timestamp: string;

const database = cosmosClient.database(process.env.COSMOS_DATABASE || 'never-alone');  severity: 'critical' | 'high' | 'medium';

const safetyIncidentsContainer = database.container('SafetyIncidents');  incidentType: string;

  userRequest?: string;

export async function GET(request: NextRequest) {  safetyRule?: {

  try {    ruleName: string;

    // Get auth token from header    reason: string;

    const authHeader = request.headers.get('authorization');  };

    if (!authHeader || !authHeader.startsWith('Bearer ')) {  context?: {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });    userRequest?: string;

    }    aiResponse?: string;

  };

    const token = authHeader.substring(7);  resolved: boolean;

      resolvedAt?: string;

    // Decode Base64 token  resolvedBy?: string;

    let userId: string;  conversationId?: string;

    try {}

      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));

      userId = decoded.userId;interface AlertsResponse {

    } catch {  alerts: SafetyIncident[];

      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });  total: number;

    }}



    // Get filter parameterexport default function AlertsPage() {

    const { searchParams } = new URL(request.url);  const router = useRouter();

    const filter = searchParams.get('filter') || 'active'; // 'active', 'resolved', 'all'  const [alerts, setAlerts] = useState<SafetyIncident[]>([]);

  const [loading, setLoading] = useState(true);

    // Build query based on filter  const [filter, setFilter] = useState<'active' | 'resolved' | 'all'>('active');

    let query = `  const [familyMemberName, setFamilyMemberName] = useState('');

      SELECT * FROM SafetyIncidents s

      WHERE s.userId = @userId  useEffect(() => {

    `;    // Check authentication

    const token = localStorage.getItem('authToken');

    if (filter === 'active') {    const name = localStorage.getItem('familyMemberName');

      query += ` AND (s.resolved = false OR NOT IS_DEFINED(s.resolved))`;    

    } else if (filter === 'resolved') {    if (!token) {

      query += ` AND s.resolved = true`;      router.push('/login');

    }      return;

    // 'all' - no additional filter    }

    

    query += ` ORDER BY s.timestamp DESC`;    if (name) {

      setFamilyMemberName(name);

    // Execute query    }

    const { resources } = await safetyIncidentsContainer.items    

      .query({    const fetchAlerts = async () => {

        query,      setLoading(true);

        parameters: [{ name: '@userId', value: userId }],      try {

      })        const response = await fetch(`/api/alerts?filter=${filter}`, {

      .fetchAll();          headers: {

            'Authorization': `Bearer ${token}`,

    return NextResponse.json({          },

      alerts: resources,        });

      total: resources.length,

    });        if (!response.ok) {

  } catch (error) {          throw new Error('Failed to load alerts');

    console.error('Error fetching alerts:', error);        }

    return NextResponse.json(

      { error: 'Failed to fetch alerts', details: error instanceof Error ? error.message : 'Unknown error' },        const data: AlertsResponse = await response.json();

      { status: 500 }        setAlerts(data.alerts);

    );      } catch (error) {

  }        console.error('Error loading alerts:', error);

}        alert('שגיאה בטעינת התרעות');

      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
  }, [filter, router]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/alerts?filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load alerts');
      }

      const data: AlertsResponse = await response.json();
      setAlerts(data.alerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      alert('שגיאה בטעינת התרעות');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolved: true,
          resolvedBy: familyMemberName,
          resolvedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      // Reload alerts
      loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      alert('שגיאה באישור התרעה');
    }
  };

  const getSeverityBadge = (severity: string) => {
    const badges = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    
    const labels = {
      critical: 'קריטי',
      high: 'גבוה',
      medium: 'בינוני',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${badges[severity as keyof typeof badges]}`}>
        {labels[severity as keyof typeof labels]}
      </span>
    );
  };

  const getIncidentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'unsafe_physical_movement': 'ניסיון לצאת מהבית',
      'leaving_home_alone': 'ניסיון לצאת מהבית לבד',
      'unsafe_action_request': 'בקשה לפעולה מסוכנת',
      'crisis_trigger_detected': 'מילות טריגר משבר',
      'medication_refusal': 'סירוב לקחת תרופה',
      'self_harm_indication': 'אינדיקציה לפגיעה עצמית',
    };
    
    return labels[type] || type;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4 space-x-reverse">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
                ← חזרה ללוח הבקרה
              </Link>
            </div>
            <div className="text-gray-700">
              שלום, <span className="font-semibold">{familyMemberName}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-right mb-2">
            התרעות בטיחות
          </h1>
          <p className="text-gray-600 text-right">
            מעקב אחר אירועי בטיחות ומצבי משבר
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex space-x-2 space-x-reverse border-b border-gray-200">
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-3 font-medium transition-colors ${
              filter === 'active'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            פעילות ({alerts.filter(a => !a.resolved).length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-6 py-3 font-medium transition-colors ${
              filter === 'resolved'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            טופלו
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-3 font-medium transition-colors ${
              filter === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            כל ההתרעות
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">טוען התרעות...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && alerts.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">אין התרעות להצגה</h3>
            <p className="text-gray-600">
              {filter === 'active' && 'אין התרעות פעילות כרגע'}
              {filter === 'resolved' && 'אין התרעות שטופלו'}
              {filter === 'all' && 'לא נרשמו התרעות במערכת'}
            </p>
          </div>
        )}

        {/* Alerts List */}
        {!loading && alerts.length > 0 && (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-lg shadow-sm border ${
                  alert.resolved ? 'border-gray-200 opacity-75' : 'border-gray-300'
                } p-6`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    {getSeverityBadge(alert.severity)}
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                  {!alert.resolved && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      אישור וסגירה
                    </button>
                  )}
                  {alert.resolved && (
                    <div className="text-sm text-green-600 font-medium">
                      ✓ טופל
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 text-right">
                    {getIncidentTypeLabel(alert.incidentType)}
                  </h3>
                  {alert.safetyRule && (
                    <p className="text-sm text-gray-600 text-right">
                      כלל בטיחות: {alert.safetyRule.ruleName}
                    </p>
                  )}
                </div>

                {/* Context */}
                {alert.context && (
                  <div className="bg-gray-50 rounded-md p-4 mb-3">
                    {alert.context.userRequest && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700 block mb-1 text-right">
                          בקשת המשתמש:
                        </span>
                        <p className="text-sm text-gray-900 text-right">
                          &ldquo;{alert.context.userRequest}&rdquo;
                        </p>
                      </div>
                    )}
                    {alert.context.aiResponse && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-1 text-right">
                          תגובת המערכת:
                        </span>
                        <p className="text-sm text-gray-900 text-right">
                          &ldquo;{alert.context.aiResponse}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Resolution Info */}
                {alert.resolved && alert.resolvedAt && (
                  <div className="text-sm text-gray-600 text-right border-t border-gray-200 pt-3">
                    טופל על ידי {alert.resolvedBy || 'בן משפחה'} בתאריך {formatTimestamp(alert.resolvedAt)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
