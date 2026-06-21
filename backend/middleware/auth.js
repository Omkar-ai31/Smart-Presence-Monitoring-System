const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

module.exports = function (req, res, next) {
  const header = req.header('Authorization') || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ msg: 'No token' });
  const token = header.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.teacher = payload;
    next();
  } catch (e) {
    return res.status(401).json({ msg: 'Invalid token' });
  }
};
