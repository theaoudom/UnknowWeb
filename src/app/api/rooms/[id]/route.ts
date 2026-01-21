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
    try {
        const body = await request.json().catch(() => ({}));
        const adminKey = body.adminKey;

        if (!adminKey) {
            return NextResponse.json(
                { error: 'Admin key required' },
                { status: 403 }
            );
        }

        const deleted = await store.deleteRoom(params.id, adminKey);

        if (!deleted) {
            return NextResponse.json(
                { error: 'Invalid key or room not found' },
                { status: 403 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
