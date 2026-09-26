const normalizeMaterial = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const generateHsnSacCode = (name, index = 0) => {
  const text = String(name || '').trim().toUpperCase();
  if (!text) return `HSN-${String(index + 1).padStart(4, '0')}`;
  let hash = 0;
  for (let position = 0; position < text.length; position += 1) {
    hash = (hash * 31 + text.charCodeAt(position)) % 1000000;
  }
  return String(hash || index + 1).padStart(6, '0');
};

const materialNamesMatch = (left, right) => {
  const first = normalizeMaterial(left);
  const second = normalizeMaterial(right);
  if (!first || !second) return false;
  if (first === second || first.includes(second) || second.includes(first)) return true;

  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= second.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1)
      );
    }
    previous = current;
  }
  return previous[second.length] <= Math.max(2, Math.floor(Math.max(first.length, second.length) * 0.1));
};

const acceptedQuantity = (accepted, received, rejected = 0, retained = 0) => {
  const acceptedQty = Math.max(0, Number(accepted) || 0);
  const receivedQty = Math.max(0, Number(received) || acceptedQty);
  const excludedQty = Math.max(0, Number(rejected) || 0) + Math.max(0, Number(retained) || 0);
  return Math.min(acceptedQty, Math.max(0, receivedQty - excludedQty));
};

export async function getPurchaseBillPreview(prisma, poNumber) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { poNumber },
    include: {
      items: { orderBy: { sNo: 'asc' } },
      grns: { include: { items: true } }
    }
  });
  if (!po) return null;

  const siteGrns = await prisma.siteGRN.findMany({
    where: { poNo: poNumber },
    include: { items: true }
  });
  const grnNos = siteGrns.map(grn => grn.grnNo).filter(Boolean);
  const gtnWhere = [];
  if (grnNos.length) gtnWhere.push({ items: { some: { grnSrNo: { in: grnNos } } } });
  gtnWhere.push({ purchaseOrderNo: poNumber });
  const gtns = await prisma.siteGTN.findMany({
    where: { OR: gtnWhere },
    include: { items: true }
  });

  const items = po.items.map((poItem, index) => {
    let quantity = 0;

    if (siteGrns.length > 0) {
      const materialKey = normalizeMaterial(poItem.description);
      const matchingRows = siteGrns.flatMap(grn => grn.items
        .filter(item => materialNamesMatch(item.materialName, poItem.description))
        .map(item => ({ grn, item })));
      let remainingPoQty = Math.max(0, Number(poItem.quantity) || 0);
      for (const { grn, item } of matchingRows) {
        if (remainingPoQty <= 0) break;
        const received = Number(item.quantity) || 0;
        const accepted = acceptedQuantity(item.acceptedQty, received, item.rejectedQty, item.retainedQty);
        const failedGtnQty = item.testRequired
          ? gtns.flatMap(gtn => gtn.items
            .filter(gtnItem => {
              if (String(gtnItem.testStatus || '').toLowerCase() !== 'fail') return false;
              if (gtnItem.grnSrNo) return gtnItem.grnSrNo === grn.grnNo;
              if (gtn.purchaseOrderNo !== poNumber) return false;
              return (gtnItem.requisitionId && gtnItem.requisitionId === item.requisitionId)
                || normalizeMaterial(gtnItem.materialName) === normalizeMaterial(item.materialName);
            })
            .reduce((sum, gtnItem) => sum + (Number(gtnItem.quantity) || 0), 0))
          : 0;
        const eligibleQty = Math.min(remainingPoQty, Math.max(0, accepted - failedGtnQty));
        quantity += eligibleQty;
        remainingPoQty -= eligibleQty;
      }
    } else {
      const receivedQty = po.grns.flatMap(grn => grn.items)
        .filter(item => item.poItemId === poItem.id)
        .reduce((sum, item) => sum + acceptedQuantity(item.acceptedQty, item.receivedQty, item.rejectedQty), 0);
      quantity = Math.min(Math.max(0, Number(poItem.quantity) || 0), receivedQty);
    }

    const rate = Math.max(0, Number(poItem.rate) || 0);
    const discountPercent = Math.min(100, Math.max(0, Number(poItem.discountPercent) || 0));
    const taxableAmount = quantity * rate * (1 - discountPercent / 100);
    const gstPercent = Math.max(0, Number(poItem.gstPercent) || 0);
    const gstAmount = taxableAmount * gstPercent / 100;
    return {
      ...poItem,
      hsnCode: poItem.hsnCode || generateHsnSacCode(poItem.description, index),
      quantity,
      taxableAmount,
      gstAmount,
      totalAmount: taxableAmount + gstAmount
    };
  }).filter(item => item.quantity > 0);

  const taxableAmount = items.reduce((sum, item) => sum + item.taxableAmount, 0);
  const taxAmount = items.reduce((sum, item) => sum + item.gstAmount, 0);
  return {
    poNumber: po.poNumber,
    items,
    taxableAmount,
    cgstAmount: taxAmount / 2,
    sgstAmount: taxAmount / 2,
    grossAmount: taxableAmount + taxAmount
  };
}