/**
 * CoWatchNavButton  —  Minimal navbar button for co-watch rooms.
 *
 * Idle:   Small pill "Watch Together" → click → dropdown with Create / Join
 * In-room: Green pill showing room code → click → dropdown with room info + Leave
 */

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Copy, Check, LogOut, Crown, ChevronDown } from "lucide-react";
import { useCoWatch } from "../../context/CoWatchContext";

export default function CoWatchNavButton() {
  const navigate = useNavigate();
  const {
    status,
    errorMsg,
    roomCode,
    members,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useCoWatch();

  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinView, setJoinView] = useState(false); // false = create/join choice, true = enter code
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setJoinView(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset join view when dropdown closes
  useEffect(() => {
    if (!open) {
      setJoinView(false);
      setJoinCode("");
    }
  }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    createRoom();
    setOpen(false);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (joinCode.trim().length === 6) {
      joinRoom(joinCode.trim());
      setOpen(false);
    }
  };

  const isInRoom = status === "in-room";
  const isConnecting = status === "connecting";

  /* ─── Trigger pill ─── */
  const Pill = () => {
    if (isConnecting) {
      return (
        <button
          disabled
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-gray-400 text-sm"
        >
          <span className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <span className="hidden sm:inline">Connecting…</span>
        </button>
      );
    }

    if (isInRoom) {
      return (
        <button
          onClick={() => setOpen((p) => !p)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-300 bg-green-50 text-green-800 text-sm font-medium hover:bg-green-100 transition"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="font-mono font-bold tracking-widest">{roomCode}</span>
          <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      );
    }

    return (
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition"
      >
        <Users size={15} className="text-indigo-500" />
        <span className="hidden sm:inline">Watch Together</span>
        <ChevronDown size={13} className={`transition-transform text-gray-400 ${open ? "rotate-180" : ""}`} />
      </button>
    );
  };

  return (
    <div className="relative" ref={ref}>
      <Pill />

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl origin-top-right
                     animate-[dropdown_0.18s_ease-out] z-[999] overflow-hidden"
        >
          {/* ── IDLE — pick Create or Join ── */}
          {status === "idle" && !joinView && (
            <div className="p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Co-Watch Room
              </p>
              <button
                onClick={handleCreate}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-indigo-50 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition">
                  <Users size={16} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Create a room</p>
                  <p className="text-xs text-gray-500">Start watching with friends</p>
                </div>
              </button>
              <button
                onClick={() => setJoinView(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-left transition group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition">
                  <span className="text-sm font-bold text-gray-600">#</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Join with a code</p>
                  <p className="text-xs text-gray-500">Have an invite code?</p>
                </div>
              </button>
            </div>
          )}

          {/* ── IDLE — enter join code ── */}
          {status === "idle" && joinView && (
            <form onSubmit={handleJoinSubmit} className="p-4 space-y-3">
              <button
                type="button"
                onClick={() => setJoinView(false)}
                className="text-xs text-gray-500 hover:text-gray-700 transition flex items-center gap-1"
              >
                ← Back
              </button>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Enter room code</p>
              <input
                autoFocus
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="XXXXXX"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono text-center text-lg tracking-[0.35em] uppercase outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={joinCode.length !== 6}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-indigo-700 transition"
              >
                Join Room
              </button>
            </form>
          )}

          {/* ── ERROR ── */}
          {status === "error" && (
            <div className="p-4 space-y-3">
              <p className="text-sm text-red-600 font-medium">{errorMsg || "Failed to join room."}</p>
              <button
                onClick={leaveRoom}
                className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── IN-ROOM ── */}
          {isInRoom && (
            <div>
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Live Room</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xl tracking-[0.2em] text-indigo-700">{roomCode}</span>
                      <button onClick={handleCopy} className="text-gray-400 hover:text-gray-700 transition">
                        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  {isHost && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Crown size={11} className="text-amber-500" />
                      Host
                    </span>
                  )}
                </div>
              </div>

              {/* Members */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mb-2">
                  {members.length} {members.length === 1 ? "Member" : "Members"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => (
                    <div
                      key={m.socketId}
                      title={m.username}
                      className="flex items-center gap-1.5 bg-gray-100 rounded-full px-2.5 py-1"
                    >
                      {m.avatar ? (
                        <img src={m.avatar} alt={m.username} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-700 text-[9px] font-bold flex items-center justify-center">
                          {m.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs text-gray-700 max-w-[72px] truncate">{m.username}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs text-gray-500">
                  {isHost
                    ? "Browse to any video — everyone follows automatically."
                    : "The host controls which video plays. Chat or sit back!"}
                </p>
              </div>

              {/* Leave */}
              <div className="px-4 py-3">
                <button
                  onClick={() => { leaveRoom(); setOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
                >
                  <LogOut size={14} />
                  Leave Room
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
