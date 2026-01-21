import { ChatInterface } from '@/features/chat/components/ChatInterface';

interface Props {
    params: Promise<{
        id: string;
    }>;
}

export default async function RoomPage(props: Props) {
    const params = await props.params;
    return (
        <main className="flex min-h-screen flex-col bg-black text-white">
            <ChatInterface roomId={params.id} />
        </main>
    );
}
