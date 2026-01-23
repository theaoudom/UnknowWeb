import { Room, Message } from '@/types';
import { EventEmitter } from 'events';
import { kv } from '@vercel/kv';
import Redis from 'ioredis';

const ROOM_TTL = 60 * 30; // 30 minutes in seconds

// Support both KV (REST API) and generic Redis URL
const useGenericRedis = !!process.env.REDIS_URL;
const genericRedis = useGenericRedis ? new Redis(process.env.REDIS_URL!) : null;

// Create a separate Redis client for Pub/Sub (required by ioredis)
const pubSubRedis = useGenericRedis ? new Redis(process.env.REDIS_URL!) : null;

// Abstract interface for the Store to ensure consistency
interface IStore {
    createRoom(name: string, creatorName: string): Promise<{ room: Room; adminKey: string }>;
    getRoom(id: string): Promise<Room | null>;
    joinRoom(id: string, userName: string): Promise<boolean>;
    addActiveUser(roomId: string, userName: string): Promise<void>;
    removeActiveUser(roomId: string, userName: string): Promise<void>;
    addMessage(roomId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message | null>;
    getMessages(roomId: string): Promise<Message[] | null>;
    deleteRoom(id: string, adminKey: string): Promise<boolean>;
    getAllRooms(): Promise<Room[]>;
    emitTyping(roomId: string, data: unknown): Promise<void>;
    subscribe(channel: string): Promise<void>;
    unsubscribe(channel: string): Promise<void>;
}

class RedisStore extends EventEmitter implements IStore {
    constructor() {
        super();
        // Set up Redis Pub/Sub subscriber if using generic Redis
        if (pubSubRedis) {
            pubSubRedis.on('message', (channel, message) => {
                this.emit(channel, JSON.parse(message));
            });
        }
    }

    private getRoomKey(id: string): string {
        return `room:${id}`;
    }

    private async _getRawRoom(id: string): Promise<Room | null> {
        let data: string | null;

        if (useGenericRedis && genericRedis) {
            data = await genericRedis.get(this.getRoomKey(id));
        } else {
            // @ts-ignore
            data = await kv.get(this.getRoomKey(id));
        }

        if (!data) return null;

        let parsed: any;
        if (typeof data === 'object') {
            parsed = data;
        } else {
            parsed = JSON.parse(data);
        }

        // Deserialize Array back to Set
        return {
            ...parsed,
            activeUsers: new Set(parsed.activeUsers || []),
        };
    }

    async subscribe(channel: string): Promise<void> {
        if (pubSubRedis) {
            await pubSubRedis.subscribe(channel);
        }
    }

    async unsubscribe(channel: string): Promise<void> {
        if (pubSubRedis) {
            await pubSubRedis.unsubscribe(channel);
        }
    }

    private async publish(channel: string, data: any): Promise<void> {
        if (genericRedis) {
            await genericRedis.publish(channel, JSON.stringify(data));
        }
        this.emit(channel, data);
    }

    async createRoom(name: string, creatorName: string): Promise<{ room: Room; adminKey: string }> {
        const id = Math.random().toString(36).substring(2, 9);
        const adminKey = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

        const room: Room = {
            id,
            name,
            createdAt: Date.now(),
            users: [creatorName],
            activeUsers: new Set([creatorName]),
            messages: [],
            adminKey
        };

        const serialized = {
            ...room,
            activeUsers: Array.from(room.activeUsers),
        };

        if (useGenericRedis && genericRedis) {
            await genericRedis.set(this.getRoomKey(id), JSON.stringify(serialized), 'EX', ROOM_TTL);
            await genericRedis.sadd('rooms:all', id);
        } else {
            await kv.set(this.getRoomKey(id), JSON.stringify(serialized), { ex: ROOM_TTL });
            await kv.sadd('rooms:all', id);
        }

        // Return room without key for consistency, key returned separately
        const { adminKey: _, ...cleanRoom } = room;
        return { room: cleanRoom as Room, adminKey };
    }

    async getRoom(id: string): Promise<Room | null> {
        const room = await this._getRawRoom(id);
        if (!room) return null;


        // Strict expiry check
        if (Date.now() - room.createdAt > ROOM_TTL * 1000) {
            return null;
        }

        // Strip adminKey to avoid leaking it
        delete room.adminKey;
        return room;
    }

    async getAllRooms(): Promise<Room[]> {
        let roomIds: string[];

        if (useGenericRedis && genericRedis) {
            roomIds = await genericRedis.smembers('rooms:all');
        } else {
            roomIds = await kv.smembers('rooms:all');
        }

        const rooms: Room[] = [];
        for (const id of roomIds) {
            const room = await this.getRoom(id);
            if (room) {
                rooms.push({ ...room, messages: [] });
            } else {
                if (useGenericRedis && genericRedis) {
                    await genericRedis.srem('rooms:all', id);
                } else {
                    await kv.srem('rooms:all', id);
                }
            }
        }
        return rooms.sort((a, b) => b.createdAt - a.createdAt);
    }

    async joinRoom(id: string, userName: string): Promise<boolean> {
        const room = await this._getRawRoom(id);
        if (!room) return false;

        if (!room.users.includes(userName)) {
            room.users.push(userName);
            await this.saveRoom(room);
        }
        return true;
    }

    async addActiveUser(roomId: string, userName: string): Promise<void> {
        const room = await this._getRawRoom(roomId);
        if (!room) return;

        room.activeUsers.add(userName);
        await this.saveRoom(room);

        await this.publish(`presence:${roomId}`, {
            type: 'join',
            userName,
            activeUsers: Array.from(room.activeUsers)
        });
    }

    async removeActiveUser(roomId: string, userName: string): Promise<void> {
        const room = await this._getRawRoom(roomId);
        if (!room) return;

        room.activeUsers.delete(userName);
        await this.saveRoom(room);

        await this.publish(`presence:${roomId}`, {
            type: 'leave',
            userName,
            activeUsers: Array.from(room.activeUsers)
        });
    }

    async addMessage(roomId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message | null> {
        const room = await this._getRawRoom(roomId);
        if (!room) return null;

        const newMessage: Message = {
            ...message,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
        };
        room.messages.push(newMessage);

        await this.saveRoom(room);
        await this.publish(`message:${roomId}`, newMessage);

        return newMessage;
    }

    async getMessages(roomId: string): Promise<Message[] | null> {
        const room = await this.getRoom(roomId);
        if (!room) return null;
        return room.messages;
    }

    async deleteRoom(id: string, adminKey: string): Promise<boolean> {
        const room = await this._getRawRoom(id);

        if (!room) return false;
        if (room.adminKey !== adminKey) return false;

        let result: number;
        if (useGenericRedis && genericRedis) {
            result = await genericRedis.del(this.getRoomKey(id));
            await genericRedis.srem('rooms:all', id);
        } else {
            result = await kv.del(this.getRoomKey(id));
            await kv.srem('rooms:all', id);
        }
        return result > 0;
    }

    async emitTyping(roomId: string, data: unknown): Promise<void> {
        await this.publish(`typing:${roomId}`, data);
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

class InMemoryStore extends EventEmitter implements IStore {
    private rooms: Map<string, Room> = new Map();

    constructor() {
        super();
        console.warn('⚠️ USING IN-MEMORY STORE: Data will be lost on restart.');

        // Simple cleanup interval for in-memory store
        setInterval(() => {
            const now = Date.now();
            for (const [id, room] of this.rooms.entries()) {
                if (now - room.createdAt > ROOM_TTL * 1000) {
                    this.rooms.delete(id);
                    console.log(`[MemoryStore] Room ${id} expired and was deleted.`);
                }
            }
        }, 60 * 1000); // Check every minute
    }

    async createRoom(name: string, creatorName: string): Promise<{ room: Room; adminKey: string }> {
        const id = Math.random().toString(36).substring(2, 9);
        const adminKey = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

        const room: Room = {
            id,
            name,
            createdAt: Date.now(),
            users: [creatorName],
            activeUsers: new Set([creatorName]),
            messages: [],
            adminKey
        };
        this.rooms.set(id, room);

        const { adminKey: _, ...cleanRoom } = room;
        return { room: cleanRoom as Room, adminKey };
    }

    async getRoom(id: string): Promise<Room | null> {
        const room = this.rooms.get(id);
        if (!room) return null;

        // Strict expiry check
        if (Date.now() - room.createdAt > ROOM_TTL * 1000) {
            return null;
        }

        // Return copy without adminKey
        const { adminKey, ...cleanRoom } = room;
        return cleanRoom as Room;
    }

    async getAllRooms(): Promise<Room[]> {
        return Array.from(this.rooms.values())
            .map(r => {
                const { adminKey, ...rest } = r;
                return { ...rest, messages: [] } as Room;
            })
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    async joinRoom(id: string, userName: string): Promise<boolean> {
        const room = this.rooms.get(id);
        if (!room) return false;

        if (!room.users.includes(userName)) {
            room.users.push(userName);
        }
        return true;
    }

    async addActiveUser(roomId: string, userName: string): Promise<void> {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.activeUsers.add(userName);
        this.emit(`presence:${roomId}`, {
            type: 'join',
            userName,
            activeUsers: Array.from(room.activeUsers)
        });
    }

    async removeActiveUser(roomId: string, userName: string): Promise<void> {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.activeUsers.delete(userName);
        this.emit(`presence:${roomId}`, {
            type: 'leave',
            userName,
            activeUsers: Array.from(room.activeUsers)
        });
    }

    async addMessage(roomId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message | null> {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        const newMessage: Message = {
            ...message,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
        };
        room.messages.push(newMessage);

        this.emit(`message:${roomId}`, newMessage);
        return newMessage;
    }

    async getMessages(roomId: string): Promise<Message[] | null> {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        return room.messages;
    }

    async deleteRoom(id: string, adminKey: string): Promise<boolean> {
        const room = this.rooms.get(id);
        if (!room) return false;

        if (room.adminKey !== adminKey) return false;

        return this.rooms.delete(id);
    }

    async emitTyping(roomId: string, data: unknown): Promise<void> {
        this.emit(`typing:${roomId}`, data);
    }

    // Subscribe to a channel (for SSE)
    async subscribe(channel: string): Promise<void> {
        // No-op for local memory as we use direct EventEmitter
    }

    async unsubscribe(channel: string): Promise<void> {
        // No-op
    }
}

// Determine which store to use
const useRedis = !!process.env.REDIS_URL || !!process.env.KV_REST_API_URL;
const storeInstance = useRedis ? new RedisStore() : new InMemoryStore();

// Global augmentation for HMR
const globalForStore = globalThis as unknown as {
    store: (RedisStore | InMemoryStore) | undefined;
};

export const store = globalForStore.store ?? storeInstance;

if (process.env.NODE_ENV !== 'production') globalForStore.store = store;
