// Single source of truth for the shared FAQ used by both the Home (relaunch)
// and Pricing (relaunch) pages. Each item points at i18n keys for its question
// and answer — no copy lives here, only structure + which page(s) render it.
//
// Per the designs:
//   • Home renders all 8 items whose `home` flag is set.
//   • Pricing renders the 6 items whose `pricing` flag is set, in `pricingOrder`.
//     The Pricing FAQ reuses the Home answers for the questions it shares
//     ("Same answers as the home page — one source of truth" — Pricing design),
//     and adds two pricing-only questions (€6.67/mo, refundable) whose copy
//     lives under relaunchPricing.faq.
//
// Consume with react-i18next: t(item.qKey), t(item.aKey).

export interface FaqItem {
  /** stable id for React keys / accordion state */
  id: string;
  /** i18n key for the question text */
  qKey: string;
  /** i18n key for the answer text */
  aKey: string;
  /** renders in the Home FAQ section */
  home: boolean;
  /** renders in the Pricing FAQ section */
  pricing: boolean;
  /** display order within the Pricing FAQ (design order); omitted when not on Pricing */
  pricingOrder?: number;
}

export const FAQ_ITEMS: FaqItem[] = [
  // ── The 8 Home items (relaunchHome.faq.q1..q8 / a1..a8) ──
  { id: 'different',  qKey: 'relaunchHome.faq.q1', aKey: 'relaunchHome.faq.a1', home: true, pricing: true,  pricingOrder: 5 },
  { id: 'challenges', qKey: 'relaunchHome.faq.q2', aKey: 'relaunchHome.faq.a2', home: true, pricing: true,  pricingOrder: 4 },
  { id: 'free',       qKey: 'relaunchHome.faq.q3', aKey: 'relaunchHome.faq.a3', home: true, pricing: true,  pricingOrder: 1 },
  { id: 'equipment',  qKey: 'relaunchHome.faq.q4', aKey: 'relaunchHome.faq.a4', home: true, pricing: false },
  { id: 'builder',    qKey: 'relaunchHome.faq.q5', aKey: 'relaunchHome.faq.a5', home: true, pricing: false },
  { id: 'android',    qKey: 'relaunchHome.faq.q6', aKey: 'relaunchHome.faq.a6', home: true, pricing: true,  pricingOrder: 6 },
  { id: 'programs',   qKey: 'relaunchHome.faq.q7', aKey: 'relaunchHome.faq.a7', home: true, pricing: false },
  { id: 'progress',   qKey: 'relaunchHome.faq.q8', aKey: 'relaunchHome.faq.a8', home: true, pricing: false },
  // ── Pricing-only questions (relaunchPricing.faq.*) ──
  { id: 'monthlyPrice', qKey: 'relaunchPricing.faq.qPrice',  aKey: 'relaunchPricing.faq.aPrice',  home: false, pricing: true, pricingOrder: 2 },
  { id: 'refundable',   qKey: 'relaunchPricing.faq.qRefund', aKey: 'relaunchPricing.faq.aRefund', home: false, pricing: true, pricingOrder: 3 },
];

/** The 8 items the Home page renders, in order. */
export const HOME_FAQ: FaqItem[] = FAQ_ITEMS.filter((f) => f.home);

/** The 6 items the Pricing page renders, in Pricing design order. */
export const PRICING_FAQ: FaqItem[] = FAQ_ITEMS
  .filter((f) => f.pricing)
  .sort((a, b) => (a.pricingOrder ?? 0) - (b.pricingOrder ?? 0));
