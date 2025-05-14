"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geocodeByCityName = void 0;
const axios_1 = __importDefault(require("axios"));
// Функція для геокодування міста за його назвою
const geocodeByCityName = async (city) => {
    const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json?language=uk';
    const params = {
        address: city, // Тепер передаємо назву міста замість lat/lng
        key: process.env.GOOGLE_API_KEY, // Переконайтесь, що ключ API збережено в змінних середовища
    };
    try {
        const response = await axios_1.default.get(baseUrl, { params });
        if (response.status === 200) {
            const result = response.data;
            if (result.results.length > 0) {
                const address = result.results[0];
                return address;
            }
            else {
                return 'Місто не знайдено.';
            }
        }
        else {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
    }
    catch (error) {
        console.error(error);
        return 'Помилка при виконанні запиту.';
    }
};
exports.geocodeByCityName = geocodeByCityName;
