import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './Legal.css';

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
              Last updated: <span>May 2026</span> &middot; Effective date: <span>May 2026</span>
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
              <li><a href="#s5">Subscription Plans &amp; Free Trial</a></li>
              <li><a href="#s6">Billing &amp; Payment</a></li>
              <li><a href="#s7">Cancellation &amp; Refunds</a></li>
              <li><a href="#points-packs">Points Packs and Digital Content</a></li>
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
            </ol>
          </div>

          {/* 1 */}
          <section className="legal-section" id="s1">
            <div className="legal-section-num">01</div>
            <h2>Acceptance of Terms</h2>
            <p>By downloading, installing, accessing, or using the Libo application or website (collectively, the <strong>"Service"</strong>), you agree to be bound by these Terms and Conditions (<strong>"Terms"</strong>). If you do not agree to these Terms, do not use the Service.</p>
            <p>These Terms constitute a legally binding agreement between you and <strong>Libo World</strong> (<strong>"Libo"</strong>, <strong>"we"</strong>, <strong>"us"</strong>, or <strong>"our"</strong>). By creating an account, you confirm that you have read, understood, and agreed to these Terms and our <Link to="/privacy">Privacy Policy</Link>.</p>
          </section>

          {/* 2 */}
          <section className="legal-section" id="s2">
            <div className="legal-section-num">02</div>
            <h2>About Libo</h2>
            <p>Libo is a digital health and fitness platform that provides users with workout programs, exercise libraries, mobility content, breathing exercises, morning and evening routines, and progress tracking tools — accessible via mobile application and web.</p>
            <p>Libo is operated by <strong>Libo World</strong>, based in Germany. For any questions, contact us at <a href="mailto:hello@liboworld.com">hello@liboworld.com</a>.</p>
          </section>

          {/* 3 */}
          <section className="legal-section" id="s3">
            <div className="legal-section-num">03</div>
            <h2>Eligibility</h2>
            <p>Libo applies layered age requirements depending on what you use the Service for. By using Libo, you represent and warrant that you meet the relevant minimum age below for each activity.</p>
            <ul>
              <li><strong>13+ — App, account, points and Common product giveaways.</strong> The minimum age to create an account, train in the app, earn rewards points, and enter Common product giveaways is <strong>13</strong>. If you are under <strong>16</strong>, you may only use the Service with verified parental consent — typically provided through your platform's family controls (Apple Family Sharing or Google Family Link).</li>
              <li><strong>16+ — Premium and Special giveaways, and entry into cash challenges.</strong> Premium and Special giveaways (including high-value items such as smartphones), and enrolment in any cash challenge, are restricted to users aged <strong>16 and over</strong>.</li>
              <li><strong>18+ — Direct cash payouts.</strong> Cash payouts via Stripe, Wise, Revolut or any equivalent payment provider are restricted to users aged <strong>18 and over</strong>, in line with our payment partners' requirements. Cash-challenge winners aged 16 or 17 may, where permitted by local law, receive payout through a parent-linked verified payment account; if no such account is provided within <strong>14 days</strong> of winner verification, the prize will be converted to in-app credit (e.g. additional tickets or a Pro subscription month) of equivalent value.</li>
            </ul>
            <p>Where local law requires a higher minimum age for any of the above activities, that local law applies. Libo may also restrict or block participation by jurisdiction (see Section 17, Governing Law) — entry is <em>void where prohibited by local law</em>.</p>
          </section>

          {/* 4 */}
          <section className="legal-section" id="s4">
            <div className="legal-section-num">04</div>
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
            <div className="legal-section-num">05</div>
            <h2>Subscription Plans &amp; Free Trial</h2>

            <h3>Free Tier</h3>
            <p>Libo offers a free base version with access to a limited selection of features including basic exercises, select workouts, and core app functionality. No payment information is required for the free tier.</p>

            <h3>Pro Subscription</h3>
            <p>Libo Pro unlocks the full feature set including the complete exercise library, all workout programs, multi-week challenges, advanced progress tracking, custom workout builder, the exercise alternative scanner, and priority support.</p>
            <p>Pro subscriptions are available on the following billing cycles:</p>
            <ul>
              <li><strong>Monthly</strong> — billed every 30 days</li>
              <li><strong>Annual</strong> — billed once per year (best value)</li>
            </ul>

            <h3>7-Day Free Trial</h3>
            <div className="legal-highlight">
              <p>New users who have not previously held a Pro subscription are eligible for a <strong>7-day free trial</strong> of Libo Pro. You will not be charged during the trial period. If you do not cancel before the trial ends, your selected subscription will automatically activate and your payment method will be charged.</p>
            </div>
            <p>The free trial is limited to one per user and one per payment method. We reserve the right to modify or withdraw free trial eligibility at any time.</p>

            <h3>Auto-Renewal</h3>
            <p>All paid subscriptions automatically renew at the end of each billing period unless cancelled at least <strong>24 hours before</strong> the renewal date.</p>
          </section>

          {/* 6 */}
          <section className="legal-section" id="s6">
            <div className="legal-section-num">06</div>
            <h2>Billing &amp; Payment</h2>
            <p>All prices are listed in EUR and include applicable taxes where required by law. Payments are processed by our third-party payment providers.</p>
            <p>We reserve the right to change subscription prices. Any price changes will be communicated at least <strong>30 days in advance</strong> via email or in-app notification.</p>
          </section>

          {/* 7 */}
          <section className="legal-section" id="s7">
            <div className="legal-section-num">07</div>
            <h2>Cancellation &amp; Refunds</h2>

            <h3>Cancellation</h3>
            <p>You may cancel your subscription at any time through your account settings or by contacting <a href="mailto:hello@liboworld.com">hello@liboworld.com</a>. Cancellation takes effect at the end of your current billing period.</p>

            <h3>Refund Policy</h3>
            <p>We offer a <strong>14-day money-back guarantee</strong> for new Pro subscribers. Contact us within 14 days of your first charge for a full refund — no questions asked.</p>
            <p>Refunds are not available for:</p>
            <ul>
              <li>Subscriptions older than 14 days from the first charge</li>
              <li>Partial billing periods following cancellation</li>
              <li>Free trial periods</li>
              <li>Users who have previously received a refund for Libo</li>
            </ul>
            <p>If you purchased through Apple App Store or Google Play, refunds are handled by Apple or Google under their respective policies.</p>

            <h3>EU Consumer Rights</h3>
            <p>EU residents have the right to withdraw from a digital service contract within <strong>14 days</strong> of purchase without providing a reason, in accordance with EU Directive 2011/83/EU — unless you have already begun using the service and explicitly waived your right of withdrawal.</p>

            <h3>Points Packs &amp; Giveaway Tickets</h3>
            <p>Points packs are <strong>one-time purchases</strong>. They are <strong>not</strong> auto-renewing subscriptions — you are charged once per pack and never recurringly. Points are converted by the user into giveaway tickets at the standard in-app rate.</p>
            <p>If a giveaway cycle is voided (for example, the minimum participation threshold for that cycle is not met), tickets are treated <strong>asymmetrically depending on their source</strong>:</p>
            <ul>
              <li><strong>Tickets derived from earned points</strong> (points acquired through fitness activity, then converted) are <strong>refunded to your in-app balance</strong> at original ticket cost. No cash refund.</li>
              <li><strong>Tickets derived from purchased points</strong> (points acquired via a real-money points pack) are <strong>consumed at the moment of conversion to tickets</strong> and are non-refundable, including where the cycle is later voided. By purchasing a points pack and converting points to tickets you expressly consent to loss of your right of withdrawal in respect of the converted points, in accordance with EU Directive 2011/83/EU Art. 16(m).</li>
            </ul>
            <p>This asymmetry exists to prevent purchase-then-refund arbitrage and to keep the giveaway economics defensible for all participants. The free in-app earn path remains available to all eligible users.</p>
          </section>

          {/* 8 */}
          <section className="legal-section" id="points-packs">
            <div className="legal-section-num">08</div>
            <h2>Points Packs and Digital Content</h2>
            <p>This section sets out the specific terms that apply when you purchase a <strong>points pack</strong> through Libo. It supplements, and where applicable expands on, the refund language in Section 7.</p>

            <h3>One-Time Purchase, No Auto-Renewal</h3>
            <p>Each points pack is a <strong>single one-time transaction</strong>. Points packs are <strong>not</strong> subscriptions and do not auto-renew. You are charged once per pack at the price displayed at checkout, and no further charges are made unless you choose to purchase another pack.</p>

            <h3>What You Receive</h3>
            <p>On successful payment, the corresponding number of points is credited to your Libo account balance. Points are an in-app utility credit; they have no cash value and cannot be redeemed for cash.</p>
            <p>You can spend points on any points-denominated feature inside the app — including, for example, converting points to giveaway tickets, applying them as merchandise discounts, or unlocking utilities such as streak-freeze tokens. Conversion to giveaway tickets is a <strong>manual action you take in-app</strong>; it does not happen automatically when you purchase a pack.</p>

            <h3>Express Consent to Immediate Provision (EU Right of Withdrawal Waiver)</h3>
            <p>Points packs are digital content delivered immediately. By completing checkout and ticking the consent box, <em>you expressly consent to immediate provision of this digital content and acknowledge that you waive your right of withdrawal under Article 16(m) of Directive 2011/83/EU</em>. The 14-day cooling-off period for distance contracts therefore does not apply once provision has begun, which for points packs is the moment your account is credited.</p>

            <h3>Non-Refundability After Conversion to Tickets</h3>
            <p>Before you convert them, purchased points sit in your balance and remain available for any other points utility. Once you choose to convert purchased points into giveaway tickets, that conversion is final.</p>
            <p><em>"Purchased points are non-refundable once converted to giveaway tickets in-app. Tickets derived from purchased points are not refunded even if a giveaway cycle is voided."</em></p>
            <p>This rule exists to keep giveaway economics defensible for all participants and to prevent purchase-then-refund arbitrage. The asymmetric treatment of earned-points tickets versus purchased-points tickets is described in more detail in Section 7.</p>

            <h3>Failure to Deliver and Support</h3>
            <p>If a points pack purchase is charged but your account is not credited, or if you believe a transaction was made in error, contact <a href="mailto:support@liboworld.com">support@liboworld.com</a>. Disputes and refund requests relating to non-converted points, or to a failure on our side to deliver the points you paid for, will be handled on a case-by-case basis through Libo support.</p>
          </section>

          {/* 9 */}
          <section className="legal-section" id="s9">
            <div className="legal-section-num">09</div>
            <h2>Free Tier</h2>
            <p>The free tier of Libo is provided "as is" with no guarantees of continued availability. We reserve the right to modify, limit, or discontinue free tier features at any time without notice.</p>
          </section>

          {/* 10 */}
          <section className="legal-section" id="s10">
            <div className="legal-section-num">10</div>
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
            <div className="legal-section-num">11</div>
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
          </section>

          {/* 12 */}
          <section className="legal-section" id="s12">
            <div className="legal-section-num">12</div>
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
            <div className="legal-section-num">13</div>
            <h2>User-Generated Content</h2>
            <p>If the Service allows you to submit content (e.g. profile information, workout logs, feedback), you retain ownership but grant Libo a worldwide, royalty-free, non-exclusive licence to use, reproduce, and display it solely for providing and improving the Service.</p>
          </section>

          {/* 14 */}
          <section className="legal-section" id="s14">
            <div className="legal-section-num">14</div>
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
            <div className="legal-section-num">15</div>
            <h2>Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time if we reasonably believe you have violated these Terms or engaged in harmful conduct.</p>
            <p>Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination will continue to apply.</p>
          </section>

          {/* 16 */}
          <section className="legal-section" id="s16">
            <div className="legal-section-num">16</div>
            <h2>Changes to Terms</h2>
            <p>We may update these Terms from time to time. Material changes will be notified at least <strong>14 days before</strong> taking effect.</p>
            <p>The current version is always available at <a href="https://www.liboworld.com/terms">www.liboworld.com/terms</a>.</p>
          </section>

          {/* 17 */}
          <section className="legal-section" id="s17">
            <div className="legal-section-num">17</div>
            <h2>Governing Law &amp; Geographic Availability</h2>
            <p>These Terms are governed by the laws of the <strong>Federal Republic of Germany</strong>. Disputes shall be subject to the exclusive jurisdiction of the courts of Germany. EU consumers may also bring claims in the courts of their country of residence.</p>
            <p>You may also use the EU Online Dispute Resolution platform at <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>.</p>
            <p><strong>Geographic availability.</strong> Libo's giveaways and cash challenges are open globally <strong>except where prohibited by local law</strong>. At launch, the following jurisdictions are excluded from all paid-entry promotions, giveaways and cash challenges: <strong>Quebec (Canada), Brazil, mainland China, and any country or region subject to OFAC or comparable EU/UN sanctions</strong>. Libo may add or remove jurisdictions at any time in response to local regulatory contact or legal review. Where a jurisdiction is excluded after a cycle has started, in-flight cycles for already-enrolled users in that geography will be honoured to completion.</p>
          </section>

          {/* 18 */}
          <section className="legal-section" id="s18">
            <div className="legal-section-num">18</div>
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
            <div className="legal-section-num">19</div>
            <h2>Early Access (Founding Member) Purchases</h2>
            <p>This section sets out the specific terms that apply when you buy the pre-launch <strong>Founding Member</strong> early-access offer, before the Libo mobile app is publicly available. It supplements Sections 5 (Subscription Plans), 6 (Billing &amp; Payment) and 7 (Cancellation &amp; Refunds).</p>

            <h3>One-Time Purchase, No Auto-Renewal</h3>
            <p>The Founding Member offer is a <strong>single one-time payment</strong> of &euro;39.50 — 50% off the standard &euro;79 first-year price of Premium. It is <strong>not</strong> a subscription and does <strong>not</strong> auto-renew. You are charged once and no further charges are made. After your first year ends, Premium does not renew automatically; you may choose to subscribe at the then-current standard price if you wish to continue.</p>

            <h3>What You Receive</h3>
            <p>You receive <strong>12 months of Premium</strong> (the full Libo app, all Premium features, no limits). Because the app is not yet publicly launched at the time of purchase, <strong>your 12-month entitlement begins on the day Libo launches</strong>, not on the day you pay — so you do not lose any of your paid year while waiting. As an early-access bonus, Premium is unlocked on your account immediately on liboworld.com and any pre-launch (e.g. TestFlight) access we provide, at no additional charge and without shortening your 12 months.</p>

            <h3>Pre-Launch Right of Withdrawal &amp; Refunds</h3>
            <p>Unlike points packs, no digital content is delivered <em>at the moment of purchase</em> as your paid entitlement year; it begins at launch. Accordingly, <strong>your 14-day right of withdrawal under Article 16(m) of Directive 2011/83/EU applies</strong>, and beyond that statutory period we will honour a <strong>full refund at any time before launch</strong>, for any reason, on request. To withdraw or request a refund, email <a href="mailto:support@liboworld.com">support@liboworld.com</a> from the address you purchased with.</p>

            <h3>If We Do Not Launch</h3>
            <p>If Libo does not launch, or if we discontinue the Founding Member entitlement before your 12 months begin, you are entitled to a <strong>full refund</strong> of the amount you paid. Founding Member access is tied to the email address used at checkout; please use the same email when the app launches.</p>

            <h3>Offer Availability</h3>
            <p>The Founding Member offer is available only during the pre-launch period and closes on launch day. Pricing and availability may be changed or withdrawn for future buyers at any time before purchase; any change does not affect a purchase already completed.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
