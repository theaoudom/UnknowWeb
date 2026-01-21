'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, RotateCw, MessageSquare } from 'lucide-react';
import { Room } from '@/types';
import { generateAnonymousName } from '@/lib/generators';

export function TopicList() {
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [joinName, setJoinName] = useState('');
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    const fetchRooms = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/rooms', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch (error) {
            console.error('Failed to fetch rooms', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRooms();
    }, []);

    const handleJoin = async (room: Room) => {
        if (!joinName.trim()) {
            setJoinName(generateAnonymousName());
        }
        setSelectedRoom(room);
    };

    const confirmJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRoom || !joinName.trim()) return;

        try {
            const res = await fetch(`/api/rooms/${selectedRoom.id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: joinName }),
            });

            if (res.ok) {
                localStorage.setItem(`unknow_user_${selectedRoom.id}`, joinName);
                router.push(`/rooms/${selectedRoom.id}`);
            }
        } catch (error) {
            alert('Failed to join');
        }
    };

    const timeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    Active Confessions
                </h2>
                <button
                    onClick={fetchRooms}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {isLoading && rooms.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">Loading whispers...</div>
            ) : rooms.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                    No active confessions. Be the first to speak.
                </div>
            ) : (
                <div className="grid gap-3">
                    <AnimatePresence>
                        {rooms.map((room) => (
                            <motion.div
                                key={room.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onClick={() => handleJoin(room)}
                                className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 p-4 rounded-xl cursor-pointer transition-all duration-300"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="font-semibold text-zinc-200 group-hover:text-purple-300 transition-colors">
                                            {room.name}
                                        </h3>
                                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {(room.activeUsers as unknown as string[])?.length || 0} online
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {timeAgo(room.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 bg-zinc-800 rounded-full text-xs text-zinc-400 group-hover:bg-purple-500/10 group-hover:text-purple-300 transition-colors">
                                        Join
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Join Modal Overlay */}
            {selectedRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl"
                    >
                        <h3 className="text-lg font-bold text-white mb-4">
                            Join "{selectedRoom.name}"
                        </h3>
                        <form onSubmit={confirmJoin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">
                                    Choose an alias
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={joinName}
                                        onChange={(e) => setJoinName(e.target.value)}
                                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                        placeholder="Anonymous"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setJoinName(generateAnonymousName())}
                                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors"
                                        title="Random Name"
                                    >
                                        <RotateCw size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedRoom(null)}
                                    className="flex-1 py-2 text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors"
                                >
                                    Enter Room
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
