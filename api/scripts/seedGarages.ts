/**
 * Seed Script: Insert test garages near Pune for development testing.
 * 
 * Usage: npx tsx api/scripts/seedGarages.ts
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
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
}

// Create a dummy user for garages (won't be used for auth)
const userSchema = new mongoose.Schema({
    firebaseUid: String,
    phoneNumber: String,
    role: { type: String, default: 'garage' },
    name: String,
}, { timestamps: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);

const garageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    email: String,
    phone: String,
    location: {
        address: String,
        coordinates: [Number, Number],
    },
    serviceHours: String,
    workingDays: [String],
    photoUrl: String,
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    businessType: { type: String, default: 'individual' },
    legalBusinessName: String,
    onboardingStatus: { type: String, default: 'completed' },
    isVerified: { type: Boolean, default: true },
}, { timestamps: true });
const Garage = mongoose.models.Garage || mongoose.model('Garage', garageSchema);

const testGarages = [
    {
        name: 'Sharma Auto Works',
        email: 'sharmaworks@test.com',
        phone: '+919876543201',
        location: { address: 'JM Road, Shivajinagar, Pune', coordinates: [73.8478, 18.5308] },
        serviceHours: '8:00 AM - 9:00 PM',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        rating: 4.5,
        totalReviews: 28,
        legalBusinessName: 'Sharma Auto Works',
    },
    {
        name: 'SpeedFix Garage',
        email: 'speedfix@test.com',
        phone: '+919876543202',
        location: { address: 'FC Road, Deccan Gymkhana, Pune', coordinates: [73.8400, 18.5196] },
        serviceHours: '9:00 AM - 8:00 PM',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        rating: 4.2,
        totalReviews: 15,
        legalBusinessName: 'SpeedFix Garage',
    },
    {
        name: 'Royal Mechanics',
        email: 'royal@test.com',
        phone: '+919876543203',
        location: { address: 'Koregaon Park, Pune', coordinates: [73.8935, 18.5361] },
        serviceHours: '8:00 AM - 10:00 PM',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        rating: 4.8,
        totalReviews: 42,
        legalBusinessName: 'Royal Mechanics Pvt Ltd',
    },
    {
        name: 'Patel Tyre & Service',
        email: 'patel@test.com',
        phone: '+919876543204',
        location: { address: 'Hadapsar, Pune', coordinates: [73.9260, 18.5089] },
        serviceHours: '7:00 AM - 8:00 PM',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        rating: 3.9,
        totalReviews: 8,
        legalBusinessName: 'Patel Tyre & Service',
    },
    {
        name: 'AutoCare Hub',
        email: 'autocare@test.com',
        phone: '+919876543205',
        location: { address: 'Kothrud, Pune', coordinates: [73.8077, 18.5074] },
        serviceHours: '9:00 AM - 7:00 PM',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        rating: 4.6,
        totalReviews: 31,
        legalBusinessName: 'AutoCare Hub',
    },
    {
        name: 'Bhosale Car Clinic',
        email: 'bhosale@test.com',
        phone: '+919876543206',
        location: { address: 'Baner, Pune', coordinates: [73.7868, 18.5590] },
        serviceHours: '8:30 AM - 8:30 PM',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        rating: 4.1,
        totalReviews: 11,
        legalBusinessName: 'Bhosale Car Clinic',
    },
    {
        name: 'Pune Motors Workshop',
        email: 'punemotors@test.com',
        phone: '+919876543207',
        location: { address: 'Viman Nagar, Pune', coordinates: [73.9149, 18.5679] },
        serviceHours: '8:00 AM - 9:00 PM',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        rating: 4.4,
        totalReviews: 22,
        legalBusinessName: 'Pune Motors Workshop',
    },
    {
        name: 'Highway Auto Service',
        email: 'highway@test.com',
        phone: '+919876543208',
        location: { address: 'Katraj, Pune', coordinates: [73.8553, 18.4626] },
        serviceHours: '6:00 AM - 10:00 PM',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        rating: 3.7,
        totalReviews: 5,
        legalBusinessName: 'Highway Auto Service',
    },
];

async function seed() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const garage of testGarages) {
        // Check if garage already exists by phone to avoid duplicates
        const exists = await Garage.findOne({ phone: garage.phone });
        if (exists) {
            console.log(`⏭ Skipping "${garage.name}" — already exists`);
            continue;
        }

        // Create a dummy user for this garage
        const user = new User({
            firebaseUid: `test-garage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            phoneNumber: garage.phone,
            role: 'garage',
            name: garage.name,
        });
        await user.save();

        const doc = new Garage({
            userId: user._id,
            ...garage,
            onboardingStatus: 'completed',
            isVerified: true,
            businessType: 'individual',
        });
        await doc.save();

        console.log(`✅ Created "${garage.name}" at ${garage.location.address}`);
    }

    console.log('\nDone! Seeded test garages near Pune.');
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
