import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IconBowl, IconCalendar, IconList, IconSettings } from './Icons';
import { Toaster } from './Toaster';
import { useStore } from '@/lib/store';
import { addDays, cn, fromISODate, startOfWeek } from '@/lib/utils';
import { useMemo } from 'react';

const NAV = [
  { to: '/planner', label: 'Planner', icon: IconCalendar },
  { to: '/library', label: 'Cookbook', icon: IconBowl },
  { to: '/outputs', label: 'Kitchen', icon: IconList },
];

function weekVolNo(weekStart: Date) {
  const year = weekStart.getFullYear();
  const start = new Date(year, 0, 1);
  const dayOfYear = Math.floor((weekStart.getTime() - start.getTime()) / 86400000) + 1;
  const weekNo = Math.max(1, Math.ceil(dayOfYear / 7));
  const vol = Math.max(1, year - 2024);
  return { vol, weekNo };
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { weekStartISO, weekPlan } = useStore();

  const weekStart = useMemo(() => fromISODate(weekStartISO), [weekStartISO]);
  const liveStart = useMemo(() => startOfWeek(new Date()), []);
  const liveEnd = useMemo(() => addDays(liveStart, 6), [liveStart]);
  const isLiveWeek = weekStart.getTime() === liveStart.getTime();
  const isPastWeek = weekStart.getTime() < liveStart.getTime();
  const hasPlan = (weekPlan?.planned_meals.length ?? 0) > 0;

  let status: { label: string; tone: 'live' | 'past' | 'future' | 'empty' };
  if (isPastWeek) {
    status = { label: 'Completed', tone: 'past' };
  } else if (isLiveWeek) {
    status = hasPlan
      ? { label: 'This week', tone: 'live' }
      : { label: 'To plan', tone: 'empty' };
  } else if (weekStart > liveEnd) {
    status = hasPlan
      ? { label: 'Planned ahead', tone: 'future' }
      : { label: 'To be planned', tone: 'empty' };
  } else {
    status = { label: 'This week', tone: 'live' };
  }

  const { vol, weekNo } = weekVolNo(weekStart);

  const isSettings = location.pathname.startsWith('/settings');

  return (
    <div className="shell">
      <header className="masthead no-print">
        <div className="masthead-inner">
          <NavLink to="/planner" className="brand">
            <div className="brand-mark">M</div>
            <div className="brand-words">
              <span className="name">Mise</span>
              <span className="tag">Weekly Meal Planner</span>
            </div>
          </NavLink>
          <nav className="nav-pill" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <n.icon size={14} />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="shell-right">
            <div className={cn('iss', `status-${status.tone}`)}>
              <span className="vol">
                Vol. {vol} · No. {weekNo}
              </span>
              <span className="status-line">
                <span className="status-dot" />
                {status.label}
              </span>
            </div>
            <span
              style={{ width: 1, height: 28, background: 'var(--rule)' }}
              aria-hidden
            />
            <button
              type="button"
              className={cn('icon-btn', isSettings && 'active')}
              onClick={() => navigate('/settings')}
              aria-label="Settings"
              title="Settings"
            >
              <IconSettings size={17} />
            </button>
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
