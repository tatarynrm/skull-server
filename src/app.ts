import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import telegramAuthRouter from "./routes/auth.route";
import cloudinaryRouter from "./routes/cloudinary-upload.route";
import cookieParser from "cookie-parser";
import cors from "cors";
import bot from "./bot/bot"; // Telegram bot import

dotenv.config();
bot.launch(); // Launch the bot

const PORT = process.env.PORT || 3001;
const app = express();

// Allowed origins for CORS
const allowedOrigins = [
  'https://skulldate.site',
  'https://www.skulldate.site',
  'https://localhost:3000',
  'http://127.0.0.1',
  'http://127.0.0.1:80',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Allow cookies and credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' })); // Максимальний розмір тіла 50 MB
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// Routes
app.use("/auth", telegramAuthRouter);
app.use("/cloudinary", cloudinaryRouter);

// Test route to check server status
app.get('/syka', async (req: Request, res: Response) => {
  console.log('GET /syka');
  res.json({ message: "Everything is okay" });
});

// Root route for basic check
app.get('/', async (req: Request, res: Response) => {
  console.log('GET /');
  res.json({ message: "Everything is okay" });
});

// Preflight CORS (OPTIONS) handling for all routes


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
