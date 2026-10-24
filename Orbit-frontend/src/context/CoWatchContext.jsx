import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

const CoWatchContext = createContext(null);

export function CoWatchProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const socketRef = useRef(null);
  const playerRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | connecting | in-room | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [members, setMembers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [currentVideoTitle, setCurrentVideoTitle] = useState(null);
  const [messages, setMessages] = useState([]);

  /* ── Get or initialize Socket.io instance ── */
  const getSocket = useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket"],
        withCredentials: true,
      });
    }
    return socketRef.current;
  }, []);

  /* ── Setup Socket Listeners ── */
  const attachListeners = useCallback((socket) => {
    socket.off(); // clear any stale listeners

    socket.on("room_created", ({ roomCode: code }) => {
      setRoomCode(code);
    });

    socket.on("room_state", ({ roomCode: code, members: mList, hostId: hId, videoId, videoTitle }) => {
      setRoomCode(code);
      setMembers(mList);
      setHostId(hId);
      setIsHost(socket.id === hId);
      setCurrentVideoId(videoId || null);
      setCurrentVideoTitle(videoTitle || null);
      setStatus("in-room");

      // If room already has a video playing and we are not watching it, navigate there!
      if (videoId && !location.pathname.startsWith(`/watch/${videoId}`)) {
        navigate(`/watch/${videoId}`);
      }
    });

    socket.on("member_joined", ({ member }) => {
      setMembers((prev) => {
        if (prev.some((m) => m.socketId === member.socketId)) return prev;
        return [...prev, member];
      });
    });

    socket.on("member_left", ({ socketId: leftSocketId, newHostId, members: updatedMembers }) => {
      setMembers(updatedMembers || []);
      setHostId(newHostId);
      setIsHost(socket.id === newHostId);
    });

    socket.on("video_changed", ({ videoId, videoTitle }) => {
      setCurrentVideoId(videoId);
      setCurrentVideoTitle(videoTitle);

      // If a new video is chosen, navigate everyone to it!
      if (videoId && !location.pathname.startsWith(`/watch/${videoId}`)) {
        navigate(`/watch/${videoId}`);
      }
    });

    socket.on("sync", ({ type, time }) => {
      const player = playerRef.current;
      if (!player) return;

      // Only sync if time difference is greater than 0.3s to prevent audio jitter
      const diff = Math.abs((player.currentTime || 0) - time);

      if (type === "seek") {
        player.currentTime = time;
      } else if (type === "play") {
        if (diff > 0.4) {
          player.currentTime = time;
        }
        player.play().catch(() => {});
      } else if (type === "pause") {
        if (diff > 0.4) {
          player.currentTime = time;
        }
        player.pause();
      }
    });

    socket.on("chat_message", (msg) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
    });

    socket.on("error", ({ message }) => {
      setErrorMsg(message);
      setStatus("error");
    });
  }, [location.pathname, navigate]);

  /* ── CREATE ROOM ── */
  const createRoom = useCallback((initialVideoId = null, initialVideoTitle = null) => {
    if (!user) return;
    setStatus("connecting");
    setErrorMsg(null);
    const socket = getSocket();
    attachListeners(socket);

    socket.emit("create_room", {
      username: user.username || user.fullName,
      avatar: user.avatar,
      videoId: initialVideoId,
      videoTitle: initialVideoTitle,
    });
  }, [user, getSocket, attachListeners]);

  /* ── JOIN ROOM ── */
  const joinRoom = useCallback((code) => {
    if (!user || !code) return;
    setStatus("connecting");
    setErrorMsg(null);
    const socket = getSocket();
    attachListeners(socket);

    socket.emit("join_room", {
      roomCode: code.toUpperCase().trim(),
      username: user.username || user.fullName,
      avatar: user.avatar,
    });
  }, [user, getSocket, attachListeners]);

  /* ── LEAVE ROOM ── */
  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit("leave_room", { roomCode });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus("idle");
    setRoomCode(null);
    setMembers([]);
    setHostId(null);
    setIsHost(false);
    setCurrentVideoId(null);
    setCurrentVideoTitle(null);
    setMessages([]);
    setErrorMsg(null);
  }, [roomCode]);

  /* ── CHANGE VIDEO (Host switches video) ── */
  const changeVideo = useCallback((videoId, videoTitle) => {
    if (!socketRef.current || !roomCode || !isHost) return;
    if (currentVideoId === videoId) return; // avoid duplicate calls

    setCurrentVideoId(videoId);
    setCurrentVideoTitle(videoTitle);

    socketRef.current.emit("change_video", {
      roomCode,
      videoId,
      videoTitle,
    });
  }, [roomCode, isHost, currentVideoId]);

  /* ── SEND SYNC (Play / Pause / Seek) ── */
  const sendSync = useCallback((type, time) => {
    if (!socketRef.current || !roomCode || !isHost) return;
    socketRef.current.emit("sync", { roomCode, type, time });
  }, [roomCode, isHost]);

  /* ── SEND CHAT ── */
  const sendChat = useCallback((text) => {
    if (!text?.trim() || !socketRef.current || !roomCode) return;
    socketRef.current.emit("chat_message", {
      roomCode,
      text: text.trim(),
    });
  }, [roomCode]);

  /* ── Register / Unregister video element ref ── */
  const registerPlayer = useCallback((el) => {
    playerRef.current = el;
  }, []);

  const unregisterPlayer = useCallback(() => {
    playerRef.current = null;
  }, []);

  /* ── Clean up on window unload ── */
  useEffect(() => {
    const handleUnload = () => {
      if (socketRef.current && roomCode) {
        socketRef.current.emit("leave_room", { roomCode });
        socketRef.current.disconnect();
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [roomCode]);

  return (
    <CoWatchContext.Provider
      value={{
        status,
        errorMsg,
        roomCode,
        members,
        hostId,
        isHost,
        currentVideoId,
        currentVideoTitle,
        messages,
        createRoom,
        joinRoom,
        leaveRoom,
        changeVideo,
        sendSync,
        sendChat,
        registerPlayer,
        unregisterPlayer,
      }}
    >
      {children}
    </CoWatchContext.Provider>
  );
}

export function useCoWatch() {
  const context = useContext(CoWatchContext);
  if (!context) {
    throw new Error("useCoWatch must be used within a CoWatchProvider");
  }
  return context;
}
