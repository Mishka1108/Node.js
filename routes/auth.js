const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail'); // Fixed import path
const auth = require('../middleware/auth');

// Get user profile endpoint
router.get('/me', auth, async (req, res) => {
  try {
    res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        isVerified: req.user.isVerified
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  const { firstName, lastName, age, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email is already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ 
      name: `${firstName} ${lastName}`, 
      firstName,
      lastName,
      age,
      email, 
      password: hashedPassword 
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.EMAIL_SECRET, { expiresIn: '1d' });

    const verificationLink = `${process.env.CLIENT_URL}/verify-email/${token}`;

    // Check email sending result
    const emailSent = await sendEmail(
      email, 
      'ელ-ფოსტის ვერიფიკაცია', 
      `გთხოვთ, დაადასტუროთ თქვენი ელ-ფოსტა შემდეგ ბმულზე დაჭერით: ${verificationLink}`
    );

    if (!emailSent) {
      // Email sending failed, but user was created
      console.log('⚠️ Email sending failed for user:', email);
      return res.status(201).json({ 
        message: 'Registration successful, but verification email could not be sent. Please contact support.',
        user: { email: newUser.email }
      });
    }

    res.status(201).json({ message: 'Registration successful! Please verify your email.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;