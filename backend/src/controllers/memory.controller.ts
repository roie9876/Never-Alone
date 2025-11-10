/**
 * Memory Controller
 * Exposes REST API endpoints for memory operations
 */

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MemoryService } from '@services/memory.service';
import { ConversationTurn, ExtractMemoryArgs } from '@interfaces/memory.interface';

@Controller('memory')
export class MemoryController {
  constructor(private memoryService: MemoryService) {}

  /**
   * Load all memory tiers for a user
   * GET /memory/load/:userId
   */
  @Get('load/:userId')
  async loadMemory(@Param('userId') userId: string) {
    const memory = await this.memoryService.loadMemory(userId);
    return {
      success: true,
      data: memory,
    };
  }

  /**
   * Add a conversation turn to short-term memory
   * POST /memory/turn
   */
  @Post('turn')
  async addTurn(
    @Body('userId') userId: string,
    @Body('turn') turn: ConversationTurn,
  ) {
    await this.memoryService.addShortTermTurn(userId, turn);
    return {
      success: true,
      message: 'Turn added to short-term memory',
    };
  }

  /**
   * Extract and save a long-term memory fact
   * POST /memory/extract
   */
  @Post('extract')
  async extractMemory(
    @Body('userId') userId: string,
    @Body('memory') memoryArgs: ExtractMemoryArgs,
  ) {
    const memory = await this.memoryService.saveLongTermMemory(userId, memoryArgs);
    return {
      success: true,
      data: memory,
    };
  }

  /**
   * Search long-term memories by keyword
   * GET /memory/search/:userId?keywords=sarah,family
   */
  @Get('search/:userId')
  async searchMemories(
    @Param('userId') userId: string,
    @Query('keywords') keywords: string,
    @Query('limit') limit?: string,
  ) {
    const keywordArray = keywords ? keywords.split(',').map((k) => k.trim()) : [];
    const limitNum = limit ? parseInt(limit) : 10;

    const memories = await this.memoryService.searchMemories(
      userId,
      keywordArray,
      limitNum,
    );

    return {
      success: true,
      count: memories.length,
      data: memories,
    };
  }

  /**
   * Get memory statistics
   * GET /memory/stats/:userId
   */
  @Get('stats/:userId')
  async getStats(@Param('userId') userId: string) {
    const stats = await this.memoryService.getMemoryStats(userId);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Clear short-term memory (session end)
   * POST /memory/clear/:userId
   */
  @Post('clear/:userId')
  async clearSession(@Param('userId') userId: string) {
    await this.memoryService.clearShortTermMemory(userId);
    return {
      success: true,
      message: 'Short-term memory cleared',
    };
  }

  /**
   * Update working memory
   * POST /memory/working
   */
  @Post('working')
  async updateWorkingMemory(
    @Body('userId') userId: string,
    @Body('updates') updates: any,
  ) {
    await this.memoryService.updateWorkingMemory(userId, updates);
    return {
      success: true,
      message: 'Working memory updated',
    };
  }
}
