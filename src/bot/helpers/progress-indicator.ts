import { Markup } from "telegraf";
import { t } from "../lib/i18n";

// Функція для відправки повідомлення з прогрес-баром
export async function sendProgressMessage(ctx: any,startTitle:string,endTitle:string) {
  // Відправляємо початкове повідомлення
  const msg = await ctx.reply(t(ctx.lang,startTitle), {
    reply_markup: Markup.removeKeyboard(),
  });

  const steps = 10; // Кількість кроків прогресу (10% кожен)

  for (let step = 1; step <= steps; step++) {
    const percent = step * 10;
    const progressBar =
      "✅".repeat(step) + "▫️".repeat(steps - step) + ` ${percent}%`;

    await ctx.editMessageText(progressBar, {
      message_id: msg.message_id,
      chat_id: ctx.chat.id,
    });

    // Затримка для симуляції прогресу
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  

  await ctx.editMessageText(t(ctx.lang, endTitle), {
    message_id: msg.message_id,
    chat_id: ctx.chat.id,
  });
}
