const { spawnSync } = require('child_process');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const envVars = envFile.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));

for (const line of envVars) {
  const [key, ...rest] = line.split('=');
  const value = rest.join('=').replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  
  if (!key || !value) continue;
  
  console.log(`Processing ${key}...`);
  
  // Remove if exists
  spawnSync('npx', ['vercel', 'env', 'rm', key, 'production', '-y'], { shell: true });
  spawnSync('npx', ['vercel', 'env', 'rm', key, 'preview', '-y'], { shell: true });
  spawnSync('npx', ['vercel', 'env', 'rm', key, 'development', '-y'], { shell: true });
  
  // Add to all environments
  for (const envName of ['production', 'preview', 'development']) {
    const addProc = spawnSync('npx', ['vercel', 'env', 'add', key, envName], {
      input: value + '\n',
      shell: true,
      encoding: 'utf8'
    });
    
    if (addProc.status === 0) {
      console.log(`Successfully added ${key} to ${envName}`);
    } else {
      console.error(`Failed to add ${key} to ${envName}:`, addProc.stderr || addProc.stdout);
    }
  }
}
console.log('All credentials pushed!');
