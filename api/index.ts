import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
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
const isProduction = process.env.NODE_ENV === 'production';

// ─── SECURITY MIDDLEWARE ──────────────────────────────────
// Helmet sets secure HTTP headers (XSS, clickjacking, etc.)
app.use(helmet());

// CORS — whitelist allowed origins instead of wildcard
const allowedOrigins = [
    'http://localhost:5173',       // Vite dev server
    'http://localhost:4001',       // Local API
    'https://knowyourmechanic.com',
    'https://www.knowyourmechanic.com',
    process.env.FRONTEND_URL,     // Configurable via env
].filter(Boolean) as string[];

app.use(cors({
    origin: isProduction
        ? (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: Origin ${origin} not allowed`));
            }
        }
        : true, // Allow all origins in development
    credentials: true,
}));

// ─── RATE LIMITING ────────────────────────────────────────
// Global rate limit: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' },
});
app.use('/api/', globalLimiter);

// Strict rate limit for auth-sensitive endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 20 : 200,
    message: { message: 'Too many authentication attempts. Please try again later.' },
});

// ─── BODY PARSING & LOGGING ──────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── ROUTES ───────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/garages', garagesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/service-records', serviceRecordsRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/whatsapp', authLimiter, whatsappRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/customer-profile', customerProfileRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────
// Catches unhandled errors to prevent stack trace leaks
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        message: isProduction ? 'Internal server error' : err.message,
    });
});

// ─── START SERVER (development only; Vercel uses the export) ──
if (!isProduction) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export default app;
