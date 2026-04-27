/**
 * MiniDev ONE Template - Chat App Component
 * 
 * Real-time messaging with WebSocket support.
 */

import { FEATURES, getColors } from '@/lib/config';
import { storage } from '@/lib/storage';
import { realtime } from '@/lib/realtime';
import { logger } from '@/lib/logger';
import { EventEmitter } from '@/lib/events';

// =============================================================================
// TYPES
// =============================================================================
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'file' | 'system';
  reactions?: Record<string, string[]>;
  replyTo?: string;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'public';
  members: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: number;
}

interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: number;
}

// =============================================================================
// CHAT APP
// =============================================================================
class ChatApp {
  private container: HTMLElement;
  private rooms: Map<string, ChatRoom> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();
  private currentRoom: string = '';
  private user: ChatUser;
  private connected: boolean = false;
  private typingUsers: Map<string, number> = new Map();
  private typingTimeout: number | null = null;
  private storageKey: string;
  private autoScroll: boolean = true;

  constructor(selector: string, userId: string, userName: string, storageKey: string = 'chat') {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    this.container = el as HTMLElement;
    this.user = { id: userId, name: userName, status: 'online' };
    this.storageKey = storageKey;
    this.load();
    this.render();
  }

  private load(): void {
    const saved = storage.get<{ rooms: ChatRoom[]; messages: Record<string, ChatMessage[]> }>(this.storageKey);
    if (saved) {
      saved.rooms.forEach(r => this.rooms.set(r.id, r));
      Object.entries(saved.messages).forEach(([roomId, msgs]) => this.messages.set(roomId, msgs));
    }
  }

  private save(): void {
    storage.set(this.storageKey, {
      rooms: Array.from(this.rooms.values()),
      messages: Object.fromEntries(this.messages),
    });
  }

  // =============================================================================
  // ROOM MANAGEMENT
  // =============================================================================
  createRoom(name: string, type: 'direct' | 'group' = 'group'): ChatRoom {
    const room: ChatRoom = {
      id: `room_${Date.now()}`,
      name,
      type,
      members: [this.user.id],
      unreadCount: 0,
      createdAt: Date.now(),
    };
    this.rooms.set(room.id, room);
    this.messages.set(room.id, []);
    this.save();
    this.render();
    return room;
  }

  joinRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && !room.members.includes(this.user.id)) {
      room.members.push(this.user.id);
      this.currentRoom = roomId;
      this.save();
      this.render();
      this.connectToRoom(roomId);
    }
  }

  leaveRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.members = room.members.filter(m => m !== this.user.id);
      if (this.currentRoom === roomId) {
        this.currentRoom = '';
        this.disconnect();
      }
      this.save();
      this.render();
    }
  }

  selectRoom(roomId: string): void {
    this.currentRoom = roomId;
    const room = this.rooms.get(roomId);
    if (room) {
      room.unreadCount = 0;
    }
    this.render();
  }

  // =============================================================================
  // MESSAGING
  // =============================================================================
  sendMessage(content: string, type: ChatMessage['type'] = 'text', replyTo?: string): ChatMessage | null {
    if (!this.currentRoom || !content.trim()) return null;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      senderId: this.user.id,
      senderName: this.user.name,
      content: content.trim(),
      timestamp: Date.now(),
      type,
      replyTo,
    };

    const roomMessages = this.messages.get(this.currentRoom) || [];
    roomMessages.push(message);
    this.messages.set(this.currentRoom, roomMessages);
    
    // Send via realtime if connected
    if (this.connected && realtime.isConnected()) {
      realtime.sendChat(JSON.stringify({ room: this.currentRoom, message }));
    }

    this.save();
    this.renderMessages();
    this.scrollToBottom();

    return message;
  }

  deleteMessage(messageId: string): void {
    if (!this.currentRoom) return;
    const roomMessages = this.messages.get(this.currentRoom);
    if (roomMessages) {
      const index = roomMessages.findIndex(m => m.id === messageId);
      if (index > -1) {
        roomMessages.splice(index, 1);
        this.save();
        this.renderMessages();
      }
    }
  }

  editMessage(messageId: string, newContent: string): void {
    if (!this.currentRoom) return;
    const roomMessages = this.messages.get(this.currentRoom);
    if (roomMessages) {
      const msg = roomMessages.find(m => m.id === messageId);
      if (msg && msg.senderId === this.user.id) {
        msg.content = newContent;
        this.save();
        this.renderMessages();
      }
    }
  }

  reactToMessage(messageId: string, emoji: string): void {
    if (!this.currentRoom) return;
    const roomMessages = this.messages.get(this.currentRoom);
    if (roomMessages) {
      const msg = roomMessages.find(m => m.id === messageId);
      if (msg) {
        msg.reactions = msg.reactions || {};
        msg.reactions[emoji] = msg.reactions[emoji] || [];
        if (!msg.reactions[emoji].includes(this.user.id)) {
          msg.reactions[emoji].push(this.user.id);
        }
        this.save();
        this.renderMessages();
      }
    }
  }

  // =============================================================================
  // TYPING INDICATOR
  // =============================================================================
  startTyping(): void {
    if (!this.currentRoom || !this.connected) return;
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = window.setTimeout(() => {
      this.stopTyping();
    }, 3000);
  }

  stopTyping(): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }

  private getTypingUsers(): string[] {
    const now = Date.now();
    const typing: string[] = [];
    for (const [userId, lastTyping] of this.typingUsers) {
      if (now - lastTyping < 5000) {
        typing.push(userId);
      }
    }
    return typing;
  }

  // =============================================================================
  // WEBSOCKET CONNECTION
  // =============================================================================
  private connectToRoom(roomId: string): void {
    if (!FEATURES.multiplayer.enabled) return;

    // Connect to realtime system
    const wsUrl = `wss://${window.location.host}/ws/chat`;
    
    try {
      realtime.connect(wsUrl);
      realtime.on('chat', (data: any) => {
        if (data.room === roomId) {
          const message: ChatMessage = {
            ...data.message,
            id: `msg_${Date.now()}`,
            timestamp: Date.now(),
          };
          const roomMessages = this.messages.get(roomId) || [];
          roomMessages.push(message);
          this.messages.set(roomId, roomMessages);
          this.save();
          this.renderMessages();
          this.scrollToBottom();
        }
      });
      
      this.connected = true;
      logger.info('chat', `Connected to room ${roomId}`);
    } catch (error) {
      logger.error('chat', 'Failed to connect', error);
    }
  }

  private disconnect(): void {
    if (this.connected) {
      realtime.disconnect();
      this.connected = false;
    }
  }

  // =============================================================================
  // RENDERING
  // =============================================================================
  private render(): void {
    const { colors } = FEATURES.theme;
    const isDark = getColors() === FEATURES.theme.colors.dark;
    const c = isDark ? colors.dark : colors.light;

    this.container.innerHTML = `
      <div class="flex h-full" style="background: ${c.background}">
        <!-- Sidebar -->
        <div class="w-80 border-r flex flex-col" style="background: ${c.card}; border-color: ${c.border}">
          <!-- Header -->
          <div class="p-4 border-b" style="border-color: ${c.border}">
            <h2 class="font-bold text-lg mb-3">Messages</h2>
            <button id="new-room" class="w-full px-4 py-2 rounded-lg bg-primary text-white font-medium">
              + New Room
            </button>
          </div>
          
          <!-- Room List -->
          <div class="flex-1 overflow-y-auto">
            ${this.renderRoomList()}
          </div>
          
          <!-- User -->
          <div class="p-4 border-t flex items-center gap-3" style="border-color: ${c.border}">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
              ${this.user.name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1">
              <div class="font-medium">${this.user.name}</div>
              <div class="text-sm flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                Online
              </div>
            </div>
          </div>
        </div>
        
        <!-- Chat Area -->
        <div class="flex-1 flex flex-col">
          ${this.currentRoom ? this.renderChatArea() : this.renderEmptyState()}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  private renderRoomList(): string {
    const rooms = Array.from(this.rooms.values());
    
    if (rooms.length === 0) {
      return `
        <div class="p-4 text-center text-muted">
          <p>No rooms yet</p>
          <p class="text-sm">Create one to start chatting</p>
        </div>
      `;
    }

    return rooms.map(room => {
      const isActive = room.id === this.currentRoom;
      return `
        <div class="p-4 border-b cursor-pointer hover:bg-muted ${isActive ? 'bg-muted' : ''}" 
             data-room="${room.id}" style="border-color: var(--border)">
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium">${this.escapeHtml(room.name)}</span>
            ${room.unreadCount > 0 ? `
              <span class="px-2 py-0.5 rounded-full bg-primary text-white text-xs">${room.unreadCount}</span>
            ` : ''}
          </div>
          <div class="text-sm text-muted">
            ${room.lastMessage ? this.escapeHtml(room.lastMessage.content.slice(0, 50)) : 'No messages'}
          </div>
        </div>
      `;
    }).join('');
  }

  private renderChatArea(): string {
    const room = this.rooms.get(this.currentRoom);
    if (!room) return this.renderEmptyState();

    return `
      <!-- Header -->
      <div class="p-4 border-b flex items-center justify-between" style="border-color: var(--border)">
        <div>
          <h3 class="font-bold">${this.escapeHtml(room.name)}</h3>
          <div class="text-sm text-muted">
            ${room.members.length} members
          </div>
        </div>
        <button id="leave-room" class="px-4 py-2 rounded-lg bg-muted">Leave</button>
      </div>
      
      <!-- Messages -->
      <div id="messages" class="flex-1 overflow-y-auto p-4 space-y-4">
        ${this.renderMessages()}
      </div>
      
      <!-- Typing -->
      <div id="typing" class="px-4 py-2 text-sm text-muted">
        ${this.getTypingUsers().length > 0 ? `${this.getTypingUsers().join(', ')} is typing...` : ''}
      </div>
      
      <!-- Input -->
      <div class="p-4 border-t" style="border-color: var(--border)">
        <form id="message-form" class="flex gap-2">
          <input type="text" id="message-input" placeholder="Type a message..." 
                 class="flex-1 px-4 py-2 rounded-lg border" autocomplete="off">
          <button type="submit" class="px-6 py-2 bg-primary text-white rounded-lg font-medium">
            Send
          </button>
        </form>
      </div>
    `;
  }

  private renderMessages(): string {
    const roomMessages = this.messages.get(this.currentRoom) || [];
    
    if (roomMessages.length === 0) {
      return `
        <div class="text-center text-muted py-8">
          No messages yet. Say hello!
        </div>
      `;
    }

    return roomMessages.map(msg => this.renderMessage(msg)).join('');
  }

  private renderMessage(msg: ChatMessage): string {
    const isOwn = msg.senderId === this.user.id;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="flex ${isOwn ? 'justify-end' : 'justify-start'}">
        <div class="max-w-xs ${isOwn ? 'order-2' : 'order-1'}">
          <div class="px-4 py-2 rounded-2xl ${isOwn ? 'bg-primary text-white rounded-br-md' : 'bg-muted rounded-bl-md'}">
            ${msg.type === 'system' ? `
              <p class="text-sm italic opacity-75">${this.escapeHtml(msg.content)}</p>
            ` : `
              <p>${this.escapeHtml(msg.content)}</p>
            `}
          </div>
          <div class="flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}">
            <span class="text-xs text-muted">${time}</span>
            ${msg.senderName && !isOwn ? `<span class="text-xs text-muted">${this.escapeHtml(msg.senderName)}</span>` : ''}
            ${isOwn ? `
              <button data-edit="${msg.id}" class="text-xs text-muted hover:text-primary">Edit</button>
              <button data-delete="${msg.id}" class="text-xs text-muted hover:text-red-500">Delete</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private renderEmptyState(): string {
    return `
      <div class="flex-1 flex items-center justify-center text-muted">
        <div class="text-center">
          <div class="text-6xl mb-4">💬</div>
          <h3 class="text-xl font-bold mb-2">Select a room</h3>
          <p>Choose a room from the sidebar or create a new one</p>
        </div>
      </div>
    `;
  }

  private renderNewRoomModal(): void {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="absolute inset-0 bg-black/50" onclick="this.parentElement.remove()"></div>
      <div class="relative bg-card rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">Create New Room</h3>
        <form id="new-room-form">
          <input type="text" id="room-name" placeholder="Room name" class="w-full px-4 py-2 rounded-lg border mb-4" required>
          <div class="flex gap-3 justify-end">
            <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-muted rounded-lg">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-primary text-white rounded-lg">Create</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('new-room-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('room-name') as HTMLInputElement).value;
      if (name) {
        const room = this.createRoom(name);
        this.joinRoom(room.id);
        modal.remove();
      }
    });
  }

  private attachEvents(): void {
    // New room button
    document.getElementById('new-room')?.addEventListener('click', () => {
      this.renderNewRoomModal();
    });

    // Room selection
    this.container.querySelectorAll('[data-room]').forEach(el => {
      el.addEventListener('click', () => {
        const roomId = (el as HTMLElement).dataset.room!;
        this.selectRoom(roomId);
      });
    });

    // Leave room
    document.getElementById('leave-room')?.addEventListener('click', () => {
      if (this.currentRoom) {
        this.leaveRoom(this.currentRoom);
      }
    });

    // Message form
    const form = document.getElementById('message-form') as HTMLFormElement;
    const input = document.getElementById('message-input') as HTMLInputElement;

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim()) {
        this.sendMessage(input.value);
        input.value = '';
        this.stopTyping();
      }
    });

    input?.addEventListener('input', () => {
      this.startTyping();
    });

    // Delete/Edit messages
    this.container.querySelectorAll('[data-delete]').forEach(el => {
      el.addEventListener('click', () => {
        const msgId = (el as HTMLElement).dataset.delete!;
        this.deleteMessage(msgId);
      });
    });

    this.container.querySelectorAll('[data-edit]').forEach(el => {
      el.addEventListener('click', async () => {
        const msgId = (el as HTMLElement).dataset.edit!;
        const newContent = prompt('Edit message:');
        if (newContent !== null) {
          this.editMessage(msgId, newContent);
        }
      });
    });
  }

  private scrollToBottom(): void {
    if (this.autoScroll) {
      const messages = document.getElementById('messages');
      if (messages) {
        messages.scrollTop = messages.scrollHeight;
      }
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =============================================================================
  // CLEANUP
  // =============================================================================
  destroy(): void {
    this.disconnect();
    this.stopTyping();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================
export { ChatApp, ChatMessage, ChatRoom, ChatUser };
export default ChatApp;
