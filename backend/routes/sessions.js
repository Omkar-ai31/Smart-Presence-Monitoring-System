const express = require('express');
const router = express.Router();

const Session = require('../models/Session');
const Course = require('../models/CourseInstance');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');

const PIN_EXPIRY_MIN = parseInt(process.env.PIN_EXPIRY_MIN || '15', 10);

/* =========================
   CREATE SESSION
========================= */
router.post('/', auth, async (req, res) => {
  try {
    const { courseInstanceId } = req.body;

    const course = await Course.findById(courseInstanceId);
    if (!course) {
      return res.status(400).json({ msg: 'Invalid course' });
    }

    await Session.updateMany(
      { courseInstanceId, active: true },
      {
        active: false,
        pin: null,
        pinExpiresAt: null,
        stoppedAt: new Date()
      }
    );

    const session = new Session({
      courseInstanceId,
      createdBy: req.teacher.email || req.teacher.id,
      active: false
    });

    await session.save();
    res.json(session);

  } catch (err) {
    console.error('CREATE SESSION ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* =========================
   GLOBAL ACTIVE SESSION
========================= */
router.get('/active', async (req, res) => {
  try {
    const session = await Session.findOne({ active: true })
      .sort({ startedAt: -1 });

    if (!session) {
      return res.json({
        active: false,
        sessionId: null,
        expiresAt: null
      });
    }

    return res.json({
      active: true,
      sessionId: session._id.toString(),
      expiresAt: session.pinExpiresAt
    });

  } catch (err) {
    console.error('ACTIVE SESSION ERROR:', err);
    res.status(500).json({
      active: false,
      sessionId: null,
      expiresAt: null
    });
  }
});

/* =========================
   LIVE ATTENDANCE
========================= */
router.get('/:id/live', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        presentCount: 0,
        totalStudents: 0,
        students: []
      });
    }

    const course = await Course.findById(session.courseInstanceId);
    const totalStudents = course?.studentIds?.length || 0;

    const records = await Attendance.find({
      session: req.params.id,
      status: 'present'
    }).populate('student', 'name roll');

    const students = records.map(r => ({
      id: r.student?._id,
      name: r.student?.name || 'Unknown',
      roll: r.student?.roll || ''
    }));

    res.json({
      presentCount: students.length,
      totalStudents,
      students
    });

  } catch (err) {
    console.error('LIVE ATTENDANCE ERROR:', err);
    res.status(500).json({
      presentCount: 0,
      totalStudents: 0,
      students: []
    });
  }
});

/* =========================
   START SESSION
========================= */
router.post('/:id/start', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    if (session.active) {
      return res.status(400).json({ msg: 'Session already active' });
    }

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = new Date(Date.now() + PIN_EXPIRY_MIN * 60 * 1000);

    session.pin = pin;
    session.pinExpiresAt = expiresAt;
    session.startedAt = new Date();
    session.active = true;

    await session.save();

    const io = req.app.get('io');

    io.emit('sessionStarted', {
      sessionId: session._id.toString(),
      pin,
      expiresAt
    });

    res.json({
      sessionId: session._id.toString(),
      pin,
      expiresAt
    });

  } catch (err) {
    console.error('START SESSION ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* =========================
   STOP SESSION
========================= */
router.post('/:id/stop', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session || !session.active) {
      return res.status(400).json({ msg: 'Session not active' });
    }

    const course = await Course.findById(session.courseInstanceId);
    if (!course) {
      return res.status(400).json({ msg: 'Course not found' });
    }

    const presentRecords = await Attendance.find({
      session: session._id,
      status: 'present'
    });

    const presentIds = presentRecords.map(r => r.student.toString());

    for (const studentId of course.studentIds) {
      if (!presentIds.includes(studentId.toString())) {
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

    const io = req.app.get('io');
    io.emit('sessionStopped', {
      sessionId: session._id.toString()
    });

    res.json({ msg: 'Session stopped' });

  } catch (err) {
    console.error('STOP SESSION ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;

