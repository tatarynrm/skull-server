import { t } from "../lib/i18n";
import { Lang } from "../types/bot-context";

// src/keyboards/likes.keyboard.ts
export const LikesKeyboard = {
  keyboard: [
    [{ text: "📨 Вхідні симпатії" }, { text: "📤 Відправлені" }],
    [{ text: "⬅️ Назад у меню" }],
  ],
  resize_keyboard: true,
};

export const getSeeMyLikesKeyboard = (lang:Lang) => {
  return {
    keyboard: [[{ text: t(lang || "en", "my_likes") }]],
    resize_keyboard: true,
  };
};
