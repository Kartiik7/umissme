import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

class SocketService {
  public socket: Socket | null = null;
  private listeners: Record<string, ((data: any) => void)[]> = {};

  connect(spaceId: string, userName: string) {
    if (this.socket) {
      if (this.socket.connected) return;
      this.socket.connect();
    } else {
      this.socket = io(SOCKET_URL, {
        reconnectionDelayMax: 10000,
        transports: ['websocket', 'polling'], // Fallback
      });

      this.socket.on('connect', () => {
        console.log('Socket connected', this.socket?.id);
        this.socket?.emit('join-space', { spaceId, userName });
      });

      this.setupBaseListeners();
    }
  }

  private setupBaseListeners() {
    if (!this.socket) return;

    ['user-online', 'presence-state', 'message-delivered', 'messages-read', 
     'user-typing', 'user-stop-typing', 'messages-updated', 'user-last-seen', 'session-kicked'].forEach(event => {
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

  emitMessageSent(spaceId: string, userName: string) {
    this.socket?.emit('message-sent', { spaceId, userName });
  }

  emitMarkSeen(spaceId: string, reader: string) {
    this.socket?.emit('mark-seen', { spaceId, reader });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners = {};
  }
}

export const socketService = new SocketService();
