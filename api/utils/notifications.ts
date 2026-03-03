import admin from './firebaseAdmin.js';

interface ServiceNotificationPayload {
    garageName: string;
    description: string;
    amount: number;
    serviceId: string;
}

/**
 * Send a push notification to a customer for service approval
 * Uses Firebase Cloud Messaging (FCM) — completely free
 */
export async function sendServiceApprovalNotification(
    fcmToken: string,
    payload: ServiceNotificationPayload
): Promise<{ success: boolean; error?: string }> {
    try {
        const messageId = await admin.messaging().send({
            token: fcmToken,
            notification: {
                title: `${payload.garageName} recorded a service`,
                body: `${payload.description} — Rs.${payload.amount}. Tap to approve or reject.`,
            },
            data: {
                type: 'service_approval',
                serviceId: payload.serviceId,
                garageName: payload.garageName,
                description: payload.description,
                amount: payload.amount.toString(),
            },
            webpush: {
                fcmOptions: {
                    link: '/customer',
                },
                notification: {
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    requireInteraction: true,
                    actions: [
                        { action: 'approve', title: '✅ Approve' },
                        { action: 'reject', title: '❌ Reject' },
                    ],
                },
            },
        });

        console.log(`FCM notification sent: ${messageId}`);
        return { success: true };
    } catch (error: any) {
        console.error('FCM send error:', error);

        // If token is invalid/expired, return specific error
        if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
            return { success: false, error: 'token_expired' };
        }

        return { success: false, error: error.message };
    }
}
