const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const Teacher = mongoose.model('Teacher', new mongoose.Schema({
  name: String, email: { type: String, unique: true }, passwordHash: String
}));

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// dev-only register (you can remove in production)
router.post('/register', async (req,res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await Teacher.findOne({ email });
    if (existing) return res.status(400).json({ msg: 'Teacher exists' });
    const hash = await bcrypt.hash(password, 10);
    const t = new Teacher({ name, email, passwordHash: hash });
    await t.save();
    res.json({ msg: 'ok', id: t._id });
  } catch(err){ console.error(err); res.status(500).json({ err: 'server' }); }
});

router.post('/login', async (req,res) => {
  try {
    const { email, password } = req.body;
    const t = await Teacher.findOne({ email });
    if (!t) return res.status(400).json({ msg: 'Invalid' });
    const ok = await bcrypt.compare(password, t.passwordHash);
    if (!ok) return res.status(400).json({ msg: 'Invalid' });
    const token = jwt.sign({ id: t._id, email: t.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, teacher: { id: t._id, name: t.name, email: t.email } });
  } catch(err){ console.error(err); res.status(500).json({ err:'server' }); }
});

module.exports = router;
