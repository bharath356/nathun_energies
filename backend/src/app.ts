import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import callRoutes from './routes/calls';
import followUpRoutes from './routes/followUps';
import phoneNumberRoutes from './routes/phoneNumbers';
import userRoutes from './routes/users';
import clientRoutes from './routes/clients';
import clientStepsRoutes from './routes/clientSteps';
import step1Routes from './routes/step1';
import step2Routes from './routes/step2';
import step3Routes from './routes/step3';
import step4Routes from './routes/step4';
import step5Routes from './routes/step5';
import expensesRoutes from './routes/expenses';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'call-management-backend'
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/phone-numbers', phoneNumberRoutes);
app.use('/calls', callRoutes);
app.use('/follow-ups', followUpRoutes);
app.use('/clients', clientRoutes);
app.use('/client-steps', clientStepsRoutes);
app.use('/client-sub-steps', clientStepsRoutes);
app.use('/step1', step1Routes);
app.use('/step2', step2Routes);
app.use('/step3', step3Routes);
app.use('/step4', step4Routes);
app.use('/step5', step5Routes);
app.use('/clients', expensesRoutes);

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

export default app;
