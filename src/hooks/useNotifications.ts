import { useEffect, useRef } from 'react';

const getApiUrl = () => {
    return (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:4001/api';
};

const getToken = async () => {
    const { auth } = await import('../lib/firebase');
    return auth.currentUser?.getIdToken();
};

/**
 * Hook to register FCM token and listen for foreground push notifications.
 * Call this once from the customer Home page.
 */
export function useNotifications(onPendingService?: () => void) {
    const registered = useRef(false);

    useEffect(() => {
        if (registered.current) return;
        registered.current = true;

        registerFcmToken(onPendingService);
    }, []);
}

async function registerFcmToken(onPendingService?: () => void) {
    try {
        // Check if browser supports notifications
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            console.log('Push notifications not supported in this browser');
            return;
        }

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return;
        }

        // Get Firebase messaging
        const { getMessaging, getToken: getFcmToken, onMessage } = await import('firebase/messaging');
        const firebaseApp = (await import('../lib/firebase')).default;

        const messaging = getMessaging(firebaseApp);

        // Get VAPID key from env
        const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;

        // Get FCM token
        const fcmToken = await getFcmToken(messaging, {
            vapidKey: vapidKey || undefined,
        });

        if (fcmToken) {
            // Save token to backend
            const authToken = await getToken();
            await fetch(`${getApiUrl()}/customer-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ fcmToken }),
            });
            console.log('FCM token registered');
        }

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
            console.log('Foreground message received:', payload);

            if (payload.data?.type === 'service_approval') {
                // Show browser notification
                new Notification(payload.notification?.title || 'Service Verification', {
                    body: payload.notification?.body || 'A garage has recorded a service. Tap to review.',
                    icon: '/icon-192.png',
                });

                // Trigger callback to refresh pending approvals
                onPendingService?.();
            }
        });
    } catch (error) {
        console.error('FCM registration error:', error);
    }
}
