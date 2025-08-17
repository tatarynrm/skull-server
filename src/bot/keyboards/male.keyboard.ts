import { Markup } from "telegraf";
import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getMaleKeyboard(ctx: MyContext) {
  return {
    keyboard: [
 [{ text: t(ctx.lang,"male")   }, { text:t(ctx.lang,"female")  }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,  // Закрити клавіатуру після вибору
  };
}

