import { Room, Message } from '@/types';
import { EventEmitter } from 'events';

class Store extends EventEmitter {
    private rooms: Map<string, Room>;

    constructor() {
        super();
        this.rooms = new Map();
    }

    createRoom(name: string, creatorName: string): Room {
        const id = Math.random().toString(36).substring(2, 9);
        const room: Room = {
            id,
            name,
            createdAt: Date.now(),
            users: [creatorName],
            activeUsers: new Set([creatorName]),
            messages: [],
        };
        this.rooms.set(id, room);
        return room;
    }

    getRoom(id: string): Room | undefined {
        return this.rooms.get(id);
    }

    joinRoom(id: string, userName: string): boolean {
        const room = this.rooms.get(id);
        if (!room) return false;
        if (!room.users.includes(userName)) {
            room.users.push(userName);
        }
        return true;
    }

    addActiveUser(roomId: string, userName: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.activeUsers.add(userName);
        // Emit 'presence' event so SSE picks it up
        this.emit(`presence:${roomId}`, {
            type: 'join',
            userName,
            activeUsers: Array.from(room.activeUsers)
        });
    }

    removeActiveUser(roomId: string, userName: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.activeUsers.delete(userName);
        this.emit(`presence:${roomId}`, {
            type: 'leave',
            userName,
            activeUsers: Array.from(room.activeUsers)
        });
    }

    addMessage(roomId: string, message: Omit<Message, 'id' | 'timestamp'>): Message | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        const newMessage: Message = {
            ...message,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
        };
        room.messages.push(newMessage);

        // Emit event for SSE listeners
        this.emit(`message:${roomId}`, newMessage);

        return newMessage;
    }

    getMessages(roomId: string): Message[] | null {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        return room.messages;
    }

    deleteRoom(id: string): boolean {
        return this.rooms.delete(id);
    }
}

// Global augmentation for HMR
const globalForStore = globalThis as unknown as {
    store: Store | undefined;
};

export const store = globalForStore.store ?? new Store();

if (process.env.NODE_ENV !== 'production') globalForStore.store = store;
