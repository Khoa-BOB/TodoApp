import Icon from './Icon.jsx';

export default function Brand({ light = false }) {
  return (
    <div
      className={`flex items-center gap-3 ${light ? 'text-white' : 'text-ink'}`}
    >
      <span
        className={`grid size-9 place-items-center rounded-xl ${light ? 'bg-white/15' : 'bg-blue text-white'}`}
      >
        <Icon name="check" size={23} />
      </span>
      <span className="display text-2xl font-bold tracking-tight">
        todo<span className={light ? 'text-lime' : 'text-blue'}>.</span>
      </span>
    </div>
  );
}
