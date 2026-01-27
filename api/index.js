// Vercel Serverless Function Entry Point
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BrasController } from '../server/dist/controllers/brasController.js';
import { AuthController } from '../server/dist/controllers/authController.js';
import { AssessmentController } from '../server/dist/controllers/assessmentController.js';
import { AccessCodeController } from '../server/dist/controllers/accessCodeController.js';
import { auth } from '../server/dist/middleware/auth.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'BRAS Admin API',
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// BRAS 分手挽回测评 API (公开)
app.post('/api/bras/verify-access-code', BrasController.verifyAccessCode);
app.post('/api/bras/generate-report', BrasController.generateReport);
app.post('/api/bras/save-assessment', BrasController.saveAssessment);
app.get('/api/bras/assessment-history/:sessionId', BrasController.getAssessmentHistory);

// Auth routes
app.post('/api/auth/login', AuthController.login);
app.get('/api/auth/me', auth, AuthController.me);

// Assessment routes (需要认证)
app.post('/api/assessments/submit', AssessmentController.submit);
app.get('/api/assessments/list', auth, AssessmentController.list);
app.get('/api/assessments/:id', auth, AssessmentController.getById);
app.get('/api/assessments/stats', auth, AssessmentController.stats);

// Access code routes (需要认证)
app.post('/api/access-codes/generate', auth, AccessCodeController.generate);
app.get('/api/access-codes/list', auth, AccessCodeController.list);
app.get('/api/access-codes/export/:batchId', auth, AccessCodeController.exportBatch);

export default app;
