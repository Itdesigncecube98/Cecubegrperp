const { spawnSync } = require('child_process');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (command, args) => spawnSync(command, args, { stdio: 'inherit', shell: false });

const build = run(npmCommand, ['run', 'build']);
if (build.error || build.status !== 0) {
  process.exit(build.status || 1);
}

const pm2Check = run('pm2', ['describe', 'dashboard']);
let deploy;
if (process.platform === 'win32') {
  if (pm2Check.status === 0) run('pm2', ['delete', 'dashboard']);
  deploy = run('pm2', ['start', 'scripts/start-production.js', '--name', 'dashboard', '--cwd', process.cwd()]);
} else {
  deploy = run('pm2', pm2Check.status === 0 ? ['restart', 'dashboard'] : ['start', 'npm', '--name', 'dashboard', '--', 'run', 'start']);
}
process.exit(deploy.status || 0);
