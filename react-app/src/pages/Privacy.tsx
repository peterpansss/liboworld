import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { GIVEAWAYS_ENABLED } from '../config/featureFlags';
import './Legal.css';

export default function Privacy() {
  // Section numbers are derived at render time (same helper as Terms.tsx), so
  // inserting a section renumbers the rest. Anchor ids (#p1…#p13) stay fixed
  // for the sections that already had them; new sections get a named id.
  let sectionNo = 0;
  const n = () => String(++sectionNo).padStart(2, '0');
  useEffect(() => {
    document.title = 'Privacy Policy | Libo';
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
            <span>Privacy Policy</span>
          </div>

          {/* Hero */}
          <div className="legal-hero">
            <div className="legal-label">Legal</div>
            <h1 className="font-display">Privacy Policy</h1>
            <p className="legal-meta">
              Last updated: <span>14 September 2026</span> &middot; Effective date: <span>14 September 2026</span>
            </p>
          </div>

          <div className="legal-highlight" style={{ marginBottom: 40 }}>
            <p>Libo World is committed to protecting your personal data. This Privacy Policy explains what data we collect through the Libo app and liboworld.com, why we collect it, how we use it, and what rights you have under the <strong>General Data Protection Regulation (GDPR)</strong> and applicable German data protection law.</p>
          </div>

          {/* Table of Contents */}
          <div className="legal-toc">
            <div className="legal-toc-title">Table of Contents</div>
            <ol>
              <li><a href="#p1">Who We Are (Data Controller)</a></li>
              <li><a href="#p2">Data We Collect</a></li>
              <li><a href="#p3">How We Use Your Data</a></li>
              <li><a href="#p4">Legal Basis for Processing</a></li>
              <li><a href="#p5">Third-Party Services</a></li>
              <li><a href="#p6">Cookies &amp; Tracking</a></li>
              <li><a href="#p7">Data Retention</a></li>
              <li><a href="#delete-account">Deleting Your Account</a></li>
              <li><a href="#p8">International Data Transfers</a></li>
              <li><a href="#p9">Children's Privacy</a></li>
              <li><a href="#p10">Your Rights Under GDPR</a></li>
              <li><a href="#p11">Security</a></li>
              <li><a href="#p12">Changes to This Policy</a></li>
              <li><a href="#p13">Contact &amp; Data Protection Officer</a></li>
            </ol>
          </div>

          {/* 1 */}
          <section className="legal-section" id="p1">
            <div className="legal-section-num">{n()}</div>
            <h2>Who We Are</h2>
            <p>The data controller responsible for your personal data is:</p>
            <ul>
              <li><strong>Company:</strong> Libo World</li>
              <li><strong>Country:</strong> Germany</li>
              <li><strong>Email:</strong> <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a></li>
              <li><strong>Website:</strong> <a href="https://www.liboworld.com">www.liboworld.com</a></li>
            </ul>
            <p>As data controller, we determine the purposes and means of processing your personal data. If you have any questions or concerns about how we handle your data, contact us at <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a>.</p>
          </section>

          {/* 2 */}
          <section className="legal-section" id="p2">
            <div className="legal-section-num">{n()}</div>
            <h2>Data We Collect</h2>

            <h3>Account &amp; Registration Data</h3>
            <p>When you create a Libo account, we collect:</p>
            <ul>
              <li>Email address</li>
              <li>Password (stored only as a secure hash — never in plain text)</li>
              <li>If you use Sign in with Apple (iOS): the name and email address Apple shares with us, which may be a private relay address</li>
              <li>A unique account ID that links your data together</li>
            </ul>

            <h3>Profile &amp; Onboarding Data</h3>
            <p>To personalise your training, the app asks optional questions during onboarding and in your profile. Every question can be skipped. Depending on what you answer, we collect:</p>
            <ul>
              <li>Your first name (used to greet you in the app)</li>
              <li>Gender and age (a number of years — we do not ask for your date of birth)</li>
              <li>Fitness goal, why it matters to you, your motivation and your biggest challenge</li>
              <li>Training experience, recent training, days per week, session length and preferred time</li>
              <li>Where you train (for example home, gym or outdoors — a training setting, not your geographic location), available equipment and focus areas</li>
              <li>Your preferred units</li>
            </ul>

            <h3>Health Information</h3>
            <p>Some optional profile answers are information about your health. We collect them only if you give explicit consent in the app (see <a href="#p4">Legal Basis for Processing</a>):</p>
            <ul>
              <li>Injuries or areas to protect</li>
              <li>Height, weight and target weight</li>
              <li>Diet, sleep and day-to-day activity level</li>
              <li>Daily water intake you log</li>
            </ul>

            <h3>Workout &amp; Activity Data</h3>
            <p>When you use the app, we collect:</p>
            <ul>
              <li>Workouts started and completed, with duration and effort</li>
              <li>Exercise logs (sets, reps, weight, duration)</li>
              <li>Notes you write on workouts and exercises</li>
              <li>Plans, programmes and custom workouts you create or follow, and your progress in them</li>
              <li>Workout frequency, streaks and activity history</li>
              <li>Rewards points earned, referral codes and invites</li>
            </ul>

            <h3>Photos</h3>
            <ul>
              <li><strong>Profile photo (optional).</strong> If you add one, it is uploaded to our storage. Profile photos are stored at a public web address: anyone who has that address can view the image, although it is not listed or searchable anywhere.</li>
              <li><strong>Workout photos (optional).</strong> If you attach a photo, or a still frame from a video, to a workout, it is uploaded to private storage that only your account can access.</li>
              <li><strong>Share cards.</strong> Images or videos you share to Instagram, Snapchat or other apps go directly from your device to the app you choose. We do not upload them.</li>
            </ul>
            <p>The app uses your camera only when you choose to take a photo or record a challenge session, and your microphone only as part of a challenge recording.</p>

            <h3>Public Share Links</h3>
            <p>If you choose to share a workout or plan, we create a public page at liboworld.com that anyone with the link can view. It shows the shared workout and the name from your profile (as "Created by"). Share links are deleted when you delete your account.</p>

            <h3>Cash Challenge Data</h3>
            <p>If you enrol in a cash challenge, we collect:</p>
            <ul>
              <li>Your enrolment, the days you complete, the duration you record each day, freeze tokens used, and whether you finish or leave</li>
              <li>Your device's timezone, recorded once at enrolment so that daily deadlines cannot be moved by changing your phone's clock or timezone</li>
            </ul>
            <p><strong>Challenge recordings stay on your device.</strong> The videos you record as proof are saved on your phone only and are never uploaded to us. If a payout is queried, we may ask you to produce them (see the <Link to="/rules">Cash Challenge Rules</Link>).</p>

            <h3>Payout &amp; Identity Data</h3>
            <p>We collect these only if and when you claim a cash payout. Identity verification is required before any payout is released (see our <Link to="/terms">Terms of Service</Link>):</p>
            <ul>
              <li>Information needed to verify your identity and age</li>
              <li>Payment details for the payout (for example bank account or payment-provider details, payee email and country) — or, for participants aged 16 or 17, the details of a parent-linked verified payment account</li>
            </ul>
            {/* Giveaways are gated, not deleted (Phase 2): the prize-claim form
                only exists in the app when GIVEAWAYS_ENABLED is on. */}
            {GIVEAWAYS_ENABLED && (
              <p>If you win a giveaway and claim a physical prize, we collect the name, delivery address and (optionally) phone number you provide so we can send it to you.</p>
            )}

            <h3>Payment &amp; Billing Data</h3>
            <p>We do <strong>not</strong> see or store your full card number, CVV or other card details. Depending on how you pay:</p>
            <ul>
              <li><strong>In-app subscriptions</strong> are billed by Apple (App Store) or Google (Google Play). We receive the product, subscription status, dates and store transaction identifiers, linked to your account ID.</li>
              <li><strong>Purchases on liboworld.com</strong> are processed by Stripe. We store your name, email address, optional phone number, what you bought and Stripe's payment and customer references.</li>
            </ul>

            <h3>Technical &amp; Device Data</h3>
            <p>We automatically collect technical information when you use the Service:</p>
            <ul>
              <li><strong>Crash reports and diagnostics (app):</strong> error details, device model, operating system, app version, performance data and app session health. Crash reports carry a random installation identifier generated by our crash-reporting provider and may contain your account ID (for example inside the address of a request that failed). Our crash reporting is configured not to store your IP address.</li>
              <li><strong>App updates:</strong> when the app checks for updates, it sends a random installation identifier, the app version and platform to our update provider.</li>
              <li><strong>IP address:</strong> stored with your sign-in sessions for account security, and processed by our hosting and network providers to deliver the app and website. We do not use it to work out your location.</li>
              <li><strong>Website:</strong> browser type, the page that referred you and campaign parameters in the link you followed, including when you click certain sign-up buttons.</li>
            </ul>
            <p>The app does not use an advertising identifier, does not include analytics or advertising SDKs, and does not collect your location.</p>

            <h3>Website Sign-ups &amp; Forms</h3>
            <p>If you join our waitlist or a sign-up funnel on liboworld.com, we collect your email address and, where the form asks for them, your name, phone number and any fitness quiz answers you give. If you apply to our creator programme or send a press enquiry, we collect the details you enter in that form.</p>

            <h3>Communications Data</h3>
            <p>If you contact us or send a bug report or feature idea from the app, we store the content of your message, your email address if you provide one, and — for in-app reports — your account ID, app version and build, device model, operating system version and language setting, so we can investigate and respond.</p>
          </section>

          {/* 3 */}
          <section className="legal-section" id="p3">
            <div className="legal-section-num">{n()}</div>
            <h2>How We Use Your Data</h2>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr><th>Purpose</th><th>Data Used</th></tr>
                </thead>
                <tbody>
                  <tr><td>Providing and operating the Service</td><td>Account data, profile data, workout and activity data, photos</td></tr>
                  <tr><td>Personalising your workout plan and recommendations</td><td>Profile and onboarding data, health information (with your explicit consent), activity history</td></tr>
                  <tr><td>Running cash challenges and preventing cheating</td><td>Challenge enrolment and completion data, timezone at enrolment, account data</td></tr>
                  <tr><td>Verifying identity and paying out cash rewards</td><td>Payout and identity data, challenge data</td></tr>
                  <tr><td>Awarding rewards points and preventing points fraud</td><td>Workout and activity data, account data</td></tr>
                  <tr><td>Creating public share links you request</td><td>The shared workout or plan, your profile name</td></tr>
                  <tr><td>Processing payments and managing subscriptions</td><td>Billing data, account ID, email</td></tr>
                  <tr><td>Sending service emails (receipts, account updates)</td><td>Email address</td></tr>
                  <tr><td>Sending marketing emails (opt-in only)</td><td>Email address, sign-up details</td></tr>
                  <tr><td>Keeping the app stable and fixing bugs</td><td>Crash reports, diagnostics, bug reports</td></tr>
                  <tr><td>Understanding how visitors use our website</td><td>Website analytics data</td></tr>
                  <tr><td>Ensuring security and preventing fraud</td><td>IP address, device data, account data</td></tr>
                  <tr><td>Complying with legal obligations</td><td>As required by applicable law</td></tr>
                  <tr><td>Responding to support requests</td><td>Communications data, account data</td></tr>
                </tbody>
              </table>
            </div>
            <p>We will never sell your personal data to third parties. We do not use your health or fitness data for advertising profiling.</p>
          </section>

          {/* 4 */}
          <section className="legal-section" id="p4">
            <div className="legal-section-num">{n()}</div>
            <h2>Legal Basis for Processing</h2>
            <p>Under the GDPR, we process your personal data on the following legal bases:</p>
            <ul>
              <li><strong>Performance of a contract (Art. 6(1)(b) GDPR)</strong> — Processing necessary to provide the Service you signed up for, including account management, workout delivery and tracking, subscriptions, cash challenges and payouts.</li>
              <li><strong>Legitimate interests (Art. 6(1)(f) GDPR)</strong> — Processing necessary for our legitimate business interests such as crash reporting, improving the Service, ensuring security, and preventing fraud and cheating — where these interests are not overridden by your rights.</li>
              <li><strong>Consent (Art. 6(1)(a) GDPR)</strong> — For optional processing such as marketing emails and marketing cookies (Meta Pixel). You can withdraw consent at any time.</li>
              <li><strong>Legal obligation (Art. 6(1)(c) GDPR)</strong> — Where we are required to process data to comply with applicable law, such as tax and financial record-keeping.</li>
            </ul>
            <h3>Health Information (Art. 9 GDPR)</h3>
            <p>Health information is special category data. We process it only on the basis of your <strong>explicit consent (Art. 9(2)(a) GDPR)</strong>, which the app asks for before it collects any health information. You can decline and still use Libo without providing health information. You can withdraw your consent at any time in the app's settings; withdrawing does not affect processing that took place before you withdrew.</p>
          </section>

          {/* 5 */}
          <section className="legal-section" id="p5">
            <div className="legal-section-num">{n()}</div>
            <h2>Third-Party Services</h2>
            <p>We use the following service providers to operate the Service. They process personal data on our behalf and on our instructions:</p>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr><th>Provider</th><th>Purpose</th><th>Data</th><th>Location</th></tr>
                </thead>
                <tbody>
                  <tr><td>Supabase</td><td>Database, sign-in, file storage and server functions</td><td>Account, profile, health, workout, photo, challenge, payout and billing data; sign-in session IP address</td><td>EU (Ireland), hosted on Amazon Web Services</td></tr>
                  <tr><td>Sentry</td><td>App crash reporting and diagnostics</td><td>Crash reports, diagnostics, installation identifier, account ID where it appears in error details</td><td>EU data region (Germany)</td></tr>
                  <tr><td>RevenueCat</td><td>Managing in-app subscriptions</td><td>Account ID, store purchase and subscription data</td><td>USA</td></tr>
                  <tr><td>Expo (EAS Update)</td><td>Delivering app updates</td><td>Installation identifier, app version, platform</td><td>USA</td></tr>
                  <tr><td>Resend</td><td>Sending emails (account, receipts, waitlist and marketing emails) and delivering contact forms and bug reports to our inbox</td><td>Email address, email content, form and bug-report content</td><td>USA</td></tr>
                  <tr><td>Stripe</td><td>Payments on liboworld.com</td><td>Name, email, phone (optional), payment details you enter with Stripe</td><td>EU / USA</td></tr>
                  <tr><td>Cloudflare</td><td>Website delivery and streaming of workout videos</td><td>IP address and technical request data</td><td>Global network (USA-based company)</td></tr>
                  <tr><td>Netcup</td><td>Website hosting</td><td>IP address and technical request data</td><td>Germany</td></tr>
                  <tr><td>Google Analytics</td><td>Website usage analytics</td><td>Pages visited, browser and device information, cookie identifiers, IP address</td><td>EU / USA</td></tr>
                  <tr><td>Meta Pixel</td><td>Measuring our website marketing — only with your consent</td><td>Pages visited, sign-up events, cookie identifiers, IP address</td><td>EU / USA</td></tr>
                  <tr><td>Payout providers (e.g. Stripe, Wise, Revolut)</td><td>Identity verification and cash payouts — only if you claim a payout</td><td>Identity data, payment details, payout amount</td><td>Depends on provider</td></tr>
                </tbody>
              </table>
            </div>
            <p><strong>Apple and Google</strong> process in-app purchases (and, for Sign in with Apple, your sign-in) as independent controllers under their own privacy policies.</p>
            <p>We also use <strong>Railway</strong> (media processing) and <strong>OpenAI</strong> (generating exercise voiceovers). These process only Libo's own exercise videos and exercise instructions and receive no personal data about you.</p>
            <p>We do not share your personal data with any other third parties except where required by law, where you choose to share something yourself (for example a share card sent to another app), or with your explicit consent.</p>
          </section>

          {/* 6 */}
          <section className="legal-section" id="p6">
            <div className="legal-section-num">{n()}</div>
            <h2>Cookies &amp; Tracking</h2>
            <p>Our website uses cookies and similar technologies (such as browser local storage). We use the following categories:</p>
            <ul>
              <li><strong>Strictly necessary</strong> — Required for the website to function, for example keeping you signed in and remembering your cookie choice. Cannot be disabled.</li>
              <li><strong>Analytics</strong> — Google Analytics helps us understand how visitors use our website. It is currently loaded on every page of the website and is not controlled by the cookie banner.</li>
              <li><strong>Marketing</strong> — The Meta Pixel measures the effectiveness of our campaigns. It is loaded only after you click Accept in the cookie banner, and never if you click Reject.</li>
            </ul>
            <p>You can change your cookie choice at any time via "Cookie settings" in the website footer, or by adjusting your browser settings.</p>
            <p>The Libo app does not use cookies for tracking, advertising identifiers, or analytics or advertising SDKs.</p>
          </section>

          {/* 7 */}
          <section className="legal-section" id="p7">
            <div className="legal-section-num">{n()}</div>
            <h2>Data Retention</h2>
            <p>We retain your personal data only for as long as necessary:</p>
            <ul>
              <li><strong>Account, profile and health data</strong> — Retained for the duration of your account. Deleted when you delete your account in the app, or within 30 days of a deletion request by email.</li>
              <li><strong>Workout &amp; activity data</strong> — Including workout notes, workout photos, plans, points and share links. Retained while your account is active. Deleted with your account.</li>
              <li><strong>Profile photo</strong> — Retained until you remove it or delete your account.</li>
              <li><strong>Challenge recordings</strong> — Never held by us; they stay on your device until you delete them. Deleting your account in the app also removes them from that device.</li>
              <li><strong>Billing, payment and payout records</strong> — Retained for 10 years to comply with German tax law (&sect; 147 AO).</li>
              <li><strong>Identity verification data</strong> — Retained only for as long as required by law.</li>
              <li><strong>Support communications and bug reports</strong> — Retained for 2 years after the last interaction.</li>
              <li><strong>Crash reports</strong> — Retained by our crash-reporting provider for a limited period, after which they are deleted automatically.</li>
              <li><strong>Website analytics data</strong> — Retained for the retention period set in our analytics accounts.</li>
            </ul>
          </section>

          {/* Deletion */}
          <section className="legal-section" id="delete-account">
            <div className="legal-section-num">{n()}</div>
            <h2>Deleting Your Account</h2>
            <p>You can delete your Libo account and personal data at any time. Full instructions are also on our <Link to="/delete-account">Delete your account</Link> page.</p>
            <ul>
              <li><strong>In the app:</strong> go to Profile &rarr; Account &rarr; Delete Account, type the confirmation word and confirm. Deletion happens immediately and cannot be undone.</li>
              <li><strong>By email:</strong> if you no longer have the app, email <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a> from the email address on your account. We will delete your account within 30 days.</li>
            </ul>
            <h3>What is deleted</h3>
            <p>Your account and sign-in details, your profile (including health information), your profile photo, your workout history, workout notes and workout photos, plans and custom workouts, water logs, points and rewards history, challenge enrolments and check-ins, your public share links, and any waitlist or unpaid website sign-up entries under your email address. Deleting in the app also removes challenge recordings from that device.</p>
            <h3>What is kept</h3>
            <p>Records we must keep by law are retained for <strong>10 years</strong> under German tax law (&sect; 147 AO). Where these records were linked to your account, that link is removed:</p>
            <ul>
              <li>Subscription and payment records (product, status, dates and store or Stripe payment references)</li>
              <li>Records of cash payouts that were paid, including the payee details that show who was paid</li>
              <li>Purchases made on liboworld.com, including the name, email address and phone number given at checkout, so the payment can still be reconciled</li>
            </ul>
            <p>Our subscription provider (RevenueCat) keeps its own record of in-app purchases made under your account ID. Support emails and bug reports you sent us remain in our inbox for the period stated in <a href="#p7">Data Retention</a>. Crash reports, which may contain your account ID, expire with our crash-reporting provider's retention period.</p>
            <p><strong>Deleting your account does not cancel a subscription billed by Apple or Google.</strong> Cancel it in your App Store or Google Play subscription settings first.</p>
          </section>

          {/* 8 */}
          <section className="legal-section" id="p8">
            <div className="legal-section-num">{n()}</div>
            <h2>International Data Transfers</h2>
            <p>We store the core app data in the EU. Some of our service providers are located, or can access data from, outside the EEA, including in the United States. Where we transfer data internationally, we ensure appropriate safeguards including:</p>
            <ul>
              <li><strong>EU Standard Contractual Clauses (SCCs)</strong> approved by the European Commission</li>
              <li><strong>EU-US Data Privacy Framework</strong> where the provider is certified under it</li>
              <li>Adequacy decisions by the European Commission</li>
            </ul>
            <p>You can request a copy of the relevant transfer mechanisms by contacting <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a>.</p>
          </section>

          {/* 9 */}
          <section className="legal-section" id="p9">
            <div className="legal-section-num">{n()}</div>
            <h2>Children's Privacy</h2>
            <p>Libo applies layered minimum ages depending on the activity (see our <Link to="/terms#s3">Terms of Service, Section 3 (Eligibility)</Link>). At a high level:</p>
            <ul>
              {/* Giveaway clauses are gated, not deleted: giveaways are Phase 2, so
                  the sentence must read correctly with them absent and restore
                  the reviewed wording when GIVEAWAYS_ENABLED flips back on. */}
              <li>The app, accounts{GIVEAWAYS_ENABLED ? ', the rewards programme and Common product giveaways' : ' and the rewards programme'} are open to users aged <strong>13 and over</strong>.</li>
              <li>Users under <strong>16</strong> may only use the Service with verified parental consent — typically provided through Apple Family Sharing or Google Family Link, which act as our first-line age and consent gate.</li>
              <li>{GIVEAWAYS_ENABLED ? 'Premium/Special giveaways and cash challenges' : 'Cash challenges'} are restricted to users aged <strong>16 and over</strong>; direct cash payouts are restricted to users aged <strong>18 and over</strong>.</li>
            </ul>
            <p>We do not knowingly collect personal data from children under 13, or from children aged 13–15 without verified parental consent. If we become aware that we have collected such data without the required consent, we will delete it promptly.</p>
            <p>If you are a parent or guardian and you believe your child has provided us with personal data without your consent, please contact us at <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a> and we will action your request within 30 days.</p>
          </section>

          {/* 10 */}
          <section className="legal-section" id="p10">
            <div className="legal-section-num">{n()}</div>
            <h2>Your Rights Under GDPR</h2>
            <p>As a data subject under the GDPR, you have the following rights. To exercise any of these, contact <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a>. We will respond within <strong>30 days</strong>.</p>
            <div className="legal-rights-grid">
              <div className="legal-right-card">
                <h4>Right of Access (Art. 15)</h4>
                <p>Request a copy of all personal data we hold about you.</p>
              </div>
              <div className="legal-right-card">
                <h4>Right to Rectification (Art. 16)</h4>
                <p>Request correction of inaccurate or incomplete data.</p>
              </div>
              <div className="legal-right-card">
                <h4>Right to Erasure (Art. 17)</h4>
                <p>Request deletion of your personal data ("right to be forgotten"), or delete your account yourself in the app (see <a href="#delete-account">Deleting Your Account</a>).</p>
              </div>
              <div className="legal-right-card">
                <h4>Right to Restriction (Art. 18)</h4>
                <p>Request that we limit processing of your data in certain circumstances.</p>
              </div>
              <div className="legal-right-card">
                <h4>Right to Data Portability (Art. 20)</h4>
                <p>Receive your data in a machine-readable format to transfer to another service.</p>
              </div>
              <div className="legal-right-card">
                <h4>Right to Object (Art. 21)</h4>
                <p>Object to processing based on legitimate interests or for direct marketing.</p>
              </div>
              <div className="legal-right-card">
                <h4>Right to Withdraw Consent</h4>
                <p>Withdraw consent at any time for consent-based processing (e.g. health information in the app's settings, or marketing emails).</p>
              </div>
              <div className="legal-right-card">
                <h4>Right to Lodge a Complaint</h4>
                <p>File a complaint with the German data protection authority (BfDI) or your local supervisory authority.</p>
              </div>
            </div>
            <p style={{ marginTop: 20 }}>The German supervisory authority is the <strong>Bundesbeauftragte f&uuml;r den Datenschutz und die Informationsfreiheit (BfDI)</strong>: <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer">www.bfdi.bund.de</a></p>
          </section>

          {/* 11 */}
          <section className="legal-section" id="p11">
            <div className="legal-section-num">{n()}</div>
            <h2>Security</h2>
            <p>We implement appropriate technical and organisational measures to protect your personal data, including:</p>
            <ul>
              <li>Encrypted data transmission (TLS/HTTPS)</li>
              <li>Encrypted storage of passwords and sensitive data</li>
              <li>Access controls limiting data access to authorised personnel only</li>
              <li>Regular security assessments and updates</li>
            </ul>
            <p>In the event of a data breach that poses a high risk to your rights, we will notify you and the relevant supervisory authority within <strong>72 hours</strong> as required by Art. 33 GDPR.</p>
          </section>

          {/* 12 */}
          <section className="legal-section" id="p12">
            <div className="legal-section-num">{n()}</div>
            <h2>Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. When we make material changes, we will notify you via email or in-app notification at least <strong>14 days before</strong> the changes take effect.</p>
            <p>The current version is always available at <a href="https://www.liboworld.com/privacy">www.liboworld.com/privacy</a>.</p>
          </section>

          {/* 13 */}
          <section className="legal-section" id="p13">
            <div className="legal-section-num">{n()}</div>
            <h2>Contact &amp; Data Protection</h2>
            <p>For any privacy-related questions, data requests, or concerns:</p>
            <ul>
              <li><strong>Privacy email:</strong> <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a></li>
              <li><strong>General contact:</strong> <a href="mailto:hello@liboworld.com">hello@liboworld.com</a></li>
              <li><strong>Website:</strong> <a href="https://www.liboworld.com">www.liboworld.com</a></li>
              <li><strong>Company:</strong> Libo World, Germany</li>
            </ul>
            <p>We aim to respond to all privacy requests within <strong>30 days</strong>. For complex requests, we may extend this by up to an additional 2 months and will inform you accordingly.</p>
            <div className="legal-highlight" style={{ marginTop: 24 }}>
              <p>If you are not satisfied with our response, you have the right to lodge a complaint with the <strong>BfDI</strong> (Federal Commissioner for Data Protection and Freedom of Information) at <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer">www.bfdi.bund.de</a>.</p>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
