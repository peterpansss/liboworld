import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { CHALLENGE_TIERS } from '../data/challengeTiers';
import './Legal.css';

/**
 * /rules — the public Cash Challenge Rules.
 *
 * Both funnel films promise "the rules are linked to the button below" and
 * name liboworld.com/rules out loud, so this page is a claim made on camera
 * that the live site has to honour. It is the readable document; the binding
 * hook lives in Terms §Cash Challenges, which incorporates this by reference.
 *
 * English-only inline JSX, like Terms.tsx and Privacy.tsx — the legal pages
 * are deliberately not run through i18n, because a mistranslated rule on a
 * page governing real payouts is worse than an English one.
 *
 * Two content rules this page must never break (REWARDS-ECONOMY-RULES canon):
 *  - Never publish the participant cap or live occupancy. "Limited spots",
 *    no figure — a number we never state cannot drift out of sync across five
 *    locales, the app, the press kit and two launch videos (§7.1c).
 *  - Sharing is rewarded, never required (§7.1b). Requiring a public post as
 *    a condition of payout would make it a compensated endorsement.
 * Payout figures come from CHALLENGE_TIERS so this page cannot drift from the
 * funnels that sell them.
 */
export default function Rules() {
  // Same auto-numbering as Terms.tsx: numbers are derived at render, so
  // inserting or gating a section renumbers the rest instead of leaving a gap.
  let sectionNo = 0;
  const n = () => String(++sectionNo).padStart(2, '0');

  useEffect(() => {
    document.title = 'Cash Challenge Rules | Libo';
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
            <span>Cash Challenge Rules</span>
          </div>

          {/* Hero */}
          <div className="legal-hero">
            <div className="legal-label">Rules</div>
            <h1 className="font-display">Cash Challenge Rules</h1>
            <p className="legal-meta">
              Last updated: <span>August 2026</span> &middot; Applies to: <span>all cash challenges</span>
            </p>
          </div>

          <div className="legal-highlight">
            <p>
              <strong>The short version.</strong> Entering is free. You pick a challenge, you
              complete the prescribed work every day for 30 days, you record each day in the
              app, and when you finish, we pay you. There is no draw, no ticket and no luck
              involved &mdash; the outcome is entirely down to whether you did the work. These
              rules form part of our <Link to="/terms">Terms &amp; Conditions</Link>.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="legal-toc">
            <div className="legal-toc-title">Table of Contents</div>
            <ol>
              <li><a href="#who">Who Can Enter</a></li>
              <li><a href="#entry">How Entry Works</a></li>
              <li><a href="#tiers">The Challenges</a></li>
              <li><a href="#day">What a Challenge Day Is</a></li>
              <li><a href="#proof">What Counts as a Completed Day</a></li>
              <li><a href="#freezes">Freeze Tokens</a></li>
              <li><a href="#missing">Missing a Day</a></li>
              <li><a href="#payout">How You Get Paid</a></li>
              <li><a href="#fair-play">Fair Play</a></li>
              <li><a href="#where">Where You Can Enter</a></li>
              <li><a href="#changes">Changes &amp; Contact</a></li>
            </ol>
          </div>

          {/* 1 */}
          <section className="legal-section" id="who">
            <div className="legal-section-num">{n()}</div>
            <h2>Who Can Enter</h2>
            <p>You need a Libo account, and you need to meet the age requirements set out in Section 3 of our <Link to="/terms#s3">Terms &amp; Conditions</Link>. In short:</p>
            <ul>
              <li><strong>16+ to enter a cash challenge.</strong> Enrolment in any cash challenge is restricted to users aged <strong>16 and over</strong>.</li>
              <li><strong>18+ to receive a cash payout.</strong> Payouts are made through regulated payment providers whose own rules require it. If you are 16 or 17, you can still enter and complete a challenge &mdash; see <a href="#payout">How You Get Paid</a> for how the reward reaches you.</li>
            </ul>
            <p>Where your local law sets a higher minimum age for either, that law applies.</p>
          </section>

          {/* 2 */}
          <section className="legal-section" id="entry">
            <div className="legal-section-num">{n()}</div>
            <h2>How Entry Works</h2>

            <h3>There is no entry fee</h3>
            <p>Entering a cash challenge costs nothing. You are never asked to stake, deposit or buy anything to take part, and the payout is not funded by other participants &mdash; Libo funds it, and the money is set aside when you enrol. A Premium membership <em>unlocks</em> the higher-payout challenges; it is not an entry fee, and it never guarantees you a spot.</p>

            <h3>Your 30 days start when you join</h3>
            <p>Challenges run on rolling entry. You are not waiting for a cohort or a start date &mdash; the moment you enrol, day 1 begins. That also means everyone in a challenge is on a different day, which is deliberate.</p>

            <h3>Spots are limited</h3>
            <p>Each challenge runs a limited number of places at any one time, on a first-come, first-served basis. When a challenge is full, enrolment is refused until a place frees up. Because entry is rolling, places free up continuously as other participants finish or drop out. If a challenge is full you can ask to be notified &mdash; everyone waiting is alerted at the same moment, and the first person to take the place gets it. There is no queue position and no place is held for you.</p>

            <h3>One challenge at a time</h3>
            <p>You can hold <strong>one active cash-challenge enrolment</strong> at a time. Trying to enrol in a second while one is running will be refused. You are free to change your mind: leaving one challenge and joining a <em>different</em> one is allowed immediately. Re-joining the <strong>same</strong> challenge after leaving it is subject to a <strong>7-day cooldown</strong>.</p>
          </section>

          {/* 3 */}
          <section className="legal-section" id="tiers">
            <div className="legal-section-num">{n()}</div>
            <h2>The Challenges</h2>
            <p>The daily commitment and the payout scale together. Every challenge runs the same length:</p>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Challenge</th>
                    <th>Every day</th>
                    <th>Length</th>
                    <th>Payout on completion</th>
                    <th>Who can enter</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Driven off CHALLENGE_TIERS, the same source the funnels
                      render from, so the figures here cannot drift from the
                      pages selling them. `spots` is deliberately NOT rendered
                      (canon §7.1c: the cap is never published). */}
                  {CHALLENGE_TIERS.map((tier) => (
                    <tr key={tier.slug}>
                      <td><strong>{tier.name}</strong></td>
                      <td>{tier.reps} reps</td>
                      <td>{tier.days} days</td>
                      <td>&euro;{tier.payout}</td>
                      <td>{tier.requiresPremium ? 'Premium' : 'Every member'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>The payout is a fixed amount for finishing, not a pot that is divided up and not a leaderboard placing. If ten people finish, ten people are paid in full.</p>
          </section>

          {/* 4 */}
          <section className="legal-section" id="day">
            <div className="legal-section-num">{n()}</div>
            <h2>What a Challenge Day Is</h2>
            <p>A challenge day is not a calendar day. Every day runs <strong>06:00 to 06:00 in your local time</strong>. The window is open through every waking hour, and the deadline lands while you are asleep rather than in the middle of your afternoon.</p>
            <ul>
              <li><strong>The grid is fixed.</strong> Day boundaries are the 06:00 marks, whatever time of day you actually train. The deadline does not shift earlier each day.</li>
              <li><strong>Your timezone is locked at enrolment.</strong> It is recorded when you join and does not follow your phone. Travelling mid-challenge will not move your deadline, and changing your device's clock will not buy you extra hours.</li>
              <li><strong>Day 1 is a part-day.</strong> It runs from the moment you enrol to the next 06:00. If you enrol within four hours of that boundary, day 1 is extended to the <em>following</em> 06:00 instead, so you are never handed a thirty-minute first day. The app tells you exactly when day 1 ends as you enrol.</li>
              <li><strong>There is a 10-minute grace period</strong> past each boundary, so nobody loses a challenge to a slow upload.</li>
              <li><strong>You cannot bank days ahead.</strong> One completion per window, and a window cannot be filled before it opens. Three days of work in one session counts as one day.</li>
            </ul>
            <p>Twice a year daylight saving makes a window 23 or 25 hours long. That happens while you are asleep, and we leave it alone rather than dragging the boundary off 06:00.</p>
          </section>

          {/* 5 */}
          <section className="legal-section" id="proof">
            <div className="legal-section-num">{n()}</div>
            <h2>What Counts as a Completed Day</h2>
            <p>A day counts when you complete the challenge&rsquo;s prescribed work inside that day&rsquo;s window and record it in the app. The recording is the basis on which we pay, so it has to actually show the work.</p>
            <p><strong>Recordings are reviewed by the Libo team.</strong> Review is manual, not automated, and it is what lets us pay out on proof rather than on an honour system.</p>
            <div className="legal-highlight">
              <p>
                <strong>You are never required to post publicly.</strong> Sharing a session to
                your stories or anywhere else is optional, always. It is not a condition of
                completing a day, and it is not a condition of being paid. If you want to
                share, the app makes it easy &mdash; but nothing about your payout depends on it.
              </p>
            </div>
          </section>

          {/* 6 */}
          <section className="legal-section" id="freezes">
            <div className="legal-section-num">{n()}</div>
            <h2>Freeze Tokens</h2>
            <p>A challenge freeze token protects a single missed day inside a cash challenge. It is separate from the freeze that protects your personal training streak &mdash; the two are not interchangeable, and only challenge freeze tokens work inside a cash challenge.</p>
            <ul>
              <li><strong>Premium members are granted 1</strong> per challenge. <strong>Free members are granted 0.</strong></li>
              <li><strong>Everyone can earn one more.</strong> If you have trained on 60 of the last 90 days when you enrol, you are granted an additional token. This rule is identical at every tier &mdash; consistency is rewarded the same whether or not you pay.</li>
              <li><strong>They cannot be bought.</strong> Freeze tokens are not for sale, in any tier, at any price.</li>
            </ul>
          </section>

          {/* 7 */}
          <section className="legal-section" id="missing">
            <div className="legal-section-num">{n()}</div>
            <h2>Missing a Day</h2>
            <p>If a day&rsquo;s window closes without a completed, recorded session and you have no freeze token available, <strong>your run ends</strong> and no payout is due.</p>
            <p>That is the whole point of the challenge, and we would rather say it plainly than bury it. Nothing else happens: you keep your account, your membership, your training history and your personal streak, which follows its own separate rules. You can enter the same challenge again after the 7-day cooldown, or switch to a different challenge straight away.</p>
          </section>

          {/* 8 */}
          <section className="legal-section" id="payout">
            <div className="legal-section-num">{n()}</div>
            <h2>How You Get Paid</h2>
            <p>Complete all 30 days and the payout for your challenge is yours, in cash. Not points, not tickets, not store credit.</p>
            <ul>
              <li><strong>Verification first.</strong> Before payment we verify your completed days and your identity. Payouts are made through regulated payment providers (such as Stripe, Wise or Revolut), and identity verification is their requirement as much as ours.</li>
              <li><strong>If you are 16 or 17</strong>, and where local law permits, payment can be made to a parent-linked verified payment account. If no such account is provided within <strong>14 days</strong> of verification, the reward is converted to in-app credit of equivalent value.</li>
              <li><strong>Tax is yours.</strong> You are responsible for any tax due on a payout in your own jurisdiction.</li>
            </ul>
            <p>We will tell you the expected timing when your final day is confirmed. Payment is issued once verification is complete.</p>
          </section>

          {/* 9 */}
          <section className="legal-section" id="fair-play">
            <div className="legal-section-num">{n()}</div>
            <h2>Fair Play</h2>
            <p>Real money is involved, so a run can be voided and a payout refused where we find, on review:</p>
            <ul>
              <li>Recordings that are falsified, edited to misrepresent the work, or re-used from another day or another challenge</li>
              <li>Someone other than the enrolled participant performing the work</li>
              <li>Manipulation of your device clock or timezone to extend a window</li>
              <li>Multiple accounts used to enter the same challenge, or to work around the one-challenge-at-a-time rule</li>
              <li>Any other attempt to obtain a payout without doing the work</li>
            </ul>
            <p>These decisions are made by people reviewing the evidence, not by an automated flag, and we will tell you the reason. If you think we got it wrong, email <a href="mailto:support@liboworld.com">support@liboworld.com</a> and we will look again.</p>
          </section>

          {/* 10 */}
          <section className="legal-section" id="where">
            <div className="legal-section-num">{n()}</div>
            <h2>Where You Can Enter</h2>
            <p>A cash challenge is decided entirely by whether you complete the work. There is no draw, no random element and no chance component &mdash; which is why cash challenges are available far more widely than a prize draw would be.</p>
            <p>They are open globally <strong>except where prohibited by local law</strong>. The jurisdictions excluded at launch are listed in Section 17 of our <Link to="/terms#s17">Terms &amp; Conditions</Link>, and that list is the authoritative one. Libo may add or remove jurisdictions in response to local legal review. Where a jurisdiction is excluded after your run has already started, your run is honoured to completion.</p>
          </section>

          {/* 11 */}
          <section className="legal-section" id="changes">
            <div className="legal-section-num">{n()}</div>
            <h2>Changes &amp; Contact</h2>
            <p>We may change these rules for <strong>future</strong> enrolments. <strong>The rules in force on the day you enrolled govern your run</strong> &mdash; a change published while you are running does not apply to a challenge you are already in.</p>
            <p>These rules form part of our <Link to="/terms#challenge-rules">Terms &amp; Conditions</Link>, which govern in the event of any conflict. Questions:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:support@liboworld.com">support@liboworld.com</a></li>
              <li><strong>Website:</strong> <a href="https://www.liboworld.com">www.liboworld.com</a></li>
              <li><strong>Company:</strong> Libo World, Germany</li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
