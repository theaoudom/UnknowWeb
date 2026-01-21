'use client';

import { useState } from 'react';
import { CreateRoomForm } from '@/features/room/components/CreateRoomForm';
import { JoinRoomForm } from '@/features/room/components/JoinRoomForm';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Ghost, Lock, Users } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden selection:bg-purple-500/30">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black via-transparent to-black pointer-events-none" />

      {/* Floating Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 blur-[130px] rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[130px] rounded-full animate-pulse" style={{ animationDuration: '7s' }} />

      <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto px-6 py-20 relative z-10 min-h-screen items-center">

        {/* Left Side: Copy & Features */}
        <div className="space-y-12">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400"
            >
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Secure System Active
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-7xl font-bold tracking-tighter leading-[1.1]"
            >
              Chat <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Invisible</span>.
              <br />
              Leave <span className="text-zinc-500">No Trace</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-zinc-400 max-w-lg leading-relaxed"
            >
              The advanced anonymous communication platform. No logs. No accounts. Just pure, encrypted ephemeral messaging.
            </motion.p>
          </div>

          {/* Feature Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid sm:grid-cols-2 gap-6"
          >
            {[
              { icon: Ghost, title: "Truly Anonymous", desc: "No sign-up required. Just pick a code name." },
              { icon: Zap, title: "Real-time SSE", desc: "Instant message delivery via secure streams." },
              { icon: Lock, title: "Zero Trace", desc: "Room data is wiped from RAM upon termination." },
              { icon: Users, title: "Live Presence", desc: "See who is online and typing in real-time." },
            ].map((f, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-zinc-900/40 transition-colors border border-transparent hover:border-zinc-800/50 group">
                <div className="p-3 bg-zinc-900 rounded-lg group-hover:scale-110 transition-transform duration-300">
                  <f.icon className="w-6 h-6 text-zinc-400 group-hover:text-purple-400 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-200">{f.title}</h3>
                  <p className="text-sm text-zinc-500 leading-snug mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Side: Interactive Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          {/* Decorative Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl rounded-3xl" />

          <div className="relative bg-zinc-950/80 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <div className="flex gap-2 mb-8 p-1 bg-zinc-900/80 rounded-xl">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${activeTab === 'create'
                    ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${activeTab === 'join'
                    ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
              >
                Join existing
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'create' ? (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CreateRoomForm />
                </motion.div>
              ) : (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <JoinRoomForm />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Security Badge */}
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-zinc-600">
              <Shield size={12} />
              <span>End-to-End Ephemeral Encryption</span>
            </div>
          </div>
        </motion.div>

      </div>
    </main>
  );
}
