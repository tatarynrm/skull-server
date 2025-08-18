import { pool } from "../../../db/pool";
import { IStatisticDto } from "./dto/statistic.dto";

export class BotStatisticService {
  public async getLikesStatsByAge(user_id: number) {
    console.log(user_id);

    const { rows } = await pool.query(
      `select * from tg_user_age_stats where user_id = $1`,
      [user_id]
    );

   


    return rows;
  }
}

export const botStatisticService = new BotStatisticService();
