import { Scenes } from "telegraf";
import axios from "axios";
import { getMainKeyboard } from "../keyboards/main.keyboard";
import { MyContext } from "../types/bot-context";
import { t } from "../lib/i18n";
import {
  getBeforeRegisterKeyboard,
  getChooseMaleKeyboard,
  getMaleKeyboard,
} from "../keyboards";
import { getSexFromText } from "../helpers/sex-chose";
import { getLookingForFromText } from "../helpers/looking-for-choose";
import { getAfterRegisterKeyboard } from "../keyboards/after-register.keyboard";
import { sendProgressMessage } from "../helpers/progress-indicator";
import { BotScenes } from "./types";
import { uploadPhotoToCloudinary } from "../lib/cloudinary";
import { tgProfileService } from "../services/profile.service";

const getFileLink = async (ctx: any, fileId: string) => {
  try {
    const file = await ctx.telegram.getFile(fileId);
    const filePath = file.file_path;
    return `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${filePath}`;
  } catch (error) {
    console.error("Error fetching file link:", error);
    return null;
  }
};

const geocodeByCityName = async (city: string) => {
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      { params: { address: city, key: process.env.GOOGLE_API_KEY } }
    );
    if (response.status === 200 && response.data.results.length > 0) {
      return response.data.results[0];
    }
    return "Incorect city";
  } catch (error) {
    console.error(error);
    return "Помилка при виконанні запиту.";
  }
};
async function geocodeByCoords(lat: number, lng: number) {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_API_KEY}`
  );
  const data = await res.json();

  if (!data.results || !data.results[0]) return null;

  const components = data.results[0].address_components;

  // шукаємо населений пункт
  const cityComponent =
    components.find((c: { types: string | string[] }) =>
      c.types.includes("locality")
    ) || // місто
    components.find((c: { types: string | string[] }) =>
      c.types.includes("administrative_area_level_3")
    ) || // смт/село
    components.find((c: { types: string | string[] }) =>
      c.types.includes("administrative_area_level_2")
    ) || // fallback
    components.find((c: { types: string | string[] }) =>
      c.types.includes("postal_town")
    ); // UK, інші країни

  const city = cityComponent ? cityComponent.long_name : null;

  return {
    city,
    raw: data.results[0],
    latitude: lat,
    longitude: lng,
  };
}
const registerScene = new Scenes.WizardScene<MyContext>(
  BotScenes.REGISTER_SCENE,

  // Крок 1: ім'я
  async (ctx) => {
    await ctx.reply(t(ctx.lang, "whats_your_name"), {
      reply_markup: { remove_keyboard: true },
    });
    return ctx.wizard.next();
  },

  // Крок 2: обробка імені
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const name = ctx.message.text;
      if (name.length > 20) {
        await ctx.reply(t(ctx.lang, "name_too_long"));
        return;
      }
      ctx.scene.session.registrationData =
        ctx.scene.session.registrationData || {};
      ctx.scene.session.registrationData.name = name;

      await ctx.reply(t(ctx.lang, "how_old"));
      return ctx.wizard.next();
    }
  },

  // Крок 3: обробка віку
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const age = parseInt(ctx.message.text);
      if (isNaN(age)) {
        await ctx.reply(t(ctx.lang, "incorect_age"));
        return;
      }
      if (age < 14) {
        await ctx.reply(t(ctx.lang, "age_lower_14"));
        return;
      }
      if (age > 90) {
        await ctx.reply(t(ctx.lang, "age_more_90"));
        return;
      }

      ctx.scene.session.registrationData.age = age;
      await ctx.reply(t(ctx.lang, "your_sex"), {
        reply_markup: getMaleKeyboard(ctx),
      });
      return ctx.wizard.next();
    }
  },

  // Крок 4: обробка статі
  // async (ctx) => {
  //   if (ctx.message && "text" in ctx.message) {
  //     const sex = getSexFromText(ctx.message.text, ctx.lang || "en");
  //     if (sex) {
  //       ctx.scene.session.registrationData.sex = Number(sex);
  //       await ctx.reply(t(ctx.lang, "your_city"), {
  //         reply_markup: { remove_keyboard: true },
  //       });
  //       return ctx.wizard.next();
  //     } else {
  //       await ctx.reply(t(ctx.lang, "unknown_answer"));
  //     }
  //   }
  // },

  // Крок 5: обробка міста
  // async (ctx) => {
  //   if (ctx.message && "text" in ctx.message) {
  //     const city = ctx.message.text;
  //     const geocoded = await geocodeByCityName(city);
  //     if (
  //       geocoded === "Incorect city"
  //     ) {
  //       await ctx.reply(t(ctx.lang, "incorect_city"));
  //       return;
  //     }
  //     ctx.scene.session.registrationData.city =
  //       geocoded.address_components[0].long_name;
  //     ctx.scene.session.registrationData.latitude =
  //       geocoded.geometry.location.lat;
  //     ctx.scene.session.registrationData.longitude =
  //       geocoded.geometry.location.lng;

  //     await ctx.reply(`📍 ${ctx.scene.session.registrationData.city}`);
  //     await ctx.reply(t(ctx.lang, "looking_for"), {
  //       reply_markup: getChooseMaleKeyboard(ctx),
  //     });
  //     return ctx.wizard.next();
  //   }
  // },
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const sex = getSexFromText(ctx.message.text, ctx.lang || "en");
      if (sex) {
        ctx.scene.session.registrationData.sex = Number(sex);

        await ctx.reply(t(ctx.lang, "your_city"), {
          reply_markup: {
            keyboard: [
              [
                {
                  text: t(ctx.lang, "request_location_button"),
                  request_location: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });

        return ctx.wizard.next();
      } else {
        await ctx.reply(t(ctx.lang, "unknown_answer"));
      }
    }
  },
  async (ctx) => {
    // Якщо користувач поділився геолокацією
    if (ctx.message && "location" in ctx.message) {
      const { latitude, longitude } = ctx.message.location;
      const geocoded = await geocodeByCoords(latitude, longitude); // функція для геокодування координат

      if (!geocoded) {
        await ctx.reply(t(ctx.lang, "incorect_city"));
        return;
      }

      ctx.scene.session.registrationData.city = geocoded.city;
      ctx.scene.session.registrationData.latitude = latitude;
      ctx.scene.session.registrationData.longitude = longitude;

      await ctx.reply(`📍 ${ctx.scene.session.registrationData.city}`, {
        reply_markup: { remove_keyboard: true },
      });

      await ctx.reply(t(ctx.lang, "looking_for"), {
        reply_markup: getChooseMaleKeyboard(ctx),
      });
      return ctx.wizard.next();
    }

    // Якщо користувач ввів місто текстом
    if (ctx.message && "text" in ctx.message) {
      const city = ctx.message.text;
      const geocoded = await geocodeByCityName(city);

      if (!geocoded || geocoded === "Incorect city") {
        await ctx.reply(t(ctx.lang, "incorect_city"));
        return;
      }

      ctx.scene.session.registrationData.city =
        geocoded.address_components[0].long_name;
      ctx.scene.session.registrationData.latitude =
        geocoded.geometry.location.lat;
      ctx.scene.session.registrationData.longitude =
        geocoded.geometry.location.lng;

      await ctx.reply(`📍 ${ctx.scene.session.registrationData.city}`, {
        reply_markup: { remove_keyboard: true },
      });

      await ctx.reply(t(ctx.lang, "looking_for"), {
        reply_markup: getChooseMaleKeyboard(ctx),
      });
      return ctx.wizard.next();
    }
  },

  // Крок 6: кого шукає
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const lookingFor = getLookingForFromText(ctx.message.text, ctx.lang);
      ctx.scene.session.registrationData.lookingFor = Number(lookingFor);

      await ctx.reply(t(ctx.lang, "min_age_for_partner"), {
        reply_markup: { remove_keyboard: true },
      });
      return ctx.wizard.next();
    }
  },

  // Крок 7: мінімальний вік партнера
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const minAge = parseInt(ctx.message.text);
      if (isNaN(minAge)) {
        await ctx.reply(t(ctx.lang, "incorrect_min_age"));
        return;
      }
      if (ctx.scene.session.registrationData.age! >= 18 && minAge < 16) {
        await ctx.reply(
          t(ctx.lang, "age_mismatch", {
            your_age: ctx.scene.session.registrationData.age!,
          })
        );
        return;
      }
      ctx.scene.session.registrationData.minAge = minAge;
      await ctx.reply(t(ctx.lang, "max_age_for_partner"));
      return ctx.wizard.next();
    }
  },

  // Крок 8: максимальний вік партнера
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const maxAge = parseInt(ctx.message.text);
      if (isNaN(maxAge)) {
        await ctx.reply(t(ctx.lang, "incorrect_max_age"));
        return;
      }

      if (ctx.scene.session.registrationData.minAge! >= maxAge) {
        await ctx.reply(
          t(ctx.lang, "age_mismatch_max_lower_min", {
            your_age: ctx.scene.session.registrationData.age!,
          })
        );
        return;
      }
      ctx.scene.session.registrationData.maxAge = maxAge;

      await ctx.reply(t(ctx.lang, "profile_description_add_text"), {
        reply_markup: { remove_keyboard: true },
      });
      return ctx.wizard.next();
    }
  },

  // Крок 9: опис профілю
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text;

      if (text.length > 600) {
        await ctx.reply("Занадто великий опис, максимум 600 символів");
        return;
      }
      ctx.scene.session.registrationData.description = ctx.message.text;

      await ctx.reply(t(ctx.lang, "send_photo"), {
        reply_markup: { remove_keyboard: true },
      });
      return ctx.wizard.next();
    }
  },

  // Крок 10: додавання фото
  // Крок 10: додавання фото
  async (ctx) => {
    ctx.scene.session.registrationData.photos =
      ctx.scene.session.registrationData.photos || [];

    if (ctx.message && "photo" in ctx.message) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      const fileLink = await getFileLink(ctx, fileId);
      if (!fileLink) return await ctx.reply(t(ctx.lang, "photo_upload_error"));

      const uploadedUrl = await uploadPhotoToCloudinary(
        fileLink,
        ctx.message.from.id
      );
      if (!uploadedUrl)
        return await ctx.reply(t(ctx.lang, "photo_upload_error"));

      ctx.scene.session.registrationData.photos.push({ url: uploadedUrl });
      const photoCount = ctx.scene.session.registrationData.photos.length;

      if (photoCount < 3) {
        await ctx.reply(
          t(ctx.lang, "want_add_another_photo", { count: photoCount }),
          {
            reply_markup: {
              keyboard: [[t(ctx.lang, "yes_word"), t(ctx.lang, "no_word")]],
              one_time_keyboard: true,
              resize_keyboard: true,
            },
          }
        );
        return ctx.wizard.selectStep(10); // переходимо на крок 11, де вибір “yes/no”
      }

      // 3 фото — йдемо до завершення реєстрації
      await ctx.reply(t(ctx.lang, "photos_uploaded_max"), {
        reply_markup: getAfterRegisterKeyboard(ctx),
      });

      ctx.wizard.selectStep(11); // одразу на крок завершення
      return;
    } else {
      await ctx.reply(t(ctx.lang, "need_photo"));
      return; // залишаємо користувача в цьому ж кроці
    }
  },

  // Крок 11: вибір “Додати ще фото чи завершити”
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text.toLowerCase();

      if (text === t(ctx.lang, "yes_word").toLowerCase()) {
        await ctx.reply(t(ctx.lang, "send_photo_again"), {
          reply_markup: { remove_keyboard: true },
        });
        return ctx.wizard.back(); // повертаємось на крок 10
      }

      if (text === t(ctx.lang, "no_word").toLowerCase()) {
      // тут додати показ анкети

      await tgProfileService.sendProfilePhotosPreRegisterShow(ctx)
        await ctx.reply(t(ctx.lang, "final_step"), {
          reply_markup: getAfterRegisterKeyboard(ctx),
        });
        return ctx.wizard.next(); // переходимо на крок 12
      }

      await ctx.reply(t(ctx.lang, "unknown_answer"));
    }
  },

  // Крок 12: Завершення реєстрації
  async (ctx) => {
    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text;
    

      if (text === t(ctx.lang, "keyboard_go_to_dating")) {
        // Якщо користувач вибирає перейти до знайомств
        const data = ctx.scene.session.registrationData;
        if (!data) {
          await ctx.reply("Registration data is missing. Please start again.");
          await ctx.reply(t(ctx.lang, "whats_your_name"), {
            reply_markup: { remove_keyboard: true },
          });
          return ctx.scene.reenter();
        } else {
          try {
            // Тепер зберігаємо дані в базу
            const newUserProfile = await tgProfileService.saveUserProfile({
              user_id: ctx.message.from.id!,
              name: data.name ?? "",
              age: data.age ?? 0,
              sex: data.sex ?? 0,
              city: data.city ?? "",
              latitude: data.latitude ?? 0,
              longitude: data.longitude ?? 0,
              lookingFor: data.lookingFor ?? 0,
              minAge: data.minAge ?? 0,
              maxAge: data.maxAge ?? 0,
              description: data.description ?? "", 
              photos: Array.isArray(data.photos)
                ? data.photos.map((p) => p.url)
                : [],
            });
            await sendProgressMessage(
              ctx,
              "system_indicator_start_create_profile",
              "system_indicator_end_create_profile"
            );
            // Перехід до знайомств
            await ctx.reply(t(ctx.lang, "welcome_new_profile"), {
              reply_markup: getMainKeyboard(ctx),
            });

            const createdProfileUserId = Number(newUserProfile.user_id);
            const profileToShow =
              await tgProfileService.getProfileByUserId(createdProfileUserId);
            await tgProfileService.sendProfilePhotos(ctx, profileToShow);

            return ctx.scene.leave(); // завершення сцени, користувач переходить до знайомств
          } catch (err) {
            console.error("Error saving user profile:", err);
            await ctx.reply("Something went wrong. Please try again.");
            await ctx.reply(t(ctx.lang, "whats_your_name"), {
              reply_markup: { remove_keyboard: true },
            });
            return ctx.scene.reenter();
          }
        }
      }
      if (text === t(ctx.lang, "keyboard_refil_questionnaire")) {
        ctx.scene.reenter();
      } else {
        await ctx.reply(t(ctx.lang, "unknown_answer"));
      }
    }
  }
);

registerScene.use(async (ctx: MyContext, next) => {
  if (ctx.message && "text" in ctx.message) {
    const text = ctx.message.text;
    if (
      text.startsWith("/profile") ||
      text.startsWith("/help") ||
      text.startsWith("/start")
    ) {
      const checkProfileExist = await tgProfileService.getProfileByUserId(
        ctx.message.from.id
      );

      const msgToDelete = await ctx.reply(
        t(ctx.lang, checkProfileExist ? "main_menu" : "system_next_steps"),
        {
          reply_markup: checkProfileExist
            ? getMainKeyboard(ctx)
            : getBeforeRegisterKeyboard(ctx),
        }
      );
      await ctx.scene.leave(); // виходимо зі сцени
      return; // не виконуємо подальші кроки сцени
    }
  }
  return next(); // продовжуємо звичайну обробку сцени
});
export default registerScene;
