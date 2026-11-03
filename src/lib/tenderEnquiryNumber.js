export async function getNextTenderEnquiryNumber(database, year = new Date().getFullYear()) {
  const prefix = `TENENQ-${year}-`;
  const tenders = await database.tender.findMany({ select: { details: true } });
  let highestSequence = 0;

  for (const tender of tenders) {
    const enquiryNo = tender.details?.enquiryNo;
    if (typeof enquiryNo !== 'string' || !enquiryNo.startsWith(prefix)) continue;
    const sequence = Number(enquiryNo.slice(prefix.length));
    if (Number.isSafeInteger(sequence) && sequence > highestSequence) highestSequence = sequence;
  }

  return `${prefix}${String(highestSequence + 1).padStart(4, '0')}`;
}

export async function getNextTenderNumber(database, year = new Date().getFullYear()) {
  const prefix = `TNDNO-${year}-`;
  const tenders = await database.tender.findMany({
    where: { tenderNo: { startsWith: prefix } },
    select: { tenderNo: true },
  });
  let highestSequence = 0;

  for (const tender of tenders) {
    const sequence = Number(tender.tenderNo.slice(prefix.length));
    if (Number.isSafeInteger(sequence) && sequence > highestSequence) highestSequence = sequence;
  }

  return `${prefix}${String(highestSequence + 1).padStart(4, '0')}`;
}
