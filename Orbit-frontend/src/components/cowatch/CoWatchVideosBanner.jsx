import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Copy,
  Check,
  ChevronRight,
  LogOut,
  Crown,
  Play,
  MessageCircle,
  X,
  Send,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { useCoWatch } from "../../context/CoWatchContext";

export default function CoWatchVideosBanner() {
  const navigate = useNavigate();
  const {
    status,
    errorMsg,
    roomCode,
    members,
    isHost,
    currentVideoId,
    currentVideoTitle,
    messages,
    createRoom,
    joinRoom,
    leaveRoom,
    sendChat,
  } = useCoWatch();

  const [view, setView] = useState("default"); // 'default' | 'join'
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatText, setChatText] = useState("");

  const handleCopy = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (inputCode.trim().length === 6) {
      joinRoom(inputCode.trim());
      setInputCode("");
      setView("default");
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatText.trim()) {
      sendChat(chatText);
      setChatText("");
    }
  };

  /* ─────────────────────── IDLE STATE (CREATE / JOIN) ─────────────────────── */
  if (status === "idle") {
    return (
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-5 sm:p-6 shadow-md border border-indigo-700/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center flex-shrink-0 text-white">
              <Users size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">Co-Watch Room</h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/30 border border-indigo-400/30 rounded-full text-indigo-200">
                  Live Sync
                </span>
              </div>
              <p className="text-sm text-indigo-100/80 mt-1 max-w-xl">
                Create a room or join friends to watch videos in real-time. The room stays active as you browse and switch videos.
              </p>
            </div>
          </div>

          {view === "default" ? (
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => createRoom()}
                className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 font-semibold text-sm hover:bg-indigo-50 active:scale-95 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
              >
                <Sparkles size={16} className="text-indigo-600" />
                <span>Create Room</span>
              </button>
              <button
                onClick={() => setView("join")}
                className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-medium text-sm hover:bg-white/20 active:scale-95 transition-all whitespace-nowrap"
              >
                Join with Code
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="flex items-center gap-2">
              <input
                autoFocus
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="6-CHAR CODE"
                className="w-36 px-3 py-2 rounded-xl bg-white/10 border border-white/30 text-white placeholder-indigo-200/50 font-mono tracking-widest text-center uppercase outline-none focus:ring-2 focus:ring-white transition"
              />
              <button
                type="submit"
                disabled={inputCode.length !== 6}
                className="px-4 py-2 rounded-xl bg-white text-indigo-900 font-semibold text-sm hover:bg-indigo-50 disabled:opacity-40 transition"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => setView("default")}
                className="px-3 py-2 text-xs text-indigo-200 hover:text-white transition"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────────── CONNECTING STATE ─────────────────────── */
  if (status === "connecting") {
    return (
      <div className="mb-6 rounded-2xl bg-indigo-50 border border-indigo-200 p-4 flex items-center gap-3 text-indigo-900 shadow-sm animate-pulse">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <span className="text-sm font-medium">Connecting to Co-Watch room...</span>
      </div>
    );
  }

  /* ─────────────────────── ERROR STATE ─────────────────────── */
  if (status === "error") {
    return (
      <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-4 text-red-900 shadow-sm">
        <div className="flex items-center gap-3">
          <WifiOff size={20} className="text-red-500" />
          <span className="text-sm font-medium">{errorMsg || "Unable to join room. Please check the code."}</span>
        </div>
        <button
          onClick={leaveRoom}
          className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-semibold text-red-700 hover:bg-red-50 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  /* ─────────────────────── ACTIVE IN-ROOM STATE ─────────────────────── */
  return (
    <div className="mb-6 rounded-2xl bg-white border border-indigo-200 shadow-md overflow-hidden transition-all">
      {/* Top Banner Bar */}
      <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-4 sm:p-5 border-b border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Room Status & Code */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-xl shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase">Live Room</span>
            <span className="font-mono font-bold text-sm tracking-widest pl-1">{roomCode}</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition"
            title="Copy room code"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy Code"}</span>
          </button>

          {isHost ? (
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              <Crown size={14} className="text-amber-500" />
              <span>You are Host</span>
            </div>
          ) : (
            <div className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
              Viewer
            </div>
          )}

          {/* Members list */}
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5 overflow-hidden">
              {members.slice(0, 4).map((m) => (
                <div
                  key={m.socketId}
                  title={m.username}
                  className="w-6 h-6 rounded-full ring-2 ring-white bg-indigo-200 text-indigo-800 text-[10px] font-bold flex items-center justify-center overflow-hidden"
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt={m.username} className="w-full h-full object-cover" />
                  ) : (
                    m.username?.[0]?.toUpperCase()
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {members.length} {members.length === 1 ? "member" : "members"}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentVideoId && (
            <button
              onClick={() => navigate(`/watch/${currentVideoId}`)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <Play size={14} />
              <span>Watch Video</span>
            </button>
          )}

          <button
            onClick={() => setShowChat((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              showChat
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <MessageCircle size={14} />
            <span>Chat</span>
            {messages.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {messages.length}
              </span>
            )}
          </button>

          <button
            onClick={leaveRoom}
            className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition"
            title="Leave room"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Video Selection Advice */}
      <div className="px-5 py-3 bg-indigo-50/50 flex items-center justify-between gap-3 text-xs text-indigo-900 border-b border-indigo-100/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
          <span className="truncate">
            {currentVideoTitle ? (
              <span>
                Playing: <strong>{currentVideoTitle}</strong>
              </span>
            ) : isHost ? (
              <strong>Host tip: Click any video below to start watching together!</strong>
            ) : (
              <span>Waiting for host to select a video below...</span>
            )}
          </span>
        </div>
        {isHost && (
          <span className="text-indigo-600 text-[11px] hidden sm:inline flex-shrink-0">
            Switching videos switches for everyone automatically
          </span>
        )}
      </div>

      {/* Expandable Chat Drawer (Inline in banner) */}
      {showChat && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Room Chat</span>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 mb-3 pr-1 text-xs">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-center py-3">No messages yet. Say hi! 👋</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="flex gap-2 items-start">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    {m.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800 mr-1.5">{m.username}:</span>
                    <span className="text-gray-600">{m.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Chat with members..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
            <button
              type="submit"
              disabled={!chatText.trim()}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold disabled:opacity-40 hover:bg-indigo-700 transition"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
