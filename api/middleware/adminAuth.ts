import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import dbConnect from '../utils/dbConnect.js';

/**
 * Middleware: require admin role
 */
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || (user.role !== 'admin')) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        next();
    } catch (error) {
        return res.status(500).json({ message: 'Auth check failed' });
    }
}

/**
 * Middleware: require admin OR employee role
 */
export async function requireEmployee(req: AuthRequest, res: Response, next: NextFunction) {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || (user.role !== 'admin' && user.role !== 'employee')) {
            return res.status(403).json({ message: 'Employee access required' });
        }
        next();
    } catch (error) {
        return res.status(500).json({ message: 'Auth check failed' });
    }
}
