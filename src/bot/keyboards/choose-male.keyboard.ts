import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getChooseMaleKeyboard(ctx: MyContext) {
  return {
    keyboard: [
      [
        { text: t(ctx.lang, "looking_for_girl") },
        { text: t(ctx.lang, "looking_for_boy") },
        { text: t(ctx.lang, "looking_for_anyone") },
      ],
    ],
    resize_keyboard: true,
  };
}
