'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function JoinRoomForm() {
    const router = useRouter();
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch(`/api/rooms/${roomId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName }),
            });

            if (res.ok) {
                // Store user identity
                localStorage.setItem(`unknow_user_${roomId}`, userName);
                router.push(`/rooms/${roomId}`);
            } else {
                alert('Failed to join room (might not exist)');
            }
        } catch (error) {
            console.error(error);
            alert('Error joining room');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="space-y-4 w-full max-w-sm"
        >
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Room ID</label>
                <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-zinc-600"
                    placeholder="Enter Room ID"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Your Alias</label>
                <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-zinc-600"
                    placeholder="e.g. Ghost"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-zinc-800 text-white font-semibold py-2 rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700 disabled:opacity-50"
            >
                {isLoading ? 'Joining...' : 'Join Room'}
            </button>
        </motion.form>
    );
}
