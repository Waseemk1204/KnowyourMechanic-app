import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { sendOtpWhatsApp, sendInvoiceWhatsApp, isWhatsAppConfigured } from '../utils/whatsapp';

const router = Router();

/**
 * Send OTP via WhatsApp
 * POST /api/whatsapp/send-otp
 */
router.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({ message: 'Phone number and OTP required' });
        }

        if (!isWhatsAppConfigured()) {
            return res.status(503).json({ message: 'WhatsApp not configured' });
        }

        const result = await sendOtpWhatsApp(phoneNumber, otp);

        if (result.success) {
            res.json({ success: true, messageId: result.messageId });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        console.error('WhatsApp OTP error:', error);
        res.status(500).json({ message: error.message });
    }
});

/**
 * Send invoice via WhatsApp
 * POST /api/whatsapp/send-invoice
 */
router.post('/send-invoice', authenticate, async (req, res) => {
    try {
        const { phoneNumber, customerName, garageName, serviceDescription, amount, date } = req.body;

        if (!phoneNumber || !garageName || !serviceDescription || !amount) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (!isWhatsAppConfigured()) {
            return res.status(503).json({ message: 'WhatsApp not configured' });
        }

        const result = await sendInvoiceWhatsApp(
            phoneNumber,
            customerName || 'Customer',
            garageName,
            serviceDescription,
            amount,
            date || new Date().toLocaleDateString('en-IN')
        );

        if (result.success) {
            res.json({ success: true, messageId: result.messageId });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error: any) {
        console.error('WhatsApp invoice error:', error);
        res.status(500).json({ message: error.message });
    }
});

/**
 * Check WhatsApp configuration status
 * GET /api/whatsapp/status
 */
router.get('/status', (req, res) => {
    res.json({ configured: isWhatsAppConfigured() });
});

export default router;
