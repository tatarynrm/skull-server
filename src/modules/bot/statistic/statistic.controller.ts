import { Request, Response } from "express";
import { pool } from "../../../db/pool";
import { botStatisticService } from "./statistic.service";

class BotStatisticController {
  async getLikesStatsByAge(req: Request, res: Response) {
    const { user_id } = req.body;

    const result = await botStatisticService.getLikesStatsByAge(user_id);

    console.log(result, "result");
    res.status(200).json(result);
  }
}
export const botStatisticController = new BotStatisticController();
