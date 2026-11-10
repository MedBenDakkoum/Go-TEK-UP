import type { ReactNode } from 'react';
import type { FormApi } from '../hooks';

/** Briques de formulaire accessibles, branchées sur le hook useForm. */
export function Form({ form, submit, pending = 'Envoi…', className = 'form', submitClass = 'btn btn-primary', children }: {
  form: FormApi; submit?: string; pending?: string; className?: string; submitClass?: string; children: ReactNode;
}) {
  return (
    <form onSubmit={form.handleSubmit} className={className} noValidate>
      {form.formError && <p role="alert" className="alert alert-error">{form.formError}</p>}
      {form.ok && <p role="status" className="alert alert-ok">{form.ok}</p>}
      {children}
      {submit && <button type="submit" className={submitClass} disabled={form.submitting}>{form.submitting ? pending : submit}</button>}
    </form>
  );
}

export function Field({ form, name, label, type = 'text', as, options, hint, required, maxLength, ...rest }: {
  form: FormApi; name: string; label: string; type?: string; as?: 'textarea' | 'select'; options?: readonly string[]; hint?: string;
  required?: boolean; maxLength?: number; [k: string]: unknown;
}) {
  const id = `f-${name}`;
  const err = form.errors[name];
  const value = form.values[name] ?? '';
  const describedBy = [hint && `${id}-hint`, err && `${id}-err`].filter(Boolean).join(' ') || undefined;
  const common = {
    id, name, required, value, maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>) => form.set(name, e.target.value),
    'aria-invalid': err ? ('true' as const) : undefined, 'aria-describedby': describedBy, ...rest,
  };
  const counter = maxLength && as !== 'select' && type !== 'password' && type !== 'datetime-local' && type !== 'number';
  return (
    <div className={`field${err ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      {as === 'textarea' ? <textarea rows={5} {...common} />
        : as === 'select' ? <select {...common}>{options!.map((o) => <option key={o}>{o}</option>)}</select>
        : <input type={type} {...common} />}
      <div className="field-foot">
        <div>
          {hint && <p id={`${id}-hint`} className="hint">{hint}</p>}
          {err && <p id={`${id}-err`} className="field-error">{err}</p>}
        </div>
        {counter && <span className={`counter${String(value).length >= maxLength! ? ' counter-max' : ''}`} aria-hidden="true">{String(value).length}/{maxLength}</span>}
      </div>
    </div>
  );
}

export function RatingField({ form }: { form: FormApi }) {
  const err = form.errors.rating;
  return (
    <fieldset className={`field rating${err ? ' has-error' : ''}`} aria-describedby={err ? 'rating-err' : undefined}>
      <legend>Note <span aria-hidden="true">*</span></legend>
      <div className="rating-options">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="rating-opt">
            <input type="radio" name="rating" value={n} checked={String(form.values.rating) === String(n)}
              onChange={() => form.set('rating', String(n))} aria-invalid={err ? 'true' : undefined} />
            <span>{n} ★</span>
          </label>
        ))}
      </div>
      {err && <p id="rating-err" className="field-error">{err}</p>}
    </fieldset>
  );
}
