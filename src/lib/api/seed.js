// Sample data for demo mode. Mirrors the data seeded in Supabase
// (supabase/seed/tcg_marketplace_plan.sql loads the same plan).
const at = (date, time = '10:00') => new Date(`${date}T${time}:00+08:00`).toISOString();

const profiles = [
  { id: 'u-admin', full_name: 'Admin', email: 'admin@example.com', title: 'CodeSync team', role: 'staff', avatar_color: '#C42531' },
  { id: 'u-client', full_name: 'Client Viewer', email: 'client@example.com', title: 'Client stakeholder', role: 'client', avatar_color: '#0F4C5C' },
];

const clients = [{ id: 'c-tcg', name: 'Deckami', accent_color: '#0F4C5C', created_at: at('2026-09-01') }];
const client_members = [{ client_id: 'c-tcg', user_id: 'u-client' }];

// The delivery plan runs 26 weeks: week 1 starts Mon 19 Oct 2026, the last planned day is Fri 16 Apr 2027.
const PLAN_START = '2026-10-19';

const projects = [
  {
    id: 'p-tcg',
    client_id: 'c-tcg',
    name: 'TCG Marketplace',
    summary:
      'Dedicated marketplace for Pokémon, Yu-Gi-Oh! and Magic: The Gathering cards. This 26-week plan covers discovery, the fixed-price marketplace MVP, a closed beta and the Malaysia soft launch.',
    start_date: '2026-09-01',
    end_date: '2027-04-16',
    status: 'active',
    created_at: at('2026-09-01'),
  },
  {
    id: 'p-tcg-next',
    client_id: 'c-tcg',
    name: 'TCG Marketplace · Next phase',
    summary:
      'Work moved to after the first launch: card scanning, auctions, Singapore go-live, native apps, listing recommendations and the full Gate 6 review. Scheduled once the Malaysia launch has real trading data.',
    start_date: '2027-04-19',
    end_date: null,
    status: 'on_hold',
    created_at: at(PLAN_START),
  },
];

const phases = [
  { id: 'ph-gov', project_id: 'p-tcg', name: 'PM · Project management & governance', position: 0, start_date: '2026-10-19', end_date: '2027-04-16' },
  { id: 'ph-disc', project_id: 'p-tcg', name: 'Phase 0 · Discovery & validation', position: 1, start_date: '2026-09-01', end_date: '2026-11-20' },
  { id: 'ph-found', project_id: 'p-tcg', name: 'Phase 1 · Platform foundation', position: 2, start_date: '2026-10-05', end_date: '2026-12-31' },
  { id: 'ph-mvp', project_id: 'p-tcg', name: 'Phase 2 · Marketplace MVP', position: 3, start_date: '2026-11-23', end_date: '2027-03-01' },
  { id: 'ph-qa', project_id: 'p-tcg', name: 'QA · Quality, security & compliance', position: 4, start_date: '2027-01-25', end_date: '2027-03-24' },
  { id: 'ph-beta', project_id: 'p-tcg', name: 'Phase 4 · Closed beta', position: 5, start_date: '2027-02-01', end_date: '2027-04-02' },
  { id: 'ph-launch', project_id: 'p-tcg', name: 'Phase 5 · Launch & early optimisation', position: 6, start_date: '2026-12-21', end_date: '2027-04-16' },
  { id: 'phn-spec', project_id: 'p-tcg-next', name: 'Phase 3 · Specialised functions', position: 0, start_date: null, end_date: null },
  { id: 'phn-exp', project_id: 'p-tcg-next', name: 'Expansion · Singapore & native apps', position: 1, start_date: null, end_date: null },
  { id: 'phn-opt', project_id: 'p-tcg-next', name: 'Phase 6 · Optimisation', position: 2, start_date: null, end_date: null },
];

// Work packages from the delivery plan, numbered as in its work breakdown structure.
// Effort is in person-days for the PM and the two developers (A, B); tasks show only the total.
// [phase, title, scope, deliverable, effort, dependsOn, priority, start, due, note]
const plan = [
  ['ph-gov', '1.1 Project initiation & set-up', '', 'Charter, RACI, repo and backlog tooling, 2-week sprint cadence', { PM: 2, A: 0.5, B: 0.5 }, [], 'high', '2026-10-19', '2026-10-22'],
  ['ph-gov', '1.2 Sprint management & reporting', 'Sprint management, risk & stakeholder reporting', 'Fortnightly sprint reviews, risk register, steering updates', { PM: 20 }, [], 'medium', '2026-11-16', '2027-04-16'],
  ['ph-disc', '2.1 Market & competitor refresh', '', 'Refreshed teardown of Shopee/Lazada, CTRL Collectibles, TCG.SG; pricing benchmarks', { PM: 1.5, A: 1 }, [], 'medium', '2026-10-19', '2026-10-28'],
  ['ph-disc', '2.2 Buyer & seller interviews', '', '~10 buyer and ~8 seller interviews, synthesis, demand/supply evidence', { PM: 3.5, B: 1.5 }, [], 'high', '2026-10-21', '2026-11-05'],
  ['ph-disc', '2.4 Technical architecture & stack', 'Technical architecture & stack decision', 'Architecture with catalogue separated from listings, modular data provider, buy-vs-build list, hosting', { A: 3, B: 2 }, [], 'high', '2026-10-21', '2026-10-30'],
  ['ph-disc', '2.5 Payment & shipping feasibility', 'Payment & shipping feasibility (sandbox proofs)', 'Gateway shortlist (hold/split/payout in MY), shipping approach: payment and shipping strategy', { A: 4 }, [], 'high', '2026-10-29', '2026-11-12', 'Fallback if hold, split and payout are not available in time: admin-run payouts for the beta.'],
  ['ph-disc', '2.7 Initial legal & regulatory assessment', 'Initial legal & regulatory assessment (external counsel)', 'Counsel brief and initial advice: MY e-commerce rules, PDPA MY/SG, card images and trademarks', { PM: 2 }, [], 'high', '2026-10-26', '2026-11-13'],
  ['ph-disc', '2.8 Financial model & unit economics', '', 'GMV and take-rate model including payment fees, refunds, fraud and support cost', { PM: 2.5 }, [], 'medium', '2026-11-04', '2026-11-16'],
  ['ph-disc', '2.10 Discovery report & gate packs', 'Discovery report & gate packs (G1-G3)', 'Discovery report, timeline, budget and risk assessment for the Proceed / Modify / Stop decision', { PM: 1.5 }, ['2.7', '2.8', 'MVP specification'], 'high', '2026-11-17', '2026-11-20'],
  ['ph-found', '3.1 Repo, CI/CD & environments', 'Repo, CI/CD, environments & observability', 'Staging and production environments, pipelines, logging/monitoring, backups', { A: 4 }, [], 'high', '2026-11-02', '2026-11-19'],
  ['ph-found', '3.5 Frontend foundation (UI kit)', 'Frontend foundation (UI kit, app shell, i18n and MYR/SGD scaffolding)', 'Responsive web app shell (PWA-ready), component library, design tokens', { B: 5 }, ['2.4'], 'high', '2026-11-10', '2026-11-27'],
  ['ph-found', '3.4 Card catalogue & import pipeline', 'Card catalogue & import pipeline (Pokémon, Yu-Gi-Oh!, MTG)', 'Modular provider interface; priority sets imported with set, number, language, variant, rarity, printing', { A: 6 }, ['Database schema & catalogue model', 'Gate 3'], 'high', '2026-11-26', '2026-12-16'],
  ['ph-found', '3.7 Admin back-office v1', 'Admin back-office v1 (users, catalogue, moderation)', 'Admin console on a prebuilt admin framework', { A: 1, B: 2 }, ['Accounts & roles'], 'medium', '2026-12-03', '2026-12-11'],
  ['ph-found', '3.6 Search & filters', 'Search & filters (managed search engine)', 'Indexing, card search, filters by TCG, set, language, variant, condition', { A: 2, B: 5 }, ['3.4 (start + 5 d)', '3.5'], 'high', '2026-12-07', '2026-12-18'],
  ['ph-found', '3.9 Catalogue data QA & coverage sign-off', '', 'Spot-check of imported cards; agreed launch coverage (which sets and languages)', { PM: 1.5 }, ['3.4 (start + 5 d)'], 'medium', '2026-12-11', '2026-12-18'],
  ['ph-found', '3.8 Security baseline', 'Security baseline (authZ, rate limiting, secrets, audit log, PDPA data handling)', 'Security checklist baselined; privacy-by-design controls', { A: 2 }, ['Accounts & roles'], 'high', '2026-12-21', '2026-12-31'],
  ['ph-mvp', '4.1 Wireframes: search, card page, account', 'UX wireframes – search, card page, account', 'Figma wireframes for the core buyer journey', { PM: 3 }, ['MVP specification'], 'medium', '2026-11-23', '2026-12-02'],
  ['ph-mvp', '4.2 Wireframes: seller, listing, checkout', 'UX wireframes – seller onboarding, listing, cart & checkout', 'Figma wireframes for the seller journey and checkout', { PM: 2.5 }, ['4.1 (start + 4 d)'], 'medium', '2026-11-30', '2026-12-09'],
  ['ph-mvp', '4.4 Payment & shipping merchant accounts', 'Payment & shipping merchant accounts (KYB approvals)', 'Live payment gateway and shipping aggregator accounts approved; long lead time, so start early', { PM: 3 }, [], 'high', '2026-11-23', '2026-12-18', 'Fallback if merchant approval is late: admin-run payouts for the beta.'],
  ['ph-mvp', '4.5 Seller verification & grading policy', 'Seller verification & condition-grading policy', 'Verification criteria for individuals and pros; NM/LP/MP/HP/DMG grading guide', { PM: 2 }, [], 'medium', '2026-12-07', '2026-12-18'],
  ['ph-mvp', '4.6 Dispute, refund & fee policies', '', 'Dispute SLAs, refund rules, seller penalties, commission and fee schedule', { PM: 2 }, ['4.5'], 'medium', '2026-12-21', '2027-01-07'],
  ['ph-mvp', '4.3 Wireframes: orders, disputes, admin', 'UX wireframes – orders, dashboards, disputes, admin', 'Figma wireframes for fulfilment, reviews, disputes', { PM: 1.5 }, [], 'medium', '2026-12-28', '2027-01-07'],
  ['ph-mvp', '4.7 Legal documents (T&Cs, privacy)', 'Marketplace legal documents (T&Cs, privacy policy, seller agreement)', 'Counsel-reviewed T&Cs, PDPA-aligned privacy policy, seller agreement', { PM: 3 }, ['4.6'], 'high', '2027-01-11', '2027-01-29'],
  ['ph-mvp', '4.8 Seller onboarding & verification', 'Seller onboarding & verification (individual + professional)', 'Seller sign-up, ID and business verification, admin review queue', { A: 3, B: 3 }, ['Accounts & roles', '3.7', '4.2', '4.5'], 'high', '2026-12-21', '2026-12-31'],
  ['ph-mvp', '4.9 Listing creation & management', '', 'Manual card select, condition, variant, photos, price, quantity, edit and pause', { A: 4, B: 5.5 }, ['3.6', '4.8 (start + 2 d)'], 'high', '2026-12-30', '2027-01-11'],
  ['ph-mvp', '4.11 Payments', 'Payments (hosted checkout, hold & payout, commission, refunds, webhooks)', 'Fixed-price payments with held funds, seller payouts, refunds', { A: 7, B: 2 }, ['2.5', 'Database schema & catalogue model'], 'high', '2027-01-04', '2027-01-29', 'Backend load peaks in weeks 11–17 (83–98% of capacity). Frontend picks up backend overflow.'],
  ['ph-mvp', '4.10 Card pages & cross-seller price comparison', '', 'One page per card and variant; compare sellers by price, condition, language, rating', { A: 3, B: 4.5 }, ['4.9'], 'high', '2027-01-12', '2027-01-21'],
  ['ph-mvp', '4.12 Cart & multi-seller checkout', '', 'Cart, per-seller order split, address, order summary', { A: 4, B: 5 }, ['4.9', '4.11 (start + 5 d)'], 'high', '2027-01-21', '2027-02-01'],
  ['ph-mvp', '4.13 Shipping', 'Shipping (seller zone rates, tracking numbers, aggregator labels)', 'Shipping profiles, label and tracking integration, shipping policy rules', { A: 2.5, B: 1.5 }, ['4.12 (start + 3 d)'], 'medium', '2027-02-01', '2027-02-09'],
  ['ph-mvp', '4.14 Orders & tracking', 'Orders & tracking (buyer + seller dashboards, auto-release)', 'Order lifecycle, ship and receive confirmation, fund release', { A: 3, B: 4 }, ['4.12', '4.3'], 'high', '2027-02-02', '2027-02-12'],
  ['ph-mvp', '4.17 Disputes, reports & refunds', '', 'Buyer reports (not received, not as described, counterfeit), evidence, admin resolution', { A: 4, B: 3 }, ['4.11', '4.14 (start + 3 d)', '4.6'], 'high', '2027-02-10', '2027-02-19'],
  ['ph-mvp', '4.16 Notifications', 'Notifications (transactional email, optional web push)', 'Order, payment, shipping and dispute notifications', { A: 1, B: 1.5 }, ['4.14 (start + 1 d)'], 'medium', '2027-02-12', '2027-02-23'],
  ['ph-mvp', '4.15 Reviews & seller ratings', '', 'Post-order reviews, seller rating, transaction history', { A: 0.5, B: 2 }, ['4.14 (start + 4 d)'], 'medium', '2027-02-16', '2027-02-22'],
  ['ph-mvp', '4.18 Trust & safety v1', 'Trust & safety v1 (moderation, new-seller limits, fraud rules)', 'Listing moderation queue, risk rules, extra verification for high-value listings', { A: 2, B: 1 }, ['3.7', '4.6'], 'medium', '2027-02-22', '2027-03-01'],
  ['ph-mvp', '4.19 Analytics & marketplace KPIs', 'Analytics & marketplace KPIs (events + SQL views)', "Supply, demand, liquidity, seller and trust KPIs from the proposal's metrics list", { A: 1, B: 0.5 }, ['4.14 (start + 4 d)'], 'low', '2027-02-22', '2027-02-26'],
  ['ph-mvp', '4.20 Assisted inventory import', 'Assisted inventory import for seeded sellers', "Admin-run CSV import to seed launch retailers' inventory", { A: 1, B: 1 }, ['4.9'], 'medium', '2027-02-22', '2027-02-24'],
  ['ph-qa', '6.1 QA test plan & test cases', '', 'Test plan and cases for critical journeys (search, buy, ship, review, dispute)', { PM: 2 }, ['MVP specification'], 'medium', '2027-01-25', '2027-02-10'],
  ['ph-qa', '6.2 Hardening & automated tests', 'Integration hardening & automated critical-path tests', 'Bug-fix sprint and end-to-end tests for checkout, payment and dispute flows; doubles as schedule contingency', { A: 3.5, B: 3.5 }, ['MVP feature-complete'], 'high', '2027-03-02', '2027-03-08', 'The 7 dev-days freed by moving card scanning to the next phase (weeks 22–23) add to this contingency.'],
  ['ph-qa', '6.3 Internal UAT', 'Internal UAT with friendly sellers', 'UAT sign-off list, defects triaged', { PM: 2.5, A: 1, B: 1 }, ['4.20', '6.1', 'MVP feature-complete'], 'high', '2027-03-02', '2027-03-12'],
  ['ph-qa', '6.4 Performance & load testing', '', 'Load-test report against agreed targets; hotspots fixed', { A: 1.5, B: 0.5 }, ['6.2'], 'medium', '2027-03-09', '2027-03-12'],
  ['ph-qa', '6.6 Legal & compliance sign-off', 'Legal & compliance sign-off (counsel review of final docs and flows)', 'Written sign-off on e-commerce, PDPA, payments, card-image/IP position; Singapore readiness note', { PM: 2 }, ['4.7'], 'high', '2027-02-22', '2027-03-19'],
  ['ph-qa', '6.5 Security review & fixes', 'Security review & remediation (OWASP checklist, scans; external pen-test if budgeted)', 'Findings closed or accepted; payment and ID-data handling reviewed', { A: 2, B: 1 }, ['6.4'], 'high', '2027-03-15', '2027-03-24'],
  ['ph-beta', '7.1 Beta plan & recruitment', 'Beta plan & participant recruitment', 'Beta plan: ~10 sellers (retailers and individuals), ~40 buyers (experienced and new), success thresholds', { PM: 2 }, ['Gate 3'], 'medium', '2027-02-01', '2027-02-15'],
  ['ph-beta', '7.2 Closed beta operation', 'Closed beta operation (support, feedback, daily metrics)', 'Beta feedback log, KPI snapshots, dispute and fraud observations', { PM: 5 }, ['Gate 4'], 'high', '2027-03-15', '2027-04-02'],
  ['ph-beta', '7.3 Beta fixes & polish', '', 'Prioritised fixes from beta; UX polish on listing and checkout', { A: 4, B: 4 }, ['Gate 4'], 'high', '2027-03-15', '2027-04-02'],
  ['ph-launch', '8.1 Seller acquisition (seller-first)', 'Seller acquisition – seller-first pipeline & onboarding', 'Target list of ~40 retailers and collectors, outreach, commitments to list at launch', { PM: 10 }, ['Gate 3'], 'high', '2026-12-21', '2027-04-02', 'Seller supply is the largest risk. If too few sellers have committed by Gate 4, move the launch instead of opening an empty marketplace.'],
  ['ph-launch', '8.2 Support playbook & help centre', 'Support playbook, help centre & FAQ content', 'Support and dispute playbook, FAQ, seller guides', { PM: 3 }, [], 'medium', '2027-02-02', '2027-02-18'],
  ['ph-launch', '8.3 Buyer acquisition & launch comms', 'Buyer acquisition & launch comms (communities, creators, store partnerships)', 'Launch content, community posts, retailer partnership outreach', { PM: 3.5 }, [], 'medium', '2027-02-15', '2027-04-14'],
  ['ph-launch', '8.4 Go-live checklist & runbooks', 'Production go-live checklist & runbooks', 'Monitoring and on-call runbook, backup/restore test, go-live checklist', { PM: 0.5, A: 1.5, B: 1 }, [], 'medium', '2027-03-22', '2027-03-29'],
  ['ph-launch', '8.5 Malaysia soft launch', 'Malaysia soft launch (production go-live)', 'Live marketplace in Malaysia; first sellers onboarded; daily monitoring', { PM: 2.2, A: 2, B: 1.5 }, ['Gate 5'], 'high', '2027-04-05', '2027-04-09'],
  ['ph-launch', '8.6 Hypercare & first metrics review', 'Hypercare & first metrics review (feeds Gate 6)', 'Stabilisation fixes; KPI read-out; ranked post-launch backlog (card scanning, auctions, Singapore, apps)', { PM: 1.8, A: 3, B: 3 }, ['8.5 (start + 2 d)'], 'high', '2027-04-07', '2027-04-16'],
  // Next phase, after the first launch. Not scheduled yet.
  ['phn-spec', '2.6 Card-recognition feasibility spike', '', 'Accuracy report on ~150 cards across 3 TCGs (OCR of set code and number vs image matching)', { B: 4 }, [], 'medium', null, null, 'Moved out of discovery together with card scanning. Run it before committing to the scanning build.'],
  ['phn-spec', '5.1 Card scanning (assisted listing)', 'Card scanning – assisted listing (OCR + catalogue match, seller confirms)', 'Photo to candidate cards to seller confirmation to prefilled listing. Never auto-publishes', { A: 3, B: 4 }, ['2.6'], 'medium', null, null, 'Builds on the card catalogue (3.4) and listing creation (4.9) delivered for launch.'],
  ['phn-spec', '9.1 Auctions', 'Auctions (bidding, auction fees, anti-sniping)', '', { A: 7, B: 5 }, [], 'medium', null, null, 'A priority enhancement in the proposal, feasibility-dependent. About 12 dev-days. Best after fixed-price liquidity is proven.'],
  ['phn-exp', '9.2 Singapore go-live', 'Singapore go-live (SGD pricing, SG shipping zones, PDPA review, cross-border policy)', '', { PM: 3, A: 3, B: 2 }, [], 'medium', null, null, 'Currency and locale support are built into the foundation. Go-live follows Malaysia once legal, payment and shipping checks pass.'],
  ['phn-exp', '9.3 Native iOS / Android apps', '', '', { A: 4, B: 12 }, [], 'low', null, null, 'The launch is web-first (responsive PWA). Native apps wrap the same APIs. About 16 dev-days plus store review.'],
  ['phn-opt', '9.4 Listing recommendations', '', '', { A: 3, B: 2 }, [], 'low', null, null, 'A priority enhancement in the proposal. Needs transaction data first.'],
  ['phn-opt', '9.5 Full Gate 6 review & Phase 6 optimisation', '', 'Search, retention and fraud tuning from ~8 weeks of real transaction data', { PM: 4, A: 4, B: 4 }, [], 'medium', null, null, 'Gate 6 on 16 Apr is only an initial health check. The full scale / modify / reassess decision needs about eight weeks of trading.'],
];

// Stage gates and the MVP milestone. [phase, title, description, dependsOn, date]
const gates = [
  ['ph-disc', 'Gate 1 · Concept validation', 'Go / no-go on the concept, using the buyer and seller interview evidence.', ['2.2'], '2026-11-06'],
  ['ph-disc', 'Gate 3 · MVP approval', 'Proceed / Modify / Stop decision on scope, budget and timeline, based on the discovery report. Re-baseline the estimates here.', ['2.10'], '2026-11-20'],
  ['ph-mvp', 'MVP feature-complete', 'All MVP features built. Hardening, UAT and the security review follow.', [], '2027-03-01'],
  ['ph-qa', 'Gate 4 · Beta approval', 'Go / no-go for the closed beta after internal UAT and load testing. If too few sellers have committed, move the launch rather than open an empty marketplace.', ['6.3', '6.4'], '2027-03-12'],
  ['ph-beta', 'Gate 5 · Launch approval', 'Go / no-go for the Malaysia soft launch: security findings closed, legal sign-off in hand and the closed beta reviewed.', ['6.5', '6.6', '7.2', '7.3'], '2027-04-02'],
  ['ph-launch', 'Gate 6 · Initial post-launch review', 'Health check on about two weeks of live data. The full scale / modify / reassess decision needs about eight weeks of trading and sits in the next phase (9.5).', ['8.6'], '2027-04-16'],
];


// Work already done or under way when the plan was loaded. Kept as it was; the plan replaced the old backlog.
// [phase, title, description, status, priority, start, due, progress, milestone, internal]
const existing = [
  ['ph-disc', 'Market & competitor research', 'Malaysia/Singapore TCG ecosystem, CTRL Collectibles, TCG.SG, Shopee/Lazada sellers.', 'done', 'medium', '2026-09-01', '2026-09-12', 100],
  ['ph-disc', 'Card data source assessment', 'Licensed data vs authorised APIs vs internal catalogue + seller photos.', 'done', 'high', '2026-09-08', '2026-09-26', 100],
  ['ph-disc', 'MVP specification', 'Final requirements, scope and success criteria for MVP.', 'done', 'high', '2026-09-15', '2026-10-02', 100],
  ['ph-disc', 'Discovery sign-off', 'Gate 2 — technical feasibility confirmed.', 'done', 'high', '2026-10-02', '2026-10-02', 100, true],
  ['ph-found', 'Design system foundations', 'Colour, type, spacing, controls and components.', 'done', 'high', '2026-10-05', '2026-10-14', 100],
  ['ph-found', 'Mobile screen mockups (10 screens)', 'Home, sign up, log in, search, filters, catalogue, set & card detail, profile, no results.', 'done', 'high', '2026-10-07', '2026-10-16', 100],
  ['ph-found', 'Brand palette selection', 'Client selected the Kartu palette (Straits Teal / Hibiscus Coral / Sand).', 'done', 'medium', '2026-10-16', '2026-10-18', 100],
  ['ph-found', 'Admin panel mockups', 'Overview, card catalogue, add card, users, suspend user.', 'review', 'medium', '2026-10-12', '2026-10-23', 90],
  ['ph-found', 'Database schema & catalogue model', 'Separate card catalogue from marketplace listings.', 'in_progress', 'high', '2026-10-15', '2026-10-30', 45],
  ['ph-found', 'Accounts & roles', 'Buyer, individual seller and professional seller registration.', 'in_progress', 'high', '2026-10-19', '2026-11-06', 20],
  ['ph-found', 'Refactor Stitch export into components', 'Internal clean-up before build.', 'in_progress', 'low', '2026-10-19', '2026-10-24', 30, false, true],
];

const weekOf = (d) => Math.floor((new Date(d) - new Date(PLAN_START)) / (7 * 86400000)) + 1;
const weeks = (a, b) => (weekOf(a) === weekOf(b) ? `Plan week ${weekOf(a)}.` : `Plan weeks ${weekOf(a)}–${weekOf(b)}.`);

function describe(scope, deliverable, effort, dependsOn, start, due, note) {
  return [
    scope && `${scope}.`,
    deliverable && `Deliverable: ${deliverable}.`,
    `Effort: ${Math.round(Object.values(effort).reduce((a, b) => a + b, 0) * 10) / 10} person-days.`,
    start && weeks(start, due),
    dependsOn.length > 0 && `Depends on: ${dependsOn.join(', ')}.`,
    note,
  ]
    .filter(Boolean)
    .join('\n');
}

const planned = { status: 'backlog', progress: 0, internal: false, created_at: at(PLAN_START, '09:00') };
const rows = [
  ...existing.map(([phase_id, title, description, status, priority, start_date, due_date, progress, is_milestone = false, internal = false]) => ({
    phase_id,
    title,
    description,
    status,
    priority,
    start_date,
    due_date,
    progress,
    is_milestone,
    internal,
    created_at: at(start_date, '09:00'),
  })),
  ...plan.map(([phase_id, title, scope, deliverable, effort, dependsOn, priority, start_date, due_date, note = '']) => ({
    ...planned,
    phase_id,
    title,
    description: describe(scope, deliverable, effort, dependsOn, start_date, due_date, note),
    priority,
    start_date,
    due_date,
    is_milestone: false,
  })),
  ...gates.map(([phase_id, title, description, dependsOn, date]) => ({
    ...planned,
    phase_id,
    title,
    description: dependsOn.length ? `${description}\nDepends on: ${dependsOn.join(', ')}.` : description,
    priority: 'high',
    start_date: date,
    due_date: date,
    is_milestone: true,
  })),
];

const phaseById = Object.fromEntries(phases.map((p) => [p.id, p]));
const byStart = [...rows].sort((a, b) => (a.start_date || '9').localeCompare(b.start_date || '9'));
const tasks = rows.map((r, i) => ({
  id: `t-${i + 1}`,
  project_id: phaseById[r.phase_id].project_id,
  ...r,
  assignee_id: 'u-admin',
  is_blocked: false,
  blocked_reason: null,
  position: byStart.indexOf(r) + 1,
  created_by: 'u-admin',
  completed_at: r.status === 'done' ? at(r.due_date, '17:00') : null,
  updated_at: r.created_at,
}));
const taskByTitle = (title) => tasks.find((t) => t.title === title);

let eid = 1;
const task_events = [];
const ev = (t, kind, from_value, to_value, created_at, actor_id = t.assignee_id || 'u-admin') =>
  task_events.push({ id: eid++, task_id: t.id, project_id: t.project_id, actor_id, kind, from_value, to_value, task_title: t.title, internal: t.internal, created_at });

for (const t of tasks) {
  ev(t, 'created', null, 'backlog', t.created_at, 'u-admin');
  if (t.status === 'done') ev(t, 'status', 'in_progress', 'done', at(t.due_date, '17:00'));
  if (t.status === 'in_progress' || t.status === 'review') ev(t, 'status', 'backlog', 'in_progress', at(t.start_date));
  if (t.status === 'review') ev(t, 'status', 'in_progress', 'review', at('2026-10-17', '15:00'));
  if (t.title === 'Admin panel mockups') ev(t, 'due_date', '2026-10-20', '2026-10-23', at('2026-10-15', '09:40'));
}

const meetings = [
  {
    id: 'm-1',
    project_id: 'p-tcg',
    meeting_date: '2026-09-21',
    title: 'Discovery check-in',
    notes: 'Reviewed competitor landscape and data-source options.',
    decisions: 'Proceed with Option C (internal catalogue + seller photos) as the fallback.',
    created_by: 'u-admin',
  },
  {
    id: 'm-2',
    project_id: 'p-tcg',
    meeting_date: '2026-10-05',
    title: 'Phase 1 kick-off',
    notes: 'Walked through Phase 1 scope: accounts, database, catalogue, search, admin, security.',
    decisions: 'Bi-weekly reviews every other Monday. Client to confirm card data source by 30 Oct.',
    created_by: 'u-admin',
  },
  {
    id: 'm-3',
    project_id: 'p-tcg',
    meeting_date: PLAN_START,
    title: 'Plan kick-off',
    notes: [
      'Walked through the 26-week delivery plan, Mon 19 Oct 2026 to Fri 16 Apr 2027: the CodeSync team of a project manager and two developers. Dates come from a working calendar with Malaysian public holidays removed, and nobody is planned above 90% of their working days in any week.',
      'Key dates: Gate 1 Fri 6 Nov · Gate 2 already signed off on 2 Oct · Gate 3 (MVP approval) Fri 20 Nov · MVP feature-complete Mon 1 Mar · Gate 4 (beta approval) Fri 12 Mar · closed beta Mon 15 Mar to Fri 2 Apr · Gate 5 (launch approval) Fri 2 Apr · Malaysia soft launch Mon 5 Apr · Gate 6 initial review Fri 16 Apr.',
      'Risks to watch: seller supply (the largest risk; outreach starts in week 10), payment gateway hold, split and payout support and merchant approval, card-data and image licensing, backend load in weeks 11 to 17, no dedicated designer or QA, Ramadan (about 8 Feb to 9 Mar) and Gate 6 landing only two weeks after launch.',
    ].join('\n\n'),
    decisions: [
      'First launch covers discovery, the platform foundation, the fixed-price marketplace MVP, a closed beta (about 10 sellers and 40 buyers) and a Malaysia-only soft launch.',
      'Work already done or under way stays on the board as it is. The plan’s work packages replace the earlier backlog. Plan items that work already covers (2.3 card-data strategy, 2.9 MVP requirements, Gate 2, 3.2 data model and 3.3 accounts) are dropped from the plan.',
      'Card scanning and AI identification (with its recognition spike) and auctions / bidding move to the next phase, after the first launch. Singapore go-live, native apps, listing recommendations and the full Gate 6 review follow them, as the plan set out. All of these sit in the “TCG Marketplace · Next phase” project.',
      'Dropping card scanning frees 7 dev-days in weeks 22 and 23, plus 4 dev-days in weeks 2 and 3 from the spike. They stay unallocated as contingency for hardening, security fixes and the beta.',
      'Every estimate is a planning figure. Re-baseline at Gate 3 on Fri 20 Nov.',
      'Two-week sprints from 19 Oct, with a review every second Monday (first on 2 Nov). If that Monday is a public holiday (8 Feb), the review moves to the Tuesday.',
    ].join('\n'),
    created_by: 'u-admin',
  },
];

const comments = [
  {
    id: 'cm-1',
    task_id: taskByTitle('Admin panel mockups').id,
    author_id: 'u-client',
    body: 'Looks great — can the Users table show the seller verification status too?',
    created_at: at('2026-10-18', '14:12'),
  },
  {
    id: 'cm-2',
    task_id: taskByTitle('Admin panel mockups').id,
    author_id: 'u-admin',
    body: 'Yes, adding a Verification column with Pending / Verified badges.',
    created_at: at('2026-10-18', '16:40'),
  },
];

export const SEED = { profiles, clients, client_members, projects, phases, tasks, task_events, meetings, comments };
