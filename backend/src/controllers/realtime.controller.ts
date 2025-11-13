import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RealtimeService } from '../services/realtime.service';
import {
  RealtimeSessionConfig,
  RealtimeSession,
} from '../interfaces/realtime.interface';

/**
 * REST API Controller for Realtime API Session Management
 *
 * Provides HTTP endpoints to:
 * - Create new Realtime API sessions
 * - Get session status and metadata
 * - End active sessions
 *
 * WebSocket audio streaming is handled by RealtimeGateway
 */
@Controller('realtime')
export class RealtimeController {
  private readonly logger = new Logger(RealtimeController.name);

  constructor(private readonly realtimeService: RealtimeService) {}

  /**
   * Create a new Realtime API session
   *
   * POST /realtime/session
   * Body: { userId: string, voice?: string, language?: string, maxDuration?: number }
   *
   * Returns: { session: RealtimeSession }
   */
  @Post('session')
  async createSession(
    @Body() config: RealtimeSessionConfig,
  ): Promise<{ session: RealtimeSession }> {
    try {
      this.logger.log(`Creating Realtime session for user: ${config.userId}`);

      // Validate required fields
      if (!config.userId) {
        throw new HttpException(
          'userId is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Set defaults for optional fields
      const sessionConfig: RealtimeSessionConfig = {
        userId: config.userId,
        voice: config.voice || 'alloy',
        language: config.language || 'he-IL',
        maxDuration: config.maxDuration || 1800, // 30 minutes default
      };

      const session = await this.realtimeService.createSession(sessionConfig);

      this.logger.log(
        `Realtime session created: ${session.id} for user ${config.userId}`,
      );

      return { session };
    } catch (error) {
      this.logger.error(
        `Failed to create Realtime session: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to create Realtime session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all active sessions
   *
   * GET /realtime/sessions
   *
   * Returns: { sessions: RealtimeSession[] }
   */
  @Get('sessions')
  async getAllSessions(): Promise<{ sessions: RealtimeSession[] }> {
    try {
      this.logger.log('Getting all active sessions');

      const sessions = await this.realtimeService.getAllSessions();

      return { sessions };
    } catch (error) {
      this.logger.error(
        `Failed to get active sessions: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        'Failed to get active sessions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get session status and metadata
   *
   * GET /realtime/session/:id
   *
   * Returns: { session: RealtimeSession | null }
   */
  @Get('session/:id')
  async getSession(
    @Param('id') sessionId: string,
  ): Promise<{ session: RealtimeSession | null }> {
    try {
      this.logger.log(`Getting Realtime session: ${sessionId}`);

      const session = await this.realtimeService.getSession(sessionId);

      if (!session) {
        throw new HttpException(
          'Session not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return { session };
    } catch (error) {
      this.logger.error(
        `Failed to get Realtime session: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to get Realtime session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * End an active Realtime API session
   *
   * DELETE /realtime/session/:id
   *
   * Returns: { message: string }
   */
  @Delete('session/:id')
  async endSession(
    @Param('id') sessionId: string,
  ): Promise<{ message: string }> {
    try {
      this.logger.log(`Ending Realtime session: ${sessionId}`);

      await this.realtimeService.endSession(sessionId);

      this.logger.log(`Realtime session ended: ${sessionId}`);

      return { message: 'Session ended successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to end Realtime session: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to end Realtime session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Health check endpoint for Realtime API
   *
   * GET /realtime/health
   *
   * Returns: { status: string, message: string }
   */
  @Get('health')
  async health(): Promise<{ status: string; message: string }> {
    return {
      status: 'ok',
      message: 'Realtime API controller is running',
    };
  }

  /**
   * Refresh system prompt for active session
   * Call this after updating user profile/preferences in dashboard
   *
   * POST /realtime/session/:sessionId/refresh
   *
   * Returns: { success: boolean, message: string }
   */
  @Post('session/:sessionId/refresh')
  async refreshSystemPrompt(
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Refreshing system prompt for session: ${sessionId}`);

      const result = await this.realtimeService.refreshSystemPrompt(sessionId);

      this.logger.log(`System prompt refreshed successfully for session: ${sessionId}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to refresh system prompt: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to refresh system prompt',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Create a mock/test session (bypasses Cosmos DB for testing)
   *
   * POST /realtime/test-session
   * Body: { userId: string }
   *
   * Returns: { session: { id: string, userId: string, status: string } }
   */
  @Post('test-session')
  async createTestSession(
    @Body() body: { userId: string },
  ): Promise<{ session: any }> {
    try {
      this.logger.log(`Creating TEST session for user: ${body.userId}`);

      if (!body.userId) {
        throw new HttpException(
          'userId is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Create a mock session object without Cosmos DB
      const session: RealtimeSession = {
        id: `test-session-${Date.now()}`,
        userId: body.userId,
        conversationId: `test-conv-${Date.now()}`,
        startedAt: new Date().toISOString(),
        status: 'active' as const,
        turnCount: 0,
        tokenUsage: 0,
      };

      // Store in memory (RealtimeService's activeSessions map)
      this.realtimeService['activeSessions'].set(session.id, session);

      this.logger.log(
        `TEST session created: ${session.id} for user ${body.userId}`,
      );

      return { session };
    } catch (error) {
      this.logger.error(
        `Failed to create TEST session: ${error.message}`,
        error.stack,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to create TEST session',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
