const { spawn } = require('child_process');

// 1. Remove existing
console.log('Removing existing DATABASE_URL...');
const rm = spawn('npx', ['vercel', 'env', 'rm', 'DATABASE_URL', 'production', '-y'], { shell: true, stdio: 'inherit' });

rm.on('close', (code) => {
  console.log('Removed with code', code);
  
  // 2. Add new
  console.log('Adding new DATABASE_URL...');
  const add = spawn('npx', ['vercel', 'env', 'add', 'DATABASE_URL', 'production'], { shell: true, stdio: ['pipe', 'inherit', 'inherit'] });
  
  add.stdin.write('postgresql://postgres.ocpnoxdnounlqycretfw:cr7juvesewy%40@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true\n');
  add.stdin.end();
  
  add.on('close', (code2) => {
    console.log('Added with code', code2);
  });
});
