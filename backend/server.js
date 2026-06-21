// server.js - starts http server + socket.io and mounts express app
require('dotenv').config();

const http = require('http');
const mongoose = require('mongoose');

const app = require('./app');

// Models (used by auto-stop logic)
const Session = require('./models/Session');
const Course = require('./models/CourseInstance');
const Attendance = require('./models/Attendance');

const PORT = process.env.PORT || 4000;

/* =========================
   CREATE HTTP SERVER
========================= */
const server = http.createServer(app);

/* =========================
   SOCKET.IO (NETWORK SAFE)
========================= */
const { Server } = require('socket.io');

const io = new Server(server, {
  cors: {
    origin: '*',                // ✅ works on any network
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'], // ✅ mobile + laptop safe
  pingTimeout: 60000,
  pingInterval: 25000
});

// 🔑 make io available everywhere (routes)
app.set('io', io);

/* =========================
   SOCKET EVENTS
========================= */
io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  socket.on('joinSession', (sessionId) => {
    socket.join(`session:${sessionId}`);
    console.log(`➡️ Joined session:${sessionId}`);
  });

  socket.on('leaveSession', (sessionId) => {
    socket.leave(`session:${sessionId}`);
    console.log(`⬅️ Left session:${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

/* =========================
   AUTO STOP EXPIRED SESSIONS
========================= */
const CHECK_INTERVAL = 60 * 1000; // 1 minute
let autoStopRunning = false;

async function autoStopExpiredSessions() {
  if (autoStopRunning) return;
  autoStopRunning = true;

  try {
    const now = new Date();

    const expiredSessions = await Session.find({
      active: true,
      pinExpiresAt: { $ne: null, $lte: now }
    });

    for (const session of expiredSessions) {
      try {
        console.log(`⏰ Auto stopping session ${session._id}`);

        const course = await Course.findById(session.courseInstanceId);
        if (!course) continue;

        const allStudentIds = course.studentIds.map(id => id.toString());

        const presentRecords = await Attendance.find({
          session: session._id,
          status: 'present'
        });

        const presentIds = presentRecords.map(r => r.student.toString());

        const absentIds = allStudentIds.filter(
          id => !presentIds.includes(id)
        );

        for (const studentId of absentIds) {
          const exists = await Attendance.findOne({
            session: session._id,
            student: studentId
          });

          if (!exists) {
            await Attendance.create({
              session: session._id,
              student: studentId,
              status: 'absent',
              markedAt: new Date()
            });
          }
        }

        session.active = false;
        session.stoppedAt = new Date();
        session.pin = null;
        session.pinExpiresAt = null;
        await session.save();

        // 🔔 SINGLE SOURCE stop event
        io.emit('sessionStopped', {
          sessionId: session._id.toString(),
          auto: true
        });

        console.log(`✅ Auto-stopped session ${session._id}`);

      } catch (err) {
        console.error('❌ Auto-stop session error:', err);
      }
    }

  } catch (err) {
    console.error('❌ AUTO STOP ERROR:', err);
  } finally {
    autoStopRunning = false;
  }
}

/* =========================
   DATABASE + START SERVER
========================= */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected');

  // start auto-stop ONLY after DB is ready
  setInterval(autoStopExpiredSessions, CHECK_INTERVAL);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
