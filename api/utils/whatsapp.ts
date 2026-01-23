import fetch from 'node-fetch';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface WhatsAppResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Send a WhatsApp message using Meta Cloud API
 */
async function sendWhatsAppMessage(
    to: string,
    templateName: string,
    templateParams: string[],
    language: string = 'en'
): Promise<WhatsAppResponse> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        console.log('WhatsApp credentials not configured');
        return { success: false, error: 'WhatsApp not configured' };
    }

    // Format phone number (remove + and ensure country code)
    const formattedPhone = to.replace(/\D/g, '');
    const phoneWithCountry = formattedPhone.startsWith('91')
        ? formattedPhone
        : `91${formattedPhone}`;

    try {
        const response = await fetch(
            `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phoneWithCountry,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: language },
                        components: [
                            {
                                type: 'body',
                                parameters: templateParams.map(text => ({
                                    type: 'text',
                                    text
                                }))
                            }
                        ]
                    }
                })
            }
        );

        const data = await response.json() as any;

        if (response.ok && data.messages?.[0]?.id) {
            return { success: true, messageId: data.messages[0].id };
        } else {
            console.error('WhatsApp API error:', data);
            return { success: false, error: data.error?.message || 'Failed to send message' };
        }
    } catch (error: any) {
        console.error('WhatsApp send error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send OTP via WhatsApp
 * Note: Requires an approved "otp_verification" template in Meta Business Manager
 */
export async function sendOtpWhatsApp(phoneNumber: string, otp: string): Promise<WhatsAppResponse> {
    return sendWhatsAppMessage(
        phoneNumber,
        'otp_verification', // Template name - must be approved in Meta
        [otp]
    );
}

/**
 * Send service invoice via WhatsApp
 * Note: Requires an approved "service_invoice" template in Meta Business Manager
 */
export async function sendInvoiceWhatsApp(
    phoneNumber: string,
    customerName: string,
    garageName: string,
    serviceDescription: string,
    amount: number,
    date: string
): Promise<WhatsAppResponse> {
    return sendWhatsAppMessage(
        phoneNumber,
        'service_invoice', // Template name - must be approved in Meta
        [
            customerName,
            garageName,
            serviceDescription,
            amount.toString(),
            date
        ]
    );
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
    return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}
