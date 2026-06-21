// app.js - express app with routes & middleware
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// routes
const authRoutes = require('./routes/auth');
const courseInstancesRoutes = require('./routes/courseinstances');
const studentsRoutes = require('./routes/students');
const sessionsRoutes = require('./routes/sessions');
const attendanceRoutes = require('./routes/attendance');
const reportRoutes = require('./routes/reports');

const app = express();

/* =========================
   GLOBAL MIDDLEWARE
========================= */
app.use(helmet());

app.use(cors({
  origin: '*',                 // ✅ works on any network
  methods: ['GET', 'POST'],
  credentials: false
}));

app.use(express.json());
app.use(morgan('dev'));

/* =========================
   API ROUTES
========================= */
app.use('/api/auth', authRoutes);
app.use('/api/courseinstances', courseInstancesRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

/* =========================
   HEALTH CHECK
========================= */
app.get('/', (req, res) => {
  res.json({ msg: 'SPMS backend up & running' });
});

module.exports = app;
