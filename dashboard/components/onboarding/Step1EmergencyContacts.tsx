/**
 * Step 1: Emergency Contacts
 */

'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import type { OnboardingFormSchema } from '@/lib/validation';

export default function Step1EmergencyContacts() {
  const { register, control, formState: { errors } } = useFormContext<OnboardingFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'emergencyContacts',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Emergency Contacts</h2>
        <p className="mt-2 text-gray-600">
          Add 1-3 family members or caregivers we can contact in case of emergency.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Contact {index + 1}</h3>
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
                <label htmlFor={`emergencyContacts.${index}.name`} className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  {...register(`emergencyContacts.${index}.name`)}
                  type="text"
                  placeholder="e.g., Sarah Cohen"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
                {errors.emergencyContacts?.[index]?.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.emergencyContacts[index]?.name?.message}</p>
                )}
              </div>

              <div>
                <label htmlFor={`emergencyContacts.${index}.phone`} className="block text-sm font-medium text-gray-700">
                  Phone Number *
                </label>
                <input
                  {...register(`emergencyContacts.${index}.phone`)}
                  type="tel"
                  placeholder="e.g., +972501234567"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
                {errors.emergencyContacts?.[index]?.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.emergencyContacts[index]?.phone?.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor={`emergencyContacts.${index}.relationship`} className="block text-sm font-medium text-gray-700">
                  Relationship *
                </label>
                <input
                  {...register(`emergencyContacts.${index}.relationship`)}
                  type="text"
                  placeholder="e.g., Daughter, Son, Caregiver"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
                {errors.emergencyContacts?.[index]?.relationship && (
                  <p className="mt-1 text-sm text-red-600">{errors.emergencyContacts[index]?.relationship?.message}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {fields.length < 3 && (
        <button
          type="button"
          onClick={() => append({ name: '', phone: '', relationship: '' })}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
        >
          + Add Another Contact
        </button>
      )}

      {errors.emergencyContacts && typeof errors.emergencyContacts === 'object' && 'message' in errors.emergencyContacts && (
        <p className="text-sm text-red-600">{errors.emergencyContacts.message as string}</p>
      )}
    </div>
  );
}
