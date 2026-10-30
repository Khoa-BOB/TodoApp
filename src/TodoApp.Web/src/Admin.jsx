import { useEffect, useState } from 'react';
import { request } from './api.js';
import UserDirectory from './components/admin/UserDirectory.jsx';
import UserTasks from './components/admin/UserTasks.jsx';

export default function Admin({ onBack, onError }) {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [todos, setTodos] = useState([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingUsers(true);
    setError('');
    request('/users', { signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return;
        setUsers(items);
        setSelectedId((current) =>
          items.some((user) => user.id === current)
            ? current
            : items[0]?.id || '',
        );
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message);
        if (err.status === 401 || err.status === 403) onError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingUsers(false);
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setTodos([]);
    setLoadingTasks(true);
    setError('');
    request(`/users/${selectedId}/todos`, { signal: controller.signal })
      .then((items) => {
        if (!controller.signal.aborted) setTodos(items);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message);
        if (err.status === 401 || err.status === 403) onError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingTasks(false);
      });
    return () => controller.abort();
  }, [selectedId, retry]);

  const selected = users.find((user) => user.id === selectedId);
  const admins = users.filter((user) => user.role === 2).length;

  return (
    <main
      id="admin"
      className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:px-10 lg:px-14 lg:py-12"
    >
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">
          Administration <span className="mx-2 text-line">/</span>{' '}
          <span className="text-ink">Users</span>
        </p>
        <button className="secondary py-2" onClick={onBack}>
          Back to my tasks
        </button>
      </div>
      <header>
        <p className="mb-2 text-sm text-muted">Administrator workspace</p>
        <h1 className="display text-4xl font-semibold tracking-tight sm:text-5xl">
          A wider view<span className="text-blue">.</span>
        </h1>
        <p className="mt-3 text-sm text-muted">
          Browse accounts and see each person’s task progress.
        </p>
      </header>
      <section
        aria-label="Account overview"
        className="my-9 grid grid-cols-3 overflow-hidden rounded-2xl border border-line bg-white"
      >
        {[
          ['Accounts', users.length],
          ['Administrators', admins],
          ['Members', users.length - admins],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={`min-w-0 p-4 sm:p-6 ${index === 1 ? 'border-x border-line' : ''}`}
          >
            <p className="break-words text-xs text-muted">{label}</p>
            <p
              className={`display mt-2 text-3xl font-semibold ${index === 1 ? 'text-blue' : ''}`}
            >
              {loadingUsers ? '—' : value.toString().padStart(2, '0')}
            </p>
          </div>
        ))}
      </section>
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            onClick={() => setRetry((value) => value + 1)}
            className="shrink-0 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(230px,1fr)_minmax(0,1.5fr)]">
        <UserDirectory
          users={users}
          selectedId={selectedId}
          search={search}
          loading={loadingUsers}
          error={error}
          onSearchChange={setSearch}
          onSelectUser={setSelectedId}
        />
        <UserTasks user={selected} todos={todos} loading={loadingTasks} />
      </div>
    </main>
  );
}
