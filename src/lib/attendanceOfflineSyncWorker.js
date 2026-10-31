let started = false;
let inFlight = false;
let lastLoggedError = '';

export function startAttendanceOfflineSyncWorker() {
  if (started) return;
  if (!process.env.ATTENDANCE_API_KEY) {
    console.error('Attendance SQLite outbox sync is disabled because ATTENDANCE_API_KEY is not configured.');
    return;
  }
  started = true;

  const port = process.env.PORT || '3000';
  const baseUrl = process.env.ATTENDANCE_INTERNAL_URL || `http://127.0.0.1:${port}`;
  const sync = async () => {
    if (inFlight) return;
    inFlight = true;

    try {
      const response = await fetch(`${baseUrl}/api/attendance/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ATTENDANCE_API_KEY,
        },
        body: JSON.stringify({ source: 'sqlite-outbox-sync', punches: [] }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        throw new Error(`attendance outbox sync returned HTTP ${response.status}`);
      }
      const result = await response.json();
      if (result.pendingSync > 0) {
        throw new Error(`${result.pendingSync} attendance punch(es) remain queued`);
      }
      lastLoggedError = '';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== lastLoggedError) {
        console.error('Attendance SQLite outbox sync will retry:', message);
        lastLoggedError = message;
      }
    } finally {
      inFlight = false;
    }
  };

  const timer = setInterval(sync, 30000);
  timer.unref();
  void sync();
}
