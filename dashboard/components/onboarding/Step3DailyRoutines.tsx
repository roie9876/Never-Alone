/**
 * Step 3: Daily Routines
 */

'use client';

import { useFormContext } from 'react-hook-form';
import type { OnboardingFormSchema } from '@/lib/validation';

export default function Step3DailyRoutines() {
  const { register, formState: { errors } } = useFormContext<OnboardingFormSchema>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Daily Routines</h2>
        <p className="mt-2 text-gray-600">
          Help us understand the patient&apos;s daily schedule. This helps the AI provide timely reminders and conversation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="routines.wakeTime" className="block text-sm font-medium text-gray-700">
            Wake Up Time *
          </label>
          <input
            {...register('routines.wakeTime')}
            type="time"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
          {errors.routines?.wakeTime && (
            <p className="mt-1 text-sm text-red-600">{errors.routines.wakeTime.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="routines.breakfastTime" className="block text-sm font-medium text-gray-700">
            Breakfast Time *
          </label>
          <input
            {...register('routines.breakfastTime')}
            type="time"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
          {errors.routines?.breakfastTime && (
            <p className="mt-1 text-sm text-red-600">{errors.routines.breakfastTime.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="routines.lunchTime" className="block text-sm font-medium text-gray-700">
            Lunch Time *
          </label>
          <input
            {...register('routines.lunchTime')}
            type="time"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
          {errors.routines?.lunchTime && (
            <p className="mt-1 text-sm text-red-600">{errors.routines.lunchTime.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="routines.dinnerTime" className="block text-sm font-medium text-gray-700">
            Dinner Time *
          </label>
          <input
            {...register('routines.dinnerTime')}
            type="time"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
          {errors.routines?.dinnerTime && (
            <p className="mt-1 text-sm text-red-600">{errors.routines.dinnerTime.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="routines.sleepTime" className="block text-sm font-medium text-gray-700">
            Sleep Time *
          </label>
          <input
            {...register('routines.sleepTime')}
            type="time"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
          {errors.routines?.sleepTime && (
            <p className="mt-1 text-sm text-red-600">{errors.routines.sleepTime.message}</p>
          )}
        </div>
      </div>

      <div className="rounded-md bg-blue-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> The AI will use these times to provide contextually appropriate reminders and check-ins. For example, it won&apos;t call during sleep hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
