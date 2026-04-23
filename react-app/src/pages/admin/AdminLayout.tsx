import { useEffect, lazy, Suspense } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AdminGuard } from './AdminGuard';
import { signOutAdmin } from '../../lib/adminApi';
import { colors } from '../../theme';

const DashboardPage = lazy(() => import('./DashboardPage').then((m) => ({ default: m.DashboardPage })));
const GiveawaysPage = lazy(() => import('./GiveawaysPage').then((m) => ({ default: m.GiveawaysPage })));
const UsersPage = lazy(() => import('./UsersPage').then((m) => ({ default: m.UsersPage })));
const ActivityPage = lazy(() => import('./ActivityPage').then((m) => ({ default: m.ActivityPage })));
const SubscriptionsPage = lazy(() => import('./SubscriptionsPage').then((m) => ({ default: m.SubscriptionsPage })));
const ExercisesPage = lazy(() => import('./ExercisesPage').then((m) => ({ default: m.ExercisesPage })));
const WorkoutsPage = lazy(() => import('./WorkoutsPage').then((m) => ({ default: m.WorkoutsPage })));
const ChallengesPage = lazy(() => import('./ChallengesPage').then((m) => ({ default: m.ChallengesPage })));

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/exercises', label: 'Exercises' },
  { to: '/admin/workouts', label: 'Workouts' },
  { to: '/admin/challenges', label: 'Challenges' },
  { to: '/admin/giveaways', label: 'Giveaways' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/activity', label: 'Activity' },
  { to: '/admin/subscriptions', label: 'Subscriptions' },
];

function Shell() {
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Libo Admin';

    // Inject noindex meta so this route never gets indexed even if leaked.
    let meta = document.querySelector('meta[name="robots"]');
    const prevContent = meta?.getAttribute('content') ?? null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex,nofollow,noarchive,nosnippet');

    return () => {
      document.title = prev;
      if (prevContent === null) meta?.remove();
      else meta?.setAttribute('content', prevContent);
    };
  }, []);

  const signOut = async () => {
    await signOutAdmin();
    navigate('/admin');
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text, display: 'flex' }}>
      <aside
        style={{
          width: 240,
          minHeight: '100vh',
          background: colors.bg2,
          borderRight: `1px solid ${colors.border}`,
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
        }}
      >
        <div
          style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: 26,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 4,
            padding: '0 8px',
          }}
        >
          Libo
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: colors.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 28, padding: '0 8px' }}>
          Admin
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                color: isActive ? colors.text : colors.muted,
                background: isActive ? colors.bg3 : 'transparent',
                transition: 'background 120ms ease, color 120ms ease',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <button
            onClick={signOut}
            style={{
              width: '100%',
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px 40px', minWidth: 0 }}>
        <Suspense fallback={<div style={{ color: colors.muted }}>Loading…</div>}>
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="workouts" element={<WorkoutsPage />} />
            <Route path="challenges" element={<ChallengesPage />} />
            <Route path="giveaways" element={<GiveawaysPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <AdminGuard>
      <Shell />
    </AdminGuard>
  );
}
