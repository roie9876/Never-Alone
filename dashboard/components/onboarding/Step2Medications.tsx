/**
 * Step 2: Medications
 */

'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import type { OnboardingFormSchema } from '@/lib/validation';

export default function Step2Medications() {
  const { register, control, formState: { errors } } = useFormContext<OnboardingFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medications',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Medications</h2>
        <p className="mt-2 text-gray-600">
          List all medications the patient takes regularly. The AI will provide reminders at scheduled times.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Medication {index + 1}</h3>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor={`medications.${index}.name`} className="block text-sm font-medium text-gray-700">
                  Medication Name *
                </label>
                <input
                  {...register(`medications.${index}.name`)}
                  type="text"
                  placeholder="e.g., Metformin"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
                {errors.medications?.[index]?.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.medications[index]?.name?.message}</p>
                )}
              </div>

              <div>
                <label htmlFor={`medications.${index}.dosage`} className="block text-sm font-medium text-gray-700">
                  Dosage *
                </label>
                <input
                  {...register(`medications.${index}.dosage`)}
                  type="text"
                  placeholder="e.g., 500mg"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
                {errors.medications?.[index]?.dosage && (
                  <p className="mt-1 text-sm text-red-600">{errors.medications[index]?.dosage?.message}</p>
                )}
              </div>

              <div>
                <label htmlFor={`medications.${index}.time`} className="block text-sm font-medium text-gray-700">
                  Time (HH:MM) *
                </label>
                <input
                  {...register(`medications.${index}.time`)}
                  type="time"
                  placeholder="09:00"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
                {errors.medications?.[index]?.time && (
                  <p className="mt-1 text-sm text-red-600">{errors.medications[index]?.time?.message}</p>
                )}
              </div>

              <div>
                <label htmlFor={`medications.${index}.specialInstructions`} className="block text-sm font-medium text-gray-700">
                  Special Instructions (optional)
                </label>
                <input
                  {...register(`medications.${index}.specialInstructions`)}
                  type="text"
                  placeholder="e.g., Take with food"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append({ name: '', dosage: '', time: '', specialInstructions: '' })}
        className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
      >
        + Add Another Medication
      </button>

      {errors.medications && typeof errors.medications === 'object' && 'message' in errors.medications && (
        <p className="text-sm text-red-600">{errors.medications.message as string}</p>
      )}
    </div>
  );
}
