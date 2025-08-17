import { Server, Socket } from "socket.io";
import { chatSocketHandler } from "./chat.socket";
import { userSocketHandler } from "./user.socket";

export const registerSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('🔌 Підключення сокета:', socket.id);

    // ініціалізуємо всі "модулі"
    chatSocketHandler(io, socket);
    userSocketHandler(io, socket);
  });
};