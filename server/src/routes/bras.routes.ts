import { Router } from 'express';
import { BrasController } from '../controllers/brasController';

const router = Router();

// BRAS 分手挽回测评 API
router.post('/verify-access-code', BrasController.verifyAccessCode);
router.post('/generate-report', BrasController.generateReport);
router.post('/save-assessment', BrasController.saveAssessment);
router.get('/assessment-history/:sessionId', BrasController.getAssessmentHistory);

export default router;
