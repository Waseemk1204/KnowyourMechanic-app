// Uses native fetch (Node 18+)

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

interface WhatsAppResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Get WhatsApp configuration
 */
function getConfig() {
    return {
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
        businessName: process.env.WHATSAPP_BUSINESS_NAME || 'KnowyourMechanic',
    };
}

/**
 * Format phone number for WhatsApp (Indian format)
 */
function formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.startsWith('91') ? digits : `91${digits}`;
}

/**
 * Upload media (PDF) to Meta's servers and get a media_id
 */
async function uploadMedia(
    buffer: Buffer,
    mimeType: string,
    filename: string
): Promise<{ mediaId?: string; error?: string }> {
    const { phoneNumberId, accessToken } = getConfig();

    if (!phoneNumberId || !accessToken) {
        return { error: 'WhatsApp not configured' };
    }

    try {
        // Create a Blob from the buffer for FormData
        const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });

        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', blob, filename);
        formData.append('type', mimeType);

        const response = await fetch(
            `${WHATSAPP_API_URL}/${phoneNumberId}/media`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: formData,
            }
        );

        const data = await response.json() as any;

        if (response.ok && data.id) {
            console.log(`Media uploaded successfully: ${data.id}`);
            return { mediaId: data.id };
        } else {
            console.error('Media upload error:', data);
            return { error: data.error?.message || 'Media upload failed' };
        }
    } catch (error: any) {
        console.error('Media upload error:', error);
        return { error: error.message };
    }
}

/**
 * Send a WhatsApp template message (text-only)
 */
async function sendWhatsAppMessage(
    to: string,
    templateName: string,
    templateParams: string[],
    language: string = 'en'
): Promise<WhatsAppResponse> {
    const { phoneNumberId, accessToken } = getConfig();

    if (!phoneNumberId || !accessToken) {
        console.log('WhatsApp credentials not configured');
        return { success: false, error: 'WhatsApp not configured' };
    }

    const phoneWithCountry = formatPhone(to);

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
 * Send a WhatsApp template message with a document header (PDF invoice)
 */
async function sendDocumentTemplate(
    to: string,
    templateName: string,
    mediaId: string,
    pdfFilename: string,
    bodyParams: string[],
    language: string = 'en'
): Promise<WhatsAppResponse> {
    const { phoneNumberId, accessToken } = getConfig();

    if (!phoneNumberId || !accessToken) {
        return { success: false, error: 'WhatsApp not configured' };
    }

    const phoneWithCountry = formatPhone(to);

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
                                type: 'header',
                                parameters: [
                                    {
                                        type: 'document',
                                        document: {
                                            id: mediaId,
                                            filename: pdfFilename,
                                        }
                                    }
                                ]
                            },
                            {
                                type: 'body',
                                parameters: bodyParams.map(text => ({
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
            console.error('WhatsApp document template error:', data);
            return { success: false, error: data.error?.message || 'Failed to send document template' };
        }
    } catch (error: any) {
        console.error('WhatsApp document send error:', error);
        return { success: false, error: error.message };
    }
}

// ─── PUBLIC API ───────────────────────────────────────────

/**
 * Send service confirmation code via WhatsApp with service details
 * Uses the "service_otp" template with garage name, description, amount, and confirmation code
 * Parameters map by position to: {{garage_name}}, {{service_description}}, {{service_amount}}, {{confirmation_code}}
 */
export async function sendOtpWhatsApp(
    phoneNumber: string,
    otp: string,
    serviceDetails?: {
        garageName: string;
        description: string;
        amount: number;
    }
): Promise<WhatsAppResponse> {
    if (serviceDetails) {
        return sendWhatsAppMessage(
            phoneNumber,
            'service_otp',
            [
                serviceDetails.garageName,
                serviceDetails.description,
                `${serviceDetails.amount}`,
                otp,
            ]
        );
    }
    // Fallback to simple OTP template if no details provided
    return sendWhatsAppMessage(
        phoneNumber,
        'otp_verification',
        [otp]
    );
}

/**
 * Send service invoice via WhatsApp with PDF attachment
 * Requires an approved "service_invoice" template with Document header
 *
 * Flow: Upload PDF → Send template message with document header + body params
 */
export async function sendInvoiceWithPdf(
    phoneNumber: string,
    pdfBuffer: Buffer,
    invoiceNumber: string,
    params: {
        customerName: string;
        garageName: string;
        serviceDescription: string;
        amount: number;
        platformFee: number;
        date: string;
        appLink?: string;
    }
): Promise<WhatsAppResponse> {
    // Step 1: Upload PDF
    const filename = `Invoice-${invoiceNumber}.pdf`;
    const uploadResult = await uploadMedia(pdfBuffer, 'application/pdf', filename);

    if (!uploadResult.mediaId) {
        console.error('PDF upload failed:', uploadResult.error);
        // Fallback: send text-only template (without document)
        return sendInvoiceWhatsApp(
            phoneNumber,
            params.customerName,
            params.garageName,
            params.serviceDescription,
            params.amount,
            params.date
        );
    }

    // Step 2: Send template with document header
    const bodyParams = [
        params.customerName,
        params.garageName,
        params.serviceDescription,
        params.amount.toFixed(2),
        params.platformFee.toFixed(2),
        params.date,
        params.appLink || 'https://knowyourmechanic.com',
    ];

    return sendDocumentTemplate(
        phoneNumber,
        'service_invoice',
        uploadResult.mediaId,
        filename,
        bodyParams
    );
}

/**
 * Send service invoice via WhatsApp (text-only fallback)
 * Used when PDF upload fails or as a standalone option
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
        'service_invoice_text',
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
