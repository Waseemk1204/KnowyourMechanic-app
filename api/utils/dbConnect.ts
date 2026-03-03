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

let isConnected = false;

async function dbConnect() {
    if (isConnected) return;

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set. Configure it in Vercel dashboard or .env file.');
    }

    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

export default dbConnect;
