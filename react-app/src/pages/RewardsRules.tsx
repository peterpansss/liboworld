import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { GIVEAWAY_EXCLUDED } from '../data/giveawayRounds';
import {
  REWARDS_CATALOG,
  REWARDS_MIN_AGE,
  REWARDS_PAYPAL_MIN_AGE,
  REWARDS_MIN_ACCOUNT_DAYS,
  REWARDS_MIN_WORKOUTS,
  REWARDS_COOLDOWN_DAYS,
  REWARDS_DELIVERY_DAYS,
  POINTS_EXPIRY_DAYS,
  formatPoints,
} from '../data/rewardsCatalog';
import './Legal.css';

/**
 * /rewards-rules — the public Rewards Rules: training points swapped for a
 * fixed-value gift code or PayPal payment from the published catalogue.
 *
 * Not gated, like /giveaway-rules: the rules must be readable before the
 * rewards shop opens in the app.
 *
 * English-only inline JSX, like Terms.tsx, Rules.tsx and GiveawayRules.tsx —
 * the legal pages are deliberately not run through i18n.
 *
 * Economy: Noah, 13 Nov 2026 (see src/data/rewardsCatalog.ts). Content rules:
 *  - This is NOT a prize draw. Never write "win" or "you could win" here:
 *    every member who meets the conditions gets the reward they pick while
 *    stock lasts.
 *  - Name each amount together with its condition (points + who can redeem).
 *  - The excluded places come from GIVEAWAY_EXCLUDED so the two rules pages
 *    can never disagree.
 */
export default function RewardsRules() {
  let sectionNo = 0;
  const n = () => String(++sectionNo).padStart(2, '0');

  useEffect(() => {
    document.title = 'Rewards Rules | Libo';
    return () => { document.title = 'Libo'; };
  }, []);

  const openToAll = REWARDS_CATALOG.filter((r) => r.minTier === 'free');
  const premiumOnly = REWARDS_CATALOG.filter((r) => r.minTier === 'premium');
  const priceList = (list: typeof REWARDS_CATALOG) =>
    list.map((r) => `€${r.valueEur} for ${formatPoints(r.points)} points`).join(' or ');

  return (
    <>
      <SiteNav />
      <main className="legal-page">
        <div className="legal-container">
          {/* Breadcrumb */}
          <div className="legal-breadcrumb">
            <Link to="/">Home</Link>
            <span className="legal-breadcrumb-sep">&gt;</span>
            <span>Rewards Rules</span>
          </div>

          {/* Hero */}
          <div className="legal-hero">
            <div className="legal-label">Rules</div>
            <h1 className="font-display">Rewards Rules</h1>
            <p className="legal-meta">
              Last updated: <span>13 November 2026</span> &middot; Applies to: <span>rewards redeemed with Libo points in the app</span>
            </p>
          </div>

          <div className="legal-highlight">
            <p>
              <strong>The short version.</strong> You earn points by training in the Libo app.
              You can swap them for a reward of a fixed value: {priceList(openToAll)} for every
              member, or {priceList(premiumOnly)} for Premium members only. Each reward is a gift
              code or a PayPal payment, while this month&rsquo;s stock lasts. No chance is
              involved: this is not a prize draw. Points have no cash value and can&rsquo;t be
              bought, sold or transferred.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="legal-toc">
            <div className="legal-toc-title">Table of Contents</div>
            <ol>
              <li><a href="#operator">Who Runs the Rewards</a></li>
              <li><a href="#points">What Points Are</a></li>
              <li><a href="#catalogue">The Catalogue</a></li>
              <li><a href="#stock">Monthly Stock</a></li>
              <li><a href="#who">Who Can Redeem</a></li>
              <li><a href="#where">Where You Can Redeem</a></li>
              <li><a href="#redeem">How to Redeem &amp; Delivery</a></li>
              <li><a href="#expiry">When Points Expire</a></li>
              <li><a href="#fair-play">Fair Play</a></li>
              <li><a href="#no-chance">Not a Prize Draw</a></li>
              <li><a href="#changes">Changes &amp; Contact</a></li>
            </ol>
          </div>

          <section className="legal-section" id="operator">
            <div className="legal-section-num">{n()}</div>
            <h2>Who Runs the Rewards</h2>
            <p>The rewards are run by <strong>Noah Fofana, trading as Libo World</strong>, a registered business in Germany (&ldquo;Libo&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).</p>
            <ul>
              <li><strong>Postal address:</strong> Johannishof 10, 56626 Andernach, Germany</li>
              <li><strong>Email:</strong> <a href="mailto:support@liboworld.com">support@liboworld.com</a></li>
              <li><strong>Website:</strong> <a href="https://www.liboworld.com">www.liboworld.com</a></li>
            </ul>
            <p>These rules form part of our <Link to="/terms">Terms &amp; Conditions</Link>. If they conflict, the Terms govern.</p>
          </section>

          <section className="legal-section" id="points">
            <div className="legal-section-num">{n()}</div>
            <h2>What Points Are</h2>
            <ul>
              <li><strong>Points have no cash value.</strong> They are a loyalty reward for training in the app (shown in the app as Libo).</li>
              <li><strong>Points can&rsquo;t be bought, sold or transferred</strong> to another account or person.</li>
              <li><strong>Points can be exchanged only for the rewards in the published catalogue</strong> below, while stock lasts. They can&rsquo;t be exchanged for anything else, and can&rsquo;t be paid out in any other way.</li>
            </ul>
          </section>

          <section className="legal-section" id="catalogue">
            <div className="legal-section-num">{n()}</div>
            <h2>The Catalogue</h2>
            <p>The current catalogue. The price is the same for every member: 500 points per &euro;1.</p>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Reward</th>
                    <th>Price</th>
                    <th>Who can redeem it</th>
                  </tr>
                </thead>
                <tbody>
                  {REWARDS_CATALOG.map((r) => (
                    <tr key={r.valueEur}>
                      <td><strong>&euro;{r.valueEur}</strong></td>
                      <td>{formatPoints(r.points)} points</td>
                      <td>{r.minTier === 'premium' ? 'Premium members only' : 'All members'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Each reward is either a <strong>gift code</strong> of that value, from a brand you choose among the brands shown in the app for that reward, or a <strong>PayPal payment</strong> of that value to your own PayPal account.</p>
            <p><strong>Each code is subject to its issuer&rsquo;s terms.</strong> The brand that issues a gift code sets how and where it can be used, and for how long. We are not responsible for the issuer&rsquo;s terms or service.</p>
            <p>A &ldquo;Premium member&rdquo; is a member with an active, paid Premium membership on the day they redeem, or a member who has been given Premium by Libo directly (for example through a company partnership). Free trial periods and free weeks from offer codes do not count.</p>
          </section>

          <section className="legal-section" id="stock">
            <div className="legal-section-num">{n()}</div>
            <h2>Monthly Stock</h2>
            <ul>
              <li><strong>Each reward has a limited stock every month.</strong> The stock left this month is shown in the app.</li>
              <li><strong>Stock resets on the 1st of each month</strong> at 00:00 Berlin time (Germany).</li>
              <li><strong>First come, first served.</strong> Once a reward&rsquo;s stock for the month is used up, it can&rsquo;t be redeemed until the next reset.</li>
            </ul>
          </section>

          <section className="legal-section" id="who">
            <div className="legal-section-num">{n()}</div>
            <h2>Who Can Redeem</h2>
            <ul>
              <li><strong>You must be {REWARDS_MIN_AGE} or older</strong> and have a Libo account. You need to have confirmed your date of birth in the app.</li>
              <li><strong>PayPal payments are for members aged {REWARDS_PAYPAL_MIN_AGE} and over</strong>, because PayPal requires its users to be {REWARDS_PAYPAL_MIN_AGE}. Members aged 16 or 17 can redeem gift codes only.</li>
              <li><strong>Your account must be at least {REWARDS_MIN_ACCOUNT_DAYS} days old</strong>, and you must have completed at least <strong>{REWARDS_MIN_WORKOUTS} workouts</strong> in the app.</li>
              <li><strong>One account per person.</strong></li>
            </ul>
          </section>

          <section className="legal-section" id="where">
            <div className="legal-section-num">{n()}</div>
            <h2>Where You Can Redeem</h2>
            <p>Rewards are available worldwide, except:</p>
            <ul>
              {GIVEAWAY_EXCLUDED.map((place) => (
                <li key={place}>{place}</li>
              ))}
              <li>any country or region under EU, UN or US (OFAC) sanctions</li>
              <li>anywhere local law prohibits it</li>
            </ul>
            <p>This is the same list as in the <Link to="/giveaway-rules">Official Giveaway Rules</Link>. We may add places to this list after local legal review.</p>
          </section>

          <section className="legal-section" id="redeem">
            <div className="legal-section-num">{n()}</div>
            <h2>How to Redeem &amp; Delivery</h2>
            <ul>
              <li><strong>In the app:</strong> pick a reward, choose a brand or PayPal, and confirm. The points are taken from your balance when you confirm.</li>
              <li><strong>One reward per member per {REWARDS_COOLDOWN_DAYS} days.</strong></li>
              <li><strong>Delivery within {REWARDS_DELIVERY_DAYS} days by email.</strong> A person checks every request before it is sent. We email the gift code, or send the PayPal payment to the PayPal email you gave us.</li>
              <li><strong>If we reject a request, your points are returned.</strong> We tell you the reason. For example, we reject a request if you don&rsquo;t meet the conditions in these rules.</li>
              <li><strong>Check your PayPal email.</strong> If you give us a wrong PayPal email, we can&rsquo;t always get the payment back.</li>
            </ul>
          </section>

          <section className="legal-section" id="expiry">
            <div className="legal-section-num">{n()}</div>
            <h2>When Points Expire</h2>
            <p>Points expire if you don&rsquo;t use them. On the <strong>Free</strong> plan, points expire <strong>{POINTS_EXPIRY_DAYS.free} days</strong> after you earn them. As a <strong>Premium</strong> member, points expire <strong>{POINTS_EXPIRY_DAYS.premium} days</strong> after you earn them. The app shows when your points expire.</p>
          </section>

          <section className="legal-section" id="fair-play">
            <div className="legal-section-num">{n()}</div>
            <h2>Fair Play</h2>
            <p>We may refuse or reverse a reward, and remove points, where we find:</p>
            <ul>
              <li>More than one account used by the same person</li>
              <li>Workouts that were faked, or completed by someone else</li>
              <li>Tampering with the app or your account</li>
              <li>Any other attempt to get points or rewards unfairly</li>
            </ul>
            <p>A person makes these decisions, and we will tell you the reason. If you think we got it wrong, email <a href="mailto:support@liboworld.com">support@liboworld.com</a> and we will look again.</p>
          </section>

          <section className="legal-section" id="no-chance">
            <div className="legal-section-num">{n()}</div>
            <h2>Not a Prize Draw</h2>
            <p><strong>Rewards involve no chance.</strong> They are not a prize draw, lottery or game. Every member who meets the conditions in these rules and has enough points gets the reward they choose, as long as that reward is in stock that month. Our giveaways are separate and have their own <Link to="/giveaway-rules">Official Giveaway Rules</Link>.</p>
          </section>

          <section className="legal-section" id="changes">
            <div className="legal-section-num">{n()}</div>
            <h2>Changes &amp; Contact</h2>
            <p>We may change the catalogue at any time: the rewards offered, their prices in points, which plan can redeem them, the brands and the monthly stock. We will update this page when we do. A change does not affect a request you have already made: it is handled at the price and on the terms in force when you made it.</p>
            <p>These rules are governed by the laws of the <strong>Federal Republic of Germany</strong>, as set out in our <Link to="/terms">Terms &amp; Conditions</Link>. Questions:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:support@liboworld.com">support@liboworld.com</a></li>
              <li><strong>Website:</strong> <a href="https://www.liboworld.com">www.liboworld.com</a></li>
              <li><strong>Operator:</strong> Noah Fofana, trading as Libo World, Johannishof 10, 56626 Andernach, Germany</li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
