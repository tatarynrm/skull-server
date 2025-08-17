// import ua from "../../locales/ua.json";
// import en from "../../locales/en.json";

// interface Locale {
//   [key: string]: string; // дозволяє звертатися по будь-якому рядку
// }

// const locales: Record<"ua" | "en", Locale> = { ua, en };

// export function t(lang: "ua" | "en", key: string, vars?: Record<string, any>) {
//   let text = locales[lang][key] || key;
//   if (vars) {
//     for (const [k, v] of Object.entries(vars)) {
//       text = text.replace(`{{${k}}}`, String(v));
//     }
//   }
//   return text;
// }
