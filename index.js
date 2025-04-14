const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin'); 
const seedAdmin = require('./utils/adminSeeder');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('🚀 Backend is running successfully!');
});

// CORS configuration
app.use(cors({
  origin: ['https://visionary-buttercream-955c10.netlify.app', 'http://localhost:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB connected');
  // Seed admin on app startup
  await seedAdmin();
})
.catch((err) => console.error('❌ MongoDB error:', err.message));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});