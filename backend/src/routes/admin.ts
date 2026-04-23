import express from 'express';
import jwt from 'jsonwebtoken';
import databaseService from '../services/databaseService';

const router = express.Router();

// POST /api/admin/login - owner/admin login (separate from normal users)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({
        error: 'Admin credentials not configured',
        message: 'Set ADMIN_EMAIL and ADMIN_PASSWORD in backend environment variables',
      });
    }

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { admin: true, email: adminEmail },
      secret,
      { expiresIn: '7d' }
    );

    return res.json({ message: 'Admin login successful', token });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin-only middleware (uses admin JWT, NOT user JWT)
router.use((req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;

    if (!decoded?.admin) {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /api/admin/users - list all users for admin dashboard
router.get('/users', async (_req, res) => {
  try {
    const users = await databaseService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;

