import mongoose from 'mongoose';

// Load .env only in development (Vercel uses dashboard env vars)
try {
    const dotenv = await import('dotenv');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    dotenv.config({ path: join(__dirname, '../../.env') });
} catch {
    // dotenv not available or .env not found — fine on Vercel
}

/**
 * Cached MongoDB connection.
 * Uses mongoose's built-in readyState instead of a manual boolean flag,
 * so it correctly handles disconnections/reconnections.
 */
async function dbConnect(): Promise<void> {
    // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    if (mongoose.connection.readyState === 1) return;
    if (mongoose.connection.readyState === 2) {
        // Already connecting — wait for it
        await new Promise<void>((resolve) => {
            mongoose.connection.once('connected', resolve);
        });
        return;
    }

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set. Configure it in Vercel dashboard or .env file.');
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

export default dbConnect;
