import Brand from '../Brand.jsx';
import Icon from '../Icon.jsx';

export default function AuthScreen({
  mode,
  busy,
  error,
  notice,
  onSubmit,
  onModeChange,
}) {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <section className="auth-story relative flex flex-col overflow-hidden bg-blue px-8 py-9 text-white lg:min-h-dvh lg:px-14 lg:py-12">
        <Brand light />
        <div className="relative z-10 mx-auto my-auto w-full max-w-lg py-14 lg:py-20">
          <p className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em]">
            <span className="size-2 rounded-full bg-lime" /> A little more done
          </p>
          <h1 className="display text-5xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Big plans.
            <br />
            Small steps.
            <br />
            <span className="text-lime">Your space.</span>
          </h1>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-blue-100">
            Give your tasks a home. Keep the next step clear. Feel good about
            what you finish.
          </p>
          <div
            aria-hidden="true"
            className="preview-note mt-10 max-w-sm rounded-2xl bg-white p-5 text-ink shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between text-xs font-semibold">
              <span>ONE STEP AT A TIME</span>
              <span className="text-muted">Your next chapter</span>
            </div>
            <div className="flex items-center gap-3 border-b border-line py-3">
              <span className="grid size-6 place-items-center rounded-full bg-blue text-white">
                <Icon name="check" size={15} />
              </span>
              <span className="text-sm text-muted line-through">
                Make a little plan
              </span>
            </div>
            <div className="flex items-center gap-3 py-3">
              <span className="size-6 rounded-full border-2 border-blue/30" />
              <span className="text-sm font-medium">
                Turn a plan into progress
              </span>
            </div>
          </div>
        </div>
        <p className="text-xs text-blue-100">
          Less in your head. More in your day.
        </p>
      </section>
      <section className="flex items-center justify-center bg-canvas px-6 py-16 lg:px-16">
        <div className="w-full max-w-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-blue">
            Your personal workspace
          </p>
          <h2 className="display text-3xl font-bold tracking-tight">
            {mode === 'signup' ? 'Start with a clean slate.' : 'Welcome back.'}
          </h2>
          <p className="mb-8 mt-3 text-sm leading-relaxed text-muted">
            {mode === 'signup'
              ? 'Create your account and make room for what matters.'
              : 'Sign in to pick up where you left off.'}
          </p>
          <form onSubmit={onSubmit} className="space-y-5">
            {mode === 'signup' && (
              <label className="field-label">
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={200}
                  pattern=".*\S.*"
                  placeholder="Alex Morgan"
                  className="field"
                />
              </label>
            )}
            <label className="field-label">
              {mode === 'signup' ? 'Email address' : 'Email or username'}
              <input
                name="email"
                type={mode === 'signup' ? 'email' : 'text'}
                autoComplete={mode === 'signup' ? 'email' : 'username'}
                required
                placeholder={
                  mode === 'signup'
                    ? 'you@example.com'
                    : 'you@example.com or admin'
                }
                className="field"
              />
            </label>
            <label className="field-label">
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  mode === 'signup' ? 'new-password' : 'current-password'
                }
                required
                placeholder={
                  mode === 'signup'
                    ? 'Choose a password'
                    : 'Enter your password'
                }
                className="field"
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-sm text-blue">
                {notice}
              </p>
            )}
            <button
              disabled={busy}
              className="primary w-full justify-between py-3.5"
            >
              {busy
                ? 'Please wait…'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Sign in'}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <p className="mt-7 text-center text-sm text-muted">
            {mode === 'signup' ? 'Already have an account?' : 'New here?'}{' '}
            <button
              disabled={busy}
              type="button"
              onClick={() =>
                onModeChange(mode === 'signup' ? 'login' : 'signup')
              }
              className="font-semibold text-blue underline-offset-4 hover:underline"
            >
              {mode === 'signup' ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
