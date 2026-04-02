import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

function normalizeUrl(value?: string) {
  if (!value) return '';
  return value.replace(/\/+$/, '');
}

const ENV_SOCKET_URL = normalizeUrl(import.meta.env.VITE_SOCKET_URL as string | undefined);
const API_ORIGIN = API_URL && API_URL.startsWith('http') ? normalizeUrl(new URL(API_URL).origin) : '';
const SOCKET_URL = ENV_SOCKET_URL || API_ORIGIN || normalizeUrl(window.location.origin);

class SocketService {
  public socket: Socket | null = null;
  private listeners: Record<string, ((data: any) => void)[]> = {};
  private currentSpaceId: string | null = null;
  private currentUserName: string | null = null;

  connect(spaceId: string, userName: string) {
    this.currentSpaceId = spaceId;
    this.currentUserName = userName;

    if (this.socket) {
      if (this.socket.connected) {
        this.socket.emit('join-space', { spaceId, userName });
        return;
      }
      this.socket.connect();
    } else {
      this.socket = io(SOCKET_URL, {
        autoConnect: false,
        reconnectionDelayMax: 10000,
        transports: ['websocket', 'polling'], // Fallback
      });

      this.socket.connect();

      this.socket.on('connect', () => {
        console.log('Socket connected', this.socket?.id);
        if (this.currentSpaceId && this.currentUserName) {
          this.socket?.emit('join-space', {
            spaceId: this.currentSpaceId,
            userName: this.currentUserName,
          });
        }
      });

      this.setupBaseListeners();
    }
  }

  private setupBaseListeners() {
    if (!this.socket) return;

    ['joined-space', 'join-error', 'user-online', 'presence-state', 'message-delivered', 'messages-read',
     'user-typing', 'user-stop-typing', 'messages-updated', 'message-created', 'user-last-seen', 'session-kicked'].forEach(event => {
      this.socket!.on(event, (data) => {
        if (this.listeners[event]) {
          this.listeners[event].forEach(cb => cb(data));
        }
      });
    });
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: (data: any) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emitTyping(spaceId: string, userName: string) {
    this.socket?.emit('typing', { spaceId, userName });
  }

  emitStopTyping(spaceId: string, userName: string) {
    this.socket?.emit('stop-typing', { spaceId, userName });
  }

  emitMessageSent(spaceId: string, userName: string, message?: any) {
    this.socket?.emit('message-sent', { spaceId, userName, message });
  }

  emitMarkSeen(spaceId: string, reader: string) {
    this.socket?.emit('mark-seen', { spaceId, reader });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentSpaceId = null;
    this.currentUserName = null;
    this.listeners = {};
  }
}

export const socketService = new SocketService();
