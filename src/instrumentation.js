export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { startAttendanceOfflineSyncWorker } = await import(
    './lib/attendanceOfflineSyncWorker'
  );
  startAttendanceOfflineSyncWorker();
}
