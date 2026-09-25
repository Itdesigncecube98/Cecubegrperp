import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cecube.employee.dashboard',
  appName: 'CeCube Employee Dashboard',
  webDir: 'www',
  server: {
    url: 'http://192.168.1.81:8080',
    cleartext: true
  }
};

export default config;
