// lib/gst-utils.js

export function monthRange(month, year) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
  return { from, to };
}

export function sumTotals(vouchers) {
  return vouchers.reduce(
    (acc, v) => {
      acc.invoiceAmt += v.invoiceAmt || 0;
      acc.assessableValue += v.assessableValue || 0;
      acc.cgstAmt += v.cgstAmt || 0;
      acc.sgstAmt += v.sgstAmt || 0;
      acc.igstAmt += v.igstAmt || 0;
      acc.cessAmt += v.cessAmt || 0;
      acc.totalTax += v.totalTax || 0;
      return acc;
    },
    { invoiceAmt: 0, assessableValue: 0, cgstAmt: 0, sgstAmt: 0, igstAmt: 0, cessAmt: 0, totalTax: 0 }
  );
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
