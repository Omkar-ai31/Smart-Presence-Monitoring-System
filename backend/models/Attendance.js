const mongoose = require('mongoose');
const { Schema } = mongoose;

const AttendanceSchema = new Schema(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent'],
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // ✅ backend safety + audit
  }
);

/* =========================
   🔒 HARD DB LOCK
   One student → one record
   per session ONLY
========================= */
AttendanceSchema.index(
  { session: 1, student: 1 },
  {
    unique: true,
    background: true, // ✅ avoids startup crash
  }
);

module.exports = mongoose.model('Attendance', AttendanceSchema);
