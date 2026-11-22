import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { GIVEAWAY_EXCLUDED } from '../data/giveawayRounds';
import {
  REWARDS_CATALOG,
  REWARDS_MIN_ACCOUNT_DAYS,
  REWARDS_MIN_WORKOUTS,
  REWARDS_COOLDOWN_DAYS,
  REWARDS_DELIVERY_DAYS,
  POINTS_EXPIRY_DAYS,
  formatPoints, REWARDS_ITEMS, ITEM_SHIP_AREA, itemCashEur,
  ITEM_TIER_VALUE_CAP_EUR, ITEM_TIER_MIN_PAID_MONTHS, ONE_ITEM_PER_DAYS,
  type RewardTier, type PublishedItem } from '../data/rewardsCatalog';
import './Legal.css';

/**
 * /rewards-rules — the public Rewards Rules: training points swapped for a
 * fixed-value gift code or cash payment (PayPal, Revolut, Wise or bank
 * transfer) from the published catalogue.
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
 *  - Item tiers (Noah, 22 Nov 2026): value caps, paid months in a row and the
 *    one-item-per-year limit are generated from the constants in
 *    rewardsCatalog.ts, never typed in here.
 */

/** Who can redeem a gift or cash card of this tier. */
function cardEligibility(tier: RewardTier): string {
  if (tier === 'elite') return 'Elite members only';
  return tier === 'premium' ? 'Premium and Elite members only' : 'All members';
}

/** "6 paid months in a row", "1 paid month in a row". */
function paidMonths(n: number): string {
  return `${n} paid month${n === 1 ? '' : 's'} in a row`;
}

/** Who can redeem an item, e.g. "Elite members with 12 paid months in a row". */
function itemEligibility(it: PublishedItem): string {
  const who = it.minTier === 'elite' ? 'Elite members' : it.minTier === 'premium' ? 'Premium and Elite members' : 'All members';
  return it.minPaidMonths > 0 ? `${who} with ${paidMonths(it.minPaidMonths)}` : who;
}

/** "up to €250" or "of any value". */
function itemValueLimit(tier: RewardTier): string {
  const cap = ITEM_TIER_VALUE_CAP_EUR[tier];
  return cap == null ? 'of any value' : `worth up to €${formatPoints(cap)}`;
}
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
    list.map((r) => `€${r.valueEur} for ${formatPoints(r.points)} Libo Points`).join(' or ');

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
              Last updated: <span>22 November 2026</span> &middot; Applies to: <span>rewards redeemed with Libo Points in the app</span>
            </p>
          </div>

          <div className="legal-highlight">
            <p>
              <strong>The short version.</strong> You earn Libo Points by training in the Libo app.
              You can swap them for a reward of a fixed value: {priceList(openToAll)} for every
              member, or {priceList(premiumOnly)} for Premium and Elite members only. Each value comes as a
              gift card or as cash (PayPal, Revolut, Wise or bank transfer), while this
              month&rsquo;s stock lasts. You can also swap them for physical items, shipped or as cash instead: which items you can
              redeem depends on your plan and how many months in a row you have paid for it. No chance is
              involved: this is not a prize draw. Libo Points have no cash value and can&rsquo;t be
              bought, sold or transferred.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="legal-toc">
            <div className="legal-toc-title">Table of Contents</div>
            <ol>
              <li><a href="#operator">Who Runs the Rewards</a></li>
              <li><a href="#points">What Libo Points Are</a></li>
              <li><a href="#catalogue">The Catalogue</a></li>
              <li><a href="#items">Physical Items</a></li>
              <li><a href="#stock">Monthly Stock</a></li>
              <li><a href="#who">Who Can Redeem</a></li>
              <li><a href="#where">Where You Can Redeem</a></li>
              <li><a href="#redeem">How to Redeem &amp; Delivery</a></li>
              <li><a href="#expiry">When Libo Points Expire</a></li>
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
            <h2>What Libo Points Are</h2>
            <ul>
              <li><strong>Libo Points have no cash value.</strong> They are a loyalty reward for training in the app.</li>
              <li><strong>Libo Points can&rsquo;t be bought, sold or transferred</strong> to another account or person.</li>
              <li><strong>Libo Points can be exchanged only for the rewards in the published catalogue</strong> below, while stock lasts. They can&rsquo;t be exchanged for anything else, and can&rsquo;t be paid out in any other way.</li>
            </ul>
          </section>

          <section className="legal-section" id="catalogue">
            <div className="legal-section-num">{n()}</div>
            <h2>The Catalogue</h2>
            <p>The current catalogue. The price is the same for every member.</p>
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
                      <td>{formatPoints(r.points)} Libo Points</td>
                      <td>{cardEligibility(r.minTier)}</td>
                    </tr>
                  ))}
                  {REWARDS_ITEMS.map((r) => (
                    <tr key={r.title}>
                      <td><strong>{r.title}</strong> (or &euro;{formatPoints(itemCashEur(r.valueEur))} cash)</td>
                      <td>{formatPoints(r.points)} Libo Points</td>
                      <td>{itemEligibility(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Each value is offered as two separate rewards, each with its own monthly stock:</p>
            <ul>
              <li><strong>Gift card:</strong> a gift code of that value, from a brand you choose among the brands shown in the app for that reward.</li>
              <li><strong>Cash:</strong> a payment of that value to your own PayPal, Revolut or Wise account, or by bank transfer (SEPA) to your own bank account.</li>
            </ul>
            <p><strong>Items</strong> are physical rewards. Who can redeem them is set out in <a href="#items">Physical Items</a> below. You choose: we ship the item free to an address in {ITEM_SHIP_AREA} (you pick the option, such as the colour, where there is one), or you take the cash instead: <strong>80% of the item&rsquo;s listed value</strong>, paid the same way as a cash reward. Outside {ITEM_SHIP_AREA}, items are cash only. Items are limited and may not come back once claimed.</p>
            <p><strong>Each code is subject to its issuer&rsquo;s terms.</strong> The brand that issues a gift code sets how and where it can be used, and for how long. We are not responsible for the issuer&rsquo;s terms or service.</p>
            <p>A &ldquo;Premium member&rdquo; is a member with an active, paid Premium membership on the day they redeem, or a member who has been given Premium by Libo directly (for example through a company partnership). An &ldquo;Elite member&rdquo; is the same with an active, paid Elite membership; every reward open to Premium members is also open to Elite members. Free trial periods and free weeks from offer codes do not count. Physical items also need a number of paid months in a row, which a membership given by Libo does not count towards (see <a href="#items">Physical Items</a>).</p>
          </section>

          <section className="legal-section" id="items">
            <div className="legal-section-num">{n()}</div>
            <h2>Physical Items</h2>
            <p>Each item belongs to a plan. Which items you can redeem depends on your plan and on how many months in a row you have paid for it:</p>
            <ul>
              <li><strong>Free items</strong> are {itemValueLimit('free')}. All members can redeem them{ITEM_TIER_MIN_PAID_MONTHS.free > 0 ? ` after ${paidMonths(ITEM_TIER_MIN_PAID_MONTHS.free)}` : ''}.</li>
              <li><strong>Premium items</strong> are {itemValueLimit('premium')}. Premium and Elite members can redeem them once they have {paidMonths(ITEM_TIER_MIN_PAID_MONTHS.premium)} on Premium or Elite.</li>
              <li><strong>Elite items</strong> can be {itemValueLimit('elite')}. Elite members can redeem them once they have {paidMonths(ITEM_TIER_MIN_PAID_MONTHS.elite)} on Elite.</li>
              <li><strong>A higher plan can redeem a lower plan&rsquo;s items</strong>, on that plan&rsquo;s conditions. For example, an Elite member can redeem a Premium item once they have {paidMonths(ITEM_TIER_MIN_PAID_MONTHS.premium)} on Premium or Elite.</li>
            </ul>
            <p>The catalogue above shows the plan and the number of paid months for each item. An item may ask for more paid months than its plan&rsquo;s minimum; it never asks for fewer.</p>
            <p><strong>What counts as a paid month.</strong> A paid month is a month of Premium or Elite membership that you paid for, monthly or as part of a yearly membership. These do not count as paid months: free trial periods, free periods from offer codes, and memberships given by Libo (for example through a company partnership). &ldquo;In a row&rdquo; means without a break: a month that is not a paid month on the required plan ends the run, and the count starts again.</p>
            <ul>
              <li><strong>One item per member per {ONE_ITEM_PER_DAYS} days</strong>, counted from the day you redeem it, whether you take the item or the cash instead. This is on top of the limit of one reward per {REWARDS_COOLDOWN_DAYS} days.</li>
              <li><strong>We check your ID first.</strong> Before we ship an item, or pay its cash instead, a person at Libo checks your official photo ID (such as a passport or national ID card) by hand. We ship only to the name on the ID, and pay the cash only to an account in that name.</li>
              <li><strong>If we can&rsquo;t confirm your identity, we reject the request</strong> and your Libo Points are returned. The delivery time for an item starts once your ID has been checked.</li>
            </ul>
          </section>

          <section className="legal-section" id="stock">
            <div className="legal-section-num">{n()}</div>
            <h2>Monthly Stock</h2>
            <ul>
              <li><strong>Each reward has a limited stock every month.</strong> When a reward is gone for the month, the app says so.</li>
              <li><strong>Stock resets on the 1st of each month</strong> at 00:00 Berlin time (Germany).</li>
              <li><strong>First come, first served.</strong> Once a reward&rsquo;s stock for the month is used up, it can&rsquo;t be redeemed until the next reset.</li>
            </ul>
          </section>

          <section className="legal-section" id="who">
            <div className="legal-section-num">{n()}</div>
            <h2>Who Can Redeem</h2>
            <ul>
              <li><strong>You need a Libo account.</strong></li>
              <li><strong>Cash goes only to an account in your own name</strong> (PayPal, Revolut, Wise or bank). These providers set their own rules for who can hold an account, including a minimum age.</li>
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
              <li><strong>In the app:</strong> pick a reward, choose a brand (gift card), how you want to be paid (cash), or shipping or cash (item), and confirm. The Libo Points are taken from your balance when you confirm.</li>
              <li><strong>One reward per member per {REWARDS_COOLDOWN_DAYS} days</strong>, and no more than one physical item per {ONE_ITEM_PER_DAYS} days (see <a href="#items">Physical Items</a>).</li>
              <li><strong>Delivery within {REWARDS_DELIVERY_DAYS} days by email.</strong> A person checks every request before it is sent. We email the gift code, or send the cash to the account details you gave us and email you when it&rsquo;s sent. A shipped item is sent within the same time, and we email you the tracking number.</li>
              <li><strong>If we reject a request, your Libo Points are returned.</strong> We tell you the reason. For example, we reject a request if you don&rsquo;t meet the conditions in these rules.</li>
              <li><strong>Check your payment details.</strong> If you give us a wrong email, phone number, tag, IBAN or address, we can&rsquo;t always get the payment or item back.</li>
            </ul>
          </section>

          <section className="legal-section" id="expiry">
            <div className="legal-section-num">{n()}</div>
            <h2>When Libo Points Expire</h2>
            <p>Libo Points expire if you don&rsquo;t use them. On the <strong>Free</strong> plan, they expire <strong>{POINTS_EXPIRY_DAYS.free} days</strong> after you earn them. As a <strong>Premium</strong> or <strong>Elite</strong> member, they expire <strong>{POINTS_EXPIRY_DAYS.premium} days</strong> after you earn them. The app shows when your Libo Points expire.</p>
          </section>

          <section className="legal-section" id="fair-play">
            <div className="legal-section-num">{n()}</div>
            <h2>Fair Play</h2>
            <p>We may refuse or reverse a reward, and remove Libo Points, where we find:</p>
            <ul>
              <li>More than one account used by the same person</li>
              <li>Workouts that were faked, or completed by someone else</li>
              <li>Tampering with the app or your account</li>
              <li>Any other attempt to get Libo Points or rewards unfairly</li>
            </ul>
            <p>A person makes these decisions, and we will tell you the reason. If you think we got it wrong, email <a href="mailto:support@liboworld.com">support@liboworld.com</a> and we will look again.</p>
          </section>

          <section className="legal-section" id="no-chance">
            <div className="legal-section-num">{n()}</div>
            <h2>Not a Prize Draw</h2>
            <p><strong>Rewards involve no chance.</strong> They are not a prize draw, lottery or game. Every member who meets the conditions in these rules and has enough Libo Points gets the reward they choose, as long as that reward is in stock that month. Our giveaways are separate and have their own <Link to="/giveaway-rules">Official Giveaway Rules</Link>.</p>
          </section>

          <section className="legal-section" id="changes">
            <div className="legal-section-num">{n()}</div>
            <h2>Changes &amp; Contact</h2>
            <p>We may change the catalogue at any time: the rewards offered, their prices in Libo Points, which plan can redeem them, the brands and the monthly stock. We will update this page when we do. A change does not affect a request you have already made: it is handled at the price and on the terms in force when you made it.</p>
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
