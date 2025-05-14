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

app.use(
  cors({
 origin: ["https://skulldate.site", "https://api.skulldate.site"],

    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json()); // Для парсингу application/json
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/auth", telegramAuthRouter);



bot.launch()
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
