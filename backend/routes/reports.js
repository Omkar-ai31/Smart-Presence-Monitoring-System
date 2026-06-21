const express = require('express');
const router = express.Router();

const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const auth = require('../middleware/auth');

/*
=====================================================
GET /api/reports/session/:sessionId/csv
Teacher downloads attendance CSV
=====================================================
*/
router.get('/session/:sessionId/csv', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // 1️⃣ Find session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ msg: 'Session not found' });
    }

    // 2️⃣ Fetch attendance records
    const records = await Attendance.find({ session: sessionId })
      .populate('student', 'roll name')
      .sort({ status: 1, markedAt: 1 });

    // 3️⃣ Build CSV
    let csv = 'Roll,Name,Status,Marked At\n';

    records.forEach(r => {
      csv += `${r.student.roll},${r.student.name},${r.status},${r.markedAt}\n`;
    });

    // 4️⃣ Send CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance_${sessionId}.csv"`
    );

    res.send(csv);

  } catch (err) {
    console.error('CSV EXPORT ERROR >>>', err);
    res.status(500).json({
      msg: 'Failed to generate attendance report'
    });
  }
});

/*
=====================================================
GET /api/reports/session/:sessionId/json
(Optional) JSON report
=====================================================
*/
router.get('/session/:sessionId/json', auth, async (req, res) => {
  try {
    const records = await Attendance.find({
      session: req.params.sessionId
    }).populate('student', 'roll name');

    res.json(records);
  } catch (err) {
    res.status(500).json({ msg: 'Failed to load report' });
  }
});

module.exports = router;
