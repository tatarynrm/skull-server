import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getPremiumKeyboard(ctx: MyContext) {
  return {
    inline_keyboard: [
      [
        { text: `✨ Підписка Premium`, callback_data: "subscribe_premium" },
        { text: `💎 Мої переваги`, callback_data: "my_benefits" },
      ],
      [
        { text: `💰 Оплата Premium`, callback_data: "premium_payment" },
        { text: `❓ Як це працює?`, callback_data: "premium_help" },
      ],
    ],
  };
}
export function getPremiumKeyboardBottom(ctx: MyContext) {
  return {
    keyboard: [
      [
        { text: t(ctx.lang, "premium_start") },
        { text: t(ctx.lang, "premium_medium") },
      ],
      [{ text: t(ctx.lang, "premium_big_boss") }],
      [{ text: t(ctx.lang, "premium_lotery") }],
      [{ text: t(ctx.lang, "back_to_menu") }],
    ],
    resize_keyboard: true,
    // one_time_keyboard: true, // Закрити клавіатуру після вибору
  };
}
