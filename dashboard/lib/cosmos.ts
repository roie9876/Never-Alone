/**
 * Azure Cosmos DB client for dashboard
 */

import { CosmosClient } from '@azure/cosmos';
import type { SafetyConfig } from '@/types/onboarding';

// Initialize Cosmos DB client
const cosmosClient = new CosmosClient(
  process.env.COSMOS_CONNECTION_STRING || ''
);

const database = cosmosClient.database(process.env.COSMOS_DATABASE || 'never-alone');

// Safety Config Container
export const safetyConfigContainer = database.container('safety-config');

/**
 * Save safety configuration to Cosmos DB
 */
export async function saveSafetyConfig(config: SafetyConfig) {
  const { resource } = await safetyConfigContainer.items.upsert(config);
  return resource;
}

/**
 * Load safety configuration from Cosmos DB
 */
export async function loadSafetyConfig(userId: string) {
  const querySpec = {
    query: 'SELECT * FROM c WHERE c.userId = @userId',
    parameters: [{ name: '@userId', value: userId }],
  };

  const { resources } = await safetyConfigContainer.items
    .query(querySpec)
    .fetchAll();

  return resources.length > 0 ? resources[0] : null;
}

/**
 * Update safety configuration
 */
export async function updateSafetyConfig(userId: string, updates: Partial<SafetyConfig>) {
  const existing = await loadSafetyConfig(userId);
  
  if (!existing) {
    throw new Error('Safety config not found');
  }

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await safetyConfigContainer.item(existing.id, userId).replace(updated);
  return resource;
}
