// backend/socket/chatSocketHandler.ts
import { Socket, Server } from "socket.io"

export const chatSocketHandler = (io: Server, socket: Socket) => {
  console.log(`💬 [chat] Користувач приєднався: ${socket.id}`)

  socket.on('chat-message', (msg) => {
    console.log(`📩 [chat] Повідомлення:`, msg)

    // Надсилаємо ВСІМ ІНШИМ, крім автора
    socket.broadcast.emit('chat-message', msg)
  })

  socket.on('disconnect', () => {
    console.log(`❌ [chat] Вийшов: ${socket.id}`)
  })
}
