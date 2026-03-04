// Firebase Cloud Messaging Service Worker
// Config is injected at build time by vite.config.ts — do NOT hardcode keys here

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// __FIREBASE_CONFIG__ is replaced at build time by the Vite plugin
firebase.initializeApp(__FIREBASE_CONFIG__);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message:', payload);

    const title = payload.notification?.title || 'KnowYourMechanic';
    const options = {
        body: payload.notification?.body || '',
        icon: '/logo.png',
        badge: '/logo.png',
        data: payload.data,
    };

    self.registration.showNotification(title, options);
});
