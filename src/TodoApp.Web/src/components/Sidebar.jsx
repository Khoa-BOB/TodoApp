import Brand from './Brand.jsx';
import Icon from './Icon.jsx';

export default function Sidebar({
  user,
  todos,
  filter,
  adminSite,
  busy,
  onFilterChange,
  onAdminSwitch,
  onLogout,
}) {
  const completed = todos.filter((item) => item.isCompleted).length;
  const active = todos.length - completed;

  return (
    <aside className="flex flex-col bg-blue px-6 py-6 text-white md:sticky md:top-0 md:h-dvh md:py-9">
      <Brand light />
      <p className="mb-3 mt-9 text-[10px] font-semibold uppercase tracking-[.2em] text-blue-200">
        Workspace
      </p>
      <nav
        aria-label="Task filters"
        className="grid grid-cols-3 gap-2 md:flex md:flex-col"
      >
        {['All tasks', 'Active', 'Completed'].map((label, index) => (
          <button
            key={label}
            onClick={() => onFilterChange(label)}
            aria-current={!adminSite && filter === label ? 'page' : undefined}
            className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs transition-colors sm:text-sm md:justify-start md:gap-3 md:px-3 ${!adminSite && filter === label ? 'bg-white text-blue shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
          >
            <Icon
              name={['list', 'circle', 'check'][index]}
              size={18}
              className="hidden sm:block"
            />
            <span className="whitespace-nowrap font-medium">{label}</span>
            <span
              className={`ml-auto hidden rounded-md px-1.5 py-0.5 text-xs sm:block ${!adminSite && filter === label ? 'bg-blue/8' : 'bg-white/10'}`}
            >
              {[todos.length, active, completed][index]}
            </span>
          </button>
        ))}
      </nav>
      {user.role === 2 && (
        <button
          onClick={onAdminSwitch}
          aria-pressed={adminSite}
          className={`mt-5 flex items-center gap-3 rounded-xl border border-white/25 px-3 py-3 text-sm font-semibold ${adminSite ? 'bg-lime text-ink' : 'text-white hover:bg-white/10'}`}
        >
          <Icon name="shield" size={18} /> Admin site{' '}
          <span className="ml-auto">↗</span>
        </button>
      )}
      <div className="mt-auto hidden pt-10 md:block">
        <div className="rounded-2xl border border-white/20 p-4">
          <span className="text-2xl text-lime">✳</span>
          <p className="display mt-3 text-lg font-medium">Small steps count.</p>
          <p className="mt-2 text-xs leading-relaxed text-blue-100">
            A finished task is a little more space for what’s next.
          </p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3 border-t border-white/20 pt-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-sm font-bold text-ink">
          {user.name?.slice(0, 1).toUpperCase() || 'U'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-[11px] text-blue-200">{user.email}</p>
        </div>
        <button
          disabled={busy}
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
          className="rounded-lg p-2 hover:bg-white/10"
        >
          <Icon name="logout" size={18} />
        </button>
      </div>
    </aside>
  );
}
