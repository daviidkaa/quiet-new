import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import "dotenv/config";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-this";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
  origin: "http://localhost:3000",
  credentials: true,
},
});

// online users map
const onlineUsers = new Map<number, string>();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded: any = jwt.verify(token, SECRET);

    socket.data.user = decoded;

    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user;

//console.log("FULL USER:", user);

  // track online user
  onlineUsers.set(user.userId, socket.id);

  // emit online users list
  io.emit(
    "online_users",
    Array.from(onlineUsers.keys())
  );

  // join personal room
  socket.join(user.userId.toString());

  // receive/send messages
  socket.on("send_message", (message) => {
    io.to(message.receiverId.toString()).emit(
      "receive_message",
      {
        ...message,
        senderId: user.userId,
      }
    );
  });
  socket.on("typing", (data) => {
  io.to(data.receiverId.toString()).emit(
    "typing",
    data.username
  );
});
socket.on("seen_messages", (data) => {
  io.to(data.receiverId.toString()).emit(
    "messages_seen",
    {
      userId: data.userId,
    }
  );
});
  // disconnect
  socket.on("disconnect", () => {
 // console.log("Disconnected:", user.username);

    onlineUsers.delete(user.userId);

    io.emit(
      "online_users",
      Array.from(onlineUsers.keys())
    );
  });
  
});


httpServer.listen(3001, () => {
  console.log("Socket.IO server running on port 3001");
});