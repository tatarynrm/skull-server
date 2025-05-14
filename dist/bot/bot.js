"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const registerScene_1 = __importDefault(require("./scenes/registerScene"));
const profile_controller_1 = require("./controllers/profile.controller");
// Створення бота з правильним типом контексту
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN);
// Створюємо Stage для сцени реєстрації
const stage = new telegraf_1.Scenes.Stage([registerScene_1.default]);
// Додаємо middleware для session і stage
bot.use((0, telegraf_1.session)());
bot.use(stage.middleware());
// Команда /start для запуску сцени реєстрації
bot.start(async (ctx) => {
    try {
        const userId = ctx.message.from.id;
        console.log('CTX', userId);
        const checkHasProfile = await profile_controller_1.ProfileController.getProfileByUserId(userId);
        console.log('checkHasProfile', checkHasProfile);
        if (checkHasProfile && checkHasProfile.user_id && checkHasProfile.sex) {
            return await ctx.reply('У вас вже є профіль ✅');
        }
        await ctx.scene.enter('register-wizard');
    }
    catch (error) {
        console.error('Помилка у /start:', error);
        await ctx.reply('Сталася помилка при запуску. Спробуйте пізніше.');
    }
});
// Запуск бота
// bot.launch().then(() => {
//   console.log('Бот запущений!');
// });
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
exports.default = bot;
