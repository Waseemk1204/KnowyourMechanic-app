import { Request, Response, NextFunction } from 'express';
import admin from '../utils/firebaseAdmin.js';

export interface AuthRequest extends Request {
    user?: admin.auth.DecodedIdToken;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
}
