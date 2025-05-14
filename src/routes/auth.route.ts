import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller'; 

const router = Router();
const authController = new AuthController();

router.post('/telegram', authController.loginWithTelegram);

router.post('/logout', authController.logout);




router.post('/me', authController.getMe);
router.post('/profile', authController.getProfile);
router.get('/logout', authController.logout);
export default router;
