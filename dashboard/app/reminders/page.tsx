'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Reminder {
  id: string;
  medicationName: string;
  scheduledFor: string;
  status: 'pending' | 'completed' | 'confirmed' | 'missed' | 'snoozed';
  completedAt?: string;
  declineCount?: number;
}

export default function RemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('today');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const loadReminders = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/reminders?filter=${filter}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setReminders(data.reminders);
        }
      } catch (error) {
        console.error('Failed to load reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReminders();
  }, [router, filter]);

  const getStatusBadge = (status: Reminder['status']) => {
    const badges = {
      completed: { text: 'נלקח', color: 'bg-green-100 text-green-800' },
      confirmed: { text: 'אושר', color: 'bg-green-100 text-green-800' },
      pending: { text: 'ממתין', color: 'bg-yellow-100 text-yellow-800' },
      missed: { text: 'לא נלקח', color: 'bg-red-100 text-red-800' },
      snoozed: { text: 'נדחה', color: 'bg-blue-100 text-blue-800' },
    };

    const badge = badges[status];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const complianceStats = () => {
    const completed = reminders.filter((r) => r.status === 'completed' || r.status === 'confirmed').length;
    const total = reminders.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const stats = complianceStats();

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center space-x-2 space-x-reverse text-gray-700 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">חזרה ללוח הבקרה</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">ניהול תרופות</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Compliance Stats Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">סטטיסטיקת תקינות</h2>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-baseline space-x-2 space-x-reverse mb-2">
                <span className="text-4xl font-bold text-gray-800">{stats.percentage}%</span>
                <span className="text-gray-600">תקינות</span>
              </div>
              <p className="text-gray-600">
                {stats.completed} מתוך {stats.total} תרופות נלקחו
              </p>
            </div>
            {/* Progress Circle */}
            <div className="relative w-32 h-32">
              <svg className="transform -rotate-90 w-32 h-32">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-gray-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - stats.percentage / 100)}`}
                  className="text-green-500 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-800">{stats.percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-md mb-6 border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setFilter('today')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                filter === 'today'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              היום
            </button>
            <button
              onClick={() => setFilter('week')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                filter === 'week'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              השבוע
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                filter === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              כל ההיסטוריה
            </button>
          </div>
        </div>

        {/* Reminders List */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">טוען תרופות...</p>
            </div>
          ) : reminders.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600">אין תרופות להצגה</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      תאריך ושעה
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      תרופה
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      סטטוס
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                      זמן לקיחה
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reminders.map((reminder) => (
                    <tr key={reminder.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                        {new Date(reminder.scheduledFor).toLocaleDateString('he-IL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}{' '}
                        {new Date(reminder.scheduledFor).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800">{reminder.medicationName}</div>
                        {reminder.declineCount && reminder.declineCount > 0 && (
                          <div className="text-xs text-red-600">נדחה {reminder.declineCount} פעמים</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(reminder.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reminder.completedAt
                          ? new Date(reminder.completedAt).toLocaleTimeString('he-IL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
