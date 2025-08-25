import { tgLikeService } from "../services/like.service";

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startLikesScheduler() {
  // Функція для рекурсивного запуску
  async function runScheduler() {
    try {
      // Запускаємо обробку нових лайків
      await tgLikeService.notifyUsersAboutNewLikesBatch(10000);
    } catch (err) {
      console.error("Помилка при розсилці нових лайків:", err);
    }

    // Наступний запуск через 40 секунд після завершення поточного
    setTimeout(runScheduler, 40000);
  }

  // Запускаємо перший раз
  await runScheduler();
}

// Запуск
startLikesScheduler();
