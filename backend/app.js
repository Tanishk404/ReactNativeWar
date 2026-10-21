
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from './lib/db.js';
import contactsRouter from './routes/contacts.js';
import mediaRouter from './routes/media.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/contacts', contactsRouter);
app.use('/api/media', mediaRouter);

const PORT = Number(process.env.PORT) || 8000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on port ${PORT}`);
});
