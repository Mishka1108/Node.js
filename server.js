import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();
const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);


mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

  app.get('/', (req, res) => {
    res.send('🚀 Backend is working perfectly!');
  });
  