// // src/middlewares/i18n.middleware.ts
// import { Telegraf } from 'telegraf';
// import i18next from '../i18n';

// export const i18nMiddleware = (bot: Telegraf<any>) => {
//   bot.use(async (ctx, next) => {
//     const userLang = ctx.from?.language_code || 'ua';
//     ctx.i18n = (key: string, vars?: Record<string, any>) =>
//       i18next.t(key, { lng: userLang, ...vars });
//     await next();
//   });
// };
