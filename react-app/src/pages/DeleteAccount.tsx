import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './Legal.css';

/**
 * /delete-account — public account-deletion instructions.
 *
 * Google Play requires a web link where a user can request deletion of their
 * account and data, reachable without the app installed; the Play Console
 * Data safety form cannot be submitted without it. This is that link.
 *
 * English-only inline JSX, like Terms.tsx, Privacy.tsx and Rules.tsx.
 *
 * Every statement here was checked against the code that does the work, and
 * must be re-checked when that code changes:
 *  - In-app path and labels: libo-app-v2/app/profile.tsx (Account section →
 *    Delete Account) and app/settings/delete-account.tsx, labels from
 *    src/i18n/locales/en.json.
 *  - What is deleted / kept: public.delete_my_account_data (migration
 *    supabase-migration-account-deletion.sql) and the delete_account Edge
 *    Function, which removes avatar storage and the auth user.
 *  - Retention periods and the request address: Privacy.tsx §7 and §13.
 *  - Store cancellation steps: settings.deleteAccount.subBodyIos / subBodyAndroid.
 */
export default function DeleteAccount() {
  let sectionNo = 0;
  const n = () => String(++sectionNo).padStart(2, '0');

  useEffect(() => {
    document.title = 'Delete Your Account | Libo';
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
            <span>Delete Your Account</span>
          </div>

          {/* Hero */}
          <div className="legal-hero">
            <div className="legal-label">Your Data</div>
            <h1 className="font-display">Delete your Libo account</h1>
            <p className="legal-meta">
              Last updated: <span>September 2026</span> &middot; Applies to: <span>Libo World - Training Club</span>
            </p>
          </div>

          <div className="legal-highlight">
            <p>
              <strong>The short version.</strong> You can delete your account inside the
              <strong> Libo World - Training Club</strong> app in under a minute. If you no longer
              have the app, email us and we will do it for you. Deleting your account permanently
              erases your profile and training data. Payment records we are required by law to
              keep are kept, cut off from your account. Deleting your account does
              <strong> not</strong> cancel an App Store or Google Play subscription &mdash; cancel
              that first. The app is operated by <strong>Libo World</strong>, based in Germany.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="legal-toc">
            <div className="legal-toc-title">Table of Contents</div>
            <ol>
              <li><a href="#in-app">Delete Your Account in the App</a></li>
              <li><a href="#by-email">Delete Your Account Without the App</a></li>
              <li><a href="#deleted">What Is Deleted</a></li>
              <li><a href="#kept">What We Keep, and for How Long</a></li>
              <li><a href="#subscriptions">Subscriptions and Purchases</a></li>
              <li><a href="#partial">Deleting Some Data but Keeping Your Account</a></li>
              <li><a href="#contact">Contact</a></li>
            </ol>
          </div>

          {/* 1 */}
          <section className="legal-section" id="in-app">
            <div className="legal-section-num">{n()}</div>
            <h2>Delete Your Account in the App</h2>
            <p>This is the quickest way, and it works on iPhone and Android:</p>
            <ol>
              <li>Open <strong>Libo World - Training Club</strong> and make sure you are signed in to the account you want to delete.</li>
              <li>On the <strong>Home</strong> tab, tap your profile button in the top-right corner (the circle with your initial).</li>
              <li>Scroll to the bottom and tap <strong>Account</strong> to open that section.</li>
              <li>Tap <strong>Delete Account</strong>.</li>
              <li>Read the summary of what is deleted and what is kept, then type <strong>DELETE</strong> in the box.</li>
              <li>Tap <strong>Delete my account</strong>.</li>
            </ol>
            <p>Your account is deleted as soon as you confirm. You are signed out, your data is cleared from that device, and the app shows <strong>Account deleted</strong>. This cannot be undone: neither you nor our support team can restore the account afterwards.</p>
            <p>If something goes wrong, the app tells you so and you can try again. If it keeps failing, email <a href="mailto:support@liboworld.com">support@liboworld.com</a> and quote the error code the app shows you.</p>
          </section>

          {/* 2 */}
          <section className="legal-section" id="by-email">
            <div className="legal-section-num">{n()}</div>
            <h2>Delete Your Account Without the App</h2>
            <p>If you have already uninstalled the app, or cannot sign in, you can ask us to delete your account by email:</p>
            <ol>
              <li>Email <a href="mailto:privacy@liboworld.com?subject=Delete%20my%20Libo%20account">privacy@liboworld.com</a> with the subject <strong>Delete my Libo account</strong>.</li>
              <li>Send it <strong>from the email address your Libo account uses</strong>. That is how we confirm the request comes from the account holder. If we cannot match the request to an account, we will reply and ask you to confirm it is yours before we delete anything.</li>
              <li>We will confirm by email that we have received your request, then delete your account and data as described on this page, and email you again once it is done.</li>
            </ol>
            <p>We complete deletion requests within <strong>30 days</strong>, in line with our <Link to="/privacy">Privacy Policy</Link>.</p>
            <p><strong>Signed up with Sign in with Apple?</strong> If you chose to hide your email, your Libo account uses an Apple relay address (ending in <em>privaterelay.appleid.com</em>) rather than your own. Tell us that address in your email &mdash; you can find it in your Apple Account settings under Sign in with Apple.</p>
          </section>

          {/* 3 */}
          <section className="legal-section" id="deleted">
            <div className="legal-section-num">{n()}</div>
            <h2>What Is Deleted</h2>
            <p>When your account is deleted, the following is permanently erased:</p>
            <ul>
              <li><strong>Your account and login</strong> &mdash; your email address, sign-in details and every active session.</li>
              <li><strong>Your profile</strong> &mdash; name, profile photo, age, gender, height, weight, injuries, goals and training preferences.</li>
              <li><strong>Your training history</strong> &mdash; every workout and set you logged, your streak, personal records and progress stats, and any photos you attached to workouts.</li>
              <li><strong>Your plans and workouts</strong> &mdash; training plans, workouts you built, and any workout links you shared publicly.</li>
              <li><strong>Your challenge activity</strong> &mdash; challenge enrolments, your day-by-day challenge progress, waitlist places and spot alerts.</li>
              <li><strong>Your rewards</strong> &mdash; points and ticket balances and their history.</li>
              <li><strong>Your referrals</strong> &mdash; the record of who invited you, and your personal invite code, which is switched off.</li>
              <li><strong>Email sign-ups</strong> &mdash; waitlist sign-ups under your email address, and web checkout sign-ups that never became a payment.</li>
            </ul>
            <p><strong>Challenge videos</strong> never leave your phone &mdash; we never receive a copy. Deleting your account in the app erases them from that phone, and uninstalling the app removes them too.</p>
          </section>

          {/* 4 */}
          <section className="legal-section" id="kept">
            <div className="legal-section-num">{n()}</div>
            <h2>What We Keep, and for How Long</h2>
            <p>Some records have to be kept even after you delete your account, because the law requires us to keep financial records. These are kept <strong>for 10 years to comply with German tax law (&sect; 147 AO)</strong>, and are no longer linked to your account:</p>
            <ul>
              <li><strong>Subscription and payment records</strong> &mdash; your plan, the platform you paid through, transaction and payment references, status and dates.</li>
              <li><strong>Cash challenge payouts</strong> &mdash; the amount, currency, status and dates of any payout, and the challenge enrolment it belongs to (without your daily progress). Where a payout was actually paid to you, the payment details it was sent to (email address, bank account and country) are kept with it as the record of that payment. For a payout that was never paid, those details are deleted.</li>
              <li><strong>Prize award records</strong> &mdash; records of any prize awarded to you.</li>
              <li><strong>Purchases made on liboworld.com</strong> &mdash; the checkout record, including the name, email address and phone number entered at checkout, so the payment can still be matched to the charge.</li>
            </ul>
            <p>We also keep:</p>
            <ul>
              <li><strong>Support emails</strong> you have sent us, for 2 years after the last interaction.</li>
              <li><strong>Anonymised, aggregated usage statistics</strong> that cannot identify you.</li>
              <li><strong>Other people&rsquo;s records.</strong> If someone signed up with your invite, their sign-up record stays in their account, with the link to you removed. If you had a creator or partner referral code, the code can stay active under that arrangement but is no longer linked to your account.</li>
            </ul>
            <p>Apple, Google and our payment processor keep their own records of purchases you made through them, under their own policies.</p>
          </section>

          {/* 5 */}
          <section className="legal-section" id="subscriptions">
            <div className="legal-section-num">{n()}</div>
            <h2>Subscriptions and Purchases</h2>
            <div className="legal-highlight">
              <p>
                <strong>Deleting your account does not cancel your subscription.</strong> If you
                subscribed in the app, Apple or Google bills you, not us, so only they can stop the
                payments. Cancel your subscription before you delete your account.
              </p>
            </div>
            <ul>
              <li><strong>iPhone:</strong> open the Settings app, tap your name, then <strong>Subscriptions</strong> &rarr; <strong>Libo</strong> &rarr; <strong>Cancel Subscription</strong>.</li>
              <li><strong>Android:</strong> open the Play Store app, tap your profile, then <strong>Payments &amp; subscriptions</strong> &rarr; <strong>Subscriptions</strong> &rarr; <strong>Libo</strong>, and cancel.</li>
            </ul>
            <p>Refunds for purchases made through the App Store or Google Play are handled by Apple or Google under their own policies. The Founding Member offer bought on liboworld.com is a one-time payment that never renews, so there is nothing to cancel. Refund terms for all purchases are in our <Link to="/terms">Terms &amp; Conditions</Link>.</p>
          </section>

          {/* 6 */}
          <section className="legal-section" id="partial">
            <div className="legal-section-num">{n()}</div>
            <h2>Deleting Some Data but Keeping Your Account</h2>
            <p>You do not have to delete your whole account to remove individual items:</p>
            <ul>
              <li><strong>A logged workout:</strong> on the <strong>Progress</strong> tab, tap <strong>History</strong> and open the workout, then tap <strong>Discard Workout</strong> and confirm with <strong>Discard</strong>. The workout, its sets and notes, and any photo attached to it are removed from your history and from our servers.</li>
              <li><strong>A workout you built:</strong> on the <strong>Explore</strong> tab, open <strong>My Workouts</strong>, press and hold the workout, tap <strong>Delete</strong> and confirm with <strong>Delete</strong>.</li>
            </ul>
            <p>For anything else, email <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a> and tell us what you would like deleted. We respond within 30 days.</p>
          </section>

          {/* 7 */}
          <section className="legal-section" id="contact">
            <div className="legal-section-num">{n()}</div>
            <h2>Contact</h2>
            <p>Questions about deleting your account or your data:</p>
            <ul>
              <li><strong>Privacy email:</strong> <a href="mailto:privacy@liboworld.com">privacy@liboworld.com</a></li>
              <li><strong>Website:</strong> <a href="https://www.liboworld.com">www.liboworld.com</a></li>
              <li><strong>Company:</strong> Libo World, Germany</li>
            </ul>
            <p>More about how we handle your data is in our <Link to="/privacy">Privacy Policy</Link>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
