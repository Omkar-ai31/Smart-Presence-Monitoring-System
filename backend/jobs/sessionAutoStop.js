const cron = require('node-cron');
const Session = require('../models/Session');
const Course = require('../models/CourseInstance');
const Attendance = require('../models/Attendance');

module.exports = function startSessionAutoStop(io) {

  // ⏱ runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // 1️⃣ find expired active sessions
      const expiredSessions = await Session.find({
        active: true,
        pinExpiresAt: { $lt: now }
      });

      for (const session of expiredSessions) {

        // 2️⃣ load course students
        const course = await Course.findById(session.courseInstanceId);
        if (!course) continue;

        const allStudents = course.studentIds.map(id => id.toString());

        // 3️⃣ already marked attendance
        const marked = await Attendance.find({
          session: session._id
        }).select('student');

        const presentIds = marked.map(a => a.student.toString());

        // 4️⃣ absentees
        const absentIds = allStudents.filter(
          id => !presentIds.includes(id)
        );

        // 5️⃣ insert ABSENT records
        if (absentIds.length > 0) {
          const absentDocs = absentIds.map(studentId => ({
            session: session._id,
            student: studentId,
            status: 'absent',
            markedAt: now
          }));

          await Attendance.insertMany(absentDocs);
        }

        // 6️⃣ stop session
        session.active = false;
        session.stoppedAt = now;
        session.pin = null;
        session.pinExpiresAt = null;
        await session.save();

        // 7️⃣ notify sockets
        if (io) {
          io.to(`session:${session._id}`).emit('sessionStopped', {
            sessionId: session._id,
            auto: true
          });
        }

        console.log(`🛑 Auto-stopped session ${session._id}`);
      }

    } catch (err) {
      console.error('AUTO-STOP ERROR >>>', err);
    }
  });

};
