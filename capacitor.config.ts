import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.knowyourmechanic.app',
    appName: 'KnowYourMechanic',
    webDir: 'dist',
    plugins: {
        SplashScreen: {
            launchAutoHide: true,
            backgroundColor: '#020617',
            showSpinner: false,
        },
        FirebaseAuthentication: {
            skipNativeAuth: false,
            providers: ['phone'],
        },
    },
};

export default config;
