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
import { TIFERET_TEST_DATA, EMPTY_FORM_DATA } from '@/lib/test-data';
import Step0PatientBackground from './Step0PatientBackground';
import Step1EmergencyContacts from './Step1EmergencyContacts';
import Step2Medications from './Step2Medications';
import Step3DailyRoutines from './Step3DailyRoutines';
import Step4ConversationBoundaries from './Step4ConversationBoundaries';
import Step5CrisisTriggers from './Step5CrisisTriggers';
import Step8PhotoUpload from './Step8PhotoUpload';
import Step7Review from './Step7Review';

const steps = [
  { id: 0, name: 'Patient Background', component: Step0PatientBackground },
  { id: 1, name: 'Emergency Contacts', component: Step1EmergencyContacts },
  { id: 2, name: 'Medications', component: Step2Medications },
  { id: 3, name: 'Daily Routines', component: Step3DailyRoutines },
  { id: 4, name: 'Conversation Boundaries', component: Step4ConversationBoundaries },
  { id: 5, name: 'Crisis Triggers', component: Step5CrisisTriggers },
  { id: 6, name: 'Voice Calibration', component: null }, // Deferred for MVP
  { id: 7, name: 'Family Photos', component: Step8PhotoUpload }, // NEW: Photo Upload
  { id: 8, name: 'Review & Confirm', component: Step7Review },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0); // Start from Step 0 (Patient Background)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [useTestData, setUseTestData] = useState(true); // Default to test data for easier testing

  // Get initial values based on test data toggle
  const getInitialValues = () => {
    if (useTestData) {
      return TIFERET_TEST_DATA;
    }
    return EMPTY_FORM_DATA;
  };

  const methods = useForm<OnboardingFormSchema>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: getInitialValues(),
    mode: 'onBlur',
  });

  const { handleSubmit, trigger } = methods;

  const nextStep = async () => {
    let fieldsToValidate: (keyof OnboardingFormSchema)[] = [];
    
    switch (currentStep) {
      case 0:
        fieldsToValidate = ['patientBackground'];
        break;
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
    } else if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep === 8) {
      setCurrentStep(7); // From Review back to Photos
    } else if (currentStep === 7) {
      setCurrentStep(5); // From Photos skip voice calibration back to Crisis Triggers
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: OnboardingFormSchema) => {
    console.log('🚀 Form submitted, starting validation...');
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('📝 Form data:', data);
      
      // Generate YAML config
      const yamlConfig = generateYAMLConfig(data);
      console.log('✅ YAML config generated');

      // Prepare payload for API
      const payload = {
        id: uuidv4(),
        userId: data.userId,
        patientBackground: data.patientBackground,
        emergencyContacts: data.emergencyContacts,
        medications: data.medications,
        routines: data.routines,
        boundaries: data.boundaries,
        crisisTriggers: data.crisisTriggers,
        photos: data.photos || [], // Include photos (optional)
        yamlConfig,
        createdAt: data.createdAt,
        updatedAt: new Date().toISOString(),
      };

      console.log('📤 Sending to API...');
      
      // Submit to API route
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API error:', error);
        throw new Error(error.message || error.error || 'Failed to save configuration');
      }

      const result = await response.json();
      console.log('✅ Success:', result);

      // Success - redirect or show success message
      alert('✅ Onboarding completed successfully!\n\nConfiguration saved to Cosmos DB.\n\nPatient: ' + data.patientBackground.fullName);
      // TODO: Redirect to dashboard or next page
      
    } catch (error) {
      console.error('❌ Onboarding submission error:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unexpected error occurred');
      alert('❌ Error: ' + (error instanceof Error ? error.message : 'An unexpected error occurred'));
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Submission complete');
    }
  };

  const CurrentStepComponent = steps.find(s => s.id === currentStep)?.component;

  // Load test data or empty form
  const loadTestData = () => {
    methods.reset(TIFERET_TEST_DATA);
    setUseTestData(true);
    setCurrentStep(0);
  };

  const loadEmptyForm = () => {
    methods.reset(EMPTY_FORM_DATA);
    setUseTestData(false);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Test Data Toggle */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Testing Mode</h3>
              <p className="text-xs text-blue-700 mt-1">
                {useTestData 
                  ? '✅ Using Tiferet test data (pre-filled)' 
                  : '📝 Using empty form'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadTestData}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  useTestData
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50'
                }`}
              >
                Load Tiferet Data
              </button>
              <button
                type="button"
                onClick={loadEmptyForm}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  !useTestData
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50'
                }`}
              >
                Start Empty
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Safety Configuration</h1>
            <span className="text-sm text-gray-600">Step {currentStep + 1} of 9</span>
          </div>
          <div className="relative">
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
              <div
                style={{ width: `${((currentStep + 1) / 9) * 100}%` }}
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
                disabled={currentStep === 0}
                className={`px-6 py-3 rounded-md font-medium ${
                  currentStep === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>

              {currentStep === 7 ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    console.log('🖱️ Submit button clicked!');
                    console.log('Form errors:', methods.formState.errors);
                    console.log('Form values:', methods.getValues());
                    
                    // Manually trigger validation and submission
                    const isValid = await methods.trigger();
                    console.log('Form is valid:', isValid);
                    
                    if (isValid) {
                      console.log('✅ Form valid, calling onSubmit...');
                      await methods.handleSubmit(onSubmit)();
                    } else {
                      console.error('❌ Form validation failed:', methods.formState.errors);
                      alert('Form validation failed. Please check all fields:\n\n' + JSON.stringify(methods.formState.errors, null, 2));
                    }
                  }}
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
