/**
 * Main Onboarding Wizard Component
 */

'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { onboardingFormSchema, type OnboardingFormSchema } from '@/lib/validation';
import { generateYAMLConfig } from '@/lib/yaml-config';
import Step1EmergencyContacts from './Step1EmergencyContacts';
import Step2Medications from './Step2Medications';
import Step3DailyRoutines from './Step3DailyRoutines';
import Step4ConversationBoundaries from './Step4ConversationBoundaries';
import Step5CrisisTriggers from './Step5CrisisTriggers';
import Step7Review from './Step7Review';

const steps = [
  { id: 1, name: 'Emergency Contacts', component: Step1EmergencyContacts },
  { id: 2, name: 'Medications', component: Step2Medications },
  { id: 3, name: 'Daily Routines', component: Step3DailyRoutines },
  { id: 4, name: 'Conversation Boundaries', component: Step4ConversationBoundaries },
  { id: 5, name: 'Crisis Triggers', component: Step5CrisisTriggers },
  { id: 6, name: 'Voice Calibration', component: null }, // Deferred for MVP
  { id: 7, name: 'Review & Confirm', component: Step7Review },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const methods = useForm<OnboardingFormSchema>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      userId: uuidv4(),
      emergencyContacts: [{ name: '', phone: '', relationship: '' }],
      medications: [{ name: '', dosage: '', time: '', specialInstructions: '' }],
      routines: {
        wakeTime: '07:00',
        breakfastTime: '08:00',
        lunchTime: '12:00',
        dinnerTime: '18:00',
        sleepTime: '22:00',
      },
      boundaries: {
        forbiddenTopics: [],
        notes: '',
      },
      crisisTriggers: [],
      voiceCalibration: { enabled: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    mode: 'onBlur',
  });

  const { handleSubmit, trigger } = methods;

  const nextStep = async () => {
    let fieldsToValidate: (keyof OnboardingFormSchema)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['emergencyContacts'];
        break;
      case 2:
        fieldsToValidate = ['medications'];
        break;
      case 3:
        fieldsToValidate = ['routines'];
        break;
      case 4:
        fieldsToValidate = ['boundaries'];
        break;
      case 5:
        fieldsToValidate = ['crisisTriggers'];
        break;
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) return;
    }

    if (currentStep === 6) {
      // Skip voice calibration for MVP
      setCurrentStep(7);
    } else if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep === 7) {
      setCurrentStep(5); // Skip voice calibration on back
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: OnboardingFormSchema) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Generate YAML config
      const yamlConfig = generateYAMLConfig(data);

      // Prepare payload for API
      const payload = {
        id: uuidv4(),
        userId: data.userId,
        emergencyContacts: data.emergencyContacts,
        medications: data.medications,
        routines: data.routines,
        boundaries: data.boundaries,
        crisisTriggers: data.crisisTriggers,
        yamlConfig,
        createdAt: data.createdAt,
        updatedAt: new Date().toISOString(),
      };

      // Submit to API route
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save configuration');
      }

      // Success - redirect or show success message
      alert('Onboarding completed successfully! Configuration saved.');
      // TODO: Redirect to dashboard or next page
      
    } catch (error) {
      console.error('Onboarding submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const CurrentStepComponent = steps.find(s => s.id === currentStep)?.component;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Safety Configuration</h1>
            <span className="text-sm text-gray-600">Step {currentStep} of 7</span>
          </div>
          <div className="relative">
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
              <div
                style={{ width: `${(currentStep / 7) * 100}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-300"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => step.id !== 6 && setCurrentStep(step.id)}
                disabled={step.id === 6}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  step.id === currentStep
                    ? 'bg-blue-600 text-white'
                    : step.id < currentStep
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : step.id === 6
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {step.name}
                {step.id === 6 && ' (Skip)'}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-md rounded-lg p-6">
            {currentStep === 6 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Voice Calibration</h2>
                  <p className="mt-2 text-gray-600">
                    This feature will be available in a future update. Click Next to continue.
                  </p>
                </div>
                <div className="rounded-md bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Coming Soon:</strong> Voice calibration will help the AI recognize the patient&apos;s voice for improved accuracy.
                  </p>
                </div>
              </div>
            ) : CurrentStepComponent ? (
              <CurrentStepComponent />
            ) : null}

            {submitError && (
              <div className="mt-6 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-md font-medium ${
                  currentStep === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>

              {currentStep === 7 ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Submit & Complete'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
