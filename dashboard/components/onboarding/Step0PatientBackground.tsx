'use client';

import { useFormContext } from 'react-hook-form';
import { OnboardingFormSchema } from '@/lib/validation';

export default function Step0PatientBackground() {
  const {
    register,
    formState: { errors },
  } = useFormContext<OnboardingFormSchema>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          סיפור רקע על המטופל
        </h2>
        <p className="text-gray-600">
          מידע בסיסי על המטופל שיעזור למערכת להתאים את עצמה באופן אישי
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="patientBackground.fullName" className="block text-sm font-medium text-gray-700 mb-1">
          שם מלא <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="patientBackground.fullName"
          {...register('patientBackground.fullName')}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="לדוגמה: תפארת נחמיה"
          dir="rtl"
        />
        {errors.patientBackground?.fullName && (
          <p className="mt-1 text-sm text-red-600">{errors.patientBackground.fullName.message}</p>
        )}
      </div>

      {/* Age */}
      <div>
        <label htmlFor="patientBackground.age" className="block text-sm font-medium text-gray-700 mb-1">
          גיל <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="patientBackground.age"
          {...register('patientBackground.age', { valueAsNumber: true })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="82"
          min="1"
          max="120"
        />
        {errors.patientBackground?.age && (
          <p className="mt-1 text-sm text-red-600">{errors.patientBackground.age.message}</p>
        )}
      </div>

      {/* Medical Condition */}
      <div>
        <label htmlFor="patientBackground.medicalCondition" className="block text-sm font-medium text-gray-700 mb-1">
          מצב רפואי / אבחנות <span className="text-red-500">*</span>
        </label>
        <textarea
          id="patientBackground.medicalCondition"
          {...register('patientBackground.medicalCondition')}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="לדוגמה: דמנציה בשלב מוקדם, סוכרת מסוג 2, לחץ דם גבוה..."
          dir="rtl"
        />
        {errors.patientBackground?.medicalCondition && (
          <p className="mt-1 text-sm text-red-600">{errors.patientBackground.medicalCondition.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          תאר את המצבים הרפואיים העיקריים והאתגרים הקוגניטיביים
        </p>
      </div>

      {/* Personality */}
      <div>
        <label htmlFor="patientBackground.personality" className="block text-sm font-medium text-gray-700 mb-1">
          אישיות ואופי <span className="text-red-500">*</span>
        </label>
        <textarea
          id="patientBackground.personality"
          {...register('patientBackground.personality')}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="לדוגמה: אדם חם ומסביר פנים, אוהב לספר סיפורים, היה מורה..."
          dir="rtl"
        />
        {errors.patientBackground?.personality && (
          <p className="mt-1 text-sm text-red-600">{errors.patientBackground.personality.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          מה האישיות של המטופל? איך הוא היה בעבר? מה החוזקות שלו?
        </p>
      </div>

      {/* Hobbies */}
      <div>
        <label htmlFor="patientBackground.hobbies" className="block text-sm font-medium text-gray-700 mb-1">
          תחביבים ודברים שהוא אוהב <span className="text-red-500">*</span>
        </label>
        <textarea
          id="patientBackground.hobbies"
          {...register('patientBackground.hobbies')}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="לדוגמה: גינון, האזנה למוזיקה ישראלית, שש-בש, צפייה בציפורים..."
          dir="rtl"
        />
        {errors.patientBackground?.hobbies && (
          <p className="mt-1 text-sm text-red-600">{errors.patientBackground.hobbies.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          מה המטופל אוהב לעשות? מה משמח אותו? מה העניין אותו?
        </p>
      </div>

      {/* Family Context */}
      <div>
        <label htmlFor="patientBackground.familyContext" className="block text-sm font-medium text-gray-700 mb-1">
          הקשר משפחתי (אופציונלי)
        </label>
        <textarea
          id="patientBackground.familyContext"
          {...register('patientBackground.familyContext')}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="לדוגמה: נשוי לצביה 58 שנה, שתי בנות, 5 נכדים..."
          dir="rtl"
        />
        <p className="mt-1 text-xs text-gray-500">
          מבנה המשפחה, יחסים, מי מעורב בטיפול
        </p>
      </div>

      {/* Important Memories */}
      <div>
        <label htmlFor="patientBackground.importantMemories" className="block text-sm font-medium text-gray-700 mb-1">
          זיכרונות חשובים (אופציונלי)
        </label>
        <textarea
          id="patientBackground.importantMemories"
          {...register('patientBackground.importantMemories')}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="לדוגמה: נולד בירושלים, החתונה ב-1967, קריירה כמורה למתמטיקה..."
          dir="rtl"
        />
        <p className="mt-1 text-xs text-gray-500">
          אירועים חשובים בחיים, הישגים, זיכרונות משמעותיים
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 למה זה חשוב?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• המערכת תשתמש במידע הזה כדי לדבר בצורה אישית ומתאימה</li>
          <li>• תזכיר למטופל דברים שהוא אוהב ושמחים אותו</li>
          <li>• תתייחס להקשר האישי והמשפחתי בשיחות</li>
          <li>• תציע פעילויות מתאימות לתחביבים שלו</li>
        </ul>
      </div>
    </div>
  );
}
