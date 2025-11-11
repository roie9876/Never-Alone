/**
 * Generate YAML configuration from onboarding form data
 */

import yaml from 'js-yaml';
import type { OnboardingFormData } from '@/types/onboarding';

export function generateYAMLConfig(formData: OnboardingFormData): string {
  const config = {
    userId: formData.userId,
    
    emergencyContacts: formData.emergencyContacts.map(contact => ({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    })),
    
    medications: formData.medications.map(med => ({
      name: med.name,
      dosage: med.dosage,
      time: med.time,
      specialInstructions: med.specialInstructions || '',
    })),
    
    routines: {
      wakeTime: formData.routines.wakeTime,
      breakfastTime: formData.routines.breakfastTime,
      lunchTime: formData.routines.lunchTime,
      dinnerTime: formData.routines.dinnerTime,
      sleepTime: formData.routines.sleepTime,
    },
    
    boundaries: {
      forbiddenTopics: formData.boundaries.forbiddenTopics,
      notes: formData.boundaries.notes || '',
    },
    
    crisisTriggers: formData.crisisTriggers.map(trigger => ({
      keyword: trigger.keyword,
      severity: trigger.severity,
      action: trigger.action,
    })),
    
    metadata: {
      createdAt: formData.createdAt,
      updatedAt: formData.updatedAt,
    },
  };

  return yaml.dump(config, {
    indent: 2,
    lineWidth: 80,
    noRefs: true,
  });
}

/**
 * Parse YAML configuration back to form data
 */
export function parseYAMLConfig(yamlString: string): Partial<OnboardingFormData> {
  const config = yaml.load(yamlString) as Record<string, unknown>;
  
  return {
    userId: config.userId as string,
    emergencyContacts: config.emergencyContacts as OnboardingFormData['emergencyContacts'],
    medications: config.medications as OnboardingFormData['medications'],
    routines: config.routines as OnboardingFormData['routines'],
    boundaries: config.boundaries as OnboardingFormData['boundaries'],
    crisisTriggers: config.crisisTriggers as OnboardingFormData['crisisTriggers'],
  };
}
