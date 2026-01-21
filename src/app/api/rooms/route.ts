import { NextResponse } from 'next/server';
import { store } from '@/services/store';
import { CreateRoomRequest } from '@/types';

export async function POST(request: Request) {
    try {
        const body: CreateRoomRequest = await request.json();

        if (!body.name || !body.creatorName) {
            return NextResponse.json(
                { error: 'Room name and creator name are required' },
                { status: 400 }
            );
        }

        const room = store.createRoom(body.name, body.creatorName);

        return NextResponse.json(room);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create room' },
            { status: 500 }
        );
    }
}
