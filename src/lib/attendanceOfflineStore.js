import { mkdirSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const globalForAttendanceStore = globalThis;

export function isTransientAttendanceDatabaseError(error) {
  const candidate = error && typeof error === 'object' ? error : {};
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  const message = String(candidate.message || '').toLowerCase();
  return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(code)
    || message.includes("can't reach database server")
    || message.includes('connection reset')
    || message.includes('connection terminated')
    || message.includes('econnreset')
    || message.includes('econnrefused')
    || message.includes('ehostunreach')
    || message.includes('etimedout');
}

function createDatabase() {
  const filename = process.env.ATTENDANCE_SQLITE_PATH
    ? path.resolve(process.env.ATTENDANCE_SQLITE_PATH)
    : path.join(process.cwd(), '.data', 'attendance-offline.sqlite');

  mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(filename);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS attendance_punch_outbox (
      device_id TEXT NOT NULL,
      device_log_id INTEGER NOT NULL,
      punch_time TEXT NOT NULL,
      payload TEXT NOT NULL,
      received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (device_id, device_log_id, punch_time)
    );
    CREATE TABLE IF NOT EXISTS attendance_cache (
      attendance_date TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      cached_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    chmodSync(filename, 0o600);
  } catch (error) {
    if (process.platform !== 'win32') throw error;
  }

  return database;
}

function getDatabase() {
  if (!globalForAttendanceStore.attendanceOfflineDatabase) {
    globalForAttendanceStore.attendanceOfflineDatabase = createDatabase();
  }
  return globalForAttendanceStore.attendanceOfflineDatabase;
}

export function enqueueAttendancePunches(punches) {
  const database = getDatabase();
  const insert = database.prepare(`
    INSERT OR IGNORE INTO attendance_punch_outbox
      (device_id, device_log_id, punch_time, payload)
    VALUES (?, ?, ?, ?)
  `);
  let inserted = 0;

  database.exec('BEGIN IMMEDIATE');
  try {
    for (const punch of punches) {
      const result = insert.run(
        punch.deviceId,
        punch.deviceLogId,
        punch.punchTime.toISOString(),
        JSON.stringify(punch),
      );
      inserted += Number(result.changes);
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  return inserted;
}

export function getPendingAttendancePunches(limit = 2000) {
  const rows = getDatabase().prepare(`
    SELECT device_id, device_log_id, punch_time, payload
    FROM attendance_punch_outbox
    ORDER BY received_at, device_id, device_log_id
    LIMIT ?
  `).all(limit);

  return rows.map((row) => {
    const punch = JSON.parse(row.payload);
    return {
      ...punch,
      punchTime: new Date(punch.punchTime),
      outboxKey: {
        deviceId: row.device_id,
        deviceLogId: row.device_log_id,
        punchTime: row.punch_time,
      },
    };
  });
}

export function removePendingAttendancePunches(keys) {
  if (keys.length === 0) return;

  const database = getDatabase();
  const remove = database.prepare(`
    DELETE FROM attendance_punch_outbox
    WHERE device_id = ? AND device_log_id = ? AND punch_time = ?
  `);

  database.exec('BEGIN IMMEDIATE');
  try {
    for (const key of keys) {
      remove.run(key.deviceId, key.deviceLogId, key.punchTime);
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function getPendingAttendancePunchCount() {
  const row = getDatabase().prepare(
    'SELECT COUNT(*) AS count FROM attendance_punch_outbox',
  ).get();
  return Number(row.count);
}

export function cacheAttendanceRecords(date, records) {
  if (!date) return;

  const safeRecords = records.map((record) => ({
    employee: {
      id: record.employee.id,
      empId: record.employee.empId,
      name: record.employee.name,
      department: record.employee.department,
    },
    status: record.status,
    shiftType: record.shiftType,
    timeSlots: record.timeSlots,
    date: record.date,
  }));

  getDatabase().prepare(`
    INSERT INTO attendance_cache (attendance_date, payload, cached_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(attendance_date) DO UPDATE SET
      payload = excluded.payload,
      cached_at = CURRENT_TIMESTAMP
  `).run(date, JSON.stringify(safeRecords));
}

export function getCachedAttendanceRecords(date) {
  if (!date) return null;

  const row = getDatabase().prepare(`
    SELECT payload, cached_at FROM attendance_cache WHERE attendance_date = ?
  `).get(date);
  if (!row) return null;

  return {
    records: JSON.parse(row.payload),
    cachedAt: row.cached_at,
  };
}
