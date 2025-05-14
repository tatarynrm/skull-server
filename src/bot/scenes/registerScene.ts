import { Scenes, Markup } from "telegraf";
import { MyContext } from "../types/scenesTypes";
import axios from "axios";
import { InputMediaPhoto } from "telegraf/typings/core/types/typegram";
import { pool } from "../../db/pool";
import { MainKeyboard } from "../keyboards/main_keyboard";

const getFileLink = async (ctx: any, fileId: string) => {
  try {
    const file = await ctx.telegram.getFile(fileId);
    const filePath = file.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
    return fileUrl;
  } catch (error) {
    console.error("Error fetching file link:", error);
    return null;
  }
};

// Функція для геокодування міста за його назвою
const geocodeByCityName = async (city: string) => {
  const baseUrl =
    "https://maps.googleapis.com/maps/api/geocode/json?language=uk";
  const params = {
    address: city, // Тепер передаємо назву міста замість lat/lng
    key: process.env.GOOGLE_API_KEY, // Переконайтесь, що ключ API збережено в змінних середовища
  };
  try {
    const response = await axios.get(baseUrl, { params });
    if (response.status === 200) {
      const result = response.data;
      if (result.results.length > 0) {
        const address = result.results[0];
        return address;
      } else {
        return "Місто не знайдено.";
      }
    } else {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error(error);
    return "Помилка при виконанні запиту.";
  }
};

const registerScene = new Scenes.WizardScene<MyContext>(
  "register-wizard",
  async (ctx) => {
    await ctx.reply("Привіт! Як тебе звати?", {
      reply_markup: {
        remove_keyboard: true,
      },
    });
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      ctx.scene.session.registrationData =
        ctx.scene.session.registrationData || {};
      ctx.scene.session.registrationData.name = ctx.message.text;
      await ctx.reply("Скільки тобі років?");
      return ctx.wizard.next();
    }
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const age = parseInt(ctx.message.text);
      if (isNaN(age)) {
        return ctx.reply("Введи, будь ласка, коректний вік.");
      }
      if (age < 14) {
        await ctx.reply(
          "Ти занадто малий для реєстрації. Будь ласка, введи коректний вік."
        );
        return;
      }
      if (age > 80) {
        await ctx.reply(
          "Будь ласка, вкажіть коректний вік, оскільки це занадто великий вік для реєстрації."
        );
        return;
      }

      ctx.scene.session.registrationData.age = age;
      await ctx.reply("Хто ти? Ти хлопець чи дівчина?", {
        reply_markup: {
          keyboard: [[{ text: "Хлопець" }, { text: "Дівчина" }]],
          resize_keyboard: true,
        },
      });
      return ctx.wizard.next();
    }
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const sex = ctx.message.text;
      ctx.scene.session.registrationData.sex = sex;

      await ctx.reply("Вкажи назву свого міста | селища | смт", {
        reply_markup: { remove_keyboard: true },
      });

      return ctx.wizard.next();
    }
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const city = ctx.message.text;
      ctx.scene.session.registrationData.city = city;

      const geocodedAddress = await geocodeByCityName(city);

      if (
        geocodedAddress === "Місто не знайдено." ||
        geocodedAddress === "Помилка при виконанні запиту."
      ) {
        await ctx.reply("Місто не знайдено. Спробуй ще раз!");
        return;
      }

      ctx.scene.session.registrationData.city =
        geocodedAddress?.address_components[0].long_name;
      ctx.scene.session.registrationData.latitude =
        geocodedAddress?.geometry.location.lat;
      ctx.scene.session.registrationData.longitude =
        geocodedAddress?.geometry.location.lng;

      await ctx.reply("Кого шукаєш? Вибери відповідний варіант:", {
        reply_markup: {
          keyboard: [[{ text: "Хлопців" }, { text: "Дівчат" }]],
          resize_keyboard: true,
        },
      });
      return ctx.wizard.next();
    }
  },

  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const lookingFor = ctx.message.text;
      ctx.scene.session.registrationData.lookingFor = lookingFor;

      await ctx.reply(
        "Тепер надішли фото, яке ти хочеш додати до свого профілю (максимум 1).\nЧому 1 ?\nТому що в сучасному світі достатньо одного фото щоб закохатись.\nОпис своєї особистості - набагато важливіший"
      );
      return ctx.wizard.next();
    }
  },

  async (ctx) => {
    if (ctx.message && "photo" in ctx.message) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      ctx.scene.session.registrationData.photos =
        ctx.scene.session.registrationData.photos || [];
      const link = await getFileLink(ctx, fileId);

      if (link) {
        ctx.scene.session.registrationData.photos.push({ url: link });
      }

      const photoCount = ctx.scene.session.registrationData.photos.length;



      // Якщо користувач додав 1 фото
      if (photoCount >= 1) {
        const data = ctx.scene.session.registrationData;
        ctx.scene.session.registrationData.user_id = ctx.message.from.id;

        const profileText = `Твоя анкета:\n\nІм'я: ${data.name}\nВік: ${data.age}\nСтать: ${data.sex}\nМісто: ${data.city}\nШукає: ${data.lookingFor}`;

        await ctx.replyWithPhoto(
          { url: ctx.scene.session.registrationData.photos[0].url },
          {
            caption: profileText,
            reply_markup: {
              keyboard: [
                [{ text: "⚙ Налаштування" }],
                [{ text: "🌟 Premium" }, { text: "💌 Мої вподобайки" }],
                [{ text: "👨‍👩‍👧‍👦 Мої реферали" }, { text: "Залишок ❤️" }],
                [{ text: "⬅️ Назад" }],
              ],
            },
          }
        );

        await ctx.reply("Що хочеш зробити далі?", {
          reply_markup: {
            keyboard: [
              [
                { text: "Перезаповнити анкету" },
                { text: "Перейти до знайомств" },
              ],
            ],
            resize_keyboard: true,
          },
        });

        return ctx.wizard.next();
      }
    }

    if (ctx.message && "text" in ctx.message) {
      await ctx.reply("Будь ласка, надішли фото.");
      return;
    }
  },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const action = ctx.message.text;
      const resultObject = ctx.scene.session.registrationData;

      if (action === "Це все, йдемо далі") {
        // Якщо користувач натиснув кнопку "Це все, йдемо далі"
        await ctx.reply("Перехід до наступної сцени...");
        return ctx.wizard.next(); // Переходить до наступного кроку сцени
      }

      if (action === "Перезаповнити анкету") {
        // Скидаємо дані і починаємо знову
        ctx.scene.session.registrationData = {};
        await ctx.reply("Давай почнемо знову!");
        await ctx.reply("Привіт! Як тебе звати?");
        return ctx.wizard.selectStep(1);
      }

      if (action === "Перейти до знайомств") {
        const result = await pool.query(
          `
  INSERT INTO users_profiles (user_id, name, age, sex, city, latitude, longitude, looking_for, photos)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (user_id)
  DO UPDATE SET
    name = EXCLUDED.name,
    age = EXCLUDED.age,
    sex = EXCLUDED.sex,
    city = EXCLUDED.city,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    looking_for = EXCLUDED.looking_for,
    photos = EXCLUDED.photos
  RETURNING *;
  `,
          [
            resultObject.user_id,
            resultObject.name,
            resultObject.age,
            resultObject.sex,
            resultObject.city,
            resultObject.latitude,
            resultObject.longitude,
            resultObject.lookingFor,
            resultObject.photos && resultObject.photos.length > 0
              ? resultObject.photos[0]?.url
              : null, // Перевірка на наявність фото
          ]
        );

        // Тут можете додати логіку для переходу до знайомств
        await ctx.reply("Ти в головному меню", {
          reply_markup: MainKeyboard
        });
        return ctx.scene.leave();
      }
    }
  }
);

export default registerScene;
