const mongoose = require('mongoose');

const CourseInstanceSchema = new mongoose.Schema({
  name: { type: String, required: true },   // B.Com / B.Sc / B.A
  code: { type: String, required: true },   // BCOM, BSC, BA
  capacity: { type: Number, default: 20 },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

module.exports = mongoose.model('CourseInstance', CourseInstanceSchema);
