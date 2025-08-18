import { scheduleDeleteOldLikes } from "./likes.cron";

export const startAllCronJobs = async () => {
  // Видалення усіх лайків за минулий день в 00:05 ночі кожного дня
  scheduleDeleteOldLikes();
};
