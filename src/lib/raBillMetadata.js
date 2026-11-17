const TASK_LINES_PREFIX = '__TASK_LINES__:';
const RA_BILL_METADATA_PREFIX = '__RA_BILL_META__:';

export function parseRABillRemarks(value) {
  let remainder = String(value || '');
  let taskLines = [];
  let metadata = {};

  while (remainder.startsWith(TASK_LINES_PREFIX) || remainder.startsWith(RA_BILL_METADATA_PREFIX)) {
    const newlineIndex = remainder.indexOf('\n');
    const line = newlineIndex === -1 ? remainder : remainder.slice(0, newlineIndex);
    const payload = line.startsWith(TASK_LINES_PREFIX)
      ? line.slice(TASK_LINES_PREFIX.length)
      : line.slice(RA_BILL_METADATA_PREFIX.length);
    try {
      if (line.startsWith(TASK_LINES_PREFIX)) taskLines = JSON.parse(payload);
      else metadata = JSON.parse(payload);
    } catch {
      if (line.startsWith(TASK_LINES_PREFIX)) taskLines = [];
      else metadata = {};
    }
    remainder = newlineIndex === -1 ? '' : remainder.slice(newlineIndex + 1);
  }

  return { taskLines, metadata, remarks: remainder.trim() };
}

export function serializeRABillRemarks({ taskLines = [], metadata = {}, remarks = '' }) {
  const lines = [];
  if (Array.isArray(taskLines) && taskLines.length) {
    lines.push(`${TASK_LINES_PREFIX}${JSON.stringify(taskLines)}`);
  }
  if (Object.values(metadata).some(value => String(value ?? '').trim())) {
    lines.push(`${RA_BILL_METADATA_PREFIX}${JSON.stringify(metadata)}`);
  }
  if (String(remarks || '').trim()) lines.push(String(remarks).trim());
  return lines.join('\n');
}
