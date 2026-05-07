import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import stokvelRoutes from './routes/stokvels';
import memberRoutes from './routes/members';
import contributionRoutes from './routes/contributions';
import payoutRoutes from './routes/payouts';
import fineRoutes from './routes/fines';
import meetingRoutes from './routes/meetings';
import reminderRoutes from './routes/reminders';
import reportRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import { authenticate } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);

// Protected routes
app.use('/api/stokvels', stokvelRoutes);
app.use('/api/stokvels/:stokvelId/members', authenticate, memberRoutes);
app.use('/api/stokvels/:stokvelId/contributions', authenticate, contributionRoutes);
app.use('/api/stokvels/:stokvelId/payouts', authenticate, payoutRoutes);
app.use('/api/stokvels/:stokvelId/fines', authenticate, fineRoutes);
app.use('/api/stokvels/:stokvelId/meetings', authenticate, meetingRoutes);
app.use('/api/stokvels/:stokvelId/reminders', authenticate, reminderRoutes);
app.use('/api/stokvels/:stokvelId/reports', authenticate, reportRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Stokvel API running on http://localhost:${PORT}`);
});

export default app;
