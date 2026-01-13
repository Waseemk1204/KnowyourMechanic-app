import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccountPath = join(__dirname, '../serviceAccountKey.json');

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            // Use environment variable (Production/Vercel)
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('Firebase Admin initialized from Environment Variable');
        } else if (existsSync(serviceAccountPath)) {
            // Use local file (Development)
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('Firebase Admin initialized from local file');
        } else {
            console.warn('Firebase service account not found, using project ID only');
            admin.initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID || 'knowyourmechanic-32246',
            });
        }
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
    }
}

export default admin;
