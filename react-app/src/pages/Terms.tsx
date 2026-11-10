import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { GIVEAWAYS_ENABLED } from '../config/featureFlags';
import './Legal.css';

// Section order, by anchor id. Section numbers — both the badge on each section
// and every "Section N" in the prose — are derived from this one list, so a
// gated section (GIVEAWAYS_ENABLED) can never leave a badge and a cross-
// reference disagreeing. Anchor ids are stable deep-link targets and do NOT
// track the displayed number (there is no s8: the points-packs section that
// once held that slot was removed on 10 Nov 2026). New sections are appended,
// never inserted, so existing numbers cited elsewhere stay put.
const SECTION_ORDER = [
  's1', 's2', 's3', 's4', 's5', 's6', 's7',
  's9', 's10', 's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18',
  'early-access', 'challenge-rules',
  ...(GIVEAWAYS_ENABLED ? ['giveaways'] : []),
];
const sec = (id: string) => SECTION_ORDER.indexOf(id) + 1;
const n = (id: string) => String(sec(id)).padStart(2, '0');

export default function Terms() {
  useEffect(() => {
    document.title = 'Terms & Conditions | Libo';
    return () => { document.title = 'Libo'; };
  }, []);

  return (
    <>
      <SiteNav />
      <main className="legal-page">
        <div className="legal-container">
          {/* Breadcrumb */}
          <div className="legal-breadcrumb">
            <Link to="/">Home</Link>
            <span className="legal-breadcrumb-sep">&gt;</span>
            <span>Terms &amp; Conditions</span>
          </div>

          {/* Hero */}
          <div className="legal-hero">
            <div className="legal-label">Legal</div>
            <h1 className="font-display">Terms &amp; Conditions</h1>
            <p className="legal-meta">
              Last updated: <span>29 September 2026</span> &middot; Effective date: <span>May 2026</span>
            </p>
          </div>

          {/* Table of Contents */}
          <div className="legal-toc">
            <div className="legal-toc-title">Table of Contents</div>
            <ol>
              <li><a href="#s1">Acceptance of Terms</a></li>
              <li><a href="#s2">About Libo</a></li>
              <li><a href="#s3">Eligibility</a></li>
              <li><a href="#s4">Account Registration</a></li>
              <li><a href="#s5">Subscription Plans</a></li>
              <li><a href="#s6">Billing &amp; Payment</a></li>
              <li><a href="#s7">Cancellation &amp; Refunds</a></li>
              <li><a href="#s9">Free Tier</a></li>
              <li><a href="#s10">User Obligations</a></li>
              <li><a href="#s11">Health &amp; Fitness Disclaimer</a></li>
              <li><a href="#s12">Intellectual Property</a></li>
              <li><a href="#s13">User-Generated Content</a></li>
              <li><a href="#s14">Limitation of Liability</a></li>
              <li><a href="#s15">Termination</a></li>
              <li><a href="#s16">Changes to Terms</a></li>
              <li><a href="#s17">Governing Law</a></li>
              <li><a href="#s18">Contact</a></li>
              <li><a href="#early-access">Early Access (Founding Member) Purchases</a></li>
              <li><a href="#challenge-rules">Cash Challenges</a></li>
              {GIVEAWAYS_ENABLED && (
                <li><a href="#giveaways">Giveaways</a></li>
              )}
            </ol>
          </div>

          {/* 1 */}
          <section className="legal-section" id="s1">
            <div className="legal-section-num">{n('s1')}</div>
            <h2>Acceptance of Terms</h2>
            <p>By downloading, installing, accessing, or using the Libo application or website (collectively, the <strong>"Service"</strong>), you agree to be bound by these Terms and Conditions (<strong>"Terms"</strong>). If you do not agree to these Terms, do not use the Service.</p>
            <p>These Terms constitute a legally binding agreement between you and <strong>Libo World</strong> (<strong>"Libo"</strong>, <strong>"we"</strong>, <strong>"us"</strong>, or <strong>"our"</strong>). By creating an account, you confirm that you have read, understood, and agreed to these Terms and our <Link to="/privacy">Privacy Policy</Link>.</p>
          </section>

          {/* 2 */}
          <section className="legal-section" id="s2">
            <div className="legal-section-num">{n('s2')}</div>
            <h2>About Libo</h2>
            <p>Libo is a digital health and fitness platform that provides users with workout programs, exercise libraries, mobility content, breathing exercises, morning and evening routines, and progress tracking tools — accessible via mobile application and web.</p>
            <p>Libo is operated by <strong>Libo World</strong>, based in Germany. For any questions, contact us at <a href="mailto:hello@liboworld.com">hello@liboworld.com</a>.</p>
          </section>

          {/* 3 */}
          <section className="legal-section" id="s3">
            <div className="legal-section-num">{n('s3')}</div>
            <h2>Eligibility</h2>
            <p>Libo applies layered age requirements depending on what you use the Service for. By using Libo, you represent and warrant that you meet the relevant minimum age below for each activity.</p>
            <ul>
              <li><strong>13+ — App, account and points.</strong> The minimum age to create an account, train in the app, and earn rewards points is <strong>13</strong>. If you are under <strong>16</strong>, you may only use the Service with verified parental consent — typically provided through your platform's family controls (Apple Family Sharing or Google Family Link).</li>
              <li><strong>16+ — {GIVEAWAYS_ENABLED ? 'Giveaways and entry' : 'Entry'} into cash challenges.</strong> {GIVEAWAYS_ENABLED ? 'Entry into any giveaway, and enrolment in any cash challenge, are' : 'Enrolment in any cash challenge is'} restricted to users aged <strong>16 and over</strong>.</li>
              <li><strong>18+ — Direct cash payouts.</strong> Cash payouts via Stripe, Wise, Revolut or any equivalent payment provider are restricted to users aged <strong>18 and over</strong>, in line with our payment partners' requirements. Cash-challenge participants aged 16 or 17 who complete a challenge may, where permitted by local law, receive payout through a parent-linked verified payment account; if no such account is provided within <strong>14 days</strong> of completion being verified, the reward will be converted to in-app credit of equivalent value.</li>
            </ul>
            <p>Where local law requires a higher minimum age for any of the above activities, that local law applies. Libo may also restrict or block participation by jurisdiction (see Section {sec('s17')}, Governing Law) — entry is <em>void where prohibited by local law</em>.</p>
          </section>

          {/* 4 */}
          <section className="legal-section" id="s4">
            <div className="legal-section-num">{n('s4')}</div>
            <h2>Account Registration</h2>
            <p>To access the full functionality of Libo, you must create an account by providing accurate and complete information. You are responsible for:</p>
            <ul>
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Notifying us immediately of any unauthorised use at <a href="mailto:hello@liboworld.com">hello@liboworld.com</a></li>
            </ul>
            <p>You may not share your account with others or create multiple accounts. We reserve the right to suspend or terminate accounts that violate these Terms.</p>
          </section>

          {/* 5 */}
          <section className="legal-section" id="s5">
            <div className="legal-section-num">{n('s5')}</div>
            <h2>Subscription Plans</h2>

            <h3>Free Tier</h3>
            <p>Libo offers a free base version with access to a limited selection of features including basic exercises, select workouts, and core app functionality. No payment information is required for the free tier.</p>

            <h3>Premium Subscription</h3>
            <p>Libo Premium unlocks the full feature set including the complete exercise library, all workout programs, multi-week challenges, advanced progress tracking, custom workout builder, and priority support.</p>
            <p>Premium subscriptions are available on the following billing cycles:</p>
            <ul>
              <li><strong>Monthly</strong> — billed every 30 days</li>
              <li><strong>Annual</strong> — billed once per year (best value)</li>
            </ul>
            {/* No introductory offer is configured on either product in App
                Store Connect, and every tier ships with trial days set to 0.
                The only free period is an Apple custom offer code (first one:
                ALENA, 2 weeks on monthly, live 2026-09-29) — REWARDS-ECONOMY-RULES
                §3 "Exception — creator offer codes". A free period is not paid
                Premium for the cash gate (supabase-migration-paid-premium-cash-gate.sql). */}
            <p>Libo Premium does not include a free trial by default: unless an offer applies, your subscription begins and your payment method is charged as soon as you subscribe.</p>
            <p>From time to time we may make <strong>promotional offer codes</strong> available that give new subscribers a free Premium period (for example, two weeks) on a specified plan. When the free period ends, your subscription automatically renews at the standard price for that plan unless you cancel it through your Apple account settings before the free period ends. A free Premium period is not a paid Premium subscription for the purposes of the cash challenges (see <a href="#challenge-rules">Cash Challenges</a>).</p>

            <h3>Auto-Renewal</h3>
            {/* "All" used to read as absolute, which is wrong for the Founding
                Member offer (§Early Access) — a one-time payment that never
                renews. A reader who stops at this section otherwise walks away
                believing they will be charged again next year. */}
            <p>All <strong>recurring</strong> paid subscriptions automatically renew at the end of each billing period unless cancelled at least <strong>24 hours before</strong> the renewal date. One-time purchases do not renew: see <a href="#early-access">Early Access (Founding Member) Purchases</a>.</p>
          </section>

          {/* 6 */}
          <section className="legal-section" id="s6">
            <div className="legal-section-num">{n('s6')}</div>
            <h2>Billing &amp; Payment</h2>
            <p>All prices are listed in EUR and include applicable taxes where required by law. Payments are processed by our third-party payment providers.</p>
            <p>We reserve the right to change subscription prices. Any price changes will be communicated at least <strong>30 days in advance</strong> via email or in-app notification.</p>
          </section>

          {/* 7 */}
          <section className="legal-section" id="s7">
            <div className="legal-section-num">{n('s7')}</div>
            <h2>Cancellation &amp; Refunds</h2>

            <h3>Cancellation</h3>
            <p>You may cancel your subscription at any time through your account settings or by contacting <a href="mailto:hello@liboworld.com">hello@liboworld.com</a>. Cancellation takes effect at the end of your current billing period.</p>

            <h3>Refund Policy</h3>
            <p>We offer a <strong>14-day money-back guarantee</strong> for new Premium subscribers. Contact us within 14 days of your first charge for a full refund — no questions asked.</p>
            <p>If your Premium subscription is refunded while you are taking part in a &euro;15 or &euro;50 cash challenge, that run earns no payout (see <a href="#challenge-rules">Cash Challenges</a>).</p>
            <p>Refunds are not available for:</p>
            <ul>
              {/* Carve-out, not a contradiction: §Early Access honours a full
                  refund on request for Founding Member purchases, which is well
                  past 14 days. Without this line the general rule here answers
                  "no" to a buyer the specific section answers "yes" to. Said
                  "at any time before launch" until 3 Nov 2026 — launch was
                  18 Sep, so that carve-out had silently expired. */}
              <li>Subscriptions older than 14 days from the first charge — <em>except</em> Founding Member purchases, which remain fully refundable on request (see <a href="#early-access">Early Access</a>)</li>
              <li>Partial billing periods following cancellation</li>
              <li>Users who have previously received a refund for Libo</li>
            </ul>
            <p>If you purchased through Apple App Store or Google Play, refunds are handled by Apple or Google under their respective policies.</p>

            <h3>EU Consumer Rights</h3>
            <p>EU residents have the right to withdraw from a digital service contract within <strong>14 days</strong> of purchase without providing a reason, in accordance with EU Directive 2011/83/EU — unless you have already begun using the service and explicitly waived your right of withdrawal.</p>

          </section>

          {/* 9 */}
          <section className="legal-section" id="s9">
            <div className="legal-section-num">{n('s9')}</div>
            <h2>Free Tier</h2>
            <p>The free tier of Libo is provided "as is" with no guarantees of continued availability. We reserve the right to modify, limit, or discontinue free tier features at any time without notice.</p>
          </section>

          {/* 10 */}
          <section className="legal-section" id="s10">
            <div className="legal-section-num">{n('s10')}</div>
            <h2>User Obligations</h2>
            <p>By using Libo, you agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose or in violation of these Terms</li>
              <li>Reproduce, duplicate, copy, sell, resell, or exploit any part of the Service</li>
              <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</li>
              <li>Upload or transmit viruses, malware, or any other harmful code</li>
              <li>Use automated tools to scrape, crawl, or extract content from the Service</li>
              <li>Impersonate any person or entity or misrepresent your affiliation</li>
              <li>Share, distribute, or commercially exploit content from Libo without prior written permission</li>
            </ul>
          </section>

          {/* 11 */}
          <section className="legal-section" id="s11">
            <div className="legal-section-num">{n('s11')}</div>
            <h2>Health &amp; Fitness Disclaimer</h2>
            <div className="legal-highlight">
              <p><strong>Important:</strong> Libo is a fitness and wellness platform intended for informational and motivational purposes only. The content provided does not constitute medical advice, diagnosis, or treatment.</p>
            </div>
            <p>Before beginning any new exercise program, consult with a qualified healthcare professional, particularly if you:</p>
            <ul>
              <li>Have a pre-existing medical condition, injury, or chronic illness</li>
              <li>Are pregnant or postpartum</li>
              <li>Have not exercised regularly in the past 12 months</li>
              <li>Experience pain, dizziness, or discomfort during exercise</li>
            </ul>
            <p>You acknowledge that physical exercise carries inherent risks, including injury. By using Libo, you assume full responsibility for any risk, injury, or damage arising from your participation in any fitness activity facilitated through the Service.</p>
            {/* Added 2026-10-13 with the AI coach. This is where the coach's
                medical and fallibility disclosure lives — deliberately here and
                NOT as a permanent label under the chat composer, which is not
                how any comparable app presents it. Section 11 already applies
                in full to challenge participation (§ Cash Challenges), so
                putting it here covers the coach by the same route. */}
            <h3>The AI coach</h3>
            <p>Libo&rsquo;s in-app coach generates its responses using artificial intelligence, reading the training data you have recorded in the app. <strong>It can be wrong.</strong> What it tells you is general guidance, not medical advice, and it is not a substitute for a qualified healthcare professional, physiotherapist or personal trainer.</p>
            <p>In particular: <strong>do not rely on the coach to judge whether an exercise is safe for you if you are in pain, injured or unwell.</strong> Everything in this section applies to the coach&rsquo;s responses as it does to the rest of the Service. The coach cannot change your training plan or any other part of your account; anything it suggests takes effect only if you make the change yourself.</p>
          </section>

          {/* 12 */}
          <section className="legal-section" id="s12">
            <div className="legal-section-num">{n('s12')}</div>
            <h2>Intellectual Property</h2>
            <p>All content within the Libo Service is the exclusive property of Libo World or its licensors and is protected by applicable intellectual property laws.</p>
            <p>You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Service for personal, non-commercial purposes. This licence does not permit you to:</p>
            <ul>
              <li>Reproduce or distribute any content from the Service</li>
              <li>Create derivative works based on Service content</li>
              <li>Use Libo's branding, trademarks, or logos without prior written consent</li>
            </ul>
          </section>

          {/* 13 */}
          <section className="legal-section" id="s13">
            <div className="legal-section-num">{n('s13')}</div>
            <h2>User-Generated Content</h2>
            <p>If the Service allows you to submit content (e.g. profile information, workout logs, feedback), you retain ownership but grant Libo a worldwide, royalty-free, non-exclusive licence to use, reproduce, and display it solely for providing and improving the Service.</p>
          </section>

          {/* 14 */}
          <section className="legal-section" id="s14">
            <div className="legal-section-num">{n('s14')}</div>
            <h2>Limitation of Liability</h2>
            <p>To the maximum extent permitted by applicable law, Libo World shall not be liable for:</p>
            <ul>
              <li>Any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, data, goodwill, or other intangible losses</li>
              <li>Damages arising from your use of or inability to use the Service</li>
              <li>Any injury or health damage resulting from exercise activities</li>
            </ul>
            <p>Our total liability shall not exceed the amount you paid us in the <strong>12 months preceding the claim</strong>, or &euro;50, whichever is greater.</p>
            <p>Nothing in these Terms excludes or limits liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded under German or EU law.</p>
          </section>

          {/* 15 */}
          <section className="legal-section" id="s15">
            <div className="legal-section-num">{n('s15')}</div>
            <h2>Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time if we reasonably believe you have violated these Terms or engaged in harmful conduct.</p>
            <p>Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination will continue to apply.</p>
          </section>

          {/* 16 */}
          <section className="legal-section" id="s16">
            <div className="legal-section-num">{n('s16')}</div>
            <h2>Changes to Terms</h2>
            <p>We may update these Terms from time to time. Material changes will be notified at least <strong>14 days before</strong> taking effect.</p>
            <p>The current version is always available at <a href="https://www.liboworld.com/terms">www.liboworld.com/terms</a>.</p>
          </section>

          {/* 17 */}
          <section className="legal-section" id="s17">
            <div className="legal-section-num">{n('s17')}</div>
            <h2>Governing Law &amp; Geographic Availability</h2>
            <p>These Terms are governed by the laws of the <strong>Federal Republic of Germany</strong>. Disputes shall be subject to the exclusive jurisdiction of the courts of Germany. EU consumers may also bring claims in the courts of their country of residence.</p>
            <p>You may also use the EU Online Dispute Resolution platform at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.</p>
            <p><strong>Geographic availability.</strong> Libo's <strong>cash challenges</strong> are decided entirely by your own effort: everyone who completes a challenge is paid in full, with no draw, no pot and no element of chance. They are open globally <strong>except where prohibited by local law</strong>. At launch, cash challenges are excluded in <strong>Quebec (Canada) and any country or region subject to OFAC or comparable EU/UN sanctions</strong>.</p>
            {GIVEAWAYS_ENABLED && (
              <p><strong>Giveaways</strong> turn on an element of chance and are restricted in different places. The places excluded from giveaways are listed in the <Link to="/giveaway-rules">Official Giveaway Rules</Link>, and that list is the authoritative one.</p>
            )}
            <p>Libo may add or remove jurisdictions at any time in response to local regulatory contact or legal review. Where a jurisdiction is excluded after a cycle has started, in-flight cycles for already-enrolled users in that geography will be honoured to completion.</p>
          </section>

          {/* 18 */}
          <section className="legal-section" id="s18">
            <div className="legal-section-num">{n('s18')}</div>
            <h2>Contact</h2>
            <p>If you have any questions about these Terms:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:hello@liboworld.com">hello@liboworld.com</a></li>
              <li><strong>Website:</strong> <a href="https://www.liboworld.com">www.liboworld.com</a></li>
              <li><strong>Company:</strong> Libo World, Germany</li>
            </ul>
          </section>

          {/* 19 */}
          <section className="legal-section" id="early-access">
            <div className="legal-section-num">{n('early-access')}</div>
            {/* Rewritten 3 Nov 2026. This section described a live pre-launch
                offer in the present tense and contradicted what happened: it
                said the 12-month entitlement "begins on the day Libo launches"
                and that the offer "closes on launch day", while in fact Libo
                launched on 18 September 2026 and the offer was held open until
                14 October, four weeks past it. The section and its id are kept
                rather than deleted — /join and the checkout consent link deep-
                link to #early-access, and removing it would renumber every
                section after it. The terms any buyer bought under are
                preserved below. */}
            <h2>Early Access (Founding Member) Purchases</h2>
            <p><strong>This offer has closed.</strong> The Founding Member early-access offer closed on <strong>14 October 2026</strong> and is no longer available to buy. Libo is now published on the App Store and Premium is sold at its standard price; see Sections {sec('s5')} (Subscription Plans) and {sec('s6')} (Billing &amp; Payment).</p>

            <h3>If You Bought the Founding Member Offer</h3>
            <p>The terms you purchased under continue to apply to that purchase. The offer was a <strong>single one-time payment</strong> of &euro;39.50 for <strong>12 months of Premium</strong> — 50% off the standard &euro;79.99 first-year price. It is <strong>not</strong> a subscription and does <strong>not</strong> auto-renew: you were charged once and no further charges are made. When your 12 months end, Premium does not renew automatically; you may subscribe at the then-current standard price if you wish to continue.</p>

            <h3>Refunds</h3>
            <p>Your <strong>14-day right of withdrawal under Article 16(m) of Directive 2011/83/EU</strong> applied to this purchase, and beyond that statutory period we will honour a <strong>full refund on request, for any reason</strong>. To request one, email <a href="mailto:support@liboworld.com">support@liboworld.com</a> from the address you purchased with. Founding Member access is tied to that email address.</p>
          </section>

          {/* Appended, never inserted: sections auto-number, and earlier
              sections are referenced by number in prose here and in
              Privacy.tsx. Adding at the end leaves all of those intact. */}
          <section className="legal-section" id="challenge-rules">
            <div className="legal-section-num">{n('challenge-rules')}</div>
            <h2>Cash Challenges</h2>
            <p>A Libo <strong>cash challenge</strong> is skill-based: you complete a published amount of work on each of a fixed number of days and receive a fixed cash payout for finishing. <strong>There is no draw, no ballot and no element of chance</strong>, and there is <strong>no entry fee</strong> &mdash; the payout is funded by Libo and set aside when you enrol, never funded by other participants.</p>
            <p>Enrolment, daily windows, proof requirements, freeze tokens, forfeiture and payout are governed by the <strong>Cash Challenge Rules</strong> published at <Link to="/rules">liboworld.com/rules</Link>, which are <strong>incorporated into these Terms by reference</strong> and form part of your agreement with us.</p>
            <p>Sections {sec('s3')} (Eligibility &mdash; 16+ to enter, 18+ for a cash payout), {sec('s11')} (Health &amp; Fitness Disclaimer) and {sec('s17')} (Governing Law &amp; Geographic Availability) apply in full to challenge participation. Identity verification is required before any payout is released. Where the Cash Challenge Rules conflict with these Terms, these Terms govern.</p>
            <p><strong>Paid Premium requirement.</strong> The &euro;15 and &euro;50 cash challenges require an active, <strong>paid</strong> Premium subscription on the day you enrol and on every day you record a session. A free Premium period, including one granted by a promotional offer code, does not satisfy this requirement. If your Premium subscription ends during a run, the run ends the next time you record a day; days already recorded while your Premium was active continue to count. If your Premium subscription is refunded during a run, that run earns no payout, even if you complete every day.</p>
            {/* Added 2026-10-13 alongside the fuller clause in the Rules page's
                payout section. Stated here too because the Terms are what a
                payment provider or a regulator reads first, and because the
                recordings never reach Libo (Rules §5) — producing them on
                request is the whole of our verification until signed on-device
                proof ships. */}
            <p><strong>Producing your recordings.</strong> Challenge recordings stay on your device and are never uploaded to us. Before a payout is released we may ask you to send us the recordings for the days you completed; where we do, we will identify the days and allow you at least <strong>7 days</strong> to respond. If they are not provided in that time, or do not show the exercise and rep count the challenge prescribed, or show the same footage used for more than one day, the payout is not made and the entry is void. Full detail is in the <Link to="/rules">Cash Challenge Rules</Link>.</p>
            <p>We may amend the Cash Challenge Rules for <strong>future</strong> enrolments. The rules in force on the day you enrolled govern your run.</p>
          </section>

          {/* Gated with giveaways. Rewritten 10 Nov 2026 to the one-pool model
              (canon LEGAL-COMPETITIONS §4b/§5/§8, REWARDS-ECONOMY-RULES §8.1/
              §8.4): no tier-locked giveaways, Free 1 / Premium 5 entries, same
              activation rule for every plan, points neither bought nor
              converted. Appended last so no earlier section renumbers when the
              flag flips. The /giveaway-rules page itself is public and NOT
              gated. Never add "buying does not increase your chances" —
              Premium gives 5x the entries (LEGAL-COMPETITIONS §5 cl.4). */}
          {GIVEAWAYS_ENABLED && (
          <section className="legal-section" id="giveaways">
            <div className="legal-section-num">{n('giveaways')}</div>
            <h2>Giveaways</h2>
            <p>Libo runs a <strong>giveaway</strong>: a cash prize draw held in rounds. There is one open draw per round, and every eligible member is entered automatically. <strong>Free members get 1 entry per round and Premium members get 5.</strong> There are no giveaways reserved for any plan.</p>
            <p>Entries for a round only become active when the member <strong>completes one workout in the app while that round is open</strong>. This rule is the same on every plan.</p>
            <ul>
              <li><strong>No purchase necessary.</strong> The Free plan is free.</li>
              <li><strong>Every entry has the same chance of winning, and all entries are drawn from one pool.</strong></li>
              <li><strong>Memberships give more entries.</strong></li>
              <li><strong>Points cannot be bought and cannot be converted into entries.</strong></li>
            </ul>
            <p>Round dates, prizes, eligibility (16+, one account per person, excluded places), the draw, claiming and winner verification are governed by the <strong>Official Giveaway Rules</strong> published at <Link to="/giveaway-rules">liboworld.com/giveaway-rules</Link>, which are <strong>incorporated into these Terms by reference</strong>. Where they conflict with these Terms, these Terms govern.</p>
            <p><strong>A giveaway is never cancelled for low participation.</strong> A draw goes ahead at its published close regardless of how many entries it received, and there is no minimum-entry threshold. We may only cancel or suspend a draw where its integrity has been compromised &mdash; for example a technical failure, a bug, tampering or fraud &mdash; or where an event outside our reasonable control prevents it from running. In either case the draw is rescheduled and <strong>all valid entries already received are carried forward into the rescheduled draw</strong>.</p>
            <p>Prizes are not transferable or exchangeable. Tax on a prize is the winner&rsquo;s responsibility. Apple and Google are not sponsors of, and are not involved in, any Libo giveaway.</p>
          </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
