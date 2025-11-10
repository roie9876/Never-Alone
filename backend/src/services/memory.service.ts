/**
 * Memory Service
 * Implements the 3-tier memory system:
 * 1. Short-term memory (Redis, 50-turn sliding window, 30-min TTL)
 * 2. Working memory (Redis, recent themes, 7-day TTL)
 * 3. Long-term memory (Cosmos DB, permanent facts, keyword search)
 *
 * Reference: docs/technical/memory-architecture.md
 */

import { Injectable } from '@nestjs/common';
import { AzureConfigService } from '@config/azure.config';
import {
  ConversationTurn,
  WorkingMemory,
  LongTermMemory,
  MemoryLoadResult,
  ExtractMemoryArgs,
  MemoryCategory,
} from '@interfaces/memory.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MemoryService {
  private readonly MAX_SHORT_TERM_TURNS = 50;
  private readonly SHORT_TERM_TTL_SECONDS = 1800; // 30 minutes
  private readonly WORKING_MEMORY_TTL_SECONDS = 604800; // 7 days

  constructor(private azureConfig: AzureConfigService) {}

  /**
   * Load all 3 memory tiers for a user
   * Called at the start of each Realtime API session
   */
  async loadMemory(userId: string): Promise<MemoryLoadResult> {
    const [shortTerm, working, longTerm] = await Promise.all([
      this.loadShortTermMemory(userId),
      this.loadWorkingMemory(userId),
      this.loadAllLongTermMemories(userId, 50), // Load top 50 facts
    ]);

    return {
      shortTerm,
      working,
      longTerm,
    };
  }

  // ========================================================================
  // SHORT-TERM MEMORY (Current Session - Redis)
  // ========================================================================

  /**
   * Save short-term memory (last 50 conversation turns)
   * Implements sliding window approach for MVP
   */
  async saveShortTermMemory(
    userId: string,
    turns: ConversationTurn[],
  ): Promise<void> {
    if (!this.azureConfig.redisClient) {
      console.warn('Redis not available - short-term memory not saved');
      return;
    }

    const key = this.getShortTermKey(userId);

    // Keep only last 50 turns (MVP simplification)
    const truncated = turns.slice(-this.MAX_SHORT_TERM_TURNS);

    // Save to Redis with TTL
    await this.azureConfig.redisClient.set(
      key,
      JSON.stringify(truncated),
      { EX: this.SHORT_TERM_TTL_SECONDS },
    );
  }

  /**
   * Add a single turn to short-term memory
   * Automatically truncates to maintain 50-turn window
   */
  async addShortTermTurn(
    userId: string,
    turn: ConversationTurn,
  ): Promise<void> {
    const existing = await this.loadShortTermMemory(userId);
    existing.push(turn);

    // Save with truncation
    await this.saveShortTermMemory(userId, existing);
  }

  /**
   * Load short-term memory (last 50 turns)
   */
  async loadShortTermMemory(userId: string): Promise<ConversationTurn[]> {
    if (!this.azureConfig.redisClient) {
      console.warn('Redis not available - returning empty short-term memory');
      return [];
    }

    const key = this.getShortTermKey(userId);
    const data = await this.azureConfig.redisClient.get(key);

    if (!data) {
      return [];
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse short-term memory:', error);
      return [];
    }
  }

  /**
   * Clear short-term memory for a user
   */
  async clearShortTermMemory(userId: string): Promise<void> {
    if (!this.azureConfig.redisClient) {
      console.warn('Redis not available - cannot clear short-term memory');
      return;
    }

    const key = this.getShortTermKey(userId);
    await this.azureConfig.redisClient.del(key);
  }

  private getShortTermKey(userId: string): string {
    return `memory:short-term:${userId}`;
  }

  // ========================================================================
  // WORKING MEMORY (Recent Context - Redis 7-day TTL)
  // ========================================================================

  /**
   * Update working memory with recent conversation themes
   */
  async updateWorkingMemory(
    userId: string,
    updates: Partial<WorkingMemory>,
  ): Promise<void> {
    if (!this.azureConfig.redisClient) {
      console.warn('Redis not available - working memory not saved');
      return;
    }

    const key = this.getWorkingMemoryKey(userId);

    // Get existing or create empty
    const existing = await this.loadWorkingMemory(userId) || this.getEmptyWorkingMemory();

    // Merge updates
    const updated: WorkingMemory = {
      ...existing,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    // Keep arrays limited (max 5 items each per MVP)
    if (updated.recentThemes) {
      updated.recentThemes = updated.recentThemes.slice(-5);
    }
    if (updated.recentActivities) {
      updated.recentActivities = updated.recentActivities.slice(-5);
    }

    // Save to Redis with 7-day TTL
    await this.azureConfig.redisClient.set(
      key,
      JSON.stringify(updated),
      { EX: this.WORKING_MEMORY_TTL_SECONDS },
    );
  }

  /**
   * Load working memory
   */
  async loadWorkingMemory(userId: string): Promise<WorkingMemory | null> {
    if (!this.azureConfig.redisClient) {
      console.warn('Redis not available - returning null working memory');
      return null;
    }

    const key = this.getWorkingMemoryKey(userId);
    const data = await this.azureConfig.redisClient.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse working memory:', error);
      return null;
    }
  }

  private getWorkingMemoryKey(userId: string): string {
    return `memory:working:${userId}`;
  }

  private getEmptyWorkingMemory(): WorkingMemory {
    return {
      lastUpdated: new Date().toISOString(),
      recentThemes: [],
      recentMood: 'neutral',
      recentActivities: [],
      upcomingEvents: [],
    };
  }

  // ========================================================================
  // LONG-TERM MEMORY (Persistent Facts - Cosmos DB)
  // ========================================================================

  /**
   * Save a new long-term memory fact
   * Called when AI extracts important information via function calling
   */
  async saveLongTermMemory(
    userId: string,
    args: ExtractMemoryArgs,
  ): Promise<LongTermMemory> {
    const memory: LongTermMemory = {
      id: uuidv4(),
      userId,
      memoryType: args.memory_type,
      key: args.key,
      value: args.value,
      extractedAt: new Date().toISOString(),
      context: args.context || 'Learned from conversation',
      importance: args.importance,
      confidence: 0.95, // MVP: fixed confidence score
      accessCount: 0,
      tags: this.extractTags(args.value), // Simple tag extraction
    };

    await this.azureConfig.memoriesContainer.items.create(memory);
    return memory;
  }

  /**
   * Search long-term memories using simple keyword search (MVP approach)
   * No embeddings/semantic search for MVP
   */
  async searchMemories(
    userId: string,
    keywords: string[],
    limit: number = 10,
  ): Promise<LongTermMemory[]> {
    if (keywords.length === 0) {
      // No keywords - return all memories sorted by importance
      return this.loadAllLongTermMemories(userId, limit);
    }

    // MVP: Simple keyword search (no embeddings)
    const keyword = keywords[0].toLowerCase(); // Use first keyword only for MVP

    const query = `
      SELECT * FROM c
      WHERE c.userId = @userId
        AND (
          CONTAINS(LOWER(c.key), @keyword)
          OR CONTAINS(LOWER(c.value), @keyword)
          OR ARRAY_CONTAINS(c.tags, @keyword, true)
        )
      ORDER BY c.extractedAt DESC
      OFFSET 0 LIMIT @limit
    `;

    const { resources } = await this.azureConfig.memoriesContainer.items
      .query({
        query,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@keyword', value: keyword },
          { name: '@limit', value: limit },
        ],
      })
      .fetchAll();

    // Update access tracking for returned memories
    await Promise.all(
      resources.map((memory) => this.trackMemoryAccess(memory.id, userId)),
    );

    return resources;
  }

  /**
   * Load all long-term memories for a user
   * Used at session initialization
   */
  async loadAllLongTermMemories(
    userId: string,
    limit: number = 50,
  ): Promise<LongTermMemory[]> {
    const query = `
      SELECT * FROM c
      WHERE c.userId = @userId
      ORDER BY c.extractedAt DESC
      OFFSET 0 LIMIT @limit
    `;

    const { resources } = await this.azureConfig.memoriesContainer.items
      .query({
        query,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@limit', value: limit },
        ],
      })
      .fetchAll();

    return resources;
  }

  /**
   * Update memory access tracking
   */
  private async trackMemoryAccess(memoryId: string, userId: string): Promise<void> {
    try {
      const { resource: memory } = await this.azureConfig.memoriesContainer
        .item(memoryId, userId)
        .read();

      if (memory) {
        memory.lastAccessed = new Date().toISOString();
        memory.accessCount = (memory.accessCount || 0) + 1;

        await this.azureConfig.memoriesContainer
          .item(memoryId, userId)
          .replace(memory);
      }
    } catch (error) {
      console.error('Failed to track memory access:', error);
      // Non-critical - don't throw
    }
  }

  /**
   * Simple tag extraction from memory value
   * MVP: Extract words longer than 3 characters
   */
  private extractTags(value: string): string[] {
    const words = value.split(/\s+/);
    const tags = words
      .filter((word) => word.length > 3)
      .map((word) => word.toLowerCase().replace(/[^\w\u0590-\u05FF]/g, '')) // Keep Hebrew and Latin
      .filter((word) => word.length > 0)
      .slice(0, 5); // Max 5 tags

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Get memory statistics for dashboard
   */
  async getMemoryStats(userId: string): Promise<{
    shortTermTurns: number;
    longTermFacts: number;
    lastActivity: string | null;
  }> {
    const shortTerm = await this.loadShortTermMemory(userId);
    const longTerm = await this.loadAllLongTermMemories(userId, 1000);
    const working = await this.loadWorkingMemory(userId);

    return {
      shortTermTurns: shortTerm.length,
      longTermFacts: longTerm.length,
      lastActivity: working?.lastUpdated || null,
    };
  }
}
