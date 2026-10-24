/**
 * CoWatchPanel — The floating side-panel for co-watch rooms.
 *
 * States it handles:
 *   idle       → shows "Watch Together" entry (Create / Join)
 *   connecting → spinner
 *   in-room    → member list + live chat + room code share
 *   error      → error banner with retry
 */

import { useState, useRef, useEffect } from 'react';
import {
    Users, Copy, Check, X, ChevronRight,
    Send, LogOut, Crown, Wifi, WifiOff,
} from 'lucide-react';

export default function CoWatchPanel({ coWatch, videoTitle }) {
    const {
        status, errorMsg, roomCode, members, isHost,
        messages, createRoom, joinRoom, leaveRoom, sendChat,
    } = coWatch;

    const [view, setView] = useState('entry'); // 'entry' | 'join-input'
    const [joinCode, setJoinCode] = useState('');
    const [chatText, setChatText] = useState('');
    const [copied, setCopied] = useState(false);
    const chatEndRef = useRef(null);

    /* Scroll chat to bottom on new messages */
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /* Reset to entry when leaving */
    useEffect(() => {
        if (status === 'idle') setView('entry');
    }, [status]);

    const handleCopy = () => {
        navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleJoinSubmit = (e) => {
        e.preventDefault();
        if (joinCode.trim().length === 6) joinRoom(joinCode.trim());
    };

    const handleChatSubmit = (e) => {
        e.preventDefault();
        sendChat(chatText);
        setChatText('');
    };

    /* ─────────────────────────── IDLE / ENTRY ─────────────────────────── */
    if (status === 'idle') {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Users size={18} className="text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm text-gray-900">Watch Together</p>
                        <p className="text-xs text-gray-500">Sync video with anyone, in real-time</p>
                    </div>
                </div>

                {view === 'entry' && (
                    <div className="p-5 space-y-3">
                        <button
                            onClick={createRoom}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl
                                       bg-indigo-600 text-white text-sm font-medium
                                       hover:bg-indigo-700 active:scale-[0.98] transition-all"
                        >
                            <span>Create a room</span>
                            <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => setView('join-input')}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl
                                       border border-gray-200 text-sm font-medium text-gray-700
                                       hover:bg-gray-50 active:scale-[0.98] transition-all"
                        >
                            <span>Join with a code</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {view === 'join-input' && (
                    <form onSubmit={handleJoinSubmit} className="p-5 space-y-3">
                        <button
                            type="button"
                            onClick={() => setView('entry')}
                            className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700 transition"
                        >
                            ← Back
                        </button>
                        <input
                            autoFocus
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                            placeholder="Enter 6-character code"
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center
                                       tracking-[0.35em] font-mono text-lg uppercase outline-none
                                       focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                        <button
                            type="submit"
                            disabled={joinCode.length !== 6}
                            className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium
                                       disabled:opacity-40 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                        >
                            Join Room
                        </button>
                    </form>
                )}
            </div>
        );
    }

    /* ─────────────────────────── CONNECTING ─────────────────────────── */
    if (status === 'connecting') {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white px-5 py-6 flex items-center gap-4 shadow-sm">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <p className="text-sm text-gray-600">Connecting to room…</p>
            </div>
        );
    }

    /* ─────────────────────────── ERROR ─────────────────────────── */
    if (status === 'error') {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3 shadow-sm">
                <div className="flex items-start gap-3">
                    <WifiOff size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-red-700">Room not found</p>
                        <p className="text-xs text-red-600 mt-0.5">{errorMsg}</p>
                    </div>
                </div>
                <button
                    onClick={leaveRoom}
                    className="w-full py-2 rounded-xl bg-white border border-red-200 text-sm text-red-600
                               hover:bg-red-50 transition"
                >
                    Try again
                </button>
            </div>
        );
    }

    /* ─────────────────────────── IN-ROOM ─────────────────────────── */
    return (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm flex flex-col"
             style={{ maxHeight: '70vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                        Live Room · {members.length} {members.length === 1 ? 'viewer' : 'viewers'}
                    </span>
                </div>
                <button
                    onClick={leaveRoom}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                    title="Leave room"
                >
                    <LogOut size={15} />
                </button>
            </div>

            {/* Room code share */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500 flex-shrink-0">Room code</span>
                <span className="font-mono font-bold text-sm tracking-widest text-indigo-700 flex-1">
                    {roomCode}
                </span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200
                               bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700
                               transition-all"
                >
                    {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>

            {isHost && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex-shrink-0">
                    <p className="text-xs text-amber-700 flex items-center gap-1.5">
                        <Crown size={12} className="text-amber-500" />
                        You're the host — your play / pause / seek syncs everyone.
                    </p>
                </div>
            )}

            {/* Members */}
            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Members</p>
                <div className="flex flex-wrap gap-2">
                    {members.map(m => (
                        <div key={m.socketId}
                             className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 max-w-full">
                            {m.avatar
                                ? <img src={m.avatar} alt={m.username}
                                       className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                                : <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center
                                                  text-indigo-700 text-[10px] font-bold flex-shrink-0">
                                    {m.username?.[0]?.toUpperCase()}
                                  </div>
                            }
                            <span className="text-xs text-gray-700 truncate max-w-[80px]">{m.username}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                {messages.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">
                        Chat is empty — say hi! 👋
                    </p>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className="flex gap-2 items-start">
                        {msg.avatar
                            ? <img src={msg.avatar} alt={msg.username}
                                   className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
                            : <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold
                                              flex items-center justify-center flex-shrink-0 mt-0.5">
                                {msg.username?.[0]?.toUpperCase()}
                              </div>
                        }
                        <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold text-gray-700">{msg.username} </span>
                            <span className="text-xs text-gray-600 break-words">{msg.text}</span>
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <form onSubmit={handleChatSubmit}
                  className="flex gap-2 px-3 py-3 border-t border-gray-100 flex-shrink-0">
                <input
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    placeholder="Say something…"
                    maxLength={500}
                    className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm
                               outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <button
                    type="submit"
                    disabled={!chatText.trim()}
                    className="p-2.5 rounded-xl bg-indigo-600 text-white disabled:opacity-40
                               hover:bg-indigo-700 active:scale-95 transition-all flex-shrink-0"
                >
                    <Send size={15} />
                </button>
            </form>
        </div>
    );
}
