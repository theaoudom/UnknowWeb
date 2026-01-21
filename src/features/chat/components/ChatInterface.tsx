'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Room } from '@/types';
import { Trash2, Send, LogOut, ShieldCheck, User, Users, Ghost } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatInterface({ roomId }: { roomId: string }) {
    const router = useRouter();
    const [room, setRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [activeUsers, setActiveUsers] = useState<string[]>([]);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load user from local storage
    useEffect(() => {
        const user = localStorage.getItem(`unknow_user_${roomId}`);
        if (!user) {
            router.push('/');
            return;
        }
        setCurrentUser(user);
        setActiveUsers([user]);
    }, [roomId, router]);

    // Initial load
    useEffect(() => {
        const fetchRoomData = async () => {
            try {
                const res = await fetch(`/api/rooms/${roomId}`);
                if (!res.ok) {
                    if (res.status === 404) {
                        alert('Room does not exist or has been deleted.');
                        router.push('/');
                    }
                    return;
                }
                const data = await res.json();
                setRoom(data);
                setMessages(data.messages);
                setActiveUsers(data.activeUsers || []);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching room:', error);
            }
        };

        fetchRoomData();
    }, [roomId, router]);

    // SSE Subscription
    useEffect(() => {
        if (loading || !currentUser) return;

        const eventSource = new EventSource(`/api/rooms/${roomId}/sse?userName=${encodeURIComponent(currentUser)}`);

        eventSource.onopen = () => {
            console.log('Connected to secure stream');
        };

        eventSource.onmessage = (event) => {
            // Catch-all
        };

        eventSource.addEventListener('message', (event) => {
            try {
                const message: Message = JSON.parse(event.data);
                setMessages((prev) => {
                    if (prev.some(m => m.id === message.id)) return prev;
                    return [...prev, message];
                });
                setTypingUsers(prev => {
                    const next = new Set(prev);
                    next.delete(message.senderName);
                    return next;
                });
            } catch (e) { }
        });

        eventSource.addEventListener('typing', (event) => {
            try {
                const { userName, isTyping } = JSON.parse(event.data);
                if (userName === currentUser) return;

                setTypingUsers(prev => {
                    const next = new Set(prev);
                    if (isTyping) next.add(userName);
                    else next.delete(userName);
                    return next;
                });
            } catch (e) { }
        });

        eventSource.addEventListener('presence', (event) => {
            try {
                const { activeUsers } = JSON.parse(event.data);
                setActiveUsers(activeUsers);
            } catch (e) { }
        });

        eventSource.onerror = (e) => {
            console.warn('SSE connection issue, browser will attempt reconnect...', e);
        };

        return () => {
            eventSource.close();
        };
    }, [roomId, loading, currentUser]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    // Typing logic
    const handleTyping = () => {
        if (!currentUser) return;
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        fetch(`/api/rooms/${roomId}/typing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: currentUser, isTyping: true }),
        }).catch(() => { });

        typingTimeoutRef.current = setTimeout(() => {
            fetch(`/api/rooms/${roomId}/typing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName: currentUser, isTyping: false }),
            }).catch(() => { });
        }, 2000);
    }

    const [isSending, setIsSending] = useState(false);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || isSending) return;

        setIsSending(true);

        // Clear typing indicator immediately
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        fetch(`/api/rooms/${roomId}/typing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userName: currentUser, isTyping: false }),
        }).catch(() => { });

        try {
            const res = await fetch(`/api/rooms/${roomId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: currentUser,
                    senderName: currentUser,
                    content: newMessage,
                }),
            });

            if (!res.ok) throw new Error('Failed to send');

            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again or refresh.');
        } finally {
            setIsSending(false);
        }
    };

    const handleEndChat = async () => {
        if (!confirm('Are you sure? This will delete the room and all messages for everyone forever.')) return;
        try {
            await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
            router.push('/');
        } catch (error) {
            alert('Failed to end chat');
        }
    };

    const handleLeave = () => {
        localStorage.removeItem(`unknow_user_${roomId}`);
        router.push('/');
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-black text-zinc-500 font-mono">
            <div className="flex gap-2 items-center animate-pulse">
                <ShieldCheck size={20} className="text-green-500" />
                Initializing Secure Channel...
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen w-full bg-black relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black pointer-events-none" />
            <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent opacity-50" />

            {/* Container */}
            <div className="relative z-10 flex flex-col h-full max-w-5xl mx-auto w-full border-x border-zinc-800/50 bg-zinc-950/30 backdrop-blur-3xl shadow-2xl">

                {/* Header */}
                <header className="px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/40 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/5">
                                <ShieldCheck size={20} className="text-zinc-200" />
                            </div>
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full animate-pulse"></span>
                        </div>
                        <div>
                            <h1 className="font-bold text-lg text-white tracking-tight">{room?.name}</h1>
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                                <span className="flex items-center gap-1 text-green-400/80">
                                    <Users size={12} /> {activeUsers.length} Online
                                </span>
                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span>Encrypted</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span>Ephemeral</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(roomId);
                                alert('Room ID copied! Share it with others so they can join.');
                            }}
                            className="p-2.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all duration-200 flex items-center justify-center"
                            title="Copy Room ID"
                        >
                            <Send size={20} className="rotate-[-45deg] ml-[-2px] mt-1" />
                        </button>
                        <div className="w-px h-6 bg-zinc-800 mx-1" />
                        <button
                            onClick={handleLeave}
                            className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-all duration-200"
                            title="Leave Room"
                        >
                            <LogOut size={20} />
                        </button>
                        <div className="w-px h-6 bg-zinc-800 mx-1" />
                        <button
                            onClick={handleEndChat}
                            className="group flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200 text-sm font-medium ml-1"
                            title="Delete Room for Everyone"
                        >
                            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">End & Destroy</span>
                        </button>
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 opacity-50">
                            <Ghost size={48} strokeWidth={1} />
                            <p className="text-sm">No trace found. Start the conversation.</p>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => {
                            const isMe = msg.senderName === currentUser;
                            const isSystem = msg.senderName === 'System'; // Future proofing

                            return (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    layout
                                    className={cn(
                                        "flex w-full",
                                        isMe ? 'justify-end' : 'justify-start'
                                    )}
                                >
                                    <div className={cn(
                                        "flex flex-col max-w-[85%] sm:max-w-[70%]",
                                        isMe ? "items-end" : "items-start"
                                    )}>
                                        <span className="text-[10px] text-zinc-500 mb-1 px-1 flex items-center gap-1">
                                            {!isMe && <User size={10} />}
                                            {isMe ? 'You' : msg.senderName}
                                            <span className="opacity-50 mx-1">•</span>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        <div className={cn(
                                            "px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm break-words relative group transition-all duration-200",
                                            isMe
                                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-blue-900/20"
                                                : "bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 text-zinc-100 rounded-tl-sm hover:bg-zinc-800"
                                        )}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {/* Typing Indicator */}
                        {typingUsers.size > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex justify-start w-full"
                            >
                                <div className="bg-zinc-900/50 border border-zinc-800/50 text-zinc-400 rounded-full px-4 py-2 text-xs flex items-center gap-3 backdrop-blur-sm">
                                    <div className="flex gap-1 h-2 items-center">
                                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                                    </div>
                                    <span className="font-medium bg-gradient-to-r from-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                                        {Array.from(typingUsers).join(', ')} is typing...
                                    </span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 sm:p-6 bg-gradient-to-t from-black via-zinc-950/80 to-transparent">
                    <div className="relative bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl p-2 flex items-center gap-2 ring-1 ring-white/5 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all duration-300">
                        <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => {
                                    setNewMessage(e.target.value);
                                    handleTyping();
                                }}
                                disabled={isSending}
                                className="flex-1 bg-transparent border-none text-white px-4 py-3 focus:outline-none placeholder:text-zinc-600 font-medium disabled:opacity-50"
                                placeholder={isSending ? "Sending..." : "Type an encrypted message..."}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
                                className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:bg-zinc-800 disabled:text-zinc-600 shadow-lg shadow-white/5 flex items-center justify-center"
                            >
                                {isSending ? (
                                    <div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send size={18} fill="currentColor" strokeWidth={2.5} />
                                )}
                            </button>
                        </form>
                    </div>
                    <p className="text-center text-[10px] text-zinc-700 mt-3 font-medium tracking-wide">
                        MESSAGES ARE NOT SAVED • SECURE CONNECTION
                    </p>
                </div>
            </div>
        </div>
    );
}
