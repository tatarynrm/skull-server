import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import telegramAuthRouter from "./routes/auth.route";
import cookieParser from "cookie-parser";
import cors from "cors";
import bot from "./bot/bot"; // Імпортуємо бота
dotenv.config();

const PORT = process.env.PORT || 3001;
const app = express();



const allowedOrigins = ['https://skulldate.site', 'https://www.skulldate.site'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json()); // Для парсингу application/json
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/auth", telegramAuthRouter);



bot.launch()
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
