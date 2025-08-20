import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import telegramAuthRouter from "./routes/auth.route";
import cloudinaryRouter from "./routes/cloudinary-upload.route";
import uploadsRouter from "./routes/upload.routes";
import botStatisticRoute from "./modules/bot/statistic/statistic.route";
import cookieParser from "cookie-parser";
import cors from "cors";

import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { registerSocketHandlers } from "./sockets/SocketProvider";
import { pool } from "./db/pool";
import path from "path";
import bot from "./bot/bot";

dotenv.config();

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);
// Підключення до Redis
const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

pubClient.connect();
subClient.connect();
// Allowed origins for CORS
const allowedOrigins = [
  "https://skulldate.site",
  "https://www.skulldate.site",
  "https://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1",
  "http://127.0.0.1:80",
  "http://127.0.0.1:80",
  "http://localhost:3000",
  "https://7878d67cc2eb.ngrok-free.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allow cookies and credentials
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  })
);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: "90mb" })); // Максимальний розмір тіла 50 MB
app.use(express.urlencoded({ limit: "90mb", extended: true }));

// Routes
app.use("/auth", telegramAuthRouter);
app.use("/cloudinary", cloudinaryRouter);
app.use("/upload", uploadsRouter);
app.use("/bot/statistic", botStatisticRoute);

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
// Test route to check server status
app.get("/syka", async (req: Request, res: Response) => {
  console.log("GET /syka");
  res.json({ message: "Everything is okay" });
});

// Root route for basic check
app.get("/", async (req: Request, res: Response) => {
  console.log("GET /");
  res.json({ message: "Everything is okay" });
});

// Preflight CORS (OPTIONS) handling for all routes
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://127.0.0.1",
      "https://skulldate.site",
      "http://localhost:3000",
    ], // Next.js frontend
    methods: ["GET", "POST"],
  },
});
io.adapter(createAdapter(pubClient, subClient));
// Логіка сокетів
registerSocketHandlers(io);
// Start the server

// bot.launch(); // Launch the bot

httpServer.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  app.use(bot.webhookCallback("/webhook"));
  console.log(process.env.SERVER_HOST!);
  
  await bot.telegram.setWebhook(`${process.env.SERVER_HOST!}/webhook`);
});
