import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.calendar.app',
  appName: '日历',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6'
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#3b82f6'
    }
  }
};

export default config;
