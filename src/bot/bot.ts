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
  try {
    const userId = ctx.message.from.id;
    console.log('CTX', userId);
    
    const checkHasProfile = await ProfileController.getProfileByUserId(userId);
    console.log('checkHasProfile', checkHasProfile);

    if (checkHasProfile && checkHasProfile.user_id && checkHasProfile.sex) {
      return await ctx.reply('У вас вже є профіль ✅');
    }

    await ctx.scene.enter('register-wizard');
  } catch (error) {
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

export default bot;
