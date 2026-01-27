import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import assessmentRoutes from './routes/assessments';
import accessCodeRoutes from './routes/accessCodes';
import brasRoutes from './routes/bras.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// 添加健康检查端点
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'BRAS Admin API is running',
    timestamp: new Date().toISOString() 
  });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/access-codes', accessCodeRoutes);
app.use('/api/bras', brasRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n✅ BRAS 管理后台后端运行在 http://localhost:${PORT}`);
  console.log(`📊 API 端点:`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - POST /api/assessments/submit (公开)`);
  console.log(`   - GET  /api/assessments/list`);
  console.log(`   - GET  /api/assessments/stats`);
  console.log(`   - POST /api/access-codes/generate`);
  console.log(`   - GET  /api/access-codes/list\n`);
});
