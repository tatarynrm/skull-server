import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors, { CorsOptionsDelegate, CorsOptions } from "cors";
import telegramAuthRouter from "./routes/auth.route";
import bot from "./bot/bot";

dotenv.config();

const PORT: number = parseInt(process.env.PORT || "3001", 10);
const app = express();

// Allowed origins for CORS
const allowedOrigins: string[] = ['https://skulldate.site', 'https://www.skulldate.site'];

// CORS options delegate with TypeScript types
const corsOptionsDelegate: CorsOptionsDelegate<Request> = (
  req: Request,
  callback: (err: Error | null, options?: CorsOptions) => void
): void => {
  const origin = req.header('Origin');
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, {
      origin: origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

// Apply CORS before all middleware
app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/auth", telegramAuthRouter);

// Start bot and server
const startServer = async (): Promise<void> => {
  try {
    await bot.launch();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error: unknown) {
    console.error('Error starting the bot:', error);
  }
};

startServer();
