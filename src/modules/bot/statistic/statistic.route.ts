import { Router } from 'express';
import { botStatisticController } from './statistic.controller';


const router = Router();




// router.post('/logout', authController.logout);




router.post('/age', botStatisticController.getLikesStatsByAge);

export default router;
