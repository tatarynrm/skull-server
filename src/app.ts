import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import cors, { CorsOptions, CorsOptionsDelegate } from 'cors';
import telegramAuthRouter from './routes/auth.route';
import bot from './bot/bot';

dotenv.config();

const PORT: number = parseInt(process.env.PORT || '3001', 10);
const app = express();

// ✅ Дозволені домени для CORS
const allowedOrigins: string[] = [
  'https://skulldate.site',
  'https://www.skulldate.site'
];

// ✅ CORS опції (динамічно залежно від запиту)
const corsOptionsDelegate: CorsOptionsDelegate<Request> = (
  req,
  callback
): void => {
  const origin = req.header('Origin');
  console.log('🔍 CORS request from:', origin);

  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, {
      origin: origin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  } else {
    callback(new Error('❌ Not allowed by CORS'));
  }
};

// 🧠 Важливо: CORS ПЕРЕД middleware
app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));

// ✅ Інші middleware
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Роут авторизації
app.use('/auth', telegramAuthRouter);

// ✅ Запуск бота + сервера
const startServer = async (): Promise<void> => {
  try {
    await bot.launch();
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error starting the bot:', error);
  }
};

startServer();
