const STANDARD_EARNING_HEADS = {
  basic: new Set(['basic', 'basic pay', 'basic salary']),
  hra: new Set(['hra', 'house rent allowance', 'house rent allowance hra', 'hra house rent allowance']),
  medical: new Set(['medical', 'medical allowance']),
  conveyance: new Set([
    'conveyance',
    'conveyance allowance',
    'transport',
    'transport allowance',
    'transport conveyance',
  ]),
};

export function classifyStandardEarningHead(name) {
  const normalizedName = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  for (const [category, aliases] of Object.entries(STANDARD_EARNING_HEADS)) {
    if (aliases.has(normalizedName)) return category;
  }

  return null;
}

export function resolveSpecialAllowance(savedAmount, configuredAmount) {
  const saved = Number(savedAmount) || 0;
  const configured = Number(configuredAmount) || 0;
  return Math.abs(saved) <= 0.005 && configured > 0 ? configured : saved;
}
