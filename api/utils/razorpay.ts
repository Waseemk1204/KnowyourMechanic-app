import Razorpay from 'razorpay';

// Lazy initialization - only create instance when needed
let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
    if (!razorpayInstance) {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            throw new Error('Razorpay API keys not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
        }

        razorpayInstance = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
    }
    return razorpayInstance;
}

// Platform fee in paise (₹1.90 = 190 paise)
export const PLATFORM_FEE_PAISE = 190;

// Check if Razorpay is configured
export function isRazorpayConfigured(): boolean {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

interface CreateLinkedAccountParams {
    email: string;
    phone: string;
    businessName: string;
    businessType: 'individual' | 'partnership' | 'proprietorship' | 'private_limited' | 'public_limited';
    legalBusinessName: string;
    bankAccountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
}

/**
 * Create a Razorpay Linked Account for a garage
 * This allows automatic payment splits via Route
 */
export async function createLinkedAccount(params: CreateLinkedAccountParams): Promise<string> {
    const razorpay = getRazorpay();

    try {
        const account = await razorpay.accounts.create({
            email: params.email,
            phone: params.phone,
            type: 'route',
            legal_business_name: params.legalBusinessName,
            business_type: params.businessType,
            contact_name: params.beneficiaryName,
            profile: {
                category: 'healthcare',
                subcategory: 'clinic',
                addresses: {
                    registered: {
                        street1: 'N/A',
                        city: 'Mumbai',
                        state: 'Maharashtra',
                        postal_code: 400001,
                        country: 'IN',
                    },
                },
            },
            legal_info: {
                pan: 'AAAPA1234A', // Placeholder - should be collected
                gst: '', // Optional
            },
            notes: {
                businessName: params.businessName,
            },
        });

        // Add bank account to the linked account
        if (account.id) {
            await razorpay.accounts.edit(account.id, {
                bank_account: {
                    ifsc_code: params.ifscCode,
                    account_number: params.bankAccountNumber,
                    beneficiary_name: params.beneficiaryName,
                },
            });
        }

        return account.id;
    } catch (error: any) {
        console.error('Razorpay create linked account error:', error);
        throw new Error(error.error?.description || 'Failed to create linked account');
    }
}

interface CreateOrderWithRouteParams {
    amount: number; // in paise
    garageAccountId: string;
    serviceRecordId: string;
}

/**
 * Create a Razorpay order with automatic transfer to garage
 * Platform keeps ₹1.90, rest goes to garage
 */
export async function createOrderWithRoute(params: CreateOrderWithRouteParams) {
    const razorpay = getRazorpay();
    const garageAmount = params.amount - PLATFORM_FEE_PAISE;

    if (garageAmount < 100) {
        throw new Error('Amount too low. Minimum order is ₹2');
    }

    try {
        const order = await razorpay.orders.create({
            amount: params.amount,
            currency: 'INR',
            receipt: params.serviceRecordId,
            transfers: [
                {
                    account: params.garageAccountId,
                    amount: garageAmount,
                    currency: 'INR',
                    notes: {
                        serviceRecordId: params.serviceRecordId,
                    },
                    on_hold: 0, // Transfer immediately
                },
            ],
        });

        return {
            orderId: order.id,
            amount: params.amount,
            platformFee: PLATFORM_FEE_PAISE,
            garageAmount,
        };
    } catch (error: any) {
        console.error('Razorpay create order error:', error);
        throw new Error(error.error?.description || 'Failed to create order');
    }
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    return expectedSignature === signature;
}
