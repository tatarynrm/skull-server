import { t } from "../lib/i18n";
import { MyContext } from "../types/bot-context";

export const ProfileKeyboard = {
  keyboard: [
    [{ text: "✏️ Редагувати анкету" }],
    [{ text: "🖼 Змінити фото" }],
    [{ text: "🗑 Видалити анкету" }],
    [{ text: "⬅️ Назад у меню" }],
  ],
  resize_keyboard: true,
};

export function getProfileKeyboard(ctx: MyContext) {
  return {
    keyboard: [
      [{ text: t(ctx.lang, "keyboard_edit_profile") }],
      [{ text: t(ctx.lang, "set_profile_status") }],
      [
        { text: t(ctx.lang, "keyboard_edit_profile_picture") },
        { text: t(ctx.lang, "keyboard_edit_profile_description") },
      ],
      [{ text: t(ctx.lang, "keyboard_edit_profile_age") }],
      [{ text: t(ctx.lang, "keyboard_edit_profile_hide") }],
      [{ text: t(ctx.lang, "back_to_menu") }],
    ],
    resize_keyboard: true,
    one_time_keyboard: true, // Закрити клавіатуру після вибору
  };
}
