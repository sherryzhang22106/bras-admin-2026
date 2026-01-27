import { Router } from 'express';
import { AssessmentController } from '../controllers/assessmentController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/submit', AssessmentController.submit); // 公开接口，接收测评数据
router.get('/list', authenticate, AssessmentController.list);
router.get('/stats', authenticate, AssessmentController.stats);
router.get('/:id', authenticate, AssessmentController.getById);

export default router;
