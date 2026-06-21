const express = require('express');
const router = express.Router();
const CourseInstance = require('../models/CourseInstance');

// list all course instances
router.get('/', async (req,res) => {
  const list = await CourseInstance.find().populate('studentIds', 'name roll gender');
  res.json(list);
});

// get single
router.get('/:id', async (req,res) => {
  const c = await CourseInstance.findById(req.params.id).populate('studentIds', 'name roll gender');
  if (!c) return res.status(404).json({msg:'not found'});
  res.json(c);
});

module.exports = router;
