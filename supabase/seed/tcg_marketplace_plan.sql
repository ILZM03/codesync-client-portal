-- TCG Marketplace: loads the 26-week delivery plan (Mon 19 Oct 2026 to Fri 16 Apr 2027)
-- into the live portal. Generated from src/lib/api/seed.js, so it matches demo mode.
--
-- What it does, in one transaction:
--   1. DELETES the project's Backlog tasks (and their comments). Tasks that are In progress,
--      In review or Done are kept as they are, apart from being assigned to Admin.
--   2. Loads the plan's 7 phases, 51 work packages and 6 milestones, all in Backlog
--      and all assigned to Admin, the CodeSync team's shared account.
--      Kept tasks move into the new phase with the same tag ("Phase 0 · …" into "Phase 0 · …",
--      and so on), then the old phases are removed. Phase dates stretch to cover the kept tasks.
--   3. Sets the project's end date (16 Apr 2027) and summary; the start date only moves earlier.
--   4. Logs the 19 Oct "Plan kick-off" meeting. Existing meetings and task history are kept.
--   5. Creates the "TCG Marketplace · Next phase" project for the work moved to after the
--      first launch: card scanning, auctions, Singapore, native apps and the rest.
--
-- Run once, in Supabase → SQL editor. A second run stops with an error instead of loading the
-- plan twice. If the Admin account isn't found, the script stops and nothing changes.

do $$
declare
  pid uuid;
  nid uuid;
  cid uuid;
  admin uuid;
  old_phases uuid[];
begin
  select id, client_id into pid, cid from public.projects where name = 'TCG Marketplace';
  if pid is null then
    raise exception 'No project named "TCG Marketplace" was found.';
  end if;
  if exists (select 1 from public.tasks where project_id = pid and title = '1.1 Project initiation & set-up')
     or exists (select 1 from public.projects where client_id = cid and name = 'TCG Marketplace · Next phase') then
    raise exception 'The delivery plan is already loaded.';
  end if;

  select id into admin from public.profiles where email = 'admin@codesync.internal';
  if admin is null then
    raise exception 'No Admin account (admin@codesync.internal) was found.';
  end if;

  -- clear the old backlog; started and finished work stays
  delete from public.tasks where project_id = pid and status = 'backlog';
  select coalesce(array_agg(id), '{}') into old_phases from public.phases where project_id = pid;

  update public.projects
     set summary = 'Dedicated marketplace for Pokémon, Yu-Gi-Oh! and Magic: The Gathering cards. This 26-week plan covers discovery, the fixed-price marketplace MVP, a closed beta and the Malaysia soft launch.',
         start_date = least(start_date, date '2026-10-19'),
         end_date = date '2027-04-16'
   where id = pid;

  insert into public.projects (client_id, name, summary, start_date, end_date, status)
  values (cid, 'TCG Marketplace · Next phase', 'Work moved to after the first launch: card scanning, auctions, Singapore go-live, native apps, listing recommendations and the full Gate 6 review. Scheduled once the Malaysia launch has real trading data.', date '2027-04-19', null::date, 'on_hold')
  returning id into nid;

  insert into public.phases (project_id, name, position, start_date, end_date) values
    (pid, 'PM · Project management & governance', 0, date '2026-10-19', date '2027-04-16'),
    (pid, 'Phase 0 · Discovery & validation', 1, date '2026-10-19', date '2026-11-20'),
    (pid, 'Phase 1 · Platform foundation', 2, date '2026-11-02', date '2026-12-31'),
    (pid, 'Phase 2 · Marketplace MVP', 3, date '2026-11-23', date '2027-03-01'),
    (pid, 'QA · Quality, security & compliance', 4, date '2027-01-25', date '2027-03-24'),
    (pid, 'Phase 4 · Closed beta', 5, date '2027-02-01', date '2027-04-02'),
    (pid, 'Phase 5 · Launch & early optimisation', 6, date '2026-12-21', date '2027-04-16'),
    (nid, 'Phase 3 · Specialised functions', 0, null::date, null::date),
    (nid, 'Expansion · Singapore & native apps', 1, null::date, null::date),
    (nid, 'Phase 6 · Optimisation', 2, null::date, null::date);

  insert into public.tasks (project_id, phase_id, title, description, status, priority, assignee_id, start_date, due_date, progress, is_milestone, position)
  select ph.project_id, ph.id, v.title, v.description, 'backlog', v.priority, admin, v.start_date, v.due_date, 0, v.is_milestone, v.position
    from (values
    ('PM · Project management & governance', '1.1 Project initiation & set-up', E'Deliverable: Charter, RACI, repo and backlog tooling, 2-week sprint cadence.\nEffort: 3 person-days.\nPlan week 1.', 'high', date '2026-10-19', date '2026-10-22', false, 12),
    ('PM · Project management & governance', '1.2 Sprint management & reporting', E'Sprint management, risk & stakeholder reporting.\nDeliverable: Fortnightly sprint reviews, risk register, steering updates.\nEffort: 20 person-days.\nPlan weeks 5–26.', 'medium', date '2026-11-16', date '2027-04-16', false, 22),
    ('Phase 0 · Discovery & validation', '2.1 Market & competitor refresh', E'Deliverable: Refreshed teardown of Shopee/Lazada, CTRL Collectibles, TCG.SG; pricing benchmarks.\nEffort: 2.5 person-days.\nPlan weeks 1–2.', 'medium', date '2026-10-19', date '2026-10-28', false, 13),
    ('Phase 0 · Discovery & validation', '2.2 Buyer & seller interviews', E'Deliverable: ~10 buyer and ~8 seller interviews, synthesis, demand/supply evidence.\nEffort: 5 person-days.\nPlan weeks 1–3.', 'high', date '2026-10-21', date '2026-11-05', false, 14),
    ('Phase 0 · Discovery & validation', '2.4 Technical architecture & stack', E'Technical architecture & stack decision.\nDeliverable: Architecture with catalogue separated from listings, modular data provider, buy-vs-build list, hosting.\nEffort: 5 person-days.\nPlan weeks 1–2.', 'high', date '2026-10-21', date '2026-10-30', false, 15),
    ('Phase 0 · Discovery & validation', '2.5 Payment & shipping feasibility', E'Payment & shipping feasibility (sandbox proofs).\nDeliverable: Gateway shortlist (hold/split/payout in MY), shipping approach: payment and shipping strategy.\nEffort: 4 person-days.\nPlan weeks 2–4.\nFallback if hold, split and payout are not available in time: admin-run payouts for the beta.', 'high', date '2026-10-29', date '2026-11-12', false, 17),
    ('Phase 0 · Discovery & validation', '2.7 Initial legal & regulatory assessment', E'Initial legal & regulatory assessment (external counsel).\nDeliverable: Counsel brief and initial advice: MY e-commerce rules, PDPA MY/SG, card images and trademarks.\nEffort: 2 person-days.\nPlan weeks 2–4.', 'high', date '2026-10-26', date '2026-11-13', false, 16),
    ('Phase 0 · Discovery & validation', '2.8 Financial model & unit economics', E'Deliverable: GMV and take-rate model including payment fees, refunds, fraud and support cost.\nEffort: 2.5 person-days.\nPlan weeks 3–5.', 'medium', date '2026-11-04', date '2026-11-16', false, 19),
    ('Phase 0 · Discovery & validation', '2.10 Discovery report & gate packs', E'Discovery report & gate packs (G1-G3).\nDeliverable: Discovery report, timeline, budget and risk assessment for the Proceed / Modify / Stop decision.\nEffort: 1.5 person-days.\nPlan week 5.\nDepends on: 2.7, 2.8, MVP specification.', 'high', date '2026-11-17', date '2026-11-20', false, 23),
    ('Phase 1 · Platform foundation', '3.1 Repo, CI/CD & environments', E'Repo, CI/CD, environments & observability.\nDeliverable: Staging and production environments, pipelines, logging/monitoring, backups.\nEffort: 4 person-days.\nPlan weeks 3–5.', 'high', date '2026-11-02', date '2026-11-19', false, 18),
    ('Phase 1 · Platform foundation', '3.5 Frontend foundation (UI kit)', E'Frontend foundation (UI kit, app shell, i18n and MYR/SGD scaffolding).\nDeliverable: Responsive web app shell (PWA-ready), component library, design tokens.\nEffort: 5 person-days.\nPlan weeks 4–6.\nDepends on: 2.4.', 'high', date '2026-11-10', date '2026-11-27', false, 21),
    ('Phase 1 · Platform foundation', '3.4 Card catalogue & import pipeline', E'Card catalogue & import pipeline (Pokémon, Yu-Gi-Oh!, MTG).\nDeliverable: Modular provider interface; priority sets imported with set, number, language, variant, rarity, printing.\nEffort: 6 person-days.\nPlan weeks 6–9.\nDepends on: Database schema & catalogue model, Gate 3.', 'high', date '2026-11-26', date '2026-12-16', false, 27),
    ('Phase 1 · Platform foundation', '3.7 Admin back-office v1', E'Admin back-office v1 (users, catalogue, moderation).\nDeliverable: Admin console on a prebuilt admin framework.\nEffort: 3 person-days.\nPlan weeks 7–8.\nDepends on: Accounts & roles.', 'medium', date '2026-12-03', date '2026-12-11', false, 29),
    ('Phase 1 · Platform foundation', '3.6 Search & filters', E'Search & filters (managed search engine).\nDeliverable: Indexing, card search, filters by TCG, set, language, variant, condition.\nEffort: 7 person-days.\nPlan weeks 8–9.\nDepends on: 3.4 (start + 5 d), 3.5.', 'high', date '2026-12-07', date '2026-12-18', false, 30),
    ('Phase 1 · Platform foundation', '3.9 Catalogue data QA & coverage sign-off', E'Deliverable: Spot-check of imported cards; agreed launch coverage (which sets and languages).\nEffort: 1.5 person-days.\nPlan weeks 8–9.\nDepends on: 3.4 (start + 5 d).', 'medium', date '2026-12-11', date '2026-12-18', false, 32),
    ('Phase 1 · Platform foundation', '3.8 Security baseline', E'Security baseline (authZ, rate limiting, secrets, audit log, PDPA data handling).\nDeliverable: Security checklist baselined; privacy-by-design controls.\nEffort: 2 person-days.\nPlan weeks 10–11.\nDepends on: Accounts & roles.', 'high', date '2026-12-21', date '2026-12-31', false, 33),
    ('Phase 2 · Marketplace MVP', '4.1 Wireframes: search, card page, account', E'UX wireframes – search, card page, account.\nDeliverable: Figma wireframes for the core buyer journey.\nEffort: 3 person-days.\nPlan weeks 6–7.\nDepends on: MVP specification.', 'medium', date '2026-11-23', date '2026-12-02', false, 25),
    ('Phase 2 · Marketplace MVP', '4.2 Wireframes: seller, listing, checkout', E'UX wireframes – seller onboarding, listing, cart & checkout.\nDeliverable: Figma wireframes for the seller journey and checkout.\nEffort: 2.5 person-days.\nPlan weeks 7–8.\nDepends on: 4.1 (start + 4 d).', 'medium', date '2026-11-30', date '2026-12-09', false, 28),
    ('Phase 2 · Marketplace MVP', '4.4 Payment & shipping merchant accounts', E'Payment & shipping merchant accounts (KYB approvals).\nDeliverable: Live payment gateway and shipping aggregator accounts approved; long lead time, so start early.\nEffort: 3 person-days.\nPlan weeks 6–9.\nFallback if merchant approval is late: admin-run payouts for the beta.', 'high', date '2026-11-23', date '2026-12-18', false, 26),
    ('Phase 2 · Marketplace MVP', '4.5 Seller verification & grading policy', E'Seller verification & condition-grading policy.\nDeliverable: Verification criteria for individuals and pros; NM/LP/MP/HP/DMG grading guide.\nEffort: 2 person-days.\nPlan weeks 8–9.', 'medium', date '2026-12-07', date '2026-12-18', false, 31),
    ('Phase 2 · Marketplace MVP', '4.6 Dispute, refund & fee policies', E'Deliverable: Dispute SLAs, refund rules, seller penalties, commission and fee schedule.\nEffort: 2 person-days.\nPlan weeks 10–12.\nDepends on: 4.5.', 'medium', date '2026-12-21', date '2027-01-07', false, 34),
    ('Phase 2 · Marketplace MVP', '4.3 Wireframes: orders, disputes, admin', E'UX wireframes – orders, dashboards, disputes, admin.\nDeliverable: Figma wireframes for fulfilment, reviews, disputes.\nEffort: 1.5 person-days.\nPlan weeks 11–12.', 'medium', date '2026-12-28', date '2027-01-07', false, 37),
    ('Phase 2 · Marketplace MVP', '4.7 Legal documents (T&Cs, privacy)', E'Marketplace legal documents (T&Cs, privacy policy, seller agreement).\nDeliverable: Counsel-reviewed T&Cs, PDPA-aligned privacy policy, seller agreement.\nEffort: 3 person-days.\nPlan weeks 13–15.\nDepends on: 4.6.', 'high', date '2027-01-11', date '2027-01-29', false, 40),
    ('Phase 2 · Marketplace MVP', '4.8 Seller onboarding & verification', E'Seller onboarding & verification (individual + professional).\nDeliverable: Seller sign-up, ID and business verification, admin review queue.\nEffort: 6 person-days.\nPlan weeks 10–11.\nDepends on: Accounts & roles, 3.7, 4.2, 4.5.', 'high', date '2026-12-21', date '2026-12-31', false, 35),
    ('Phase 2 · Marketplace MVP', '4.9 Listing creation & management', E'Deliverable: Manual card select, condition, variant, photos, price, quantity, edit and pause.\nEffort: 9.5 person-days.\nPlan weeks 11–13.\nDepends on: 3.6, 4.8 (start + 2 d).', 'high', date '2026-12-30', date '2027-01-11', false, 38),
    ('Phase 2 · Marketplace MVP', '4.11 Payments', E'Payments (hosted checkout, hold & payout, commission, refunds, webhooks).\nDeliverable: Fixed-price payments with held funds, seller payouts, refunds.\nEffort: 9 person-days.\nPlan weeks 12–15.\nDepends on: 2.5, Database schema & catalogue model.\nBackend load peaks in weeks 11–17 (83–98% of capacity). Frontend picks up backend overflow.', 'high', date '2027-01-04', date '2027-01-29', false, 39),
    ('Phase 2 · Marketplace MVP', '4.10 Card pages & cross-seller price comparison', E'Deliverable: One page per card and variant; compare sellers by price, condition, language, rating.\nEffort: 7.5 person-days.\nPlan weeks 13–14.\nDepends on: 4.9.', 'high', date '2027-01-12', date '2027-01-21', false, 41),
    ('Phase 2 · Marketplace MVP', '4.12 Cart & multi-seller checkout', E'Deliverable: Cart, per-seller order split, address, order summary.\nEffort: 9 person-days.\nPlan weeks 14–16.\nDepends on: 4.9, 4.11 (start + 5 d).', 'high', date '2027-01-21', date '2027-02-01', false, 42),
    ('Phase 2 · Marketplace MVP', '4.13 Shipping', E'Shipping (seller zone rates, tracking numbers, aggregator labels).\nDeliverable: Shipping profiles, label and tracking integration, shipping policy rules.\nEffort: 4 person-days.\nPlan weeks 16–17.\nDepends on: 4.12 (start + 3 d).', 'medium', date '2027-02-01', date '2027-02-09', false, 44),
    ('Phase 2 · Marketplace MVP', '4.14 Orders & tracking', E'Orders & tracking (buyer + seller dashboards, auto-release).\nDeliverable: Order lifecycle, ship and receive confirmation, fund release.\nEffort: 7 person-days.\nPlan weeks 16–17.\nDepends on: 4.12, 4.3.', 'high', date '2027-02-02', date '2027-02-12', false, 46),
    ('Phase 2 · Marketplace MVP', '4.17 Disputes, reports & refunds', E'Deliverable: Buyer reports (not received, not as described, counterfeit), evidence, admin resolution.\nEffort: 7 person-days.\nPlan weeks 17–18.\nDepends on: 4.11, 4.14 (start + 3 d), 4.6.', 'high', date '2027-02-10', date '2027-02-19', false, 48),
    ('Phase 2 · Marketplace MVP', '4.16 Notifications', E'Notifications (transactional email, optional web push).\nDeliverable: Order, payment, shipping and dispute notifications.\nEffort: 2.5 person-days.\nPlan weeks 17–19.\nDepends on: 4.14 (start + 1 d).', 'medium', date '2027-02-12', date '2027-02-23', false, 49),
    ('Phase 2 · Marketplace MVP', '4.15 Reviews & seller ratings', E'Deliverable: Post-order reviews, seller rating, transaction history.\nEffort: 2.5 person-days.\nPlan weeks 18–19.\nDepends on: 4.14 (start + 4 d).', 'medium', date '2027-02-16', date '2027-02-22', false, 51),
    ('Phase 2 · Marketplace MVP', '4.18 Trust & safety v1', E'Trust & safety v1 (moderation, new-seller limits, fraud rules).\nDeliverable: Listing moderation queue, risk rules, extra verification for high-value listings.\nEffort: 3 person-days.\nPlan weeks 19–20.\nDepends on: 3.7, 4.6.', 'medium', date '2027-02-22', date '2027-03-01', false, 52),
    ('Phase 2 · Marketplace MVP', '4.19 Analytics & marketplace KPIs', E'Analytics & marketplace KPIs (events + SQL views).\nDeliverable: Supply, demand, liquidity, seller and trust KPIs from the proposal\'s metrics list.\nEffort: 1.5 person-days.\nPlan week 19.\nDepends on: 4.14 (start + 4 d).', 'low', date '2027-02-22', date '2027-02-26', false, 53),
    ('Phase 2 · Marketplace MVP', '4.20 Assisted inventory import', E'Assisted inventory import for seeded sellers.\nDeliverable: Admin-run CSV import to seed launch retailers\' inventory.\nEffort: 2 person-days.\nPlan week 19.\nDepends on: 4.9.', 'medium', date '2027-02-22', date '2027-02-24', false, 54),
    ('QA · Quality, security & compliance', '6.1 QA test plan & test cases', E'Deliverable: Test plan and cases for critical journeys (search, buy, ship, review, dispute).\nEffort: 2 person-days.\nPlan weeks 15–17.\nDepends on: MVP specification.', 'medium', date '2027-01-25', date '2027-02-10', false, 43),
    ('QA · Quality, security & compliance', '6.2 Hardening & automated tests', E'Integration hardening & automated critical-path tests.\nDeliverable: Bug-fix sprint and end-to-end tests for checkout, payment and dispute flows; doubles as schedule contingency.\nEffort: 7 person-days.\nPlan weeks 20–21.\nDepends on: MVP feature-complete.\nThe 7 dev-days freed by moving card scanning to the next phase (weeks 22–23) add to this contingency.', 'high', date '2027-03-02', date '2027-03-08', false, 57),
    ('QA · Quality, security & compliance', '6.3 Internal UAT', E'Internal UAT with friendly sellers.\nDeliverable: UAT sign-off list, defects triaged.\nEffort: 4.5 person-days.\nPlan weeks 20–21.\nDepends on: 4.20, 6.1, MVP feature-complete.', 'high', date '2027-03-02', date '2027-03-12', false, 58),
    ('QA · Quality, security & compliance', '6.4 Performance & load testing', E'Deliverable: Load-test report against agreed targets; hotspots fixed.\nEffort: 2 person-days.\nPlan week 21.\nDepends on: 6.2.', 'medium', date '2027-03-09', date '2027-03-12', false, 59),
    ('QA · Quality, security & compliance', '6.6 Legal & compliance sign-off', E'Legal & compliance sign-off (counsel review of final docs and flows).\nDeliverable: Written sign-off on e-commerce, PDPA, payments, card-image/IP position; Singapore readiness note.\nEffort: 2 person-days.\nPlan weeks 19–22.\nDepends on: 4.7.', 'high', date '2027-02-22', date '2027-03-19', false, 55),
    ('QA · Quality, security & compliance', '6.5 Security review & fixes', E'Security review & remediation (OWASP checklist, scans; external pen-test if budgeted).\nDeliverable: Findings closed or accepted; payment and ID-data handling reviewed.\nEffort: 3 person-days.\nPlan weeks 22–23.\nDepends on: 6.4.', 'high', date '2027-03-15', date '2027-03-24', false, 61),
    ('Phase 4 · Closed beta', '7.1 Beta plan & recruitment', E'Beta plan & participant recruitment.\nDeliverable: Beta plan: ~10 sellers (retailers and individuals), ~40 buyers (experienced and new), success thresholds.\nEffort: 2 person-days.\nPlan weeks 16–18.\nDepends on: Gate 3.', 'medium', date '2027-02-01', date '2027-02-15', false, 45),
    ('Phase 4 · Closed beta', '7.2 Closed beta operation', E'Closed beta operation (support, feedback, daily metrics).\nDeliverable: Beta feedback log, KPI snapshots, dispute and fraud observations.\nEffort: 5 person-days.\nPlan weeks 22–24.\nDepends on: Gate 4.', 'high', date '2027-03-15', date '2027-04-02', false, 62),
    ('Phase 4 · Closed beta', '7.3 Beta fixes & polish', E'Deliverable: Prioritised fixes from beta; UX polish on listing and checkout.\nEffort: 8 person-days.\nPlan weeks 22–24.\nDepends on: Gate 4.', 'high', date '2027-03-15', date '2027-04-02', false, 63),
    ('Phase 5 · Launch & early optimisation', '8.1 Seller acquisition (seller-first)', E'Seller acquisition – seller-first pipeline & onboarding.\nDeliverable: Target list of ~40 retailers and collectors, outreach, commitments to list at launch.\nEffort: 10 person-days.\nPlan weeks 10–24.\nDepends on: Gate 3.\nSeller supply is the largest risk. If too few sellers have committed by Gate 4, move the launch instead of opening an empty marketplace.', 'high', date '2026-12-21', date '2027-04-02', false, 36),
    ('Phase 5 · Launch & early optimisation', '8.2 Support playbook & help centre', E'Support playbook, help centre & FAQ content.\nDeliverable: Support and dispute playbook, FAQ, seller guides.\nEffort: 3 person-days.\nPlan weeks 16–18.', 'medium', date '2027-02-02', date '2027-02-18', false, 47),
    ('Phase 5 · Launch & early optimisation', '8.3 Buyer acquisition & launch comms', E'Buyer acquisition & launch comms (communities, creators, store partnerships).\nDeliverable: Launch content, community posts, retailer partnership outreach.\nEffort: 3.5 person-days.\nPlan weeks 18–26.', 'medium', date '2027-02-15', date '2027-04-14', false, 50),
    ('Phase 5 · Launch & early optimisation', '8.4 Go-live checklist & runbooks', E'Production go-live checklist & runbooks.\nDeliverable: Monitoring and on-call runbook, backup/restore test, go-live checklist.\nEffort: 3 person-days.\nPlan weeks 23–24.', 'medium', date '2027-03-22', date '2027-03-29', false, 64),
    ('Phase 5 · Launch & early optimisation', '8.5 Malaysia soft launch', E'Malaysia soft launch (production go-live).\nDeliverable: Live marketplace in Malaysia; first sellers onboarded; daily monitoring.\nEffort: 5.7 person-days.\nPlan week 25.\nDepends on: Gate 5.', 'high', date '2027-04-05', date '2027-04-09', false, 66),
    ('Phase 5 · Launch & early optimisation', '8.6 Hypercare & first metrics review', E'Hypercare & first metrics review (feeds Gate 6).\nDeliverable: Stabilisation fixes; KPI read-out; ranked post-launch backlog (card scanning, auctions, Singapore, apps).\nEffort: 7.8 person-days.\nPlan weeks 25–26.\nDepends on: 8.5 (start + 2 d).', 'high', date '2027-04-07', date '2027-04-16', false, 67),
    ('Phase 3 · Specialised functions', '2.6 Card-recognition feasibility spike', E'Deliverable: Accuracy report on ~150 cards across 3 TCGs (OCR of set code and number vs image matching).\nEffort: 4 person-days.\nMoved out of discovery together with card scanning. Run it before committing to the scanning build.', 'medium', null::date, null::date, false, 69),
    ('Phase 3 · Specialised functions', '5.1 Card scanning (assisted listing)', E'Card scanning – assisted listing (OCR + catalogue match, seller confirms).\nDeliverable: Photo to candidate cards to seller confirmation to prefilled listing. Never auto-publishes.\nEffort: 7 person-days.\nDepends on: 2.6.\nBuilds on the card catalogue (3.4) and listing creation (4.9) delivered for launch.', 'medium', null::date, null::date, false, 70),
    ('Phase 3 · Specialised functions', '9.1 Auctions', E'Auctions (bidding, auction fees, anti-sniping).\nEffort: 12 person-days.\nA priority enhancement in the proposal, feasibility-dependent. About 12 dev-days. Best after fixed-price liquidity is proven.', 'medium', null::date, null::date, false, 71),
    ('Expansion · Singapore & native apps', '9.2 Singapore go-live', E'Singapore go-live (SGD pricing, SG shipping zones, PDPA review, cross-border policy).\nEffort: 8 person-days.\nCurrency and locale support are built into the foundation. Go-live follows Malaysia once legal, payment and shipping checks pass.', 'medium', null::date, null::date, false, 72),
    ('Expansion · Singapore & native apps', '9.3 Native iOS / Android apps', E'Effort: 16 person-days.\nThe launch is web-first (responsive PWA). Native apps wrap the same APIs. About 16 dev-days plus store review.', 'low', null::date, null::date, false, 73),
    ('Phase 6 · Optimisation', '9.4 Listing recommendations', E'Effort: 5 person-days.\nA priority enhancement in the proposal. Needs transaction data first.', 'low', null::date, null::date, false, 74),
    ('Phase 6 · Optimisation', '9.5 Full Gate 6 review & Phase 6 optimisation', E'Deliverable: Search, retention and fraud tuning from ~8 weeks of real transaction data.\nEffort: 12 person-days.\nGate 6 on 16 Apr is only an initial health check. The full scale / modify / reassess decision needs about eight weeks of trading.', 'medium', null::date, null::date, false, 75),
    ('Phase 0 · Discovery & validation', 'Gate 1 · Concept validation', E'Go / no-go on the concept, using the buyer and seller interview evidence.\nDepends on: 2.2.', 'high', date '2026-11-06', date '2026-11-06', true, 20),
    ('Phase 0 · Discovery & validation', 'Gate 3 · MVP approval', E'Proceed / Modify / Stop decision on scope, budget and timeline, based on the discovery report. Re-baseline the estimates here.\nDepends on: 2.10.', 'high', date '2026-11-20', date '2026-11-20', true, 24),
    ('Phase 2 · Marketplace MVP', 'MVP feature-complete', 'All MVP features built. Hardening, UAT and the security review follow.', 'high', date '2027-03-01', date '2027-03-01', true, 56),
    ('QA · Quality, security & compliance', 'Gate 4 · Beta approval', E'Go / no-go for the closed beta after internal UAT and load testing. If too few sellers have committed, move the launch rather than open an empty marketplace.\nDepends on: 6.3, 6.4.', 'high', date '2027-03-12', date '2027-03-12', true, 60),
    ('Phase 4 · Closed beta', 'Gate 5 · Launch approval', E'Go / no-go for the Malaysia soft launch: security findings closed, legal sign-off in hand and the closed beta reviewed.\nDepends on: 6.5, 6.6, 7.2, 7.3.', 'high', date '2027-04-02', date '2027-04-02', true, 65),
    ('Phase 5 · Launch & early optimisation', 'Gate 6 · Initial post-launch review', E'Health check on about two weeks of live data. The full scale / modify / reassess decision needs about eight weeks of trading and sits in the next phase (9.5).\nDepends on: 8.6.', 'high', date '2027-04-16', date '2027-04-16', true, 68)
    ) as v(phase, title, description, priority, start_date, due_date, is_milestone, position)
    join public.phases ph on ph.project_id in (pid, nid) and ph.name = v.phase and not ph.id = any(old_phases);

  -- kept tasks join the new phase with the same "Phase N" tag, then the old phases go
  update public.tasks t
     set phase_id = np.id
    from public.phases op, public.phases np
   where t.project_id = pid and t.phase_id = op.id and op.id = any(old_phases)
     and np.project_id = pid and not np.id = any(old_phases)
     and split_part(np.name, ' · ', 1) = split_part(op.name, ' · ', 1);
  delete from public.phases where id = any(old_phases);
  update public.tasks set assignee_id = admin where project_id = pid and assignee_id is distinct from admin;

  update public.phases p
     set start_date = least(p.start_date, x.s), end_date = greatest(p.end_date, x.e)
    from (select phase_id, min(coalesce(start_date, due_date)) as s, max(coalesce(due_date, start_date)) as e
            from public.tasks where project_id = pid group by phase_id) x
   where p.id = x.phase_id and p.start_date is not null;

  insert into public.meetings (project_id, meeting_date, title, notes, decisions, created_by)
  values (pid, date '2026-10-19', 'Plan kick-off',
          E'Walked through the 26-week delivery plan, Mon 19 Oct 2026 to Fri 16 Apr 2027: the CodeSync team of a project manager and two developers. Dates come from a working calendar with Malaysian public holidays removed, and nobody is planned above 90% of their working days in any week.\n\nKey dates: Gate 1 Fri 6 Nov · Gate 2 already signed off on 2 Oct · Gate 3 (MVP approval) Fri 20 Nov · MVP feature-complete Mon 1 Mar · Gate 4 (beta approval) Fri 12 Mar · closed beta Mon 15 Mar to Fri 2 Apr · Gate 5 (launch approval) Fri 2 Apr · Malaysia soft launch Mon 5 Apr · Gate 6 initial review Fri 16 Apr.\n\nRisks to watch: seller supply (the largest risk; outreach starts in week 10), payment gateway hold, split and payout support and merchant approval, card-data and image licensing, backend load in weeks 11 to 17, no dedicated designer or QA, Ramadan (about 8 Feb to 9 Mar) and Gate 6 landing only two weeks after launch.',
          E'First launch covers discovery, the platform foundation, the fixed-price marketplace MVP, a closed beta (about 10 sellers and 40 buyers) and a Malaysia-only soft launch.\nWork already done or under way stays on the board as it is. The plan’s work packages replace the earlier backlog. Plan items that work already covers (2.3 card-data strategy, 2.9 MVP requirements, Gate 2, 3.2 data model and 3.3 accounts) are dropped from the plan.\nCard scanning and AI identification (with its recognition spike) and auctions / bidding move to the next phase, after the first launch. Singapore go-live, native apps, listing recommendations and the full Gate 6 review follow them, as the plan set out. All of these sit in the “TCG Marketplace · Next phase” project.\nDropping card scanning frees 7 dev-days in weeks 22 and 23, plus 4 dev-days in weeks 2 and 3 from the spike. They stay unallocated as contingency for hardening, security fixes and the beta.\nEvery estimate is a planning figure. Re-baseline at Gate 3 on Fri 20 Nov.\nTwo-week sprints from 19 Oct, with a review every second Monday (first on 2 Nov). If that Monday is a public holiday (8 Feb), the review moves to the Tuesday.',
          admin);
end $$;
