export default function UserDirectory({
  users,
  selectedId,
  search,
  loading,
  error,
  onSearchChange,
  onSelectUser,
}) {
  const visible = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <section
      aria-labelledby="directory-title"
      className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white"
    >
      <div className="border-b border-line p-5">
        <h2 id="directory-title" className="display text-xl font-semibold">
          User directory
        </h2>
        <label className="field-label mt-4">
          <span className="sr-only">Search users</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Find a name or email…"
            className="field"
          />
        </label>
      </div>
      <div aria-busy={loading} className="max-h-[540px] overflow-y-auto">
        {visible.map((user) => (
          <button
            key={user.id}
            onClick={() => onSelectUser(user.id)}
            aria-pressed={selectedId === user.id}
            aria-label={`View tasks for ${user.name} (${user.email})`}
            className={`flex w-full items-start gap-3 border-b border-line p-5 text-left last:border-b-0 ${selectedId === user.id ? 'bg-blue/5' : 'hover:bg-canvas'}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue/10 text-sm font-bold text-blue">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold">{user.name}</p>
              <p className="mt-1 break-all text-xs text-muted">{user.email}</p>
              <p className="mt-2 text-[11px] text-muted">
                Joined{' '}
                {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
                  new Date(user.createdAt),
                )}
              </p>
            </div>
            <span
              className={`rounded-md px-2 py-1 text-[10px] font-semibold ${user.role === 2 ? 'bg-lime text-ink' : 'bg-canvas text-muted'}`}
            >
              {user.role === 2 ? 'Admin' : 'Member'}
            </span>
          </button>
        ))}
        {loading && (
          <p role="status" className="p-6 text-sm text-muted">
            Loading accounts…
          </p>
        )}
        {!loading && visible.length === 0 && (
          <p className="p-6 text-sm text-muted">
            {search
              ? 'No accounts match your search.'
              : error
                ? 'Accounts could not be loaded. Try again.'
                : 'No accounts yet.'}
          </p>
        )}
      </div>
    </section>
  );
}
