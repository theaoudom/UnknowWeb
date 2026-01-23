import { NextResponse } from 'next/server';
import { store } from '@/services/store';
import { SendMessageRequest } from '@/types';

type Props = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(request: Request, props: Props) {
    const params = await props.params;
    const messages = await store.getMessages(params.id);

    if (!messages) {
        return NextResponse.json(
            { error: 'Room not found' },
            { status: 404 }
        );
    }

    return NextResponse.json(messages);
}

export async function POST(request: Request, props: Props) {
    const params = await props.params;
    try {
        const body: SendMessageRequest = await request.json();

        // Allow message with either content OR image (or both)
        if (!body.senderId || !body.senderName || (!body.content && !body.image)) {
            return NextResponse.json(
                { error: 'Missing required fields (content or image)' },
                { status: 400 }
            );
        }

        const message = await store.addMessage(params.id, {
            senderId: body.senderId,
            senderName: body.senderName,
            content: body.content || '', // Ensure string if undefined
            image: body.image,
        });

        if (!message) {
            return NextResponse.json(
                { error: 'Room not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(message);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}
