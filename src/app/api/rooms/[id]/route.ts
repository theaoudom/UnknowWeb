import { NextResponse } from 'next/server';
import { store } from '@/services/store';

// Helper to access dynamic params in App Router
type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(request: Request, props: Props) {
    const params = await props.params;
    const room = await store.getRoom(params.id);

    if (!room) {
        return NextResponse.json(
            { error: 'Room not found' },
            { status: 404 }
        );
    }

    return NextResponse.json(room);
}

export async function DELETE(request: Request, props: Props) {
    const params = await props.params;
    const deleted = await store.deleteRoom(params.id);

    if (!deleted) {
        return NextResponse.json(
            { error: 'Room not found' },
            { status: 404 }
        );
    }

    return NextResponse.json({ success: true });
}
