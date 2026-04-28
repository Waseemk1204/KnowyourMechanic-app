import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import User from '../models/User.js';
import Garage from '../models/Garage.js';
import dbConnect from '../utils/dbConnect.js';

/**
 * Extended request with resolved MongoDB user and optional garage.
 * Eliminates the repetitive User.findOne + role check pattern
 * that previously appeared in 25+ route handlers.
 */
export interface DbUserRequest extends AuthRequest {
    /** The MongoDB user document resolved from the Firebase UID */
    dbUser: InstanceType<typeof User>;
    /** The garage document (only attached by requireGarageOwner) */
    dbGarage?: InstanceType<typeof Garage>;
}

/**
 * Middleware: resolves Firebase UID → MongoDB User document.
 * Must be used AFTER `authenticate`.
 */
export async function withDbUser(req: DbUserRequest, res: Response, next: NextFunction) {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        req.dbUser = user;
        next();
    } catch (error) {
        console.error('withDbUser error:', error);
        return res.status(500).json({ message: 'Failed to resolve user' });
    }
}

/**
 * Middleware: resolves User + Garage for garage-role routes.
 * Rejects if user is not a garage owner or has no garage profile.
 * Must be used AFTER `authenticate`.
 */
export async function requireGarageOwner(req: DbUserRequest, res: Response, next: NextFunction) {
    await dbConnect();
    try {
        const user = await User.findOne({ firebaseUid: req.user!.uid });
        if (!user || user.role !== 'garage') {
            return res.status(403).json({ message: 'Only garage owners can access this resource' });
        }

        const garage = await Garage.findOne({ userId: user._id });
        if (!garage) {
            return res.status(404).json({ message: 'Garage not found. Complete onboarding first.' });
        }

        req.dbUser = user;
        req.dbGarage = garage;
        next();
    } catch (error) {
        console.error('requireGarageOwner error:', error);
        return res.status(500).json({ message: 'Auth check failed' });
    }
}
