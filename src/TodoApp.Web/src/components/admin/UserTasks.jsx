export default function UserTasks({ user, todos, loading }) {
  return (
    <section
      aria-labelledby="user-tasks-title"
      className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white"
    >
      <div className="border-b border-line p-5">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="user-tasks-title"
            className="display break-words text-xl font-semibold"
          >
            {user ? `${user.name}’s tasks` : 'User tasks'}
          </h2>
          <span className="shrink-0 rounded-md bg-canvas px-2 py-1 text-[10px] font-semibold text-muted">
            Read only
          </span>
        </div>
        {user && (
          <p className="mt-2 break-all text-xs text-muted">{user.email}</p>
        )}
        <p className="mt-4 text-xs text-muted">
          {loading
            ? 'Loading tasks…'
            : `${todos.length} tasks · ${todos.filter((task) => task.isCompleted).length} completed`}
        </p>
      </div>
      <div aria-busy={loading}>
        {todos.map((task) => (
          <article
            key={task.id}
            className="flex items-start gap-3 border-b border-line p-5 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-xs ${task.isCompleted ? 'border-blue bg-blue text-white' : 'border-slate-300'}`}
            >
              {task.isCompleted ? '✓' : ''}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-sm font-semibold">
                {task.title}
              </h3>
              {task.description && (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
                  {task.description}
                </p>
              )}
              <p className="mt-3 text-[11px] text-muted">
                {task.isCompleted ? 'Completed' : 'Active'}
              </p>
            </div>
          </article>
        ))}
        {!loading && todos.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="display text-lg font-semibold">
              {user ? 'No tasks to show' : 'Choose an account'}
            </p>
            <p className="mt-2 text-sm text-muted">
              {user
                ? 'This person’s tasks will appear here.'
                : 'Select someone in the directory to view their tasks.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
