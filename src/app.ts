import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import telegramAuthRouter from "./routes/auth.route";
import cookieParser from "cookie-parser";
import cors from "cors";
import bot from "./bot/bot"; // Telegram bot import

dotenv.config();

const PORT = process.env.PORT || 3001;
const app = express();

// Allowed origins for CORS
const allowedOrigins = ['https://skulldate.site', 'https://www.skulldate.site'];

// CORS configuration

app.use(cors({
  origin: "*",
  // credentials: true
}));

// Middleware
app.use(express.json());  // For parsing application/json
app.use(cookieParser());  // For parsing cookies
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Routes
app.use("/auth", telegramAuthRouter);



console.log('TEST -------- ');

app.get('/syka',async (req:Request,res:Response) =>{


  console.log('1111');
  
  res.json({
    message:"Everything is okay"
  })
})




     bot.launch(); // Launch the bot if needed
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });


