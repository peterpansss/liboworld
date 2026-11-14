import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import {
  GIVEAWAY_ROUNDS,
  GIVEAWAY_ENTRIES,
  GIVEAWAY_MAX_ENTRIES,
  LOYALTY_PER_MONTH,
  LOYALTY_MAX_MONTHS,
  LOYALTY_MIN_WORKOUT_MINUTES,
  GIVEAWAY_CLAIM_DAYS,
  GIVEAWAY_MIN_AGE,
  GIVEAWAY_EXCLUDED,
  formatRoundDate,
  POSTAL_BASE_LETTERS,
  POSTAL_LETTERS_PER_LOYALTY_MONTH,
  POSTAL_MAX_LETTERS,
  POSTAL_ENTRY_ADDRESS,
} from '../data/giveawayRounds';
import './Legal.css';

/**
 * /giveaway-rules — the public Official Giveaway Rules.
 *
 * Deliberately NOT gated behind GIVEAWAYS_ENABLED: the rules must be publicly
 * reachable before round 1 opens, so anyone told about the giveaway can read
 * them first. The Terms section that incorporates this page by reference
 * (Terms §Giveaways) stays behind the flag until the giveaway goes live.
 *
 * English-only inline JSX, like Terms.tsx and Rules.tsx — the legal pages are
 * deliberately not run through i18n.
 *
 * Model: Noah, 10 Nov 2026 — canon LEGAL-COMPETITIONS.md §4b/§5/§8 and
 * REWARDS-ECONOMY-RULES.md §8.1/§8.4. Two content rules this page must never
 * break:
 *  - Never state or imply that buying does not improve your chances. Premium
 *    gives 5x the entries, so it does. That clause was deleted from canon on
 *    purpose (LEGAL-COMPETITIONS §5 cl.4). The three true statements replace it.
 *  - Never void a round for low participation (§8a / REWARDS §8.4).
 * Round dates and prizes come from GIVEAWAY_ROUNDS, so adding a round is a
 * one-line change in src/data/giveawayRounds.ts.
 */
export default function GiveawayRules() {
  let sectionNo = 0;
  const n = () => String(++sectionNo).padStart(2, '0');

  useEffect(() => {
    document.title = 'Official Giveaway Rules | Libo';
    return () => { document.title = 'Libo'; };
  }, []);

  const first = GIVEAWAY_ROUNDS[0];
  const last = GIVEAWAY_ROUNDS[GIVEAWAY_ROUNDS.length - 1];

  return (
    <>
      <SiteNav />
      <main className="legal-page">
        <div className="legal-container">
          {/* Breadcrumb */}
          <div className="legal-breadcrumb">
            <Link to="/">Home</Link>
            <span className="legal-breadcrumb-sep">&gt;</span>
            <span>Official Giveaway Rules</span>
          </div>

          {/* Hero */}
          <div className="legal-hero">
            <div className="legal-label">Rules</div>
            <h1 className="font-display">Official Giveaway Rules</h1>
            <p className="legal-meta">
              Last updated: <span>14 November 2026</span> &middot; Applies to: <span>giveaway rounds from {formatRoundDate(first.opens)} to {formatRoundDate(last.closes)}</span>
            </p>
          </div>

          <div className="legal-highlight">
            <p>
              <strong>The short version.</strong> No purchase necessary. Every eligible Libo
              member is entered automatically. Free members get {GIVEAWAY_ENTRIES.free} entry
              per round, Premium members get {GIVEAWAY_ENTRIES.premium}, plus loyalty entries for
              every month in a row you&rsquo;ve trained. Your entries count once
              you complete one workout in the app while the round is open. Every entry has the
              same chance of winning, and all entries are drawn from one pool. Memberships give
              more entries. Some draws are Premium draws: in the app only Premium members are
              entered, and anyone eligible can enter them free by post. Apple, Google, Sony and
              Rockstar Games are not sponsors of, and are not involved in, this giveaway.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="legal-toc">
            <div className="legal-toc-title">Table of Contents</div>
            <ol>
              <li><a href="#promoter">Who Runs the Giveaway</a></li>
              <li><a href="#who">Who Can Enter</a></li>
              <li><a href="#where">Where You Can Enter</a></li>
              <li><a href="#rounds">Rounds &amp; Prizes</a></li>
              <li><a href="#entries">How You Are Entered</a></li>
              <li><a href="#premium">Premium Draws</a></li>
              <li><a href="#free">No Purchase Necessary</a></li>
              <li><a href="#post">Free Entry by Post</a></li>
              <li><a href="#draw">The Draw</a></li>
              <li><a href="#claim">Winning &amp; Claiming</a></li>
              <li><a href="#fair-play">Fair Play</a></li>
              <li><a href="#cancellation">If a Round Cannot Run</a></li>
              <li><a href="#tax-privacy">Tax, Privacy, Apple &amp; Google</a></li>
              <li><a href="#changes">Changes &amp; Contact</a></li>
            </ol>
          </div>

          <section className="legal-section" id="promoter">
            <div className="legal-section-num">{n()}</div>
            <h2>Who Runs the Giveaway</h2>
            <p>The giveaway is run by <strong>Noah Fofana, trading as Libo World</strong>, a registered business in Germany (&ldquo;Libo&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), the promoter.</p>
            <ul>
              <li><strong>Postal address:</strong> Johannishof 10, 56626 Andernach, Germany</li>
              <li><strong>Email:</strong> <a href="mailto:support@liboworld.com">support@liboworld.com</a></li>
              <li><strong>Website:</strong> <a href="https://www.liboworld.com">www.liboworld.com</a></li>
            </ul>
            <p>These rules form part of our <Link to="/terms">Terms &amp; Conditions</Link>. If they conflict, the Terms govern.</p>
          </section>

          <section className="legal-section" id="who">
            <div className="legal-section-num">{n()}</div>
            <h2>Who Can Enter</h2>
            <ul>
              <li><strong>You must be {GIVEAWAY_MIN_AGE} or older</strong> and have a Libo account. If your local law sets a higher minimum age, that law applies.</li>
              <li><strong>One account per person.</strong> If you use more than one account, all of them are disqualified.</li>
              <li><strong>Libo staff and partners can&rsquo;t enter.</strong> Nor can anyone in their household.</li>
            </ul>
          </section>

          <section className="legal-section" id="where">
            <div className="legal-section-num">{n()}</div>
            <h2>Where You Can Enter</h2>
            <p>The giveaway is open worldwide, except:</p>
            <ul>
              {GIVEAWAY_EXCLUDED.map((place) => (
                <li key={place}>{place}</li>
              ))}
              <li>any country or region under EU, UN or US (OFAC) sanctions</li>
              <li>anywhere local law prohibits it</li>
            </ul>
            <p>If you live in an excluded place, you are not entered and cannot win. We may add places to this list after local legal review.</p>
          </section>

          <section className="legal-section" id="rounds">
            <div className="legal-section-num">{n()}</div>
            <h2>Rounds &amp; Prizes</h2>
            <p>Each giveaway runs as a round with its own dates and prize, listed below and in the app. Rounds can be different lengths, and more than one round can be open at the same time. All times are Berlin time (Germany). Each round opens at 00:00 on its first day and closes at 23:59 on its last day.</p>
            <div className="legal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Opens</th>
                    <th>Closes</th>
                    <th>Prize</th>
                    <th>Winner announced</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Driven off GIVEAWAY_ROUNDS. Announcement = the day after close. */}
                  {GIVEAWAY_ROUNDS.map((round) => (
                    <tr key={round.n}>
                      <td><strong>{round.title}</strong></td>
                      <td>{formatRoundDate(round.opens)}, 00:00</td>
                      <td>{formatRoundDate(round.closes)}, 23:59</td>
                      <td>{round.prize}, {round.winners === 1 ? '1 winner' : `${round.winners} winners`}</td>
                      <td>{formatRoundDate(round.closes, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>Each round is a separate draw. Prizes can&rsquo;t be transferred to someone else.</p>
            <ul>
              <li><strong>Item prizes</strong> (such as the PlayStation 5 with GTA VI) are new, bought by us, and shipped free to the winner in the EU or the UK. Instead of the item, the winner can choose the cash amount shown in the table. A winner living outside the EU and the UK receives the cash amount.</li>
              <li><strong>Age-rated games.</strong> GTA VI is rated 18+. A winner aged 16 or 17 receives the PlayStation 5 and, instead of the game, its retail price in cash, sent to their parent or guardian.</li>
              <li>PlayStation is a trademark of Sony Interactive Entertainment, and GTA VI is a game by Rockstar Games. Neither is a sponsor of, or involved in, this giveaway.</li>
            </ul>
          </section>

          <section className="legal-section" id="entries">
            <div className="legal-section-num">{n()}</div>
            <h2>How You Are Entered</h2>
            <p>You don&rsquo;t need to sign up. Every eligible member is entered into each round automatically:</p>
            <ul>
              <li><strong>Free plan:</strong> {GIVEAWAY_ENTRIES.free} entry per round</li>
              <li><strong>Premium:</strong> {GIVEAWAY_ENTRIES.premium} entries per round</li>
            </ul>
            <p><strong>Loyalty entries:</strong> for every calendar month in a row before the round&rsquo;s month in which you completed at least one workout of {LOYALTY_MIN_WORKOUT_MINUTES} minutes or more, you get your plan&rsquo;s entries again, so entries add up month by month &mdash; Free +{LOYALTY_PER_MONTH.free}, Premium +{LOYALTY_PER_MONTH.premium} per month, counting up to {LOYALTY_MAX_MONTHS} months. A month without such a workout restarts the count. Example: in your 5th month in a row you hold {GIVEAWAY_ENTRIES.free + 4 * LOYALTY_PER_MONTH.free} entries on Free, or {GIVEAWAY_ENTRIES.premium + 4 * LOYALTY_PER_MONTH.premium} on Premium; a member who trained every month for the past year holds {GIVEAWAY_MAX_ENTRIES.free} on Free, or {GIVEAWAY_MAX_ENTRIES.premium} on Premium.</p>
            <p>You need to have confirmed your date of birth in the app.</p>
            <h3>Your entries count once you train</h3>
            <p>Your entries for a round only become active when you <strong>complete one workout in the app while that round is open</strong>. This rule is the same on every plan. If you don&rsquo;t complete a workout during the round, your entries for that round don&rsquo;t count.</p>
            <p>Your plan on the day the round closes decides how many entries you hold. Each round is a separate draw. Your entries are worked out fresh for every round.</p>
          </section>

          {/* Premium draws (Noah, 13 Nov 2026). The free route is the postal
              clause (#post, from feat/giveaway-postal-entry) with the same parity
              cap: a Free member's letters can reach exactly what a Premium member
              with the same loyalty months holds, never more. Don't restate the
              postal mechanics here; refer to #post. */}
          <section className="legal-section" id="premium">
            <div className="legal-section-num">{n()}</div>
            <h2>Premium Draws</h2>
            <p>Some draws are marked <strong>Premium</strong> in the app. Each Premium draw&rsquo;s dates, prize and number of winners are shown in the app before it opens, and the same times apply as in <a href="#rounds">Rounds &amp; Prizes</a> (Berlin time, opening 00:00, closing 23:59).</p>
            <ul>
              <li><strong>In the app, only Premium members are entered</strong> into a Premium draw, with the entries set out in <a href="#entries">How You Are Entered</a>.</li>
              <li><strong>Anyone eligible can enter a Premium draw free by post</strong>, under <a href="#post">Free Entry by Post</a>, with the same limit: your letters can bring you to exactly the entries a Premium member with the same loyalty months holds, never more. On a Premium draw a Free member holds no entries from the app, so that is up to {GIVEAWAY_ENTRIES.premium} letters plus {LOYALTY_PER_MONTH.premium} for each loyalty month (at most {GIVEAWAY_MAX_ENTRIES.premium}).</li>
              <li><strong>Everything else in these rules applies to Premium draws too</strong>: who can enter, excluded places, the one-workout activation rule, the draw, claiming and fair play.</li>
            </ul>
          </section>

          <section className="legal-section" id="free">
            <div className="legal-section-num">{n()}</div>
            <h2>No Purchase Necessary</h2>
            <ul>
              <li><strong>No purchase necessary.</strong> The Free plan is free. A free member who completes one workout during a round is in the draw.</li>
              <li><strong>Every entry has the same chance of winning, and all entries are drawn from one pool.</strong> A free entry and a Premium entry are treated exactly the same.</li>
              <li><strong>Memberships give more entries.</strong> Premium members get {GIVEAWAY_ENTRIES.premium} base entries per round instead of {GIVEAWAY_ENTRIES.free}, and +{LOYALTY_PER_MONTH.premium} loyalty entries per month instead of +{LOYALTY_PER_MONTH.free}.</li>
              <li><strong>Points can&rsquo;t be bought, and can&rsquo;t be turned into entries.</strong></li>
              <li><strong>You can also add entries for free by post.</strong> See <a href="#post">Free Entry by Post</a>.</li>
            </ul>
          </section>

          <section className="legal-section" id="post">
            <div className="legal-section-num">{n()}</div>
            <h2>Free Entry by Post</h2>
            <p>Any eligible member can add entries to a round without buying anything, by sending a letter.</p>
            <ul>
              <li><strong>One letter = one entry.</strong> Letters let you reach exactly the entries a Premium member with the same loyalty months holds, never more. On the Free plan you can send up to {POSTAL_BASE_LETTERS} letters per round, plus {POSTAL_LETTERS_PER_LOYALTY_MONTH} for each of your loyalty months (at most {POSTAL_MAX_LETTERS}). Example: with 3 loyalty months, Premium holds {GIVEAWAY_ENTRIES.premium} + {3 * LOYALTY_PER_MONTH.premium} = {GIVEAWAY_ENTRIES.premium + 3 * LOYALTY_PER_MONTH.premium} entries; a Free member holds {GIVEAWAY_ENTRIES.free} + {3 * LOYALTY_PER_MONTH.free} = {GIVEAWAY_ENTRIES.free + 3 * LOYALTY_PER_MONTH.free} and can add up to {POSTAL_BASE_LETTERS + 3 * POSTAL_LETTERS_PER_LOYALTY_MONTH} letters to reach {GIVEAWAY_ENTRIES.premium + 3 * LOYALTY_PER_MONTH.premium}. Premium members already hold that number, so letters add nothing for them. Your plan and loyalty months on the day the round closes decide. Each letter needs its own envelope and stamp; letters above your limit don&rsquo;t count.</li>
              <li><strong>What to write:</strong> your full name, the email of your Libo account, your postal address including country, and the round you want to enter (for example &ldquo;PS5 + GTA VI Giveaway, 20 November&ndash;20 December 2026&rdquo;). A free Libo account is enough; you can create one in the app.</li>
              <li><strong>Where to send it:</strong>{' '}
                {POSTAL_ENTRY_ADDRESS ? (
                  POSTAL_ENTRY_ADDRESS.map((line, i) => (
                    <span key={line}>{i > 0 && ', '}{line}</span>
                  ))
                ) : (
                  <span>[ADDRESS TO BE ADDED BEFORE PUBLISHING]</span>
                )}
              </li>
              <li><strong>When:</strong> the letter must <strong>arrive</strong> before the round closes. Letters that arrive later are not carried over to the next round.</li>
              <li><strong>Same conditions as every entry:</strong> you must be eligible (see <a href="#who">Who Can Enter</a> and <a href="#where">Where You Can Enter</a>) and complete one workout in the app during the round. Postal entries are added to your other entries and have exactly the same chance of winning.</li>
              <li>You pay the postage. Letters that are illegible, incomplete, or sent from an excluded country don&rsquo;t count. Letters are not returned or acknowledged.</li>
            </ul>
          </section>

          <section className="legal-section" id="draw">
            <div className="legal-section-num">{n()}</div>
            <h2>The Draw</h2>
            <p>When a round closes, the winner is drawn automatically and at random by computer from all active entries in that round. The winner is announced the day after the round closes.</p>
          </section>

          <section className="legal-section" id="claim">
            <div className="legal-section-num">{n()}</div>
            <h2>Winning &amp; Claiming</h2>
            <ul>
              <li><strong>We tell you in the app or by email.</strong></li>
              <li><strong>You have {GIVEAWAY_CLAIM_DAYS} days to claim.</strong> If you don&rsquo;t claim in time, a new winner is drawn from the same round&rsquo;s entries.</li>
              <li><strong>We check your ID and age before paying.</strong> If you can&rsquo;t verify them, or you are not eligible, a new winner is drawn from the same round&rsquo;s entries.</li>
              <li><strong>If you are under 18</strong>, the prize is sent or paid to your parent or guardian, after we verify them.</li>
            </ul>
          </section>

          <section className="legal-section" id="fair-play">
            <div className="legal-section-num">{n()}</div>
            <h2>Fair Play</h2>
            <p>We may disqualify entries and refuse a prize where we find:</p>
            <ul>
              <li>More than one account used by the same person</li>
              <li>Workouts that were faked, or completed by someone else</li>
              <li>Tampering with the app, the draw or your account</li>
              <li>Any other attempt to win unfairly</li>
            </ul>
            <p>A person makes these decisions, and we will tell you the reason. If you think we got it wrong, email <a href="mailto:support@liboworld.com">support@liboworld.com</a> and we will look again.</p>
          </section>

          <section className="legal-section" id="cancellation">
            <div className="legal-section-num">{n()}</div>
            <h2>If a Round Cannot Run</h2>
            <p><strong>A round is never cancelled for low participation.</strong> The draw goes ahead at the published close, however many entries there are. There is no minimum number of entries.</p>
            <p>We may only cancel or pause a draw if its integrity is compromised &mdash; for example by fraud, tampering or a technical failure &mdash; or if an event outside our reasonable control stops it from running. If that happens, the draw is rescheduled and <strong>all valid entries carry forward to the rescheduled draw</strong>.</p>
          </section>

          <section className="legal-section" id="tax-privacy">
            <div className="legal-section-num">{n()}</div>
            <h2>Tax, Privacy, Apple &amp; Google</h2>
            <ul>
              <li><strong>Tax is the winner&rsquo;s responsibility.</strong> You are responsible for any tax due on the prize where you live.</li>
              <li><strong>Privacy.</strong> We use your data to run the giveaway, check eligibility and pay the prize, as set out in our <Link to="/privacy">Privacy Policy</Link>.</li>
              <li><strong>Apple and Google are not sponsors of, and are not involved in, this giveaway.</strong></li>
            </ul>
          </section>

          <section className="legal-section" id="changes">
            <div className="legal-section-num">{n()}</div>
            <h2>Changes &amp; Contact</h2>
            <p>We may change these rules for <strong>future</strong> rounds. The rules in force when a round opens govern that round.</p>
            <p>These rules are governed by the laws of the <strong>Federal Republic of Germany</strong>, as set out in our <Link to="/terms">Terms &amp; Conditions</Link>. Questions:</p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:support@liboworld.com">support@liboworld.com</a></li>
              <li><strong>Website:</strong> <a href="https://www.liboworld.com">www.liboworld.com</a></li>
              <li><strong>Promoter:</strong> Noah Fofana, trading as Libo World, Johannishof 10, 56626 Andernach, Germany</li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
