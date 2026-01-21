import { NextResponse } from 'next/server';
import { store } from '@/services/store';
import { JoinRoomRequest } from '@/types';

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function POST(request: Request, props: Props) {
    const params = await props.params;
    try {
        const body: JoinRoomRequest = await request.json();

        if (!body.userName) {
            return NextResponse.json(
                { error: 'User name is required' },
                { status: 400 }
            );
        }

        const success = store.joinRoom(params.id, body.userName);

        if (!success) {
            return NextResponse.json(
                { error: 'Room not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: 'Joined room' });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to join room' },
            { status: 500 }
        );
    }
}
