import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cecube.dashboard',
  appName: 'CeCube Employee Dashboard',
  webDir: 'www',
  server: {
    url: 'https://cecubeerp.duckdns.org/employeedashboard/login'
  }
};

export default config;