import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBBhImobV1ED50eSvtoV0sSpBMqjH3pLF8",
    authDomain: "knowyourmechanic-32246.firebaseapp.com",
    projectId: "knowyourmechanic-32246",
    storageBucket: "knowyourmechanic-32246.firebasestorage.app",
    messagingSenderId: "1043163825972",
    appId: "1:1043163825972:web:d929881567c5478a534761",
    measurementId: "G-4PFM0JHJ4W"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
