'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function CreateRoomForm() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [creatorName, setCreatorName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, creatorName }),
            });

            if (res.ok) {
                const room = await res.json();
                // Store user identity in localStorage (anonymous session)
                localStorage.setItem(`unknow_user_${room.id}`, creatorName);
                router.push(`/rooms/${room.id}`);
            } else {
                alert('Failed to create room');
            }
        } catch (error) {
            console.error(error);
            alert('Error creating room');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4 w-full max-w-sm"
        >
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Room Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-zinc-600"
                    placeholder="e.g. Secret Meeting"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Your Alias</label>
                <input
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-zinc-600"
                    placeholder="e.g. Agent 47"
                    required
                />
            </div>
            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black font-semibold py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
                {isLoading ? 'Creating...' : 'Create Secure Room'}
            </button>
        </motion.form>
    );
}
