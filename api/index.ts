import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import garagesRoutes from './routes/garages.js';
import bookingsRoutes from './routes/bookings.js';
import servicesRoutes from './routes/services.js';
import serviceRecordsRoutes from './routes/service-records.js';
import onboardingRoutes from './routes/onboarding.js';
import reviewsRoutes from './routes/reviews.js';
import whatsappRoutes from './routes/whatsapp.js';
import reportsRoutes from './routes/reports.js';
import customerProfileRoutes from './routes/customer-profile.js';
import paymentsRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import employeeRoutes from './routes/employee.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/garages', garagesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/service-records', serviceRecordsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/customer-profile', customerProfileRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
