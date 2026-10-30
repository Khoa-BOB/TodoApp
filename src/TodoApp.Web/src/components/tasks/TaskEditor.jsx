import { useEffect, useRef } from 'react';
import Icon from '../Icon.jsx';

export default function TaskEditor({ item, busy, onSave, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      aria-labelledby="editor-title"
      className="w-[calc(100%-2rem)] max-w-lg rounded-3xl bg-white p-7 text-ink shadow-2xl backdrop:bg-ink/40"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 id="editor-title" className="display text-2xl font-bold">
          {item.id ? 'Edit task' : 'Make a little plan'}
        </h2>
        <button
          type="button"
          aria-label="Close task editor"
          disabled={busy}
          onClick={onClose}
          className="icon-button"
        >
          <Icon name="close" />
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onSave({
            title: data.get('title').trim(),
            description: data.get('description').trim() || null,
            isCompleted: item.isCompleted || false,
          });
        }}
        className="space-y-5"
      >
        <label className="field-label">
          Task title
          <input
            name="title"
            autoFocus
            required
            maxLength={512}
            pattern=".*\S.*"
            defaultValue={item.title || ''}
            placeholder="What would you like to get done?"
            className="field"
          />
        </label>
        <label className="field-label">
          Description <span className="font-normal text-muted">(optional)</span>
          <textarea
            name="description"
            maxLength={2048}
            defaultValue={item.description || ''}
            placeholder="Add a few details…"
            rows={4}
            className="field resize-y"
          />
        </label>
        <p role="alert" className="text-sm text-red-700">
          {item.error}
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? 'Saving…' : item.id ? 'Save changes' : 'Add task'}
            <Icon name="arrow" size={17} />
          </button>
        </div>
      </form>
    </dialog>
  );
}
