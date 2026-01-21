import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/services/store';
import { Message } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: roomId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userName = searchParams.get('userName');

    if (!store.getRoom(roomId)) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    console.log(`[SSE] New connection request for room ${roomId} user ${userName}`);

    if (userName) {
        store.addActiveUser(roomId, userName);
    }

    const stream = new ReadableStream({
        start(controller) {
            console.log(`[SSE] Stream started for ${userName}`);
            const encoder = new TextEncoder();

            const sendEvent = (data: any) => {
                console.log(`[SSE] Sending message to ${userName}`);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            // Send initial presence immediately to self
            const room = store.getRoom(roomId);
            if (room) {
                const presenceData = {
                    type: 'init',
                    activeUsers: Array.from(room.activeUsers)
                };
                controller.enqueue(encoder.encode(`event: presence\ndata: ${JSON.stringify(presenceData)}\n\n`));
            }

            // Keep connection alive
            const keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(': keep-alive\n\n'));
            }, 15000);

            const onMessage = (message: Message) => {
                sendEvent(message);
            };

            const onTyping = (event: any) => {
                // SSE format:
                // event: typing
                // data: {...}
                controller.enqueue(encoder.encode(`event: typing\ndata: ${JSON.stringify(event)}\n\n`));
            };

            const onPresence = (event: any) => {
                controller.enqueue(encoder.encode(`event: presence\ndata: ${JSON.stringify(event)}\n\n`));
            }

            store.on(`message:${roomId}`, onMessage);
            store.on(`typing:${roomId}`, onTyping);
            store.on(`presence:${roomId}`, onPresence);

            // Clean up on close (handled by client disconnect usually)
            request.signal.addEventListener('abort', () => {
                clearInterval(keepAlive);
                store.off(`message:${roomId}`, onMessage);
                store.off(`typing:${roomId}`, onTyping);
                store.off(`presence:${roomId}`, onPresence);

                if (userName) {
                    store.removeActiveUser(roomId, userName);
                }
                controller.close();
            });
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
