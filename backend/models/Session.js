const mongoose = require('mongoose');
const { Schema } = mongoose;

const SessionSchema = new Schema(
  {
    courseInstanceId: {
      type: Schema.Types.ObjectId,
      ref: 'CourseInstance',
      required: true,
      index: true, // ⚡ faster lookups
    },

    createdBy: {
      type: String, // teacher email or id
      required: true,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    stoppedAt: {
      type: Date,
      default: null,
    },

    pin: {
      type: String,
      default: null,
    },

    pinExpiresAt: {
      type: Date,
      default: null,
    },

    active: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true, // ✅ createdAt & updatedAt automatically
  }
);

/* =========================
   🔒 DB SAFETY RULE
   Only ONE active session
   per course at a time
========================= */
SessionSchema.index(
  { courseInstanceId: 1, active: 1 },
  {
    partialFilterExpression: { active: true },
    unique: true,
  }
);

module.exports = mongoose.model('Session', SessionSchema);
