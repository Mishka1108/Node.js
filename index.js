const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); // Import the CORS middleware
const authRoutes = require('./routes/auth');

dotenv.config();

const app = express();

// Configure CORS - this must be before other middleware and routes
app.use(cors({
  origin: 'http://localhost:4200', // Your Angular app's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Use your routes
app.use('/api', authRoutes);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running at http://localhost:${process.env.PORT}`);
  });
})
.catch((err) => console.error('❌ MongoDB error:', err.message));