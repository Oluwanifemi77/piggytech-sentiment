export const PIGGTECH_SET = new Set([
  'PiggyVest', 'Pocket', 'PiggyVest_for_Business',
  'PVB', 'Investify', 'PiggyFx', 'Shared',
]);

// Sub-products map to their display parent for grouping in ProductBar
export const SUB_PRODUCT_PARENT: Record<string, string> = {
  Pocket: 'PiggyVest',
  Investify: 'PiggyVest',
  PiggyFx: 'PiggyVest',
  PVB: 'PiggyVest_for_Business',
};

export const DISPLAY_NAME: Record<string, string> = {
  PiggyVest: 'PiggyVest',
  Pocket: 'Pocket',
  PiggyVest_for_Business: 'PiggyVest for Business',
  PVB: 'PiggyVest for Business',
  Investify: 'Investify',
  PiggyFx: 'PiggyFx',
  Shared: 'Multi-product',
  Cowrywise: 'Cowrywise',
  Opay: 'OPay',
  OPay: 'OPay',
  Fairmoney: 'FairMoney',
  FairMoney: 'FairMoney',
  Moniepoint: 'Moniepoint',
  PalmPay: 'PalmPay',
  Palmpay: 'PalmPay',
  'Access Bank': 'Access Bank',
  ClevaBanking: 'ClevaBanking',
  GeegPay: 'GeegPay',
  Afrinvest: 'Afrinvest',
  investbamboo: 'Bamboo',
  VFD: 'VFD',
  OrderlyNetwork: 'OrderlyNetwork',
};

export const SENT_SCORE: Record<string, number> = {
  very_negative: 1,
  slightly_negative: 2,
  neutral: 3,
  slightly_positive: 4,
  very_positive: 5,
};

export function isPiggyTech(p: string | null | undefined): boolean {
  return !p || PIGGTECH_SET.has(p);
}

export function getDisplayName(p: string): string {
  return DISPLAY_NAME[p] || p.replace(/_/g, ' ');
}

export function avgScore(data: any[]): number {
  const scores = data.map(d => SENT_SCORE[d.overall_sentiment]).filter(Boolean);
  if (!scores.length) return 0;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}
