import { NextResponse } from 'next/server';
import { store } from '@/services/store';

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function POST(request: Request, props: Props) {
    const params = await props.params;
    try {
        const body = await request.json();
        const { userName, isTyping } = body;

        if (!userName) {
            return NextResponse.json({ error: 'Missing userName' }, { status: 400 });
        }

        // Emit typing event
        store.emit(`typing:${params.id}`, {
            roomId: params.id,
            userName,
            isTyping
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
