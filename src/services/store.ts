import { Room, Message } from '@/types';
import { EventEmitter } from 'events';
import { kv } from '@vercel/kv';
import Redis from 'ioredis';

const ROOM_TTL = 60 * 60 * 24; // 24 hours in seconds

// Support both KV (REST API) and generic Redis URL
const useGenericRedis = !!process.env.REDIS_URL;
const genericRedis = useGenericRedis ? new Redis(process.env.REDIS_URL!) : null;

class Store extends EventEmitter {
    constructor() {
        super();
    }

    private getRoomKey(id: string): string {
        return `room:${id}`;
    }

    async createRoom(name: string, creatorName: string): Promise<Room> {
        const id = Math.random().toString(36).substring(2, 9);
        const room: Room = {
            id,
            name,
            createdAt: Date.now(),
            users: [creatorName],
            activeUsers: new Set([creatorName]),
            messages: [],
        };

        // Serialize Set to Array for Redis
        const serialized = {
            ...room,
            activeUsers: Array.from(room.activeUsers),
        };

        if (useGenericRedis && genericRedis) {
            await genericRedis.set(this.getRoomKey(id), JSON.stringify(serialized), 'EX', ROOM_TTL);
        } else {
            await kv.set(this.getRoomKey(id), JSON.stringify(serialized), { ex: ROOM_TTL });
        }
        return room;
    }

    async getRoom(id: string): Promise<Room | null> {
        let data: string | null;

        if (useGenericRedis && genericRedis) {
            data = await genericRedis.get(this.getRoomKey(id));
        } else {
            data = await kv.get<string>(this.getRoomKey(id));
        }

        if (!data) return null;

        const parsed = JSON.parse(data);
        // Deserialize Array back to Set
        return {
            ...parsed,
            activeUsers: new Set(parsed.activeUsers || []),
        };
    }

    async joinRoom(id: string, userName: string): Promise<boolean> {
        const room = await this.getRoom(id);
        if (!room) return false;

        if (!room.users.includes(userName)) {
            room.users.push(userName);
            await this.saveRoom(room);
        }
        return true;
    }

    async addActiveUser(roomId: string, userName: string): Promise<void> {
        const room = await this.getRoom(roomId);
        if (!room) return;

        room.activeUsers.add(userName);
        await this.saveRoom(room);

        // Emit 'presence' event so SSE picks it up
        this.emit(`presence:${roomId}`, {
            type: 'join',
            userName,
            activeUsers: Array.from(room.activeUsers)
        });
    }

    async removeActiveUser(roomId: string, userName: string): Promise<void> {
        const room = await this.getRoom(roomId);
        if (!room) return;

        room.activeUsers.delete(userName);
        await this.saveRoom(room);

        this.emit(`presence:${roomId}`, {
            type: 'leave',
            userName,
            activeUsers: Array.from(room.activeUsers)
        });
    }

    async addMessage(roomId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message | null> {
        const room = await this.getRoom(roomId);
        if (!room) return null;

        const newMessage: Message = {
            ...message,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
        };
        room.messages.push(newMessage);

        await this.saveRoom(room);

        // Emit event for SSE listeners
        this.emit(`message:${roomId}`, newMessage);

        return newMessage;
    }

    async getMessages(roomId: string): Promise<Message[] | null> {
        const room = await this.getRoom(roomId);
        if (!room) return null;
        return room.messages;
    }

    async deleteRoom(id: string): Promise<boolean> {
        let result: number;

        if (useGenericRedis && genericRedis) {
            result = await genericRedis.del(this.getRoomKey(id));
        } else {
            result = await kv.del(this.getRoomKey(id));
        }
        return result > 0;
    }

    private async saveRoom(room: Room): Promise<void> {
        const serialized = {
            ...room,
            activeUsers: Array.from(room.activeUsers),
        };

        if (useGenericRedis && genericRedis) {
            await genericRedis.set(this.getRoomKey(room.id), JSON.stringify(serialized), 'EX', ROOM_TTL);
        } else {
            await kv.set(this.getRoomKey(room.id), JSON.stringify(serialized), { ex: ROOM_TTL });
        }
    }
}

// Global augmentation for HMR
const globalForStore = globalThis as unknown as {
    store: Store | undefined;
};

export const store = globalForStore.store ?? new Store();

if (process.env.NODE_ENV !== 'production') globalForStore.store = store;
