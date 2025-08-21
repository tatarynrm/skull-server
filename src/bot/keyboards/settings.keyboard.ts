import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getSettingsKeyboard(ctx: MyContext) {
  return {
    keyboard: [
      [{ text: t(ctx.lang, "change_language") }],
      [{ text: t(ctx.lang, "hide_my_profile") }],
      [{ text: t(ctx.lang, "back_to_menu") }],
    ],
    resize_keyboard: true,
    // one_time_keyboard: true, // Закрити клавіатуру після вибору
  };
}
