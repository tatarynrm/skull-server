import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getAfterRegisterKeyboard(ctx: MyContext) {
  return {
    keyboard: [
      [
        { text: t(ctx.lang, "keyboard_go_to_dating") },
        { text: t(ctx.lang, "keyboard_refil_questionnaire") },
      ],
    ],
    resize_keyboard: true,
  };
}
