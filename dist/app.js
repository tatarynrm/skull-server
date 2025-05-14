"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_route_1 = __importDefault(require("./routes/auth.route"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const bot_1 = __importDefault(require("./bot/bot")); // Telegram bot import
dotenv_1.default.config();
const PORT = process.env.PORT || 3001;
const app = (0, express_1.default)();
// Allowed origins for CORS
const allowedOrigins = ['https://skulldate.site', 'https://www.skulldate.site'];
// CORS configuration
app.use((0, cors_1.default)({
    origin: "*",
    // credentials: true
}));
// Middleware
app.use(express_1.default.json()); // For parsing application/json
app.use((0, cookie_parser_1.default)()); // For parsing cookies
app.use(body_parser_1.default.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
// Routes
app.use("/auth", auth_route_1.default);
console.log('TEST -------- ');
app.get('/syka', async (req, res) => {
    console.log('1111');
    res.json({
        message: "Everything is okay"
    });
});
app.get('/', async (req, res) => {
    console.log('1111');
    res.json({
        message: "Everything is okay"
    });
});
bot_1.default.launch(); // Launch the bot if needed
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
