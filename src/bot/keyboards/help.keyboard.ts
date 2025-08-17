import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getHelpKeyboard(ctx: MyContext) {
  return {
  keyboard: [
    [{ text: t(ctx.lang,"keyboard_help_contact") }],
    [{ text: t(ctx.lang,"back_to_menu")   }],

  ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}


