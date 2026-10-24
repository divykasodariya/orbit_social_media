/**
 * Co-Watch Room — Socket.io Handler
 *
 * Room lifecycle:
 *   - Rooms are identified by a short code (e.g. "ABC123").
 *   - The first person to join becomes the HOST.
 *   - Host sync events (play/pause/seek) are broadcast to every other viewer.
 *   - When the host disconnects, the oldest remaining member becomes the new host.
 *   - Rooms are destroyed when empty.
 *
 * Events (client → server):
 *   join_room     { roomCode, username, avatar }
 *   sync          { roomCode, type: 'play'|'pause'|'seek', time }
 *   chat_message  { roomCode, text }
 *   leave_room    { roomCode }
 *
 * Events (server → client):
 *   room_state    { members, hostId, videoId, videoTitle }
 *   member_joined { member }
 *   member_left   { socketId, newHostId? }
 *   sync          { type, time, fromSocketId }
 *   chat_message  { id, username, avatar, text, at }
 *   error         { message }
 */

// In-memory store: roomCode → { hostId, videoId, videoTitle, members[] }
const rooms = new Map();

/**
 * Generate a unique 6-char room code
 */
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (rooms.has(code));
    return code;
}

export function initCoWatchSocket(io) {
    io.on('connection', (socket) => {

        /* ──────────────────────────────────────────
         * CREATE room  (host creates a new room)
         * ────────────────────────────────────────── */
        socket.on('create_room', ({ username, avatar, videoId, videoTitle }) => {
            const roomCode = generateCode();

            const member = { socketId: socket.id, username, avatar };
            rooms.set(roomCode, {
                hostId: socket.id,
                videoId: videoId || null,
                videoTitle: videoTitle || null,
                members: [member],
            });

            socket.join(roomCode);
            socket.emit('room_created', { roomCode });
            socket.emit('room_state', {
                roomCode,
                members: [member],
                hostId: socket.id,
                videoId: videoId || null,
                videoTitle: videoTitle || null,
            });
        });

        /* ──────────────────────────────────────────
         * JOIN room
         * ────────────────────────────────────────── */
        socket.on('join_room', ({ roomCode, username, avatar }) => {
            const code = roomCode?.toUpperCase();
            const room = rooms.get(code);
            if (!room) {
                socket.emit('error', { message: 'Room not found. Check the code and try again.' });
                return;
            }

            // Avoid duplicate member entry for same socket
            const existingIdx = room.members.findIndex(m => m.socketId === socket.id);
            const member = { socketId: socket.id, username, avatar };
            if (existingIdx >= 0) {
                room.members[existingIdx] = member;
            } else {
                room.members.push(member);
            }

            socket.join(code);

            // Tell the joiner the full room state
            socket.emit('room_state', {
                roomCode: code,
                members: room.members,
                hostId: room.hostId,
                videoId: room.videoId,
                videoTitle: room.videoTitle,
            });

            // Announce to everyone else
            socket.to(code).emit('member_joined', { member });
        });

        /* ──────────────────────────────────────────
         * CHANGE VIDEO — host changes current video
         * ────────────────────────────────────────── */
        socket.on('change_video', ({ roomCode, videoId, videoTitle }) => {
            const code = roomCode?.toUpperCase();
            const room = rooms.get(code);
            if (!room) return;
            if (room.hostId !== socket.id) return; // only host can switch video

            room.videoId = videoId || null;
            room.videoTitle = videoTitle || null;

            // Broadcast new video to all room participants
            io.to(code).emit('video_changed', {
                videoId: room.videoId,
                videoTitle: room.videoTitle,
                hostId: socket.id,
            });

            if (videoTitle) {
                const sysMsg = {
                    id: `sys-${Date.now()}`,
                    username: 'Orbit Room',
                    avatar: null,
                    text: `Host switched video to "${videoTitle}"`,
                    at: new Date().toISOString(),
                    isSystem: true,
                };
                io.to(code).emit('chat_message', sysMsg);
            }
        });

        /* ──────────────────────────────────────────
         * SYNC (play / pause / seek) — host only
         * ────────────────────────────────────────── */
        socket.on('sync', ({ roomCode, type, time }) => {
            const code = roomCode?.toUpperCase();
            const room = rooms.get(code);
            if (!room) return;
            if (room.hostId !== socket.id) return; // only host can sync

            socket.to(code).emit('sync', { type, time, fromSocketId: socket.id });
        });

        /* ──────────────────────────────────────────
         * CHAT MESSAGE
         * ────────────────────────────────────────── */
        socket.on('chat_message', ({ roomCode, text }) => {
            const code = roomCode?.toUpperCase();
            const room = rooms.get(code);
            if (!room) return;

            const member = room.members.find(m => m.socketId === socket.id);
            if (!member) return;

            const msg = {
                id: `${socket.id}-${Date.now()}`,
                username: member.username,
                avatar: member.avatar,
                text: text?.slice(0, 500), // hard cap
                at: new Date().toISOString(),
            };

            io.to(code).emit('chat_message', msg);
        });

        /* ──────────────────────────────────────────
         * LEAVE room
         * ────────────────────────────────────────── */
        socket.on('leave_room', ({ roomCode }) => handleLeave(socket, roomCode, io));

        /* ──────────────────────────────────────────
         * DISCONNECT (tab closed / network lost)
         * ────────────────────────────────────────── */
        socket.on('disconnect', () => {
            // Find any rooms this socket was in
            for (const [code] of rooms) {
                handleLeave(socket, code, io);
            }
        });
    });
}

function handleLeave(socket, roomCode, io) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.members = room.members.filter(m => m.socketId !== socket.id);
    socket.leave(roomCode);

    if (room.members.length === 0) {
        rooms.delete(roomCode);
        return;
    }

    let newHostId = room.hostId;
    if (room.hostId === socket.id) {
        newHostId = room.members[0].socketId;
        room.hostId = newHostId;
    }

    io.to(roomCode).emit('member_left', {
        socketId: socket.id,
        newHostId,
        members: room.members,
    });
}
