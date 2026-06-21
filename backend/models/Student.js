const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  roll: { type: String, required: true, unique: true },
  gender: { type: String, enum: ['M','F'], default: 'M' },
  courseInstanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseInstance' }
});

module.exports = mongoose.model('Student', StudentSchema);
