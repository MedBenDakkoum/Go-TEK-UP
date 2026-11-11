'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeSubject, searchSubjects, SUBJECTS } from '@/domain/subjects';
import type { FormApi } from '../hooks';

/**
 * Sélecteur de matière avec autocomplétion accessible (combobox ARIA).
 * La valeur reste une chaîne : une matière du catalogue ou une saisie libre.
 */
export function SubjectCombobox({
  form,
  name = 'subject',
  label,
  options = SUBJECTS,
  required,
  allowCustom = true,
}: {
  form: FormApi;
  name?: string;
  label: string;
  options?: readonly string[];
  required?: boolean;
  allowCustom?: boolean;
}) {
  const id = `f-${name}`;
  const listId = `${id}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const value = String(form.values[name] ?? '');
  const err = form.errors[name];
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const matches = useMemo(() => searchSubjects(query, options), [query, options]);
  const trimmed = query.trim();
  const hasExactMatch = matches.some((subject) => normalizeSubject(subject) === normalizeSubject(trimmed));
  const customIndex = allowCustom && trimmed.length > 0 && !hasExactMatch ? matches.length : -1;
  const itemCount = matches.length + (customIndex >= 0 ? 1 : 0);

  const optionId = (index: number) => `${listId}-${index}`;

  const select = (subject: string) => {
    form.set(name, subject);
    setQuery(subject);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  };

  const selectCustom = () => {
    if (customIndex >= 0) select(trimmed);
  };

  const onChange = (next: string) => {
    setQuery(next);
    form.set(name, next);
    setOpen(true);
    const nextMatches = searchSubjects(next, options);
    const nextTrimmed = next.trim();
    const exact = nextMatches.some((subject) => normalizeSubject(subject) === normalizeSubject(nextTrimmed));
    const hasCustom = allowCustom && nextTrimmed.length > 0 && !exact;
    setActive(nextMatches.length > 0 || hasCustom ? 0 : -1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(itemCount > 0 ? 0 : -1);
      } else {
        setActive((current) => (itemCount > 0 ? (current + 1) % itemCount : -1));
      }
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(itemCount > 0 ? itemCount - 1 : -1);
      } else {
        setActive((current) => (itemCount > 0 ? (current <= 0 ? itemCount - 1 : current - 1) : -1));
      }
      return;
    }
    if (event.key === 'Enter') {
      if (open && active >= 0 && active < itemCount) {
        event.preventDefault();
        if (active < matches.length) select(matches[active]);
        else selectCustom();
      } else if (open && customIndex >= 0) {
        event.preventDefault();
        selectCustom();
      } else if (open) {
        setOpen(false);
      }
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      setActive(-1);
    }
  };

  const describedBy = err ? `${id}-err` : undefined;

  return (
    <div className={`field${err ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="combobox">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          required={required}
          value={query}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => {
            event.currentTarget.select();
            setOpen(true);
            setActive(matches.length > 0 || customIndex >= 0 ? 0 : -1);
          }}
          onBlur={() => { setOpen(false); setActive(-1); }}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          aria-invalid={err ? 'true' : undefined}
          aria-describedby={describedBy}
        />
        {open && (
          <ul id={listId} className="combobox-list" role="listbox" aria-label={`Suggestions pour ${label.toLowerCase()}`}>
            {matches.map((subject, index) => (
              <li
                key={subject}
                id={optionId(index)}
                role="option"
                aria-selected={active === index}
                className={`combobox-option${active === index ? ' active' : ''}`}
                onMouseDown={(event) => { event.preventDefault(); select(subject); }}
                onMouseEnter={() => setActive(index)}
              >
                {subject}
              </li>
            ))}
            {customIndex >= 0 && (
              <li
                id={optionId(customIndex)}
                role="option"
                aria-selected={active === customIndex}
                className={`combobox-option combobox-custom${active === customIndex ? ' active' : ''}`}
                onMouseDown={(event) => { event.preventDefault(); selectCustom(); }}
                onMouseEnter={() => setActive(customIndex)}
              >
                Utiliser « {trimmed} »
              </li>
            )}
            {itemCount === 0 && (
              <li className="combobox-empty" role="presentation">
                {allowCustom ? 'Saisissez une matière personnalisée.' : 'Aucune matière ne correspond.'}
              </li>
            )}
          </ul>
        )}
      </div>
      {err && <p id={`${id}-err`} className="field-error">{err}</p>}
    </div>
  );
}
