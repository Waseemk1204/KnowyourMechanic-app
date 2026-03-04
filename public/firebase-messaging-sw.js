// Firebase Cloud Messaging Service Worker
// This file MUST live at the root of the public directory

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyAjwzp9H99YwIqp4knPgA95W_OjuSeWxWM',
    authDomain: 'knowyour-mechanic.firebaseapp.com',
    projectId: 'knowyour-mechanic',
    storageBucket: 'knowyour-mechanic.firebasestorage.app',
    messagingSenderId: '11256763632',
    appId: '1:11256763632:web:329566a04a1331e8579e35',
});

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
