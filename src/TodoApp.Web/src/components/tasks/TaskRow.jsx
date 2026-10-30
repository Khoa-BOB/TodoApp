import Icon from '../Icon.jsx';

export default function TaskRow({
  item,
  disabled,
  onToggle,
  onEdit,
  onDelete,
}) {
  return (
    <article className="task-row group flex items-start gap-4 border-b border-line p-5 last:border-b-0 sm:p-6">
      <button
        disabled={disabled}
        onClick={() => onToggle(item)}
        aria-label={`${item.isCompleted ? 'Reopen' : 'Complete'} ${item.title}`}
        aria-pressed={item.isCompleted}
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${item.isCompleted ? 'border-blue bg-blue text-white' : 'border-slate-300 hover:border-blue'}`}
      >
        {item.isCompleted && <Icon name="check" size={15} />}
      </button>
      <div className="min-w-0 flex-1">
        <h3
          className={`break-words text-sm font-semibold sm:text-base ${item.isCompleted ? 'text-muted line-through' : 'text-ink'}`}
        >
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">
            {item.description}
          </p>
        )}
        <p className="mt-3 text-[11px] text-muted">
          {item.isCompleted ? 'Completed' : 'Added'}{' '}
          {new Intl.DateTimeFormat('en', {
            month: 'short',
            day: 'numeric',
          }).format(new Date(item.completedAt || item.createdAt))}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
        <button
          disabled={disabled}
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.title}`}
          title="Edit task"
          className="icon-button"
        >
          <Icon name="edit" size={17} />
        </button>
        <button
          disabled={disabled}
          onClick={() => onDelete(item)}
          aria-label={`Delete ${item.title}`}
          title="Delete task"
          className="icon-button hover:!bg-red-50 hover:!text-red-700"
        >
          <Icon name="trash" size={17} />
        </button>
      </div>
    </article>
  );
}
