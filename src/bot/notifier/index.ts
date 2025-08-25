import { pool } from "../../db/pool";
import bot from "../bot";
import { LikesNotifier } from "./likes.notifier";

const notifier = new LikesNotifier();

export const startNotifier = () => {
  // запускаємо цикл
  setInterval(() => {
    notifier.notifyUsersAboutNewLikesBatch().catch(console.error);
  }, 20000);
};
