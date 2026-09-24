const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Department = require('../models/Department');
const requireAuth = require('../middleware/auth');
const { sendEmail } = require('../utils/sendEmail');

const router = express.Router();

function signToken(user){
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try{
    const { name, email, password, department } = req.body;
    if(!name || !email || !password || !department){
      return res.status(400).json({ message: 'Name, email, password and department are required' });
    }

    const deptExists = await Department.findOne({ name: department });
    if(!deptExists) return res.status(400).json({ message: 'Select a valid department' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if(existing) return res.status(409).json({ message: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, department });

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, department: user.department } });
  }catch(err){
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try{
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if(!user) return res.status(401).json({ message: 'Invalid email or password' });

    if(user.lockedUntil && user.lockedUntil > new Date()){
      return res.status(423).json({ message: 'Account locked due to too many failed attempts. Try again later.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok){
      user.failedLoginAttempts += 1;
      if(user.failedLoginAttempts >= 10){
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, department: user.department } });
  }catch(err){
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// GET /api/auth/me  -> current logged-in user's profile (id, name, email, department)
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('name email department');
  if(!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// POST /api/auth/forgot-password  -> emails a 6-digit OTP
router.post('/forgot-password', async (req, res) => {
  try{
    const { email } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    // Always respond success-shaped to avoid leaking which emails exist
    if(!user) return res.json({ message: 'If this email is registered, an OTP has been sent.' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    try{
      await sendEmail({
        to: user.email,
        subject: 'Your Production BoM Check password reset OTP',
        text: `Your OTP is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`
      });
    }catch(emailErr){
      // Email not configured/working yet (e.g. Brevo sender not verified) —
      // don't block local testing. Log the OTP to the server console instead.
      console.warn('Could not send OTP email, printing to console instead:', emailErr.message);
      console.log(`\n=== OTP for ${user.email}: ${otp} (valid 10 minutes) ===\n`);
    }

    res.json({ message: 'If this email is registered, an OTP has been sent.' });
  }catch(err){
    res.status(500).json({ message: 'Could not process request', error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try{
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if(!user || !user.otp || user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()){
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpires = null;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  }catch(err){
    res.status(500).json({ message: 'Could not reset password', error: err.message });
  }
});

module.exports = router;