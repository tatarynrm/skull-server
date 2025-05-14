import { Telegraf, session, Scenes } from "telegraf";
import { MyContext } from "./types/scenesTypes";
import registerScene from "./scenes/registerScene";
import { ProfileController } from "./controllers/profile.controller";
import { handleStart } from "./tgUser";
import { MainKeyboard } from "./keyboards/main_keyboard";
import dayjs from "dayjs";
import "dayjs/locale/uk";
dayjs.locale("uk");
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

    handleStart(ctx);

    const checkHasProfile = await ProfileController.getProfileByUserId(userId);

    if (checkHasProfile.date_block) {
      return await ctx.reply(
        `ВАШ АККАУНТ ЗАБЛОКОВАНО\n\n\n❗❗❗${checkHasProfile.block_reason}❗❗❗\n\n\nДАТА БЛОКУВАННЯ: ${dayjs(checkHasProfile.date_block).format("D MMMM YYYY")}`,
        {
          reply_markup: {
            remove_keyboard: true,
          },
        }
      );
    }
    if (checkHasProfile && checkHasProfile.user_id && checkHasProfile.sex) {
      return await ctx.reply("Твій профіль ✅", { reply_markup: MainKeyboard });
    }

    if (!checkHasProfile) {
      await ctx.reply("Давай створимо тобі анкету ?");
      await ctx.scene.enter("register-wizard");
      return;
    }
  } catch (error) {
    console.error("Помилка у /start:", error);
    await ctx.reply("Сталася помилка при запуску. Спробуйте пізніше.");
    return;
  }
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

export default bot;
