/**
 * useCoWatch  — thin React hook wrapping socket.io-client
 *
 * Usage inside WatchPage:
 *   const coWatch = useCoWatch({ user, videoId, videoTitle, playerRef });
 *   coWatch.createRoom()       – host creates a room
 *   coWatch.joinRoom(code)     – viewer joins by code
 *   coWatch.leaveRoom()        – disconnect gracefully
 *   coWatch.sendChat(text)
 *
 *   coWatch.roomCode           – string | null
 *   coWatch.members            – []
 *   coWatch.isHost             – bool
 *   coWatch.messages           – []
 *   coWatch.status             – 'idle'|'connecting'|'in-room'|'error'
 *   coWatch.errorMsg           – string | null
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

export function useCoWatch({ user, videoId, videoTitle, playerRef }) {
    const socketRef = useRef(null);

    const [status, setStatus] = useState('idle'); // idle | connecting | in-room | error
    const [errorMsg, setErrorMsg] = useState(null);
    const [roomCode, setRoomCode] = useState(null);
    const [members, setMembers] = useState([]);
    const [isHost, setIsHost] = useState(false);
    const [messages, setMessages] = useState([]);
    const [hostId, setHostId] = useState(null);

    /* ── Lazy connect (only when needed) ── */
    const getSocket = useCallback(() => {
        if (!socketRef.current || !socketRef.current.connected) {
            socketRef.current = io(SOCKET_URL, {
                transports: ['websocket'],
                withCredentials: true,
            });
        }
        return socketRef.current;
    }, []);

    /* ── Attach listeners once we have a socket ── */
    const attachListeners = useCallback((socket) => {
        socket.off(); // remove any previous listeners

        socket.on('room_created', ({ roomCode }) => {
            setRoomCode(roomCode);
        });

        socket.on('room_state', ({ members, hostId, videoId: _vId }) => {
            setMembers(members);
            setHostId(hostId);
            setIsHost(socket.id === hostId);
            setStatus('in-room');
        });

        socket.on('member_joined', ({ member }) => {
            setMembers(prev => [...prev, member]);
        });

        socket.on('member_left', ({ socketId, newHostId, members }) => {
            setMembers(members);
            setHostId(newHostId);
            setIsHost(socket.id === newHostId);
        });

        socket.on('sync', ({ type, time }) => {
            const player = playerRef?.current;
            if (!player) return;
            if (type === 'seek') {
                player.currentTime = time;
            } else if (type === 'play') {
                player.currentTime = time;
                player.play().catch(() => {});
            } else if (type === 'pause') {
                player.currentTime = time;
                player.pause();
            }
        });

        socket.on('chat_message', (msg) => {
            setMessages(prev => [...prev.slice(-199), msg]); // keep last 200
        });

        socket.on('error', ({ message }) => {
            setErrorMsg(message);
            setStatus('error');
        });
    }, [playerRef]);

    /* ── CREATE ── */
    const createRoom = useCallback(() => {
        if (!user) return;
        setStatus('connecting');
        setErrorMsg(null);
        const socket = getSocket();
        attachListeners(socket);
        socket.emit('create_room', {
            username: user.username || user.fullName,
            avatar: user.avatar,
            videoId,
            videoTitle,
        });
    }, [user, videoId, videoTitle, getSocket, attachListeners]);

    /* ── JOIN ── */
    const joinRoom = useCallback((code) => {
        if (!user || !code) return;
        setStatus('connecting');
        setErrorMsg(null);
        const socket = getSocket();
        attachListeners(socket);
        socket.emit('join_room', {
            roomCode: code.toUpperCase(),
            username: user.username || user.fullName,
            avatar: user.avatar,
        });
    }, [user, getSocket, attachListeners]);

    /* ── LEAVE ── */
    const leaveRoom = useCallback(() => {
        if (!socketRef.current || !roomCode) return;
        socketRef.current.emit('leave_room', { roomCode });
        socketRef.current.disconnect();
        socketRef.current = null;
        setStatus('idle');
        setRoomCode(null);
        setMembers([]);
        setMessages([]);
        setIsHost(false);
        setHostId(null);
    }, [roomCode]);

    /* ── SEND SYNC (player event → server) ── */
    const sendSync = useCallback((type, time) => {
        if (!socketRef.current || !roomCode || !isHost) return;
        socketRef.current.emit('sync', { roomCode, type, time });
    }, [roomCode, isHost]);

    /* ── SEND CHAT ── */
    const sendChat = useCallback((text) => {
        if (!text?.trim() || !socketRef.current || !roomCode) return;
        socketRef.current.emit('chat_message', { roomCode, text: text.trim() });
    }, [roomCode]);

    /* ── Cleanup on unmount ── */
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return {
        status,
        errorMsg,
        roomCode,
        members,
        isHost,
        messages,
        createRoom,
        joinRoom,
        leaveRoom,
        sendSync,
        sendChat,
    };
}
