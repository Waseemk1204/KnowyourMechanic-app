/**
 * Promote a user to admin role by phone number.
 * 
 * Usage: npx tsx api/scripts/promoteAdmin.ts +919321495344
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
}

const phone = process.argv[2];
if (!phone) {
    console.error('Usage: npx tsx api/scripts/promoteAdmin.ts +919321495344');
    process.exit(1);
}

const userSchema = new mongoose.Schema({
    firebaseUid: String,
    phoneNumber: String,
    role: String,
    name: String,
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ phoneNumber: phone });
    if (!user) {
        console.error(`❌ No user found with phone: ${phone}`);
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`Found user: ${user.phoneNumber} (current role: ${user.role})`);
    user.role = 'admin';
    await user.save();
    console.log(`✅ User ${phone} promoted to admin!`);

    await mongoose.disconnect();
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
