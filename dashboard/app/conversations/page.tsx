'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ConversationTurn {
  role: 'user' | 'assistant';
  timestamp: string;
  transcript: string;
}

interface Conversation {
  id: string;
  userId: string;
  conversationId: string;
  sessionId: string;
  startTime: string;
  endTime: string;
  turns: ConversationTurn[];
  totalTurns: number;
}

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    loadConversations();
  }, [router]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      console.log('🔑 Token present:', !!token);
      console.log('🌐 Fetching /api/conversations...');
      
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Data received:', { total: data.total, count: data.conversations?.length });
        setConversations(data.conversations || []);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load conversations:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('💥 Error loading conversations:', error);
      throw error; // Re-throw to see full error in console
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const duration = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
    return `${duration} דקות`;
  };

  const filteredConversations = conversations.filter(conv => {
    // Filter by search query
    const matchesSearch = !searchQuery || conv.turns.some(turn => 
      turn.transcript.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Filter by selected date
    if (selectedDate) {
      const convDate = new Date(conv.startTime).toISOString().split('T')[0];
      return matchesSearch && convDate === selectedDate;
    }
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="text-xl mr-2">←</span>
              <span className="text-sm font-medium">חזרה ללוח הבקרה</span>
            </button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mt-4">היסטוריית שיחות</h1>
          <p className="text-gray-600 mt-2">צפייה בתמלילים מלאים של כל השיחות</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Search Input */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="חיפוש בשיחות..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  dir="rtl"
                />
              </div>

              {/* Date Picker */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סינון לפי תאריך
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-800 underline"
                  >
                    נקה סינון
                  </button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">טוען שיחות...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {searchQuery ? 'לא נמצאו שיחות' : 'אין שיחות עדיין'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConv(conv)}
                      className={`w-full text-right p-4 rounded-lg border-2 transition-all ${
                        selectedConv?.id === conv.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">
                          {formatDuration(conv.startTime, conv.endTime)}
                        </span>
                        <span className="text-xs text-purple-600 font-medium">
                          {conv.totalTurns} תורות
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(conv.startTime)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {conv.turns[0]?.transcript || ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conversation Transcript */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {!selectedConv ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-gray-500 text-lg">בחר שיחה לצפייה בתמליל</p>
                </div>
              ) : (
                <div>
                  {/* Transcript Header */}
                  <div className="border-b border-gray-200 pb-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {formatDate(selectedConv.startTime)}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          משך השיחה: {formatDuration(selectedConv.startTime, selectedConv.endTime)} • {selectedConv.totalTurns} תורות דיבור
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const transcript = selectedConv.turns
                            .map(turn => `${turn.role === 'user' ? '👤 משתמש' : '🤖 AI'}: ${turn.transcript}`)
                            .join('\n\n');
                          navigator.clipboard.writeText(transcript);
                          alert('התמליל הועתק ללוח');
                        }}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                      >
                        📋 העתק תמליל
                      </button>
                    </div>
                  </div>

                  {/* Transcript Content */}
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {selectedConv.turns.map((turn, index) => (
                      <div
                        key={index}
                        className={`flex ${turn.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            turn.role === 'user'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-purple-600 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {turn.role === 'user' ? '👤 משתמש' : '🤖 AI'}
                            </span>
                            <span className={`text-xs ${turn.role === 'user' ? 'text-gray-500' : 'text-purple-200'}`}>
                              {new Date(turn.timestamp).toLocaleTimeString('he-IL', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {turn.transcript}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
