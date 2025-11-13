/**
 * Step 7: Review & Confirm
 */

'use client';

import { useFormContext } from 'react-hook-form';
import type { OnboardingFormSchema } from '@/lib/validation';

export default function Step7Review() {
  const { watch } = useFormContext<OnboardingFormSchema>();
  const formData = watch();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">סקירה ואישור</h2>
        <p className="mt-2 text-gray-600">
          אנא סקור את כל המידע לפני השליחה. ניתן לערוך כל קטע על ידי לחיצה על השלב למעלה.
        </p>
      </div>

      {/* Emergency Contacts */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">אנשי קשר לחירום</h3>
        <div className="space-y-2">
          {formData.emergencyContacts?.map((contact, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded">
              <p className="font-medium">{contact.name}</p>
              <p className="text-sm text-gray-600">{contact.phone}</p>
              <p className="text-sm text-gray-600">{contact.relationship}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Medications */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">תרופות</h3>
        <div className="space-y-2">
          {formData.medications?.map((med, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded">
              <p className="font-medium">{med.name} - {med.dosage}</p>
              <p className="text-sm text-gray-600">זמן: {med.time}</p>
              {med.specialInstructions && (
                <p className="text-sm text-gray-600">הוראות: {med.specialInstructions}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Daily Routines */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">שגרת יום</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-gray-600">זמן השכמה</p>
            <p className="font-medium">{formData.routines?.wakeTime}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ארוחת בוקר</p>
            <p className="font-medium">{formData.routines?.breakfastTime}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ארוחת צהריים</p>
            <p className="font-medium">{formData.routines?.lunchTime}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">ארוחת ערב</p>
            <p className="font-medium">{formData.routines?.dinnerTime}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">זמן שינה</p>
            <p className="font-medium">{formData.routines?.sleepTime}</p>
          </div>
        </div>
      </div>

      {/* Conversation Boundaries */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">גבולות שיחה</h3>
        {formData.boundaries?.forbiddenTopics && formData.boundaries.forbiddenTopics.length > 0 ? (
          <div className="space-y-1">
            {formData.boundaries.forbiddenTopics.map((topic, index) => (
              <div key={index} className="bg-gray-50 px-3 py-2 rounded text-sm">
                {topic}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">לא צוינו נושאים אסורים</p>
        )}
        {formData.boundaries?.notes && (
          <div className="mt-3">
            <p className="text-sm text-gray-600">הערות: {formData.boundaries.notes}</p>
          </div>
        )}
      </div>

      {/* Crisis Triggers */}
      <div className="border border-gray-300 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">טריגרים למצב משבר</h3>
        <div className="space-y-2">
          {formData.crisisTriggers?.map((trigger, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium">{trigger.keyword}</p>
                <span className={`px-2 py-1 text-xs rounded ${
                  trigger.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  trigger.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {trigger.severity === 'critical' ? 'קריטי' : trigger.severity === 'high' ? 'גבוה' : 'בינוני'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{trigger.action}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md bg-green-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700">
              <strong>מוכן לשליחה:</strong> תצורה זו תישמר ותשמש להתאמה אישית של בן הלוויה המלאכותי עבור יקירך.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
