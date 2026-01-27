import { Router } from 'express';
import { AccessCodeController } from '../controllers/accessCodeController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/verify', AccessCodeController.verify); // 公开接口
router.post('/generate', authenticate, AccessCodeController.generate);
router.get('/list', authenticate, AccessCodeController.list);
router.get('/stats', authenticate, AccessCodeController.stats);
router.get('/export', authenticate, AccessCodeController.export); // 导出所有
router.get('/export/:batchId', authenticate, AccessCodeController.exportBatch); // 导出指定批次

export default router;
