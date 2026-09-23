// Isolated design prototype. Not wired to production routes or payment events.
// Inputs MUST be authenticated, tenant-scoped records from trusted server storage.
export const PILOT_END = '2027-01-31T23:00:00Z'; // 01 Feb, 00:00 Europe/Berlin
export const PAID_START = '2027-01-21T23:00:00Z'; // 22 Jan, 00:00 Europe/Berlin
const instant = value => typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ? Date.parse(value) : NaN;
const finite = Number.isFinite;

function validInterval(grant, now, floor = -Infinity, ceiling = Infinity) {
  if (!grant || grant.revoked !== false) return false;
  const start = instant(grant.startsAt), end = instant(grant.endsAt);
  return finite(start) && finite(end) && start < end && start >= floor && end <= ceiling
    && now >= start && now < end;
}
function trialCovers(trial, now) {
  const redeemed = instant(trial?.redeemedAt);
  return finite(redeemed) && redeemed <= now && trial?.kind === 'pilot'
    && validInterval(trial, now, -Infinity, instant(PILOT_END));
}
function paymentCovers(grant, now) {
  return grant?.paymentState === 'settled'
    && validInterval(grant, now, instant(PAID_START));
}

export function evaluateMemberAccess({ now, authenticated, accountState, trial, paidPeriods = [] } = {}) {
  const timestamp = instant(now);
  const account = authenticated === true;
  const enabled = account && accountState === 'enabled' && finite(timestamp);
  const trialActive = enabled && trialCovers(trial, timestamp);
  const paidActive = enabled && Array.isArray(paidPeriods) && paidPeriods.some(p => paymentCovers(p, timestamp));
  const member = trialActive || paidActive;
  return Object.freeze({
    member, worker: member, memberAppointments: member,
    // Billing/documents remain reachable after a service suspension, following authentication.
    account, billing: account, contractDocuments: account,
    basis: paidActive ? 'paid' : trialActive ? 'pilot' : 'none',
  });
}

export function canUseInvoicePurchase({ orderKind, profile } = {}) {
  // This is eligibility for a project term, never a substitute for an accepted order.
  return orderKind === 'project' && profile?.invoicePurchaseApproved === true;
}

export function formOfAddress({ area, language, profile } = {}) {
  if (language === 'en') return 'you';
  return area === 'member' && profile?.informalAddressApproved === true ? 'du' : 'Sie';
}

export function canDisplayCaioAffiliation({ now, access, addon } = {}) {
  const timestamp = instant(now);
  if (access?.member !== true || !finite(timestamp) || addon?.wordingApproved !== true) return false;
  if (addon.kind === 'coupon') {
    const redeemed = instant(addon.redeemedAt);
    return finite(redeemed) && redeemed <= timestamp && validInterval(addon, timestamp);
  }
  return addon.kind === 'paid' && paymentCovers(addon, timestamp);
}

// Segment selection is personalization, NEVER authorization or tenant isolation.
export function relevantArticles(authorizedArticles, { language = 'de', segments = [] } = {}) {
  if (!Array.isArray(authorizedArticles) || !Array.isArray(segments)) return [];
  return authorizedArticles.filter(article => article.language === language &&
    Array.isArray(article.audiences) && (article.audiences.includes('all') ||
      article.audiences.some(audience => segments.includes(audience))));
}
