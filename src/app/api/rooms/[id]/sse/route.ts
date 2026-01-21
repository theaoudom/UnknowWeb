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

    const room = await store.getRoom(roomId);
    if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    console.log(`[SSE] New connection request for room ${roomId} user ${userName}`);

    if (userName) {
        await store.addActiveUser(roomId, userName);
    }

    const stream = new ReadableStream({
        async start(controller) {
            console.log(`[SSE] Stream started for ${userName}`);
            const encoder = new TextEncoder();

            // Helper to safely enqueue data
            const safeEnqueue = (data: Uint8Array) => {
                try {
                    controller.enqueue(data);
                } catch (e) {
                    // Controller might be closed or erroring
                    console.warn('[SSE] Failed to enqueue, controller closed?', e);
                }
            };

            const sendEvent = (data: any) => {
                console.log(`[SSE] Sending message to ${userName}`);
                safeEnqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            // Send initial presence immediately to self
            const roomData = await store.getRoom(roomId);
            if (roomData) {
                const presenceData = {
                    type: 'init',
                    activeUsers: Array.from(roomData.activeUsers)
                };
                safeEnqueue(encoder.encode(`event: presence\ndata: ${JSON.stringify(presenceData)}\n\n`));
            }

            // Keep connection alive
            const keepAlive = setInterval(() => {
                safeEnqueue(encoder.encode(': keep-alive\n\n'));
            }, 15000);

            const onMessage = (message: Message) => {
                sendEvent(message);
            };

            const onTyping = (event: any) => {
                // SSE format:
                // event: typing
                // data: {...}
                safeEnqueue(encoder.encode(`event: typing\ndata: ${JSON.stringify(event)}\n\n`));
            };

            const onPresence = (event: any) => {
                safeEnqueue(encoder.encode(`event: presence\ndata: ${JSON.stringify(event)}\n\n`));
            }

            // Subscribe to Redis Pub/Sub channels
            await store.subscribe(`message:${roomId}`);
            await store.subscribe(`typing:${roomId}`);
            await store.subscribe(`presence:${roomId}`);

            store.on(`message:${roomId}`, onMessage);
            store.on(`typing:${roomId}`, onTyping);
            store.on(`presence:${roomId}`, onPresence);

            // Clean up on close (handled by client disconnect usually)
            request.signal.addEventListener('abort', async () => {
                clearInterval(keepAlive);

                // Unsubscribe from Redis Pub/Sub
                await store.unsubscribe(`message:${roomId}`);
                await store.unsubscribe(`typing:${roomId}`);
                await store.unsubscribe(`presence:${roomId}`);

                store.off(`message:${roomId}`, onMessage);
                store.off(`typing:${roomId}`, onTyping);
                store.off(`presence:${roomId}`, onPresence);

                if (userName) {
                    await store.removeActiveUser(roomId, userName);
                }
                // Do not call controller.close() here; stream is already aborted
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
