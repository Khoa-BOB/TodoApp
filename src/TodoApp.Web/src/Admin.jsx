import { useEffect, useState } from 'react';
import { request } from './api.js';

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
    setLoadingUsers(true); setError('');
    request('/users', { signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return;
        setUsers(items);
        setSelectedId((current) => items.some((user) => user.id === current) ? current : items[0]?.id || '');
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message);
        if (err.status === 401 || err.status === 403) onError(err);
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingUsers(false); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    setTodos([]); setLoadingTasks(true); setError('');
    request(`/users/${selectedId}/todos`, { signal: controller.signal })
      .then((items) => { if (!controller.signal.aborted) setTodos(items); })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err.message);
        if (err.status === 401 || err.status === 403) onError(err);
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingTasks(false); });
    return () => controller.abort();
  }, [selectedId, retry]);

  const selected = users.find((user) => user.id === selectedId);
  const visible = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()));
  const admins = users.filter((user) => user.role === 2).length;

  return <main id="admin" className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
    <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">Administration <span className="mx-2 text-line">/</span> <span className="text-ink">Users</span></p><button className="secondary py-2" onClick={onBack}>Back to my tasks</button></div>
    <header><p className="mb-2 text-sm text-muted">Administrator workspace</p><h1 className="display text-4xl font-semibold tracking-tight sm:text-5xl">A wider view<span className="text-blue">.</span></h1><p className="mt-3 text-sm text-muted">Browse accounts and see each person’s task progress.</p></header>
    <section aria-label="Account overview" className="my-9 grid grid-cols-3 overflow-hidden rounded-2xl border border-line bg-white">
      {[['Accounts', users.length], ['Administrators', admins], ['Members', users.length - admins]].map(([label, value], index) => <div key={label} className={`min-w-0 p-4 sm:p-6 ${index === 1 ? 'border-x border-line' : ''}`}><p className="break-words text-xs text-muted">{label}</p><p className={`display mt-2 text-3xl font-semibold ${index === 1 ? 'text-blue' : ''}`}>{loadingUsers ? '—' : value.toString().padStart(2, '0')}</p></div>)}
    </section>
    {error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button onClick={() => setRetry((value) => value + 1)} className="shrink-0 font-semibold underline">Try again</button></div>}
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(230px,1fr)_minmax(0,1.5fr)]">
      <section aria-labelledby="directory-title" className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line p-5"><h2 id="directory-title" className="display text-xl font-semibold">User directory</h2><label className="field-label mt-4"><span className="sr-only">Search users</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a name or email…" className="field" /></label></div>
        <div aria-busy={loadingUsers} className="max-h-[540px] overflow-y-auto">
          {visible.map((user) => <button key={user.id} onClick={() => setSelectedId(user.id)} aria-pressed={selectedId === user.id} aria-label={`View tasks for ${user.name} (${user.email})`} className={`flex w-full items-start gap-3 border-b border-line p-5 text-left last:border-b-0 ${selectedId === user.id ? 'bg-blue/5' : 'hover:bg-canvas'}`}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue/10 text-sm font-bold text-blue">{user.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{user.name}</p><p className="mt-1 break-all text-xs text-muted">{user.email}</p><p className="mt-2 text-[11px] text-muted">Joined {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(user.createdAt))}</p></div><span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${user.role === 2 ? 'bg-lime text-ink' : 'bg-canvas text-muted'}`}>{user.role === 2 ? 'Admin' : 'Member'}</span></button>)}
          {loadingUsers && <p role="status" className="p-6 text-sm text-muted">Loading accounts…</p>}
          {!loadingUsers && visible.length === 0 && <p className="p-6 text-sm text-muted">{search ? 'No accounts match your search.' : error ? 'Accounts could not be loaded. Try again.' : 'No accounts yet.'}</p>}
        </div>
      </section>
      <section aria-labelledby="user-tasks-title" className="min-w-0 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line p-5"><div className="flex items-center justify-between gap-3"><h2 id="user-tasks-title" className="display break-words text-xl font-semibold">{selected ? `${selected.name}’s tasks` : 'User tasks'}</h2><span className="shrink-0 rounded-md bg-canvas px-2 py-1 text-[10px] font-semibold text-muted">Read only</span></div>{selected && <p className="mt-2 break-all text-xs text-muted">{selected.email}</p>}<p className="mt-4 text-xs text-muted">{loadingTasks ? 'Loading tasks…' : `${todos.length} tasks · ${todos.filter((task) => task.isCompleted).length} completed`}</p></div>
        <div aria-busy={loadingTasks}>
          {todos.map((task) => <article key={task.id} className="flex items-start gap-3 border-b border-line p-5 last:border-b-0"><span aria-hidden="true" className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-xs ${task.isCompleted ? 'border-blue bg-blue text-white' : 'border-slate-300'}`}>{task.isCompleted ? '✓' : ''}</span><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{task.title}</h3>{task.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{task.description}</p>}<p className="mt-3 text-[11px] text-muted">{task.isCompleted ? 'Completed' : 'Active'}</p></div></article>)}
          {!loadingTasks && todos.length === 0 && <div className="px-6 py-14 text-center"><p className="display text-lg font-semibold">{selected ? 'No tasks to show' : 'Choose an account'}</p><p className="mt-2 text-sm text-muted">{selected ? 'This person’s tasks will appear here.' : 'Select someone in the directory to view their tasks.'}</p></div>}
        </div>
      </section>
    </div>
  </main>;
}
