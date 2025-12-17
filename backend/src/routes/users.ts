import { Router, Request, Response } from 'express';
import { db } from '../services/database';
import { authenticate, authorize } from '../middleware/auth';
import { hashPassword } from '../utils/auth';
import { User } from '@shared/types';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all users (admin only)
router.get('/', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const users = await db.getAllUsers();
    
    // Remove passwords from response
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    });

    res.status(200).json({
      success: true,
      data: sanitizedUsers
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting users'
    });
  }
});

// Get active users only (admin only)
router.get('/active', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const users = await db.getActiveUsers();
    
    // Remove passwords from response
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    });

    res.status(200).json({
      success: true,
      data: sanitizedUsers
    });
  } catch (error) {
    console.error('Error getting active users:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting active users'
    });
  }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Check if user is admin or requesting their own profile
    if (req.user!.role !== 'admin' && req.user!.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own profile'
      });
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user as any;
    res.status(200).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting user'
    });
  }
});

// Update user
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    
    // Check if user is admin or updating their own profile
    if (req.user!.role !== 'admin' && req.user!.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own profile'
      });
    }
    
    // Prevent role change unless admin
    if (updates.role && req.user!.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can change user roles'
      });
    }

    // Only admins can change passwords for other users
    if (updates.password && req.user!.role !== 'admin' && req.user!.userId !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only admins can change passwords for other users'
      });
    }

    // Prevent changing email to an existing one
    if (updates.email) {
      const existingUser = await db.getUserByEmail(updates.email);
      if (existingUser && existingUser.userId !== userId) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Email already in use'
        });
      }
    }

    // Prepare updates object
    const updateData = { ...updates };

    // Hash password if provided
    if (updates.password && updates.password.trim() !== '') {
      // Validate password length
      if (updates.password.length < 6) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Password must be at least 6 characters long'
        });
      }
      updateData.password = await hashPassword(updates.password);
    } else {
      // Remove empty password from updates to avoid overwriting with empty string
      delete updateData.password;
    }

    // Update user
    const updatedUser = await db.updateUser(userId, {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });

    if (!updatedUser) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser as any;
    res.status(200).json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error updating user'
    });
  }
});

export default router;
