const express = require('express');
const router = express.Router();

const Session = require('../models/Session');
const Student = require('../models/Student');
const Course = require('../models/CourseInstance');
const Attendance = require('../models/Attendance');

/* =====================================================
POST /api/attendance
Mark Attendance + Live Broadcast (Room Safe)
===================================================== */
router.post('/', async (req, res) => {
  try {

    const { pin, roll, sessionId } = req.body;

    if (!pin || !roll || !sessionId) {
      return res.status(400).json({
        msg: "pin, roll and sessionId are required"
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) return res.status(400).json({ msg: "Session not found" });
    if (!session.active) return res.status(400).json({ msg: "Session expired" });

    if (!session.pin || String(session.pin) !== String(pin))
      return res.status(400).json({ msg: "Invalid PIN" });

    if (session.pinExpiresAt && session.pinExpiresAt < new Date())
      return res.status(403).json({ msg: "PIN expired" });

    const student = await Student.findOne({ roll });
    if (!student) return res.status(404).json({ msg: "Student not found" });

    const course = await Course.findById(session.courseInstanceId);
    if (!course) return res.status(400).json({ msg: "Course not found" });

    const enrolled = course.studentIds
      .map(id => id.toString())
      .includes(student._id.toString());

    if (!enrolled)
      return res.status(403).json({ msg: "Student not enrolled in this course" });

    await Attendance.create({
      session: session._id,
      student: student._id,
      status: 'present'
    });

    /* 🔥 ROOM BASED LIVE BROADCAST */
    const presentRecords = await Attendance.find({
      session: session._id,
      status: 'present'
    }).populate('student', 'name roll');

    const totalStudents = course.studentIds.length;

    const students = presentRecords.map(r => ({
      name: r.student?.name || "Unknown",
      roll: r.student?.roll || ""
    }));

    const io = req.app.get('io');

    if (io) {
      io.to(`session:${session._id}`).emit('attendanceUpdate', {
        sessionId: session._id.toString(),
        presentCount: presentRecords.length,
        totalStudents,
        students
      });
    }

    return res.json({ msg: "Attendance marked successfully" });

  } catch (err) {

    if (err.code === 11000)
      return res.status(400).json({ msg: "Attendance already marked" });

    console.error("ATTENDANCE ERROR >>>", err);
    return res.status(500).json({
      msg: "Server error while marking attendance"
    });
  }
});


/* =====================================================
GET /api/attendance/summary/:roll
===================================================== */
router.get('/summary/:roll', async (req, res) => {
  try {

    const { roll } = req.params;

    const student = await Student.findOne({ roll });
    if (!student)
      return res.status(404).json({ msg: "Student not found" });

    const course = await Course.findOne({
      studentIds: student._id
    });

    if (!course)
      return res.status(404).json({ msg: "Course not found" });

    const sessions = await Session.find({
      courseInstanceId: course._id
    }).select('_id');

    const sessionIds = sessions.map(s => s._id);
    const totalSessions = sessionIds.length;

    const presentSessions = await Attendance.countDocuments({
      student: student._id,
      session: { $in: sessionIds },
      status: 'present'
    });

    const absentSessions = totalSessions - presentSessions;

    const percentage =
      totalSessions === 0
        ? 0
        : Math.round((presentSessions * 100) / totalSessions);

    return res.json({
      roll: student.roll,
      totalSessions,
      presentSessions,
      absentSessions,
      percentage
    });

  } catch (err) {
    console.error("SUMMARY ERROR >>>", err);
    return res.status(500).json({
      msg: "Server error while computing summary"
    });
  }
});


/* =====================================================
GET /api/attendance/student/:roll
Teacher Performance + Trend Intelligence
===================================================== */
router.get('/student/:roll', async (req, res) => {
  try {

    const { roll } = req.params;

    const student = await Student.findOne({ roll });
    if (!student)
      return res.status(404).json({ msg: "Student not found" });

    const course = await Course.findOne({
      studentIds: student._id
    });

    if (!course)
      return res.status(404).json({ msg: "Course not found" });

    const sessions = await Session.find({
      courseInstanceId: course._id
    }).select('_id');

    const sessionIds = sessions.map(s => s._id);
    const totalSessions = sessionIds.length;

    const presentSessions = await Attendance.countDocuments({
      student: student._id,
      session: { $in: sessionIds },
      status: 'present'
    });

    const absentSessions = totalSessions - presentSessions;

    const percentage =
      totalSessions === 0
        ? 0
        : Math.round((presentSessions * 100) / totalSessions);

    const records = await Attendance.find({
      student: student._id,
      session: { $in: sessionIds }
    }).sort({ createdAt: -1 });

    const history = records.map(r => ({
      date: r.createdAt
        ? new Date(r.createdAt).toLocaleDateString()
        : "Unknown",
      status: r.status
    }));

    /* ================= TREND ANALYSIS ================= */

    let trend = "stable";

    if (history.length >= 8) {
      const recent = history.slice(0, 4);
      const older = history.slice(4, 8);

      const recentPresent = recent.filter(s => s.status === "present").length;
      const olderPresent = older.filter(s => s.status === "present").length;

      if (recentPresent > olderPresent) trend = "improving";
      else if (recentPresent < olderPresent) trend = "declining";
    }

    return res.json({
      roll,
      name: student.name,
      totalSessions,
      presentSessions,
      absentSessions,
      percentage,
      sessions: history,
      trend
    });

  } catch (err) {
    console.error("TEACHER VIEW ERROR >>>", err);
    return res.status(500).json({
      msg: "Server error loading student performance"
    });
  }
});

module.exports = router;

