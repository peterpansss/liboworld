import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Scroll to top on route change — or smooth-scroll to a #hash target when the
// URL carries one (e.g. the nav CTA links to "/#hero-capture", the money
// challenge page uses "#reserve").
//
// The anchor hunt retries across frames rather than looking exactly once. A
// single rAF was enough for eager routes but never for a lazy one: at that
// moment the Suspense fallback is still mounted, the target does not exist,
// and the effect silently fell back to the top of the page. That made every
// deep link into a lazily-loaded page — /terms#early-access from the founding
// funnel and the checkout consent line, /rules#payout — land at the top,
// which is the exact behaviour the deep link exists to avoid.
// Gives up after HASH_SCROLL_TIMEOUT_MS and scrolls to top, so a stale or
// misspelled anchor still leaves the reader somewhere sensible.
// How long to keep looking for a #hash target before giving up and going to
// the top. Long enough for a lazy chunk to arrive on a slow connection, short
// enough that a bad anchor doesn't leave the page feeling stuck.
const HASH_SCROLL_TIMEOUT_MS = 3_000;

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  // SPA PageView (Meta-Pixel-Setup Step 2): without this the pixel counts one
  // page per session and the five-locale funnel collapses in every report.
  // No-ops until consent is granted; guarded against the init double-fire.
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    const deadline = Date.now() + HASH_SCROLL_TIMEOUT_MS;
    let frame = 0;
    const hunt = () => {
      const el = document.getElementById(id);
      if (el) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      if (Date.now() < deadline) {
        frame = requestAnimationFrame(hunt);
        return;
      }
      window.scrollTo(0, 0);
    };
    frame = requestAnimationFrame(hunt);
    // Cancelled on unmount and on any further navigation, so a hunt for a
    // never-arriving anchor cannot outlive the route that started it.
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

// Marketing pages
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import { isPrelaunch } from './config/launchMode';
import FoundingCheckoutProvider from './components/funnel/FoundingCheckoutProvider';
import CursorFollower from './components/CursorFollower';
import ConsentBanner from './components/ConsentBanner';
import { initConsent, trackPageView } from './lib/consent';

// If the visitor accepted on a previous visit, load GA4 + pixel immediately.
initConsent();

// Content pages — lazy loaded
const Careers = lazy(() => import('./pages/Careers'));
const Pricing = lazy(() => import('./pages/Pricing'));
const ExerciseLibrary = lazy(() => import('./pages/ExerciseLibrary'));
const ExerciseDetail = lazy(() => import('./pages/ExerciseDetail'));
const ProgramLibrary = lazy(() => import('./pages/ProgramLibrary'));
const ProgramDetail = lazy(() => import('./pages/ProgramDetail'));
const BestWorkouts = lazy(() => import('./pages/BestWorkouts'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Rules = lazy(() => import('./pages/Rules'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const AuthConfirm = lazy(() => import('./pages/AuthConfirm'));
const Giveaway = lazy(() => import('./pages/Giveaway'));
const CashChallenge = lazy(() => import('./pages/CashChallenge'));
const GetApp = lazy(() => import('./pages/GetApp'));
const Founder = lazy(() => import('./pages/Founder'));
const Affiliate = lazy(() => import('./pages/Affiliate'));
const AffiliateApply = lazy(() => import('./pages/AffiliateApply'));
const AffiliateApplySent = lazy(() => import('./pages/AffiliateApplySent'));
const Press = lazy(() => import('./pages/Press'));
const PressSent = lazy(() => import('./pages/PressSent'));
const SharedRoutine = lazy(() => import('./pages/SharedRoutine'));

// Site-relaunch pages
const CashChallenges = lazy(() => import('./pages/CashChallenges'));
const ChallengeFunnel = lazy(() => import('./pages/ChallengeFunnel'));
const JoinFunnel = lazy(() => import('./pages/JoinFunnel'));

// Admin area — lazy, never loads for public visitors, not linked from public pages.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));

const darkFallback = <div style={{ background: '#080808', height: '100vh' }} />;

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <CursorFollower />
      <ConsentBanner />
      <FoundingCheckoutProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/careers" element={<Suspense fallback={darkFallback}><Careers /></Suspense>} />

        {/* ── Site relaunch ─────────────────────────────────────────────────
            "Pricing" is now "Membership", "Money Challenges" is now "Cash
            Challenges", and "Affiliate" is now "Creator Program". The old
            paths stay alive as redirects — .htaccess is a pure SPA fallback
            with no route rewrites, so redirects have to live here, and the
            handoff's "complement, never destroy" rule means no URL 404s. */}
        <Route path="/membership" element={<Suspense fallback={darkFallback}><Pricing /></Suspense>} />
        <Route path="/pricing" element={<Navigate to="/membership" replace />} />

        <Route path="/cash-challenges" element={<Suspense fallback={darkFallback}><CashChallenges /></Suspense>} />
        <Route path="/cash-challenges/:tier" element={<Suspense fallback={darkFallback}><ChallengeFunnel /></Suspense>} />
        <Route path="/money-challenges" element={<Navigate to="/cash-challenges" replace />} />

        {/* Founding Member funnel — the single paid conversion surface. */}
        <Route path="/join" element={<Suspense fallback={darkFallback}><JoinFunnel /></Suspense>} />

        <Route path="/creator-program" element={<Suspense fallback={darkFallback}><Affiliate /></Suspense>} />
        <Route path="/creator-program/apply" element={<Suspense fallback={darkFallback}><AffiliateApply /></Suspense>} />
        <Route path="/creator-program/apply/sent" element={<Suspense fallback={darkFallback}><AffiliateApplySent /></Suspense>} />
        <Route path="/affiliate" element={<Navigate to="/creator-program" replace />} />
        <Route path="/affiliate/apply" element={<Navigate to="/creator-program/apply" replace />} />
        <Route path="/affiliate/apply/sent" element={<Navigate to="/creator-program/apply/sent" replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/exercises" element={<Suspense fallback={darkFallback}><ExerciseLibrary /></Suspense>} />
        <Route path="/exercises/:slug" element={<Suspense fallback={darkFallback}><ExerciseDetail /></Suspense>} />
        <Route path="/workouts" element={<Suspense fallback={darkFallback}><ProgramLibrary /></Suspense>} />
        <Route path="/workouts/:id" element={<Suspense fallback={darkFallback}><ProgramDetail /></Suspense>} />
        <Route path="/best-workouts/:facet" element={<Suspense fallback={darkFallback}><BestWorkouts /></Suspense>} />
        {/* Public shared-routine page (liboworld.com/w/{id}) — opened from app share links. */}
        <Route path="/w/:id" element={<Suspense fallback={darkFallback}><SharedRoutine /></Suspense>} />
        <Route path="/blog" element={<Suspense fallback={darkFallback}><Blog /></Suspense>} />
        <Route path="/blog/:slug" element={<Suspense fallback={darkFallback}><BlogPost /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={darkFallback}><Privacy /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={darkFallback}><Terms /></Suspense>} />
        <Route path="/rules" element={<Suspense fallback={darkFallback}><Rules /></Suspense>} />
        <Route path="/auth/callback" element={<Suspense fallback={darkFallback}><AuthCallback /></Suspense>} />
        <Route path="/auth/confirm" element={<Suspense fallback={darkFallback}><AuthConfirm /></Suspense>} />
        <Route path="/giveaway" element={isPrelaunch() ? <Navigate to="/" replace /> : <Suspense fallback={darkFallback}><Giveaway /></Suspense>} />
        <Route path="/cash-challenge" element={isPrelaunch() ? <Navigate to="/" replace /> : <Suspense fallback={darkFallback}><CashChallenge /></Suspense>} />
        {/* /get-app UA-routes to the App Store, but there is no listing yet — it
            would dump visitors on apps.apple.com's homepage. Send them home until
            launch; flipping LAUNCH_MODE to 'launched' restores the real endpoint. */}
        <Route path="/get-app" element={isPrelaunch() ? <Navigate to="/" replace /> : <Suspense fallback={darkFallback}><GetApp /></Suspense>} />
        {/* Founder page lives at /about (SOURCE-OF-TRUTH.md); /founder stays as
            a redirect so the URL that's been live since the v1 port never 404s. */}
        <Route path="/about" element={<Suspense fallback={darkFallback}><Founder /></Suspense>} />
        <Route path="/founder" element={<Navigate to="/about" replace />} />
        <Route path="/press" element={<Suspense fallback={darkFallback}><Press /></Suspense>} />
        <Route path="/press/sent" element={<Suspense fallback={darkFallback}><PressSent /></Suspense>} />
        <Route path="/admin/*" element={<Suspense fallback={darkFallback}><AdminLayout /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </FoundingCheckoutProvider>
    </BrowserRouter>
  );
}
