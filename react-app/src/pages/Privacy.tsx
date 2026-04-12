import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './Legal.css';

export default function Privacy() {
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
              Last updated: <span>March 2026</span> &middot; Effective date: <span>March 2026</span>
            </p>
          </div>

          <div className="legal-highlight" style={{ marginBottom: 40 }}>
            <p>Libo World is committed to protecting your personal data. This Privacy Policy explains what data we collect, why we collect it, how we use it, and what rights you have — in full compliance with the <strong>General Data Protection Regulation (GDPR)</strong> and applicable German data protection law.</p>
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
            <div className="legal-section-num">01</div>
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
            <div className="legal-section-num">02</div>
            <h2>Data We Collect</h2>

            <h3>Account &amp; Registration Data</h3>
            <p>When you create a Libo account, we collect:</p>
            <ul>
              <li>Name and email address</li>
              <li>Password (stored encrypted — never in plain text)</li>
              <li>Date of birth (for age verification)</li>
              <li>Optional: profile photo</li>
            </ul>

            <h3>Onboarding &amp; Fitness Profile Data</h3>
            <p>To personalise your experience, we collect:</p>
            <ul>
              <li>Fitness goals (e.g. lose weight, build muscle, improve mobility)</li>
              <li>Current fitness level (beginner, intermediate, advanced)</li>
              <li>Available equipment and preferred training location</li>
              <li>Body metrics you voluntarily provide (height, weight, age)</li>
            </ul>

            <h3>Workout &amp; Activity Data</h3>
            <p>When you use the app, we collect:</p>
            <ul>
              <li>Workouts started and completed</li>
              <li>Exercise logs (sets, reps, weight, duration)</li>
              <li>Programs enrolled in and progress made</li>
              <li>Workout frequency, streaks, and activity history</li>
            </ul>

            <h3>Payment &amp; Billing Data</h3>
            <p>For paid subscriptions, payment is processed by our third-party payment providers. We do <strong>not</strong> store your full card number, CVV, or sensitive payment details. We only retain:</p>
            <ul>
              <li>Subscription plan and billing cycle</li>
              <li>Transaction ID and payment status</li>
              <li>Billing country and currency</li>
            </ul>

            <h3>Technical &amp; Device Data</h3>
            <p>We automatically collect technical information when you use the Service:</p>
            <ul>
              <li>IP address and approximate location (country/region)</li>
              <li>Device type, operating system, and browser</li>
              <li>App version and session duration</li>
              <li>Crash reports and error logs</li>
            </ul>

            <h3>Communications Data</h3>
            <p>If you contact us for support or provide feedback, we store the content of those communications and your email address to respond to you.</p>
          </section>

          {/* 3 */}
          <section className="legal-section" id="p3">
            <div className="legal-section-num">03</div>
            <h2>How We Use Your Data</h2>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr><th>Purpose</th><th>Data Used</th></tr>
                </thead>
                <tbody>
                  <tr><td>Providing and operating the Service</td><td>Account data, fitness profile, activity data</td></tr>
                  <tr><td>Personalising your workout plan and recommendations</td><td>Fitness goals, fitness level, activity history</td></tr>
                  <tr><td>Processing payments and managing subscriptions</td><td>Billing data, email</td></tr>
                  <tr><td>Sending service emails (receipts, account updates)</td><td>Email address</td></tr>
                  <tr><td>Sending marketing emails (opt-in only)</td><td>Email address, usage preferences</td></tr>
                  <tr><td>Improving and developing the Service</td><td>Aggregated, anonymised usage data</td></tr>
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
            <div className="legal-section-num">04</div>
            <h2>Legal Basis for Processing</h2>
            <p>Under the GDPR, we process your personal data on the following legal bases:</p>
            <ul>
              <li><strong>Performance of a contract (Art. 6(1)(b) GDPR)</strong> — Processing necessary to provide the Service you signed up for, including account management and workout delivery.</li>
              <li><strong>Legitimate interests (Art. 6(1)(f) GDPR)</strong> — Processing necessary for our legitimate business interests such as improving the Service, ensuring security, and preventing fraud — where these interests are not overridden by your rights.</li>
              <li><strong>Consent (Art. 6(1)(a) GDPR)</strong> — For optional processing such as marketing emails, analytics cookies, and personalised recommendations. You can withdraw consent at any time.</li>
              <li><strong>Legal obligation (Art. 6(1)(c) GDPR)</strong> — Where we are required to process data to comply with applicable law, such as tax and financial record-keeping.</li>
            </ul>
            <p>For health and fitness data that may qualify as special category data under Art. 9 GDPR, we process it on the basis of your <strong>explicit consent</strong> given during onboarding.</p>
          </section>

          {/* 5 */}
          <section className="legal-section" id="p5">
            <div className="legal-section-num">05</div>
            <h2>Third-Party Services</h2>
            <p>We use a limited number of trusted third-party service providers to operate the Service:</p>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr><th>Provider</th><th>Purpose</th><th>Location</th></tr>
                </thead>
                <tbody>
                  <tr><td>Stripe / payment processor</td><td>Payment processing</td><td>EU / USA</td></tr>
                  <tr><td>Google Analytics</td><td>Anonymised usage analytics</td><td>USA</td></tr>
                  <tr><td>Cloud hosting provider (e.g. AWS / Hetzner)</td><td>Data storage and infrastructure</td><td>EU (preferred)</td></tr>
                  <tr><td>Email service provider (e.g. Mailchimp / Brevo)</td><td>Transactional and marketing emails</td><td>EU / USA</td></tr>
                  <tr><td>Crash analytics (e.g. Sentry / Firebase Crashlytics)</td><td>App stability and error reporting</td><td>USA</td></tr>
                </tbody>
              </table>
            </div>
            <p>We do not share your personal data with any other third parties except where required by law or with your explicit consent.</p>
          </section>

          {/* 6 */}
          <section className="legal-section" id="p6">
            <div className="legal-section-num">06</div>
            <h2>Cookies &amp; Tracking</h2>
            <p>Our website uses cookies and similar technologies. We use the following categories:</p>
            <ul>
              <li><strong>Strictly necessary cookies</strong> — Required for the website to function. Cannot be disabled.</li>
              <li><strong>Analytical cookies</strong> — Help us understand how visitors use our website (e.g. Google Analytics). Only activated with your consent.</li>
              <li><strong>Marketing cookies</strong> — Used for retargeting and measuring campaign effectiveness (e.g. Meta Pixel). Only activated with your consent.</li>
            </ul>
            <p>You can manage your cookie preferences at any time via our cookie consent banner or by adjusting your browser settings.</p>
          </section>

          {/* 7 */}
          <section className="legal-section" id="p7">
            <div className="legal-section-num">07</div>
            <h2>Data Retention</h2>
            <p>We retain your personal data only for as long as necessary:</p>
            <ul>
              <li><strong>Account data</strong> — Retained for the duration of your account. Deleted within 30 days of account deletion request.</li>
              <li><strong>Workout &amp; activity data</strong> — Retained while your account is active. Deleted with your account.</li>
              <li><strong>Billing &amp; payment records</strong> — Retained for 10 years to comply with German tax law (&sect; 147 AO).</li>
              <li><strong>Support communications</strong> — Retained for 2 years after the last interaction.</li>
              <li><strong>Analytics data</strong> — Retained in anonymised, aggregated form indefinitely.</li>
            </ul>
          </section>

          {/* 8 */}
          <section className="legal-section" id="p8">
            <div className="legal-section-num">08</div>
            <h2>International Data Transfers</h2>
            <p>Some of our third-party service providers are located outside the EEA, including in the United States. Where we transfer data internationally, we ensure appropriate safeguards including:</p>
            <ul>
              <li><strong>EU Standard Contractual Clauses (SCCs)</strong> approved by the European Commission</li>
              <li><strong>EU-US Data Privacy Framework</strong> where applicable</li>
              <li>Adequacy decisions by the European Commission</li>
            </ul>
            <p>You can request a copy of the relevant transfer mechanisms by contacting <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a>.</p>
          </section>

          {/* 9 */}
          <section className="legal-section" id="p9">
            <div className="legal-section-num">09</div>
            <h2>Children's Privacy</h2>
            <p>Libo is not intended for use by anyone under the age of <strong>18</strong>. We do not knowingly collect personal data from children. If we become aware that we have collected personal data from a child without verified parental consent, we will delete it promptly.</p>
            <p>If you believe a child has provided us with personal data, please contact us at <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a>.</p>
          </section>

          {/* 10 */}
          <section className="legal-section" id="p10">
            <div className="legal-section-num">10</div>
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
                <p>Request deletion of your personal data ("right to be forgotten").</p>
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
                <p>Withdraw consent at any time for consent-based processing (e.g. marketing emails).</p>
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
            <div className="legal-section-num">11</div>
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
            <div className="legal-section-num">12</div>
            <h2>Changes to This Policy</h2>
            <p>We may update this Privacy Policy periodically. When we make material changes, we will notify you via email or in-app notification at least <strong>14 days before</strong> the changes take effect.</p>
            <p>The current version is always available at <a href="https://www.liboworld.com/privacy">www.liboworld.com/privacy</a>.</p>
          </section>

          {/* 13 */}
          <section className="legal-section" id="p13">
            <div className="legal-section-num">13</div>
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
