import { useEffect, useRef, useState } from 'react';
import { request } from './api.js';
import Admin from './Admin.jsx';
import AuthScreen from './components/auth/AuthScreen.jsx';
import Sidebar from './components/Sidebar.jsx';
import TaskEditor from './components/tasks/TaskEditor.jsx';
import TaskWorkspace from './components/tasks/TaskWorkspace.jsx';

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
      .then((session) => {
        if (!controller.signal.aborted)
          setUser({ ...session.response, role: session.role });
      })
      .catch((err) => {
        if (!controller.signal.aborted && err.status !== 401)
          setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setInitializing(false);
      });
    return () => controller.abort();
  }, []);

  async function loadTodos() {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setLoadFailed(false);
    setError('');
    try {
      const items = await request('/todos/', { signal: controller.signal });
      if (!controller.signal.aborted) setTodos(items);
    } catch (err) {
      if (!controller.signal.aborted) {
        handleError(err);
        setLoadFailed(true);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    if (user) loadTodos();
    return () => loadController.current?.abort();
  }, [user]);

  function handleError(err) {
    setError(err.message);
    if (err.status === 401) {
      setUser(null);
      setTodos([]);
      setEditor(null);
      setAdminSite(false);
      setMode('login');
    }
  }

  async function authenticate(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const credentials = {
      email: data.get('email').trim(),
      password: data.get('password'),
    };
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'signup')
        await request('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            ...credentials,
            name: data.get('name').trim(),
          }),
        });
      const result = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      setFilter('All tasks');
      setSearch('');
      setAdminSite(false);
      setUser({ ...result.response, role: result.role });
      setNotice(
        mode === 'signup'
          ? 'Your account is ready. Add your first task.'
          : 'Welcome back. Let’s get a little more done.',
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveTask(data) {
    setBusy(true);
    setError('');
    try {
      const saved = await request(
        editor.id ? `/todos/${editor.id}` : '/todos/',
        { method: editor.id ? 'PUT' : 'POST', body: JSON.stringify(data) },
      );
      setTodos((items) =>
        editor.id
          ? items.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...items],
      );
      setNotice(editor.id ? 'Changes saved.' : 'Task added.');
      setEditor(null);
    } catch (err) {
      if (err.status === 401) handleError(err);
      else setEditor((item) => ({ ...item, error: err.message }));
    } finally {
      setBusy(false);
    }
  }

  async function toggleTask(item) {
    setBusy(true);
    setError('');
    try {
      const saved = await request(`/todos/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          isCompleted: !item.isCompleted,
        }),
      });
      setTodos((items) =>
        items.map((task) => (task.id === saved.id ? saved : task)),
      );
      setNotice(
        saved.isCompleted
          ? 'Task completed. Nicely done.'
          : 'Task moved back to active.',
      );
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function deleteTask(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`))
      return;
    setBusy(true);
    setError('');
    try {
      await request(`/todos/${item.id}`, { method: 'DELETE' });
      setTodos((items) => items.filter((task) => task.id !== item.id));
      setNotice('Task deleted.');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError('');
    try {
      await request('/auth/logout', { method: 'POST' });
      setUser(null);
      setTodos([]);
      setAdminSite(false);
      setNotice('You’re signed out.');
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  if (initializing)
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas text-muted">
        <p role="status">Opening your workspace…</p>
      </main>
    );

  if (!user)
    return (
      <AuthScreen
        mode={mode}
        busy={busy}
        error={error}
        notice={notice}
        onSubmit={authenticate}
        onModeChange={(nextMode) => {
          setMode(nextMode);
          setError('');
          setNotice('');
        }}
      />
    );

  return (
    <div className="min-h-dvh bg-canvas md:grid md:grid-cols-[240px_1fr]">
      <a
        href={adminSite ? '#admin' : '#tasks'}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <Sidebar
        user={user}
        todos={todos}
        filter={filter}
        adminSite={adminSite}
        busy={busy}
        onFilterChange={(label) => {
          setFilter(label);
          setAdminSite(false);
        }}
        onAdminSwitch={() => setAdminSite(true)}
        onLogout={logout}
      />
      {adminSite && user.role === 2 ? (
        <Admin
          onBack={() => setAdminSite(false)}
          onError={(err) => {
            handleError(err);
            if (err.status === 403) {
              setAdminSite(false);
              setUser((current) => current && { ...current, role: 1 });
            }
          }}
        />
      ) : (
        <TaskWorkspace
          user={user}
          todos={todos}
          filter={filter}
          search={search}
          busy={busy}
          loading={loading}
          loadFailed={loadFailed}
          error={error}
          notice={notice}
          onSearchChange={setSearch}
          onAdd={() => setEditor({})}
          onEdit={setEditor}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onRetry={loadTodos}
        />
      )}
      {editor && (
        <TaskEditor
          item={editor}
          busy={busy}
          onSave={saveTask}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
