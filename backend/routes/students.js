const express = require('express');
const router = express.Router();

const Student = require('../models/Student');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');

/* =========================
   FETCH STUDENT BASIC INFO
   (🔥 NAME + ROLL)
========================= */
router.get('/byroll/:roll', async (req, res) => {
  try {
    const student = await Student.findOne(
      { roll: req.params.roll },
      { name: 1, roll: 1, _id: 0 } // ✅ ONLY SEND REQUIRED DATA
    );

    if (!student) {
      return res.status(404).json({ msg: 'Student not found' });
    }

    res.json(student);
  } catch (err) {
    console.error('FETCH STUDENT ERROR:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* =========================
   GET STUDENTS BY COURSE
========================= */
router.get('/bycourse/:courseId', async (req, res) => {
  try {
    const list = await Student.find({
      courseInstanceId: req.params.courseId
    }).sort('roll');

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/* =========================
   ATTENDANCE SUMMARY
========================= */
router.get('/:roll/attendance-summary', async (req, res) => {
  try {
    const student = await Student.findOne({ roll: req.params.roll });
    if (!student) {
      return res.status(404).json({ msg: 'Student not found' });
    }

    const totalSessions = await Session.countDocuments({
      courseInstanceId: student.courseInstanceId
    });

    const presentCount = await Attendance.countDocuments({
      student: student._id,
      status: 'present'
    });

    const absentCount = totalSessions - presentCount;

    const percentage =
      totalSessions === 0
        ? 100
        : Math.round((presentCount / totalSessions) * 100);

    res.json({
      totalSessions,
      presentSessions: presentCount,
      absentSessions: absentCount,
      percentage
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
