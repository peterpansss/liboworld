import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Marketing pages
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';

// Content pages — lazy loaded
const Careers = lazy(() => import('./pages/Careers'));
const Pricing = lazy(() => import('./pages/Pricing'));
const ExerciseLibrary = lazy(() => import('./pages/ExerciseLibrary'));
const ExerciseDetail = lazy(() => import('./pages/ExerciseDetail'));
const ProgramLibrary = lazy(() => import('./pages/ProgramLibrary'));
const ProgramDetail = lazy(() => import('./pages/ProgramDetail'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Giveaway = lazy(() => import('./pages/Giveaway'));
const CashChallenge = lazy(() => import('./pages/CashChallenge'));
const GetApp = lazy(() => import('./pages/GetApp'));
const Founder = lazy(() => import('./pages/Founder'));
const Affiliate = lazy(() => import('./pages/Affiliate'));
const AffiliateApply = lazy(() => import('./pages/AffiliateApply'));
const AffiliateApplySent = lazy(() => import('./pages/AffiliateApplySent'));
const Press = lazy(() => import('./pages/Press'));
const PressSent = lazy(() => import('./pages/PressSent'));

// Admin area — lazy, never loads for public visitors, not linked from public pages.
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));

const darkFallback = <div style={{ background: '#080808', height: '100vh' }} />;

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/careers" element={<Suspense fallback={darkFallback}><Careers /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={darkFallback}><Pricing /></Suspense>} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/exercises" element={<Suspense fallback={darkFallback}><ExerciseLibrary /></Suspense>} />
        <Route path="/exercises/:slug" element={<Suspense fallback={darkFallback}><ExerciseDetail /></Suspense>} />
        <Route path="/workouts" element={<Suspense fallback={darkFallback}><ProgramLibrary /></Suspense>} />
        <Route path="/workouts/:id" element={<Suspense fallback={darkFallback}><ProgramDetail /></Suspense>} />
        <Route path="/blog" element={<Suspense fallback={darkFallback}><Blog /></Suspense>} />
        <Route path="/blog/:slug" element={<Suspense fallback={darkFallback}><BlogPost /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={darkFallback}><Privacy /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={darkFallback}><Terms /></Suspense>} />
        <Route path="/auth/callback" element={<Suspense fallback={darkFallback}><AuthCallback /></Suspense>} />
        <Route path="/giveaway" element={<Suspense fallback={darkFallback}><Giveaway /></Suspense>} />
        <Route path="/cash-challenge" element={<Suspense fallback={darkFallback}><CashChallenge /></Suspense>} />
        <Route path="/get-app" element={<Suspense fallback={darkFallback}><GetApp /></Suspense>} />
        <Route path="/founder" element={<Suspense fallback={darkFallback}><Founder /></Suspense>} />
        <Route path="/affiliate" element={<Suspense fallback={darkFallback}><Affiliate /></Suspense>} />
        <Route path="/affiliate/apply" element={<Suspense fallback={darkFallback}><AffiliateApply /></Suspense>} />
        <Route path="/affiliate/apply/sent" element={<Suspense fallback={darkFallback}><AffiliateApplySent /></Suspense>} />
        <Route path="/press" element={<Suspense fallback={darkFallback}><Press /></Suspense>} />
        <Route path="/press/sent" element={<Suspense fallback={darkFallback}><PressSent /></Suspense>} />
        <Route path="/admin/*" element={<Suspense fallback={darkFallback}><AdminLayout /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
