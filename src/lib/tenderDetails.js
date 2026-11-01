function isValidDate(value) {
  if (!value) return true;
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function normalizeText(value, field, limit = 500) {
  if (value == null) return '';
  if (typeof value !== 'string') throw new Error(`${field} must be text.`);
  return value.trim().slice(0, limit);
}

function normalizePaymentStructure(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error('Payment structure must contain no more than 100 milestones.');
  }
  return value.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Payment milestone ${index + 1} is invalid.`);
    }
    const rawRate = row.rate === '' || row.rate == null ? null : Number(row.rate);
    if (rawRate !== null && (!Number.isFinite(rawRate) || rawRate < 0)) {
      throw new Error(`Payment milestone ${index + 1} rate must be a non-negative number.`);
    }
    const effectiveDate = normalizeText(row.effectiveDate, 'Effective date', 10);
    if (!isValidDate(effectiveDate)) throw new Error(`Payment milestone ${index + 1} has an invalid effective date.`);
    return {
      milestone: normalizeText(row.milestone, 'Milestone name', 200),
      rate: rawRate,
      unit: normalizeText(row.unit, 'Rate unit', 50),
      paymentTerms: normalizeText(row.paymentTerms, 'Payment terms', 1000),
      effectiveDate,
    };
  });
}

function normalizeMeetings(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) {
    throw new Error('Tender may have no more than 100 face-to-face meetings.');
  }
  return value.map((meeting, index) => {
    if (!meeting || typeof meeting !== 'object' || Array.isArray(meeting)) {
      throw new Error(`Meeting ${index + 1} is invalid.`);
    }
    const date = normalizeText(meeting.date, 'Meeting date', 10);
    if (!isValidDate(date)) throw new Error(`Meeting ${index + 1} has an invalid date.`);
    const employeeIds = Array.isArray(meeting.employeeIds)
      ? [...new Set(meeting.employeeIds.filter(id => typeof id === 'string').map(id => id.trim()).filter(Boolean))]
      : [];
    return {
      date,
      time: normalizeText(meeting.time, 'Meeting time', 5),
      location: normalizeText(meeting.location, 'Meeting location', 300),
      kindlyAttention: normalizeText(meeting.kindlyAttention, 'Kindly Attention', 200),
      employeeIds,
      remarks: normalizeText(meeting.remarks, 'Meeting details', 2000),
    };
  });
}

export function normalizeTenderDetails(input, previousDetails = {}, { initializeRevision = false, userId = null } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Tender details must be an object.');
  }

  const details = { ...input };
  for (const field of ['tenderOpeningDate', 'tenderClosingDate', 'paymentRevisionEffectiveDate']) {
    if (details[field] !== undefined && !isValidDate(details[field])) {
      throw new Error(`${field} must use a valid YYYY-MM-DD date.`);
    }
  }
  if (
    details.tenderOpeningDate &&
    details.tenderClosingDate &&
    details.tenderClosingDate < details.tenderOpeningDate
  ) {
    throw new Error('Tender closing date must be on or after the opening date.');
  }

  details.tenderLocation = normalizeText(details.tenderLocation, 'Tender location', 300);
  details.kindlyAttention = normalizeText(details.kindlyAttention, 'Kindly Attention', 200);
  details.faceToFaceMeetings = normalizeMeetings(details.faceToFaceMeetings);
  details.paymentStructure = normalizePaymentStructure(details.paymentStructure);

  const previousStructure = normalizePaymentStructure(previousDetails.paymentStructure || []);
  const structureChanged = JSON.stringify(previousStructure) !== JSON.stringify(details.paymentStructure);
  const revisionRemarks = normalizeText(details.paymentRevisionRemarks, 'Revision reason', 1000);
  if (structureChanged && previousStructure.length > 0 && !revisionRemarks) {
    throw new Error('Add a reason before saving a payment structure revision.');
  }
  const revisions = Array.isArray(previousDetails.paymentRevisions)
    ? previousDetails.paymentRevisions
    : [];
  details.paymentRevisions = revisions;

  if (structureChanged && (initializeRevision || previousStructure.length > 0 || details.paymentStructure.length > 0)) {
    const today = new Date().toISOString().slice(0, 10);
    details.paymentRevisions = [
      ...revisions,
      {
        revisionNumber: revisions.length + 1,
        changedAt: new Date().toISOString(),
        effectiveDate: details.paymentRevisionEffectiveDate || today,
        remarks: revisionRemarks,
        userId: userId || null,
        structure: details.paymentStructure,
      },
    ];
  }

  delete details.paymentRevisionRemarks;
  return {
    details,
    structureChanged,
    previousStructure,
    currentStructure: details.paymentStructure,
    revision: details.paymentRevisions.at(-1) || null,
  };
}
