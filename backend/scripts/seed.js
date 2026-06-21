// scripts/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Course = require('../models/CourseInstance');
const Student = require('../models/Student');
const Session = require('../models/Session');

// Teacher is simple inline model for seeding
const Teacher = mongoose.model('Teacher', new mongoose.Schema({
  name: String, email: { type: String, unique: true }, passwordHash: String
}));

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('connected');

  // clear existing
  await Course.deleteMany({});
  await Student.deleteMany({});
  await Session.deleteMany({});
  await Teacher.deleteMany({});

  // create courses
  const c1 = await Course.create({ name: 'B.Com', code: 'BCOM', capacity: 20 });
  const c2 = await Course.create({ name: 'B.Sc', code: 'BSC', capacity: 20 });
  const c3 = await Course.create({ name: 'B.A', code: 'BA', capacity: 20 });

  const students = [];

  // B.Com - 20 Indian names
  const bcomNames = [
    'Arjun Mehta','Priya Sharma','Rahul Verma','Sneha Reddy','Amit Kumar',
    'Pooja Patel','Vikram Singh','Anjali Gupta','Karan Joshi','Divya Nair',
    'Saurabh Rao','Neha Kaur','Manish Desai','Ritu Kapoor','Harish Chandra',
    'Maya Iyer','Sameer Khan','Isha Saxena','Rohit Bhatia','Kavita Menon'
  ];
  for (let i = 1; i <= 20; i++) {
    students.push({
      name: bcomNames[i-1],
      roll: `BCOM-${String(i).padStart(2,'0')}`,
      gender: (i % 2 === 0) ? 'F' : 'M',
      courseInstanceId: c1._id
    });
  }

  // B.Sc - exactly these 10 male names (for BSC odd rolls)
  const bscMaleNames = [
    'tanish dasgupta','vasu','simon','sudish','nikhil',
    'charan','manoj','sanjay','nithin','rakesh'
  ];
  // B.Sc female names (10 Indian female names)
  const bscFemaleNames = [
    'Ananya Rao','Kavya Nair','Isha Menon','Ritika Singh','Meera Patel',
    'Shalini Iyer','Trisha Gupta','Nandini Mohan','Bhavya Shah','Sakshi Joshi'
  ];

  let maleIdx = 0, femaleIdx = 0;
  for (let i = 1; i <= 20; i++) {
    const roll = `BSC-${String(i).padStart(2,'0')}`;
    if (i % 2 === 1) { // odd -> male per your pattern
      students.push({
        name: bscMaleNames[maleIdx++],
        roll,
        gender: 'M',
        courseInstanceId: c2._id
      });
    } else {
      students.push({
        name: bscFemaleNames[femaleIdx++],
        roll,
        gender: 'F',
        courseInstanceId: c2._id
      });
    }
  }

  // B.A - 20 Indian names
  const baNames = [
    'Ankit Sharma','Tanya Rao','Prateek Jain','Rhea Kapoor','Vikram Yadav',
    'Gauri Singh','Aditya Roy','Sonal Verma','Naveen Kumar','Parul Chawla',
    'Kunal Nair','Suhana Qureshi','Mayank Gill','Neelam Reddy','Ajay Chauhan',
    'Ritu Sinha','Devansh Patel','Lata Iyer','Kishore Bose','Nisha Khatri'
  ];
  for (let i = 1; i <= 20; i++) {
    students.push({
      name: baNames[i-1],
      roll: `BA-${String(i).padStart(2,'0')}`,
      gender: (i % 2 === 0) ? 'F' : 'M',
      courseInstanceId: c3._id
    });
  }

  // Insert all students
  const created = await Student.insertMany(students);

  // attach student ids to courses
  c1.studentIds = created.filter(s => String(s.courseInstanceId) === String(c1._id)).map(s => s._id);
  c2.studentIds = created.filter(s => String(s.courseInstanceId) === String(c2._id)).map(s => s._id);
  c3.studentIds = created.filter(s => String(s.courseInstanceId) === String(c3._id)).map(s => s._id);
  await c1.save(); await c2.save(); await c3.save();

  // create teacher (default)
  const hash = await bcrypt.hash('password123', 10);
  await Teacher.create({ name: 'Default Teacher', email: 'teacher@college.edu', passwordHash: hash });

  console.log('Seeded DB: 3 courses, 60 students, 1 teacher');
  process.exit(0);
}

run().catch(err=>{ console.error(err); process.exit(1); });
