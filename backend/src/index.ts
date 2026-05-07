import express from 'express';
import cors from 'cors';
import stokvelRoutes from './routes/stokvels';
import memberRoutes from './routes/members';
import contributionRoutes from './routes/contributions';
import meetingRoutes from './routes/meetings';
import reminderRoutes from './routes/reminders';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/stokvels', stokvelRoutes);
app.use('/api/stokvels/:stokvelId/members', memberRoutes);
app.use('/api/stokvels/:stokvelId/contributions', contributionRoutes);
app.use('/api/stokvels/:stokvelId/meetings', meetingRoutes);
app.use('/api/stokvels/:stokvelId/reminders', reminderRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Stokvel API running on http://localhost:${PORT}`);
});

export default app;
