import { pool } from "../../db/pool";

const languages = [
  { code: "uk", label: "Українська 🇺🇦" },
  { code: "pl", label: "Polski 🇵🇱" },
  { code: "en", label: "English 🇬🇧" },
  { code: "de", label: "Deutsch 🇩🇪" },
  { code: "es", label: "Español 🇪🇸" },
  { code: "fr", label: "Français 🇫🇷" },
  { code: "it", label: "Italiano 🇮🇹" }
];

export function getLanguageKeyboard() {
  // Розбиваємо кнопки по 2 в рядку
  const keyboard: { text: string }[][] = [];
  for (let i = 0; i < languages.length; i += 2) {
    keyboard.push(languages.slice(i, i + 2).map(lang => ({ text: lang.label })));
  }
  return {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };
}
export async function handleLanguageSelection(ctx: any) {
  if (!ctx.message || !ctx.message.text) return false;

  const selected = languages.find(lang => ctx.message.text.includes(lang.label.split(" ")[0]));
  if (!selected) return false;

  // Оновлюємо мову користувача в базі
  await pool.query(
    `UPDATE tg_user SET lang = $1 WHERE tg_id = $2`,
    [selected.code, ctx.message.from.id]
  );

  ctx.lang = selected.code; // зберігаємо в контексті

  // Після вибору мови запускаємо сцену реєстрації
  await ctx.scene.enter("register-scene");
  return true;
}