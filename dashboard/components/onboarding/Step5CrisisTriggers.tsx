/**
 * Step 5: Crisis Triggers
 */

'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import type { OnboardingFormSchema } from '@/lib/validation';

export default function Step5CrisisTriggers() {
  const { register, control, formState: { errors } } = useFormContext<OnboardingFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'crisisTriggers',
  });

  const defaultTriggers = [
    { keyword: 'lost', severity: 'high' as const, action: 'Contact emergency contact immediately' },
    { keyword: 'scared', severity: 'high' as const, action: 'Provide reassurance and notify family' },
    { keyword: 'help me', severity: 'critical' as const, action: 'Call emergency contact immediately' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Crisis Triggers</h2>
        <p className="mt-2 text-gray-600">
          Define keywords and phrases that indicate the patient may need immediate assistance.
        </p>
      </div>

      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              <strong>Critical Safety Feature:</strong> When these keywords are detected, the AI will immediately alert emergency contacts.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Trigger {index + 1}</h3>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="md:col-span-2">
                <label htmlFor={`crisisTriggers.${index}.keyword`} className="block text-sm font-medium text-gray-700">
                  Keyword/Phrase *
                </label>
                <input
                  {...register(`crisisTriggers.${index}.keyword`)}
                  type="text"
                  placeholder="e.g., lost, scared, help me"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
                {errors.crisisTriggers?.[index]?.keyword && (
                  <p className="mt-1 text-sm text-red-600">{errors.crisisTriggers[index]?.keyword?.message}</p>
                )}
              </div>

              <div>
                <label htmlFor={`crisisTriggers.${index}.severity`} className="block text-sm font-medium text-gray-700">
                  Severity *
                </label>
                <select
                  {...register(`crisisTriggers.${index}.severity`)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="medium">Medium - Monitor closely</option>
                  <option value="high">High - Notify family soon</option>
                  <option value="critical">Critical - Immediate action</option>
                </select>
                {errors.crisisTriggers?.[index]?.severity && (
                  <p className="mt-1 text-sm text-red-600">{errors.crisisTriggers[index]?.severity?.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor={`crisisTriggers.${index}.action`} className="block text-sm font-medium text-gray-700">
                  Action to Take *
                </label>
                <textarea
                  {...register(`crisisTriggers.${index}.action`)}
                  rows={2}
                  placeholder="e.g., Call emergency contact immediately"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
                {errors.crisisTriggers?.[index]?.action && (
                  <p className="mt-1 text-sm text-red-600">{errors.crisisTriggers[index]?.action?.message}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append({ keyword: '', severity: 'high', action: '' })}
        className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
      >
        + Add Another Trigger
      </button>

      {fields.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-medium">Quick Start - Add Common Triggers:</p>
          {defaultTriggers.map((trigger, index) => (
            <button
              key={index}
              type="button"
              onClick={() => append(trigger)}
              className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              <span className="font-medium">{trigger.keyword}</span> 
              <span className="text-gray-500"> - {trigger.severity}</span>
            </button>
          ))}
        </div>
      )}

      {errors.crisisTriggers && typeof errors.crisisTriggers === 'object' && 'message' in errors.crisisTriggers && (
        <p className="text-sm text-red-600">{errors.crisisTriggers.message as string}</p>
      )}
    </div>
  );
}
