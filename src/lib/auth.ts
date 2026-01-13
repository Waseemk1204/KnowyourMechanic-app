import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type ConfirmationResult
} from 'firebase/auth';
import { auth } from './firebase';

export const isNative = Capacitor.isNativePlatform();

let webConfirmationResult: ConfirmationResult | null = null;
let nativeVerificationId: string | null = null;
let autoVerifiedUser: any = null;

export async function sendOtp(phoneNumber: string): Promise<void> {
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
    console.log('Sending OTP to:', formattedPhone);

    nativeVerificationId = null;
    autoVerifiedUser = null;

    if (isNative) {
        return new Promise<void>(async (resolve, reject) => {
            let resolved = false;

            const codeSentListener = await FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
                nativeVerificationId = event.verificationId;
                if (!resolved) {
                    resolved = true;
                    codeSentListener.remove();
                    verificationCompletedListener.then(l => l.remove());
                    resolve();
                }
            });

            const verificationCompletedListener = FirebaseAuthentication.addListener('phoneVerificationCompleted', (event) => {
                autoVerifiedUser = event.credential;
                if (!resolved) {
                    resolved = true;
                    codeSentListener.remove();
                    verificationCompletedListener.then(l => l.remove());
                    resolve();
                }
            });

            const verificationFailedListener = await FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
                verificationFailedListener.remove();
                codeSentListener.remove();
                verificationCompletedListener.then(l => l.remove());
                if (!resolved) {
                    resolved = true;
                    reject(new Error(event.message || 'Phone verification failed'));
                }
            });

            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    codeSentListener.remove();
                    verificationCompletedListener.then(l => l.remove());
                    verificationFailedListener.remove();
                    reject(new Error('Timeout waiting for phone verification.'));
                }
            }, 60000);

            try {
                await FirebaseAuthentication.signInWithPhoneNumber({
                    phoneNumber: formattedPhone,
                    timeout: 60,
                });
            } catch (error: any) {
                codeSentListener.remove();
                verificationCompletedListener.then(l => l.remove());
                verificationFailedListener.remove();
                if (!resolved) {
                    resolved = true;
                    reject(error);
                }
            }
        });
    } else {
        // Clear any existing verifier first
        if ((window as any).recaptchaVerifier) {
            try {
                (window as any).recaptchaVerifier.clear();
            } catch (e) {
                console.log('Could not clear existing verifier');
            }
            (window as any).recaptchaVerifier = null;
        }

        // Create new verifier with visible reCAPTCHA for debugging
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'normal',
            callback: () => {
                console.log('reCAPTCHA solved');
            },
            'expired-callback': () => {
                console.log('reCAPTCHA expired');
            }
        });

        try {
            await (window as any).recaptchaVerifier.render();
            webConfirmationResult = await signInWithPhoneNumber(
                auth,
                formattedPhone,
                (window as any).recaptchaVerifier
            );
        } catch (error: any) {
            console.error('Phone auth error:', error);
            (window as any).recaptchaVerifier = null;
            throw error;
        }
    }
}

export function isAutoVerified(): boolean {
    return autoVerifiedUser !== null;
}

export async function verifyOtp(code: string): Promise<any> {
    if (isNative) {
        if (autoVerifiedUser) {
            const user = autoVerifiedUser;
            autoVerifiedUser = null;
            return user;
        }

        if (!nativeVerificationId) {
            throw new Error('No verification ID found. Please request OTP again.');
        }

        const result = await FirebaseAuthentication.confirmVerificationCode({
            verificationId: nativeVerificationId,
            verificationCode: code,
        });

        nativeVerificationId = null;
        return result.user;
    } else {
        if (!webConfirmationResult) {
            throw new Error('No confirmation result found. Please request OTP again.');
        }

        const result = await webConfirmationResult.confirm(code);
        return result.user;
    }
}

export async function signOut(): Promise<void> {
    if (isNative) {
        await FirebaseAuthentication.signOut();
    }
    await auth.signOut();
}

export function getCurrentUser() {
    return auth.currentUser;
}
