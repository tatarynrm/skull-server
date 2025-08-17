import { Socket, Server } from "socket.io";

export const userSocketHandler = (io: Server, socket: Socket) => {
  console.log(`👤 [user] Підключився: ${socket.id}`);

  socket.on('user-typing', (userId) => {
    socket.broadcast.emit('user-typing', userId);
  });

  // інші події для користувачів...
};