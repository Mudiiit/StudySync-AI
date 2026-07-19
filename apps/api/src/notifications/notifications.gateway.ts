import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const authHeader =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization ||
      client.handshake.query?.token;
    let token: string | null = null;

    if (authHeader) {
      token = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;
    }

    if (!token) {
      this.logger.warn(
        `Missing Authorization header - disconnecting notifications socket client: ${client.id}`,
      );
      client.emit('auth_error', { message: 'Missing Authorization header' });
      client.disconnect();
      return;
    }

    try {
      const decoded = this.jwtService.verify(token);
      this.userSockets.set(decoded.sub, client.id);
      this.logger.log(
        `User connected via Socket.IO notifications: ${decoded.sub}`,
      );
    } catch (e: any) {
      let diagMessage = 'Token verification failed';
      if (e.name === 'TokenExpiredError') {
        diagMessage = 'Expired access token';
      } else if (e.message === 'jwt malformed') {
        diagMessage = 'Malformed JWT';
      } else if (e.message === 'invalid signature') {
        diagMessage = 'Invalid signature';
      } else {
        diagMessage = `Token verification failed: ${e.message}`;
      }

      this.logger.warn(
        `${diagMessage} - disconnecting notifications socket client: ${client.id}`,
      );
      client.emit('auth_error', { message: diagMessage });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        this.logger.log(`User disconnected from Socket.IO: ${userId}`);
        break;
      }
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
