import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getBeforeRegisterKeyboard(ctx: MyContext) {
  return {
    keyboard: [
      [{ text: t(ctx.lang, "keyboard_change_language") }],
      [{ text: t(ctx.lang, "keyboard_create_profile") }],
      [{ text: t(ctx.lang, "keyboard_our_rules") }],
    ],
    resize_keyboard: true,
  };
}
