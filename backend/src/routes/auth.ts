import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserRequest, LoginRequest, User } from '@shared/types';
import { db } from '../services/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';

const router = Router();

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest = req.body;
    
    // Validate required fields
    if (!userData.email || !userData.password || !userData.role) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email, password, and role are required'
      });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(userData.email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.password);

    // Create new user
    const now = new Date().toISOString();
    const newUser: User = {
      userId: uuidv4(),
      email: userData.email,
      role: userData.role,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    // Store user in database
    await db.createUser({
      ...newUser,
      password: hashedPassword,
    } as any);

    // Generate JWT token
    const token = generateToken({
      userId: newUser.userId,
      email: newUser.email,
      role: newUser.role,
    });

    // Return user without password
    res.status(201).json({
      success: true,
      data: {
        token,
        user: newUser,
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error registering user'
    });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginData: LoginRequest = req.body;
    
    // Validate required fields
    if (!loginData.email || !loginData.password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required'
      });
    }

    // Get user by email
    const user = await db.getUserByEmail(loginData.email);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User account is inactive'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(loginData.password, (user as any).password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    });

    // Return user without password
    const { password, ...userWithoutPassword } = user as any;
    res.status(200).json({
      success: true,
      data: {
        token,
        user: userWithoutPassword,
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error logging in'
    });
  }
});

export default router;
