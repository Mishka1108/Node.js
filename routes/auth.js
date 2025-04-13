const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

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

    await sendEmail(email, 'Verify your email', `Please verify your email by clicking this link: ${verificationLink}`);

    res.status(201).json({ message: 'Registration successful! Please verify your email.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Email verification endpoint
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isVerified) return res.status(200).json({ message: 'Email already verified' });

    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully!' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your email before logging in' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      token,
      user: {
        firstName: user.firstName || user.name.split(' ')[0],
        lastName: user.lastName || user.name.split(' ')[1] || '',
        age: user.age || 0,
        email: user.email,
        emailVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
// Get all users with unverified emails
router.get('/unverified-users', async (req, res) => {
  try {
    const unverifiedUsers = await User.find({ isVerified: false });
    res.status(200).json({
      count: unverifiedUsers.length,
      users: unverifiedUsers.map(user => ({
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});
// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password'); // პაროლის გარეშე
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get verified users
router.get('/users/verified', async (req, res) => {
  try {
    const verifiedUsers = await User.find({ isVerified: true }).select('-password');
    res.status(200).json(verifiedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch verified users' });
  }
});

// Get unverified users
router.get('/users/unverified', async (req, res) => {
  try {
    const unverifiedUsers = await User.find({ isVerified: false });
    res.status(200).json(unverifiedUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch unverified users' });
  }
});

// Delete user by ID
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});
