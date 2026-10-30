import Icon from '../Icon.jsx';
import TaskRow from './TaskRow.jsx';

export default function TaskWorkspace({
  user,
  todos,
  filter,
  search,
  busy,
  loading,
  loadFailed,
  error,
  notice,
  onSearchChange,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
  onRetry,
}) {
  const completed = todos.filter((item) => item.isCompleted).length;
  const active = todos.length - completed;
  const progress = todos.length
    ? Math.round((completed / todos.length) * 100)
    : 0;
  const visible = todos.filter(
    (item) =>
      (filter === 'All tasks' ||
        (filter === 'Completed' ? item.isCompleted : !item.isCompleted)) &&
      `${item.title} ${item.description || ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <main
      id="tasks"
      className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-10 lg:px-14 lg:py-12"
    >
      <div className="mb-10 flex items-center justify-between border-b border-line pb-5">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">
          Personal workspace <span className="mx-2 text-line">/</span>{' '}
          <span className="text-ink">My tasks</span>
        </p>
        <span className="hidden text-xs text-muted sm:block">
          {new Intl.DateTimeFormat('en', {
            month: 'short',
            day: 'numeric',
            weekday: 'long',
          }).format(new Date())}
        </span>
      </div>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-sm text-muted">
            Let’s make room for progress, {user.name?.split(' ')[0]}.
          </p>
          <h1 className="display text-4xl font-semibold tracking-tight sm:text-5xl">
            A little more done<span className="text-blue">.</span>
          </h1>
          <p className="mt-3 text-sm text-muted">
            Your plans, in one place. One task at a time.
          </p>
        </div>
        <button
          className="primary"
          disabled={busy || loading || loadFailed}
          onClick={onAdd}
        >
          <Icon name="plus" size={18} /> Add task
        </button>
      </header>
      <section
        aria-label="Task progress"
        className="my-9 grid grid-cols-3 overflow-hidden rounded-2xl border border-line bg-white"
      >
        <div className="p-5 sm:p-6">
          <p className="text-xs text-muted">On your list</p>
          <p className="display mt-2 text-3xl font-semibold">
            {todos.length.toString().padStart(2, '0')}
          </p>
        </div>
        <div className="border-x border-line p-5 sm:p-6">
          <p className="text-xs text-muted">Still to do</p>
          <p className="display mt-2 text-3xl font-semibold text-blue">
            {active.toString().padStart(2, '0')}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">Completed</p>
            <span className="hidden text-xs font-semibold text-blue sm:block">
              {progress}%
            </span>
          </div>
          <p className="display mt-2 text-3xl font-semibold">
            {completed.toString().padStart(2, '0')}
          </p>
          <progress
            aria-label="Tasks completed"
            value={completed}
            max={todos.length || 1}
            className="mt-3 h-1.5 w-full"
          />
        </div>
      </section>
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          {loadFailed && (
            <button
              onClick={onRetry}
              disabled={loading}
              className="font-semibold underline"
            >
              Try again
            </button>
          )}
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="display text-xl font-semibold">{filter}</h2>
          <span className="rounded-lg border border-line bg-white px-2 py-0.5 text-xs text-muted">
            {visible.length}
          </span>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-muted">
          <Icon name="search" size={17} />
          <input
            aria-label="Search tasks"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Find a task…"
            className="w-40 bg-transparent text-sm text-ink outline-none sm:w-48"
          />
        </label>
      </div>
      <div
        role="status"
        aria-live="polite"
        className="mb-3 min-h-5 text-xs text-muted"
      >
        {loading ? 'Loading your tasks…' : notice}
      </div>
      <div
        className="overflow-hidden rounded-2xl border border-line bg-white"
        aria-busy={loading}
      >
        {visible.map((item) => (
          <TaskRow
            key={item.id}
            item={item}
            disabled={busy || loading}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {!loading && !loadFailed && visible.length === 0 && (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue/8 text-blue">
              <Icon
                name={
                  search ? 'search' : filter === 'Completed' ? 'check' : 'list'
                }
                size={25}
              />
            </span>
            <h3 className="display mt-5 text-xl font-semibold">
              {search
                ? 'No matching tasks'
                : filter === 'Completed'
                  ? 'Your wins will live here'
                  : filter === 'Active' && todos.length
                    ? 'All caught up.'
                    : 'A clear space. A fresh start.'}
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
              {search
                ? 'Try a different word or clear your search.'
                : filter === 'Completed'
                  ? 'Complete a task to see your progress here.'
                  : 'Add a task to give your next step a home.'}
            </p>
            {!search && filter !== 'Completed' && (
              <button
                disabled={busy}
                onClick={onAdd}
                className="secondary mx-auto mt-6"
              >
                <Icon name="plus" size={17} /> Add your first task
              </button>
            )}
          </div>
        )}
      </div>
      <footer className="mt-8 flex items-center justify-between text-[11px] text-muted">
        <span>A little progress is still progress.</span>
        <span className="display font-semibold">todo.</span>
      </footer>
    </main>
  );
}
