import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fittrackai.app',
  appName: 'FitTrack AI',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email', 'https://www.googleapis.com/auth/fitness.activity.read', 'https://www.googleapis.com/auth/fitness.body.read'],
      serverClientId: '393563449346-h9l7hrac2c7j6sto53smh682mqn8rib5.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
