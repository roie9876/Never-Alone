'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  conversationsToday: number;
  medicationComplianceRate: number;
  activeAlerts: number;
  lastConversationTime: string | null;
  medicationsTakenToday: number;
  medicationsScheduledToday: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    conversationsToday: 0,
    medicationComplianceRate: 0,
    activeAlerts: 0,
    lastConversationTime: null,
    medicationsTakenToday: 0,
    medicationsScheduledToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // No authentication required - MVP mode
    setUserName('משפחה');
    loadDashboardStats();
  }, [router]);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // No authentication - do nothing for MVP
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-800">לא לבד</h1>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4 space-x-reverse">
              <span className="text-gray-700">שלום, {userName}</span>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                יציאה
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">סיכום יומי</h2>
          <p className="text-gray-600">סקירה מהירה של המצב היום</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Conversations Today */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-800">{stats.conversationsToday}</p>
              <p className="text-gray-600 text-sm mt-1">שיחות היום</p>
            </div>
          </div>

          {/* Medication Compliance */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-800">{stats.medicationComplianceRate}%</p>
              <p className="text-gray-600 text-sm mt-1">תרופות - אחוז תקינות</p>
              <p className="text-gray-500 text-xs mt-1">
                {stats.medicationsTakenToday} מתוך {stats.medicationsScheduledToday} היום
              </p>
            </div>
          </div>

          {/* Active Alerts */}
          <div className={`rounded-xl shadow-md p-6 border hover:shadow-lg transition-shadow ${
            stats.activeAlerts > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                stats.activeAlerts > 0 ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                <svg className={`w-6 h-6 ${stats.activeAlerts > 0 ? 'text-red-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${stats.activeAlerts > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {stats.activeAlerts}
              </p>
              <p className={`text-sm mt-1 ${stats.activeAlerts > 0 ? 'text-red-700' : 'text-gray-600'}`}>
                {stats.activeAlerts > 0 ? 'התרעות פעילות!' : 'אין התרעות'}
              </p>
            </div>
          </div>

          {/* Last Conversation */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-800">
                {stats.lastConversationTime 
                  ? new Date(stats.lastConversationTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
                  : 'לא היו שיחות'}
              </p>
              <p className="text-gray-600 text-sm mt-1">שיחה אחרונה</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* View Conversations */}
          <button
            onClick={() => router.push('/conversations')}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg hover:border-purple-300 transition-all text-right"
          >
            <div className="flex items-center justify-between mb-3">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">שיחות</h3>
            <p className="text-gray-600 text-sm">צפה בתמלילים מלאים של כל השיחות</p>
          </button>

          {/* View Reminders */}
          <button
            onClick={() => router.push('/reminders')}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all text-right"
          >
            <div className="flex items-center justify-between mb-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">תרופות</h3>
            <p className="text-gray-600 text-sm">צפה בהיסטוריית תרופות ואחוזי תקינות</p>
          </button>

          {/* View Alerts */}
          <button
            onClick={() => router.push('/alerts')}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg hover:border-red-300 transition-all text-right"
          >
            <div className="flex items-center justify-between mb-3">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">התרעות</h3>
            <p className="text-gray-600 text-sm">צפה בהתרעות בטיחות והודעות חשובות</p>
          </button>

          {/* Edit Profile (Onboarding) */}
          <button
            onClick={() => router.push('/onboarding')}
            className="bg-white rounded-xl shadow-md p-6 border border-gray-200 hover:shadow-lg hover:border-gray-400 transition-all text-right"
          >
            <div className="flex items-center justify-between mb-3">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">עריכת פרופיל</h3>
            <p className="text-gray-600 text-sm">ערוך הגדרות בטיחות, תרופות ופרטי המטופל</p>
          </button>
        </div>
      </div>
    </div>
  );
}
