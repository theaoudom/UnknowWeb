import { NextResponse } from 'next/server';
import { store } from '@/services/store';
import { CreateRoomRequest } from '@/types';


export async function GET() {
    try {
        const rooms = await store.getAllRooms();
        // Convert Set to Array for JSON serialization
        const serializedRooms = rooms.map(room => ({
            ...room,
            activeUsers: Array.from(room.activeUsers)
        }));
        return NextResponse.json(serializedRooms);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch rooms' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body: CreateRoomRequest = await request.json();

        if (!body.name || !body.creatorName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const { room, adminKey } = await store.createRoom(body.name, body.creatorName);

        return NextResponse.json({ ...room, adminKey });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create room' },
            { status: 500 }
        );
    }
}
