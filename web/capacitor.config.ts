import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cecube.employee.dashboard',
  appName: 'CeCube Employee Dashboard',
  webDir: 'www',
  server: {
    url: 'http://172.236.185.37/employeedashboard/login',
    cleartext: true
  }
};

export default config;
