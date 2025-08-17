import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export function getSeeMyLikes(ctx: MyContext) {
  return {
    keyboard: [
      [
        { text: t(ctx.lang, "my_likes") },

      ],
    ],
    resize_keyboard: true,
  };
}