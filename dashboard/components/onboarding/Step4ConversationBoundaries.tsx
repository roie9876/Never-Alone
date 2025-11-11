/**
 * Step 4: Conversation Boundaries
 */

'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { OnboardingFormSchema } from '@/lib/validation';

export default function Step4ConversationBoundaries() {
  const { register, watch, setValue } = useFormContext<OnboardingFormSchema>();
  const [topicInput, setTopicInput] = useState('');
  const forbiddenTopics = watch('boundaries.forbiddenTopics') || [];

  const addTopic = () => {
    if (topicInput.trim()) {
      setValue('boundaries.forbiddenTopics', [...forbiddenTopics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const removeTopic = (index: number) => {
    const updated = forbiddenTopics.filter((_, i) => i !== index);
    setValue('boundaries.forbiddenTopics', updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Conversation Boundaries</h2>
        <p className="mt-2 text-gray-600">
          Specify topics the AI should avoid discussing with the patient to prevent distress or confusion.
        </p>
      </div>

      <div>
        <label htmlFor="topicInput" className="block text-sm font-medium text-gray-700 mb-2">
          Forbidden Topics
        </label>
        <p className="text-sm text-gray-500 mb-3">
          Examples: deceased family members, traumatic events, controversial topics like politics or religion.
        </p>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
            placeholder="e.g., deceased spouse, politics"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          />
          <button
            type="button"
            onClick={addTopic}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            Add
          </button>
        </div>

        {forbiddenTopics.length > 0 && (
          <div className="mt-4 space-y-2">
            {forbiddenTopics.map((topic, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-md">
                <span className="text-sm text-gray-700">{topic}</span>
                <button
                  type="button"
                  onClick={() => removeTopic(index)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="boundaries.notes" className="block text-sm font-medium text-gray-700">
          Additional Notes (optional)
        </label>
        <textarea
          {...register('boundaries.notes')}
          rows={4}
          placeholder="Any additional context about conversation boundaries..."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
        />
      </div>

      <div className="rounded-md bg-yellow-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Important:</strong> The AI will gently redirect conversations away from these topics to protect the patient&apos;s emotional well-being.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
