import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RealtimeService } from '../services/realtime.service';

/**
 * WebSocket Gateway for Realtime API Audio Streaming
 *
 * Handles bidirectional communication between Flutter frontend and Azure OpenAI Realtime API:
 * - Receives audio chunks from Flutter client
 * - Forwards audio to Azure OpenAI via RealtimeService
 * - Broadcasts AI audio responses back to client
 * - Manages WebSocket connections and disconnections
 *
 * Client Events:
 * - 'audio-chunk': Send audio data to AI
 * - 'commit-audio': Signal end of user speech
 * - 'join-session': Join existing Realtime session
 *
 * Server Events:
 * - 'ai-audio': AI audio response chunk
 * - 'transcript': User or AI transcript
 * - 'session-status': Session state updates
 * - 'error': Error messages
 */
@WebSocketGateway({
  cors: {
    origin: '*', // TODO: Restrict to frontend domain in production
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // Map client socket IDs to Realtime session IDs
  private clientSessions = new Map<string, string>();

  constructor(private readonly realtimeService: RealtimeService) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Send connection confirmation
    client.emit('connected', {
      clientId: client.id,
      message: 'Connected to Realtime Gateway',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle WebSocket disconnection
   */
  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Check if client has active session
    const sessionId = this.clientSessions.get(client.id);
    if (sessionId) {
      try {
        // End the Realtime API session
        await this.realtimeService.endSession(sessionId);
        this.clientSessions.delete(client.id);
        this.logger.log(
          `Ended session ${sessionId} for disconnected client ${client.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to end session on disconnect: ${error.message}`,
        );
      }
    }
  }

  /**
   * Client joins an existing Realtime session
   *
   * Event: 'join-session'
   * Payload: { sessionId: string }
   */
  @SubscribeMessage('join-session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const { sessionId } = data;

      this.logger.log(`Client ${client.id} joining session ${sessionId}`);

      // Verify session exists
      const session = await this.realtimeService.getSession(sessionId);
      if (!session) {
        client.emit('error', {
          message: 'Session not found',
          sessionId,
        });
        return;
      }

      // Map client to session
      this.clientSessions.set(client.id, sessionId);

      // Join Socket.IO room for this session (for broadcasting)
      client.join(sessionId);

      // Send confirmation
      client.emit('session-joined', {
        sessionId,
        userId: session.userId,
        status: session.status,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Client ${client.id} joined session ${sessionId} successfully`,
      );
    } catch (error) {
      this.logger.error(`Failed to join session: ${error.message}`);
      client.emit('error', {
        message: 'Failed to join session',
        error: error.message,
      });
    }
  }

  /**
   * Receive audio chunk from client and forward to Azure OpenAI
   *
   * Event: 'audio-chunk'
   * Payload: { sessionId: string, audio: string (base64), timestamp: string }
   */
  @SubscribeMessage('audio-chunk')
  async handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; audio: string; timestamp: string },
  ) {
    try {
      const { sessionId, audio, timestamp } = data;

      // Verify client is in this session
      const clientSessionId = this.clientSessions.get(client.id);
      if (clientSessionId !== sessionId) {
        client.emit('error', {
          message: 'Client not in this session',
          sessionId,
        });
        return;
      }

      // Forward audio to Realtime API
      await this.realtimeService.sendAudioChunk(sessionId, audio);

      // Optionally log (but don't log audio data itself - too verbose)
      // this.logger.debug(`Forwarded audio chunk for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to forward audio chunk: ${error.message}`);
      client.emit('error', {
        message: 'Failed to send audio',
        error: error.message,
      });
    }
  }

  /**
   * Client signals end of speech (commit audio buffer)
   *
   * Event: 'commit-audio'
   * Payload: { sessionId: string }
   */
  @SubscribeMessage('commit-audio')
  async handleCommitAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    try {
      const { sessionId } = data;

      // Verify client is in this session
      const clientSessionId = this.clientSessions.get(client.id);
      if (clientSessionId !== sessionId) {
        client.emit('error', {
          message: 'Client not in this session',
          sessionId,
        });
        return;
      }

      // Commit audio buffer (signal to API that user stopped speaking)
      await this.realtimeService.commitAudioBuffer(sessionId);

      this.logger.log(`Audio buffer committed for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to commit audio buffer: ${error.message}`);
      client.emit('error', {
        message: 'Failed to commit audio',
        error: error.message,
      });
    }
  }

  /**
   * Broadcast AI audio response to client(s) in session
   *
   * Called by RealtimeService when Azure OpenAI sends audio
   */
  broadcastAIAudio(sessionId: string, audioChunk: { delta: string; timestamp: string }) {
    this.server.to(sessionId).emit('ai-audio', {
      sessionId,
      audio: audioChunk.delta,
      timestamp: audioChunk.timestamp,
    });
  }

  /**
   * Broadcast transcript (user or AI) to client(s) in session
   *
   * Called by RealtimeService when transcripts are received
   */
  broadcastTranscript(
    sessionId: string,
    transcript: { role: string; text: string; timestamp: string },
  ) {
    this.server.to(sessionId).emit('transcript', {
      sessionId,
      role: transcript.role,
      text: transcript.text,
      timestamp: transcript.timestamp,
    });
  }

  /**
   * Broadcast session status update to client(s) in session
   *
   * Called by RealtimeService when session state changes
   */
  broadcastSessionStatus(
    sessionId: string,
    status: { state: string; turnCount: number; tokenUsage: number },
  ) {
    this.server.to(sessionId).emit('session-status', {
      sessionId,
      status: status.state,
      turnCount: status.turnCount,
      tokenUsage: status.tokenUsage,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast error to client(s) in session
   */
  broadcastError(sessionId: string, error: { message: string; code?: string }) {
    this.server.to(sessionId).emit('error', {
      sessionId,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });
  }
}
