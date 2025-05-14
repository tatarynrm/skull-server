import { Telegraf, session, Scenes } from 'telegraf';
import { MyContext } from './types/scenesTypes';
import registerScene from './scenes/registerScene';
import { ProfileController } from './controllers/profile.controller';



// Створення бота з правильним типом контексту
const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN as string);

// Створюємо Stage для сцени реєстрації
const stage = new Scenes.Stage<MyContext>([registerScene]);

// Додаємо middleware для session і stage
bot.use(session());
bot.use(stage.middleware());

// Команда /start для запуску сцени реєстрації
bot.start(async (ctx) => {
  const checkHasProfile = await ProfileController.getProfileByUserId(ctx.message.from.id)
console.log(checkHasProfile);

if (checkHasProfile.user_id && checkHasProfile.sex) {
// await ctx.scene.enter('register-wizard')
}
await ctx.scene.enter('register-wizard')
}
  
);

// Запуск бота
// bot.launch().then(() => {
//   console.log('Бот запущений!');
// });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export default bot;
