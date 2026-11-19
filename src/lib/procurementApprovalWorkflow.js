export const PROCUREMENT_DOCUMENT_TYPES = {
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  WORK_ORDER: 'WORK_ORDER',
};

export const PURCHASE_MANAGER_APPROVER_ID = '__PURCHASE_MANAGER__';
export const CONTRACT_MANAGER_APPROVER_ID = '__CONTRACT_MANAGER__';

export async function getProcurementApprovalConfig(db) {
  const settings = await db.systemSettings.findUnique({
    where: { id: 1 },
    select: { purchaseWorkOrderApprovalConfig: true },
  });
  const config = settings?.purchaseWorkOrderApprovalConfig;
  return config && Array.isArray(config.levels) ? config : { levels: [] };
}

export function getApplicableApprovalStages(config, amount) {
  const total = Number(amount) || 0;
  return (Array.isArray(config?.levels) ? config.levels : [])
    .map(level => ({
      threshold: Number(level.threshold),
      approverEmployeeIds: Array.isArray(level.approverEmployeeIds) ? level.approverEmployeeIds : [],
    }))
    .filter(level => Number.isFinite(level.threshold) && level.threshold > 0 && total > level.threshold)
    .sort((first, second) => first.threshold - second.threshold)
    .map((level, index) => ({ ...level, stage: index + 1 }));
}

export function buildPendingApprovalRows(stages) {
  return stages.flatMap(({ stage, threshold, approverEmployeeIds }) =>
    approverEmployeeIds.map(approverEmployeeId => ({
      stage,
      threshold,
      approverEmployeeId,
      status: 'PENDING',
    }))
  );
}

export function buildPurchaseOrderApprovalRows(stages) {
  return [
    {
      stage: 0,
      threshold: 0,
      approverEmployeeId: PURCHASE_MANAGER_APPROVER_ID,
      status: 'PENDING',
    },
    ...buildPendingApprovalRows(stages),
  ];
}

export function addPurchaseManagerApprovalRow(rows) {
  if (rows.some(row => row.stage === 0 && row.approverEmployeeId === PURCHASE_MANAGER_APPROVER_ID)) {
    return rows;
  }
  return [
    {
      stage: 0,
      threshold: 0,
      approverEmployeeId: PURCHASE_MANAGER_APPROVER_ID,
      status: 'PENDING',
    },
    ...rows,
  ];
}

export function buildWorkOrderApprovalRows(stages) {
  return [
    {
      stage: 0,
      threshold: 0,
      approverEmployeeId: CONTRACT_MANAGER_APPROVER_ID,
      status: 'PENDING',
    },
    ...buildPendingApprovalRows(stages),
  ];
}

export function addContractManagerApprovalRow(rows) {
  if (rows.some(row => row.stage === 0 && row.approverEmployeeId === CONTRACT_MANAGER_APPROVER_ID)) {
    return rows;
  }
  return [
    {
      stage: 0,
      threshold: 0,
      approverEmployeeId: CONTRACT_MANAGER_APPROVER_ID,
      status: 'PENDING',
    },
    ...rows,
  ];
}

export function summarizeApprovalSteps(rows = []) {
  const byStage = new Map();
  rows.forEach(row => {
    const stageRows = byStage.get(row.stage) || [];
    stageRows.push(row);
    byStage.set(row.stage, stageRows);
  });
  const stages = Array.from(byStage.entries()).sort(([first], [second]) => first - second);
  const currentStage = stages.find(([, stageRows]) => stageRows.some(row => row.status !== 'APPROVED'));
  const currentStageRows = currentStage?.[1] || stages[stages.length - 1]?.[1] || [];
  const approvedCount = rows.filter(row => row.status === 'APPROVED').length;

  return {
    required: rows.length > 0,
    stageCount: stages.filter(([stage]) => stage > 0).length,
    currentStage: currentStage?.[0] ?? null,
    currentApproverIds: currentStageRows.filter(row => row.status !== 'APPROVED').map(row => row.approverEmployeeId),
    currentStageApprovedCount: currentStageRows.filter(row => row.status === 'APPROVED').length,
    currentStageApproverCount: currentStageRows.length,
    approvedCount,
    totalApproverCount: rows.length,
    complete: rows.length > 0 && approvedCount === rows.length,
  };
}

export async function replaceDocumentApprovalSteps(db, documentType, documentId, stages) {
  return replaceDocumentApprovalRows(
    db,
    documentType,
    documentId,
    buildPendingApprovalRows(stages)
  );
}

export async function replaceDocumentApprovalRows(db, documentType, documentId, rows) {
  await db.documentApprovalStep.deleteMany({ where: { documentType, documentId } });
  const documentRows = rows.map(row => ({ ...row, documentType, documentId }));
  if (documentRows.length) await db.documentApprovalStep.createMany({ data: documentRows });
  return documentRows;
}
