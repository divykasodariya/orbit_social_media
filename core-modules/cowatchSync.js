export function registerCoWatchSocket(io) {
  const rooms = new Map();

  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, userId, isHost }) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          hostId: userId,
          currentTime: 0,
          isPlaying: false,
          lastUpdated: Date.now(),
        });
      }

      socket.emit("sync-state", rooms.get(roomId));
    });

    socket.on("video-action", ({ roomId, action, currentTime }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.currentTime = currentTime;
      room.isPlaying = action === "play";
      room.lastUpdated = Date.now();

      socket.to(roomId).emit("video-action", {
        action,
        currentTime,
        serverTime: Date.now(),
      });
    });

    socket.on("disconnecting", () => {
      for (const roomId of socket.rooms) {
        socket.to(roomId).emit("user-left", { socketId: socket.id });
      }
    });
  });
}
