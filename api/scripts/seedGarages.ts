/**
 * Seed script to add 250 test garages in Pune
 * Run with: npx ts-node api/scripts/seedGarages.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Pune city center coordinates
const PUNE_CENTER = { lat: 18.5204, lng: 73.8567 };
const RADIUS_KM = 15; // 15km radius from city center

// Garage name patterns
const prefixes = [
    'Express', 'Quick', 'Pro', 'Elite', 'Royal', 'Prime', 'Star', 'Classic',
    'Modern', 'Expert', 'Master', 'Super', 'Fast', 'Speed', 'Premium', 'Smart',
    'Auto', 'Metro', 'City', 'Urban', 'Rapid', 'Turbo', 'Ace', 'Best'
];

const suffixes = [
    'Car Care', 'Auto Works', 'Garage', 'Motors', 'Auto Service', 'Car Service',
    'Workshop', 'Auto Repair', 'Car Clinic', 'Auto Hub', 'Service Center',
    'Car Works', 'Auto Zone', 'Mechanics', 'Car Doctor', 'Auto Care'
];

// Pune areas for addresses
const puneAreas = [
    'Koregaon Park', 'Kothrud', 'Baner', 'Hinjewadi', 'Wakad', 'Aundh',
    'Viman Nagar', 'Kharadi', 'Hadapsar', 'Magarpatta', 'Pune Station',
    'Shivajinagar', 'Deccan', 'FC Road', 'JM Road', 'Prabhat Road',
    'Kalyani Nagar', 'Yerawada', 'Vishrantwadi', 'Pimpri', 'Chinchwad',
    'Nigdi', 'Akurdi', 'PCMC', 'Warje', 'Karve Nagar', 'Bibwewadi',
    'Katraj', 'Kondhwa', 'NIBM', 'Undri', 'Wanowrie', 'Camp', 'MG Road',
    'Senapati Bapat Road', 'IT Park Road', 'Sinhagad Road', 'Bavdhan',
    'Pashan', 'Sus', 'Mahalunge', 'Balewadi', 'Dhanori', 'Lohegaon'
];

const serviceHoursOptions = [
    '8:00 AM - 8:00 PM',
    '9:00 AM - 9:00 PM',
    '8:00 AM - 6:00 PM',
    '9:00 AM - 7:00 PM',
    '7:00 AM - 9:00 PM',
    '24 Hours'
];

const workingDaysOptions = [
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
];

// Generate random coordinates within radius
function randomLocationInPune(): [number, number] {
    const radiusDeg = RADIUS_KM / 111; // Approximate km to degrees
    const theta = Math.random() * 2 * Math.PI;
    const r = Math.sqrt(Math.random()) * radiusDeg;

    const lng = PUNE_CENTER.lng + r * Math.cos(theta);
    const lat = PUNE_CENTER.lat + r * Math.sin(theta);

    return [lng, lat]; // GeoJSON format: [longitude, latitude]
}

function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateGarageName(): string {
    return `${randomElement(prefixes)} ${randomElement(suffixes)}`;
}

function generateAddress(area: string): string {
    const plotNo = Math.floor(Math.random() * 500) + 1;
    return `Plot No. ${plotNo}, ${area}, Pune, Maharashtra 411001`;
}

function generatePhone(): string {
    const nums = '0123456789';
    let phone = '+919';
    for (let i = 0; i < 9; i++) {
        phone += nums[Math.floor(Math.random() * 10)];
    }
    return phone;
}

async function seedGarages() {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        console.error('MONGODB_URI not found in environment');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected!');

    // Create a temporary user for seeded garages
    const User = mongoose.model('User', new mongoose.Schema({
        firebaseUid: { type: String, required: true, unique: true },
        phoneNumber: { type: String, required: true },
        role: { type: String, enum: ['customer', 'garage'], required: true },
    }));

    const GarageSchema = new mongoose.Schema({
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        email: { type: String },
        phone: { type: String },
        location: {
            address: { type: String },
            coordinates: { type: [Number], index: '2dsphere' },
        },
        serviceHours: { type: String },
        workingDays: [{ type: String }],
        photoUrl: { type: String },
        rating: { type: Number, default: 4.0 },
        totalReviews: { type: Number, default: 0 },
        totalServices: { type: Number, default: 0 },
        businessType: { type: String, default: 'individual' },
        legalBusinessName: { type: String },
        onboardingStatus: { type: String, default: 'completed' },
        isVerified: { type: Boolean, default: true },
    }, { timestamps: true });

    // Ensure 2dsphere index
    GarageSchema.index({ 'location.coordinates': '2dsphere' });

    const Garage = mongoose.models.Garage || mongoose.model('Garage', GarageSchema);

    // Create seed users and garages
    const garages = [];

    console.log('Creating 250 test garages...');

    for (let i = 1; i <= 250; i++) {
        const area = randomElement(puneAreas);
        const coords = randomLocationInPune();
        const phone = generatePhone();

        // Create a seed user for this garage
        const seedUser = await User.findOneAndUpdate(
            { firebaseUid: `seed-garage-${i}` },
            {
                firebaseUid: `seed-garage-${i}`,
                phoneNumber: phone,
                role: 'garage'
            },
            { upsert: true, new: true }
        );

        const garageData = {
            userId: seedUser._id,
            name: generateGarageName(),
            email: `garage${i}@test.com`,
            phone: phone,
            location: {
                address: generateAddress(area),
                coordinates: coords
            },
            serviceHours: randomElement(serviceHoursOptions),
            workingDays: randomElement(workingDaysOptions),
            photoUrl: `https://images.unsplash.com/photo-1517524008410-b44c6059b850?q=80&w=800&sig=${i}`,
            rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)), // 3.5 - 5.0
            totalReviews: Math.floor(Math.random() * 200),
            totalServices: Math.floor(Math.random() * 15) + 1,
            businessType: 'individual',
            legalBusinessName: '',
            onboardingStatus: 'completed',
            isVerified: true
        };

        garages.push(garageData);

        if (i % 50 === 0) {
            console.log(`Created ${i} garages...`);
        }
    }

    // Bulk insert garages
    await Garage.insertMany(garages);

    console.log('\n✅ Successfully seeded 250 garages in Pune!');
    console.log(`Latitude range: ${PUNE_CENTER.lat - RADIUS_KM / 111} to ${PUNE_CENTER.lat + RADIUS_KM / 111}`);
    console.log(`Longitude range: ${PUNE_CENTER.lng - RADIUS_KM / 111} to ${PUNE_CENTER.lng + RADIUS_KM / 111}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
}

seedGarages().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
