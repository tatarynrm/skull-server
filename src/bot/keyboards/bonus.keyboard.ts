import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getBonusKeyboard(ctx: MyContext) {
  return {
    inline_keyboard: [
      [
        {
          text: t(ctx.lang, "premium_for_ref"),
          callback_data: "premium_for_ref",
        },
        {
          text: t(ctx.lang, "premium_for_video"),
          callback_data: "premium_for_video",
        },
      ],
      [
        {
          text: t(ctx.lang, "premium_for_daily_lottery"),
          callback_data: "premium_for_daily_lottery",
        },
      ],
      [
        {
          text: t(ctx.lang, "premium_for_month"),
          callback_data: "premium_for_month",
        },
      ],
    ],
  };
}
export function getBonusKeyboardGoBack(ctx: MyContext) {
  return {
    keyboard: [
      [{ text: t(ctx.lang, "daily_lotery_start") }],
      [{ text: t(ctx.lang, "montly_lotery_start") }],
      [{ text: t(ctx.lang, "back_to_menu") }],
    ],
    resize_keyboard: true,
    // one_time_keyboard: true, // Закрити клавіатуру після вибору
  };
}
export function getBonusKeyboardGoBackWithoutDaily(ctx: MyContext) {
  return {
    keyboard: [
      [{ text: t(ctx.lang, "montly_lotery_start") }],
      [{ text: t(ctx.lang, "back_to_menu") }],
    ],
    resize_keyboard: true,
    // one_time_keyboard: true, // Закрити клавіатуру після вибору
  };
}
export function getBonusKeyboardGoBackWithoutMonthly(ctx: MyContext) {
  return {
    keyboard: [
      [{ text: t(ctx.lang, "daily_lotery_start") }],
      [{ text: t(ctx.lang, "back_to_menu") }],
    ],
    resize_keyboard: true,
    // one_time_keyboard: true, // Закрити клавіатуру після вибору
  };
}
export function getBonusKeyboardGoBackWithoutAnything(ctx: MyContext) {
  return {
    keyboard: [[{ text: t(ctx.lang, "back_to_menu") }]],
    resize_keyboard: true,
    // one_time_keyboard: true, // Закрити клавіатуру після вибору
  };
}
