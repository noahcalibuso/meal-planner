import { NavLink, Outlet } from 'react-router-dom';
import {
  IconBowl,
  IconCalendar,
  IconList,
  IconSettings,
  IconSparkle,
} from './Icons';
import { cn } from '@/lib/utils';
import { Toaster } from './Toaster';

const NAV = [
  { to: '/planner', label: 'Planner', icon: IconCalendar },
  { to: '/library', label: 'Library', icon: IconBowl },
  { to: '/outputs', label: 'Outputs', icon: IconList },
  { to: '/settings', label: 'Settings', icon: IconSettings },
];

export function Layout() {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-canvas/85 backdrop-blur-md no-print">
        <div className="mx-auto max-w-[1400px] px-6 h-16 flex items-center gap-8">
          <NavLink to="/planner" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-canvas-ink text-white grid place-items-center shadow-card">
              <IconSparkle size={18} />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-[15px] tracking-tight">Mise</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-black/50 font-semibold">
                Meal Planner
              </div>
            </div>
          </NavLink>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-canvas-ink text-white shadow-card'
                      : 'text-black/65 hover:text-canvas-ink hover:bg-black/[0.04]'
                  )
                }
              >
                <n.icon size={16} />
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
