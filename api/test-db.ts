import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
const envPath = join(__dirname, '../.env');
console.log('Loading .env from:', envPath);
config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
    console.log('--- MongoDB Connection Test ---');
    if (!MONGODB_URI) {
        console.error('ERROR: MONGODB_URI is undefined!');
        console.log('Please check that .env exists at the root of the project.');
        process.exit(1);
    }

    console.log('URI found:', MONGODB_URI.substring(0, 20) + '...');

    try {
        console.log('Attempting to connect...');
        await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('SUCCESS: Connected to MongoDB!');
        await mongoose.disconnect();
    } catch (error: any) {
        console.error('FAILURE: Could not connect to MongoDB.');
        console.error('Error Details:', error.message);

        if (error.codeName === 'AtlasError') {
            console.log('Hint: Check your IP Whitelist in MongoDB Atlas.');
        }
    }
}

testConnection();
