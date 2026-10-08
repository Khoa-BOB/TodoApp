import { useEffect, useRef, useState } from 'react';
import { request } from './api.js';
import Admin from './Admin.jsx';

function Icon({ name, size = 20, ...props }) {
  const paths = {
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
    circle: <circle cx="12" cy="12" r="8" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    edit: <><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" /></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
    logout: <><path d="M9 4H4v16h5M9 12h12m-4-4 4 4-4 4" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" /><path d="m8 12 3 3 5-6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

function Brand({ light = false }) {
  return <div className={`flex items-center gap-3 ${light ? 'text-white' : 'text-ink'}`}><span className={`grid size-9 place-items-center rounded-xl ${light ? 'bg-white/15' : 'bg-blue text-white'}`}><Icon name="check" size={23} /></span><span className="display text-2xl font-bold tracking-tight">todo<span className={light ? 'text-lime' : 'text-blue'}>.</span></span></div>;
}

function TaskEditor({ item, busy, onSave, onClose }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} onClose={onClose} onCancel={(event) => { if (busy) event.preventDefault(); }} aria-labelledby="editor-title" className="w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-white p-7 text-ink shadow-2xl backdrop:bg-ink/40">
    <div className="mb-6 flex items-center justify-between"><h2 id="editor-title" className="display text-2xl font-bold">{item.id ? 'Edit task' : 'Make a little plan'}</h2><button type="button" aria-label="Close task editor" disabled={busy} onClick={onClose} className="icon-button"><Icon name="close" /></button></div>
    <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ title: data.get('title').trim(), description: data.get('description').trim() || null, isCompleted: item.isCompleted || false }); }} className="space-y-5">
      <label className="field-label">Task title<input name="title" autoFocus required maxLength={512} pattern=".*\S.*" defaultValue={item.title || ''} placeholder="What would you like to get done?" className="field" /></label>
      <label className="field-label">Description <span className="font-normal text-muted">(optional)</span><textarea name="description" maxLength={2048} defaultValue={item.description || ''} placeholder="Add a few details…" rows={4} className="field resize-y" /></label>
      <p role="alert" className="text-sm text-red-700">{item.error}</p>
      <div className="flex justify-end gap-3"><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : item.id ? 'Save changes' : 'Add task'}<Icon name="arrow" size={17} /></button></div>
    </form>
  </dialog>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [adminSite, setAdminSite] = useState(false);
  const [mode, setMode] = useState('login');
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('All tasks');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const loadController = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    request('/auth/me', { signal: controller.signal })
      .then((session) => { if (!controller.signal.aborted) setUser({ ...session.response, role: session.role }); })
      .catch((err) => { if (!controller.signal.aborted && err.status !== 401) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setInitializing(false); });
    return () => controller.abort();
  }, []);

  async function loadTodos() {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true); setLoadFailed(false); setError('');
    try {
      const items = await request('/todos/', { signal: controller.signal });
      if (!controller.signal.aborted) setTodos(items);
    }
    catch (err) { if (!controller.signal.aborted) { handleError(err); setLoadFailed(true); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }

  useEffect(() => {
    if (user) loadTodos();
    return () => loadController.current?.abort();
  }, [user]);

  function handleError(err) {
    setError(err.message);
    if (err.status === 401) { setUser(null); setTodos([]); setEditor(null); setAdminSite(false); setMode('login'); }
  }

  async function authenticate(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const credentials = { email: data.get('email').trim(), password: data.get('password') };
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signup') await request('/auth/signup', { method: 'POST', body: JSON.stringify({ ...credentials, name: data.get('name').trim() }) });
      const result = await request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
      setFilter('All tasks'); setSearch(''); setAdminSite(false); setUser({ ...result.response, role: result.role });
      setNotice(mode === 'signup' ? 'Your account is ready. Add your first task.' : 'Welcome back. Let’s get a little more done.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function saveTask(data) {
    setBusy(true); setError('');
    try {
      const saved = await request(editor.id ? `/todos/${editor.id}` : '/todos/', { method: editor.id ? 'PUT' : 'POST', body: JSON.stringify(data) });
      setTodos((items) => editor.id ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]);
      setNotice(editor.id ? 'Changes saved.' : 'Task added.'); setEditor(null);
    } catch (err) { if (err.status === 401) handleError(err); else setEditor((item) => ({ ...item, error: err.message })); }
    finally { setBusy(false); }
  }

  async function toggleTask(item) {
    setBusy(true); setError('');
    try {
      const saved = await request(`/todos/${item.id}`, { method: 'PUT', body: JSON.stringify({ title: item.title, description: item.description, isCompleted: !item.isCompleted }) });
      setTodos((items) => items.map((task) => task.id === saved.id ? saved : task));
      setNotice(saved.isCompleted ? 'Task completed. Nicely done.' : 'Task moved back to active.');
    } catch (err) { handleError(err); }
    finally { setBusy(false); }
  }

  async function deleteTask(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try { await request(`/todos/${item.id}`, { method: 'DELETE' }); setTodos((items) => items.filter((task) => task.id !== item.id)); setNotice('Task deleted.'); }
    catch (err) { handleError(err); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError('');
    try { await request('/auth/logout', { method: 'POST' }); setUser(null); setTodos([]); setAdminSite(false); setNotice('You’re signed out.'); }
    catch (err) { handleError(err); }
    finally { setBusy(false); }
  }

  const completed = todos.filter((item) => item.isCompleted).length;
  const active = todos.length - completed;
  const progress = todos.length ? Math.round(completed / todos.length * 100) : 0;
  const visible = todos.filter((item) => (filter === 'All tasks' || (filter === 'Completed' ? item.isCompleted : !item.isCompleted)) && `${item.title} ${item.description || ''}`.toLowerCase().includes(search.toLowerCase()));

  if (initializing) return <main className="grid min-h-dvh place-items-center bg-canvas text-muted"><p role="status">Opening your workspace…</p></main>;

  if (!user) return <main className="min-h-dvh lg:grid lg:grid-cols-2">
    <section className="auth-story relative flex flex-col overflow-hidden bg-blue px-8 py-9 text-white lg:min-h-dvh lg:px-14 lg:py-12">
      <Brand light />
      <div className="relative z-10 mx-auto my-auto w-full max-w-lg py-14 lg:py-20">
        <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em]"><span className="size-2 rounded-full bg-lime" /> A little more done</p>
        <h1 className="display text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">Big plans.<br />Small steps.<br /><span className="text-lime">Your space.</span></h1>
        <p className="mt-6 max-w-sm text-base leading-relaxed text-blue-100">Give your tasks a home. Keep the next step clear. Feel good about what you finish.</p>
        <div aria-hidden="true" className="preview-note mt-10 max-w-sm rounded-2xl bg-white p-5 text-ink shadow-xl">
          <div className="mb-4 flex items-center justify-between text-xs font-semibold"><span>ONE STEP AT A TIME</span><span className="text-muted">Your next chapter</span></div>
          <div className="flex items-center gap-3 border-b border-line py-3"><span className="grid size-6 place-items-center rounded-full bg-blue text-white"><Icon name="check" size={15} /></span><span className="text-sm text-muted line-through">Make a little plan</span></div>
          <div className="flex items-center gap-3 py-3"><span className="size-6 rounded-full border-2 border-blue/30" /><span className="text-sm font-medium">Turn a plan into progress</span></div>
        </div>
      </div>
      <p className="text-xs text-blue-100">Less in your head. More in your day.</p>
    </section>
    <section className="flex items-center justify-center bg-canvas px-6 py-16 lg:px-16">
      <div className="w-full max-w-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-blue">Your personal workspace</p>
        <h2 className="display text-3xl font-bold tracking-tight">{mode === 'signup' ? 'Start with a clean slate.' : 'Welcome back.'}</h2>
        <p className="mb-8 mt-3 text-sm leading-relaxed text-muted">{mode === 'signup' ? 'Create your account and make room for what matters.' : 'Sign in to pick up where you left off.'}</p>
        <form onSubmit={authenticate} className="space-y-5">
          {mode === 'signup' && <label className="field-label">Your name<input name="name" autoComplete="name" required maxLength={200} pattern=".*\S.*" placeholder="Alex Morgan" className="field" /></label>}
          <label className="field-label">{mode === 'signup' ? 'Email address' : 'Email or username'}<input name="email" type={mode === 'signup' ? 'email' : 'text'} autoComplete={mode === 'signup' ? 'email' : 'username'} required placeholder={mode === 'signup' ? 'you@example.com' : 'you@example.com or admin'} className="field" /></label>
          <label className="field-label">Password<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required placeholder={mode === 'signup' ? 'Choose a password' : 'Enter your password'} className="field" /></label>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="text-sm text-blue">{notice}</p>}
          <button disabled={busy} className="primary w-full justify-between py-3.5">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}<Icon name="arrow" size={18} /></button>
        </form>
        <p className="mt-7 text-center text-sm text-muted">{mode === 'signup' ? 'Already have an account?' : 'New here?'} <button disabled={busy} type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setNotice(''); }} className="font-semibold text-blue underline-offset-4 hover:underline">{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
      </div>
    </section>
  </main>;

  return <div className="min-h-dvh bg-canvas md:grid md:grid-cols-[240px_1fr]">
    <a href={adminSite ? '#admin' : '#tasks'} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
    <aside className="flex flex-col bg-blue px-6 py-6 text-white md:sticky md:top-0 md:h-dvh md:py-9">
      <Brand light />
      <p className="mb-3 mt-9 text-[10px] font-semibold uppercase tracking-[.2em] text-blue-200">Workspace</p>
      <nav aria-label="Task filters" className="grid grid-cols-3 gap-2 md:flex md:flex-col">
        {['All tasks', 'Active', 'Completed'].map((label, index) => <button key={label} onClick={() => { setFilter(label); setAdminSite(false); }} aria-current={!adminSite && filter === label ? 'page' : undefined} className={`flex items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs transition-colors sm:text-sm md:justify-start md:gap-3 md:px-3 ${!adminSite && filter === label ? 'bg-white text-blue shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}><Icon name={['list', 'circle', 'check'][index]} size={18} className="hidden sm:block" /><span className="whitespace-nowrap font-medium">{label}</span><span className={`ml-auto hidden rounded-md px-1.5 py-0.5 text-xs sm:block ${!adminSite && filter === label ? 'bg-blue/8' : 'bg-white/10'}`}>{[todos.length, active, completed][index]}</span></button>)}
      </nav>
      {user.role === 2 && <button onClick={() => setAdminSite(true)} aria-pressed={adminSite} className={`mt-5 flex items-center gap-3 rounded-xl border border-white/25 px-3 py-3 text-sm font-semibold ${adminSite ? 'bg-lime text-ink' : 'text-white hover:bg-white/10'}`}><Icon name="shield" size={18} /> Admin site <span className="ml-auto">↗</span></button>}
      <div className="mt-auto hidden pt-10 md:block"><div className="rounded-2xl border border-white/20 p-4"><span className="text-2xl text-lime">✳</span><p className="display mt-3 text-lg font-medium">Small steps count.</p><p className="mt-2 text-xs leading-relaxed text-blue-100">A finished task is a little more space for what’s next.</p></div></div>
      <div className="mt-6 flex items-center gap-3 border-t border-white/20 pt-5"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-lime text-sm font-bold text-ink">{user.name?.slice(0, 1).toUpperCase() || 'U'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-[11px] text-blue-200">{user.email}</p></div><button disabled={busy} onClick={logout} aria-label="Sign out" title="Sign out" className="rounded-lg p-2 hover:bg-white/10"><Icon name="logout" size={18} /></button></div>
    </aside>
    {adminSite && user.role === 2 ? <Admin onBack={() => setAdminSite(false)} onError={(err) => { handleError(err); if (err.status === 403) { setAdminSite(false); setUser((current) => current && ({ ...current, role: 1 })); } }} /> : <main id="tasks" className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-10 lg:px-14 lg:py-12">
      <div className="mb-10 flex items-center justify-between border-b border-line pb-5"><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">Personal workspace <span className="mx-2 text-line">/</span> <span className="text-ink">My tasks</span></p><span className="hidden text-xs text-muted sm:block">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', weekday: 'long' }).format(new Date())}</span></div>
      <header className="flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-sm text-muted">Let’s make room for progress, {user.name?.split(' ')[0]}.</p><h1 className="display text-4xl font-semibold tracking-tight sm:text-5xl">A little more done<span className="text-blue">.</span></h1><p className="mt-3 text-sm text-muted">Your plans, in one place. One task at a time.</p></div><button className="primary" disabled={busy || loading || loadFailed} onClick={() => setEditor({})}><Icon name="plus" size={18} /> Add task</button></header>
      <section aria-label="Task progress" className="my-9 grid grid-cols-3 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="p-5 sm:p-6"><p className="text-xs text-muted">On your list</p><p className="display mt-2 text-3xl font-semibold">{todos.length.toString().padStart(2, '0')}</p></div><div className="border-x border-line p-5 sm:p-6"><p className="text-xs text-muted">Still to do</p><p className="display mt-2 text-3xl font-semibold text-blue">{active.toString().padStart(2, '0')}</p></div><div className="p-5 sm:p-6"><div className="flex items-center justify-between"><p className="text-xs text-muted">Completed</p><span className="hidden text-xs font-semibold text-blue sm:block">{progress}%</span></div><p className="display mt-2 text-3xl font-semibold">{completed.toString().padStart(2, '0')}</p><progress aria-label="Tasks completed" value={completed} max={todos.length || 1} className="mt-3 h-1.5 w-full" /></div>
      </section>
      {error && <div role="alert" className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"><span>{error}</span>{loadFailed && <button onClick={loadTodos} disabled={loading} className="font-semibold underline">Try again</button>}</div>}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><h2 className="display text-xl font-semibold">{filter}</h2><span className="rounded-lg border border-line bg-white px-2 py-0.5 text-xs text-muted">{visible.length}</span></div><label className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-muted"><Icon name="search" size={17} /><input aria-label="Search tasks" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a task…" className="w-40 bg-transparent text-sm text-ink outline-none sm:w-48" /></label></div>
      <div role="status" aria-live="polite" className="mb-3 min-h-5 text-xs text-muted">{loading ? 'Loading your tasks…' : notice}</div>
      <div className="overflow-hidden rounded-2xl border border-line bg-white" aria-busy={loading}>
        {visible.map((item) => <article key={item.id} className="task-row group flex items-start gap-4 border-b border-line p-5 last:border-b-0 sm:p-6">
          <button disabled={busy || loading} onClick={() => toggleTask(item)} aria-label={`${item.isCompleted ? 'Reopen' : 'Complete'} ${item.title}`} aria-pressed={item.isCompleted} className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${item.isCompleted ? 'border-blue bg-blue text-white' : 'border-slate-300 hover:border-blue'}`}>{item.isCompleted && <Icon name="check" size={15} />}</button>
          <div className="min-w-0 flex-1"><h3 className={`break-words text-sm font-semibold sm:text-base ${item.isCompleted ? 'text-muted line-through' : 'text-ink'}`}>{item.title}</h3>{item.description && <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{item.description}</p>}<p className="mt-3 text-[11px] text-muted">{item.isCompleted ? 'Completed' : 'Added'} {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(item.completedAt || item.createdAt))}</p></div>
          <div className="flex shrink-0 flex-col gap-1 sm:flex-row"><button disabled={busy || loading} onClick={() => setEditor(item)} aria-label={`Edit ${item.title}`} title="Edit task" className="icon-button"><Icon name="edit" size={17} /></button><button disabled={busy || loading} onClick={() => deleteTask(item)} aria-label={`Delete ${item.title}`} title="Delete task" className="icon-button hover:!bg-red-50 hover:!text-red-700"><Icon name="trash" size={17} /></button></div>
        </article>)}
        {!loading && !loadFailed && visible.length === 0 && <div className="px-6 py-16 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-blue/8 text-blue"><Icon name={search ? 'search' : filter === 'Completed' ? 'check' : 'list'} size={25} /></span><h3 className="display mt-5 text-xl font-semibold">{search ? 'No matching tasks' : filter === 'Completed' ? 'Your wins will live here' : filter === 'Active' && todos.length ? 'All caught up.' : 'A clear space. A fresh start.'}</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">{search ? 'Try a different word or clear your search.' : filter === 'Completed' ? 'Complete a task to see your progress here.' : 'Add a task to give your next step a home.'}</p>{!search && filter !== 'Completed' && <button disabled={busy} onClick={() => setEditor({})} className="secondary mx-auto mt-6"><Icon name="plus" size={17} /> Add your first task</button>}</div>}
      </div>
      <footer className="mt-8 flex items-center justify-between text-[11px] text-muted"><span>A little progress is still progress.</span><span className="display font-semibold">todo.</span></footer>
    </main>}
    {editor && <TaskEditor item={editor} busy={busy} onSave={saveTask} onClose={() => setEditor(null)} />}
  </div>;
}
