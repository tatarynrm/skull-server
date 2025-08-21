import cron from "node-cron";
import { pool } from "../../db/pool";
import { tgLikeService } from "../services/like.service";

export function LikesSchedule() {


  tgLikeService.start(5000)


 
}
