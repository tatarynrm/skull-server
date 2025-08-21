import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getMainKeyboard(ctx: MyContext) {
  return {
    keyboard: [
      [{ text: t(ctx.lang, "profile") },{ text: t(ctx.lang, "my_likes") }, { text: t(ctx.lang, "find_partner") }],
      [{ text: t(ctx.lang, "bonus") }, { text: t(ctx.lang, "premium") }],
      [{ text: t(ctx.lang, "settings") }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}
export function getMainKeyboardWhenIsHidden(ctx: MyContext) {
  return {
    keyboard: [[{ text: t(ctx.lang, "turn_on_profile") }]],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}
