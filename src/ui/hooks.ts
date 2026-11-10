'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from './api';
import { useRealtimeEvent } from './providers/realtime';
import { useToast } from './providers/toast';
import { validate, type Schema } from './validation';

/** Charge une ressource : { data, error, loading, reload }. `reload` recharge sans repasser par l'écran de chargement. */
export function useFetch<T = any>(path: string, { interval }: { interval?: number } = {}) {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean }>({ data: null, error: null, loading: true });
  const load = useCallback(async () => {
    try {
      const data = await api<T>(path);
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ data: interval ? s.data : null, error: e as ApiError, loading: false }));
    }
  }, [path, interval]);
  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load();
  }, [load]);
  useEffect(() => {
    if (!interval) return undefined;
    const t = setInterval(load, interval);
    return () => clearInterval(t);
  }, [load, interval]);
  return { ...state, reload: load };
}

export interface FormApi<V extends Record<string, any> = Record<string, any>> {
  values: V; errors: Record<string, string | undefined>; formError: string; ok: string; submitting: boolean;
  set(name: string, value: unknown): void;
  handleSubmit(ev: FormEvent<HTMLFormElement>): Promise<void>;
}

/**
 * Formulaire : valeurs, validation client (schéma), erreurs serveur par champ, état d'envoi.
 * onSubmit(values) retourne un message de succès (facultatif, affiché en toast) ou lève ApiError.
 */
export function useForm<V extends Record<string, any>>({ initial, schema, onSubmit, resetOnSuccess = false }: {
  initial: V; schema?: Schema; onSubmit: (values: V) => Promise<string | void>; resetOnSuccess?: boolean;
}): FormApi<V> {
  const toast = useToast();
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState('');
  const [ok, setOk] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (name: string, value: unknown) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  const handleSubmit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const formEl = ev.currentTarget;
    setFormError(''); setOk('');
    const clientErrors = schema ? validate(schema, values) : {};
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setFormError('Veuillez corriger les champs signalés.');
      setTimeout(() => (formEl.querySelector?.('[aria-invalid="true"]') as HTMLElement | null)?.focus(), 0);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const msg = await onSubmit(values);
      if (msg) { setOk(msg); toast(msg); }
      if (resetOnSuccess) setValues(initial);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.errors || {});
        setFormError(Object.keys(e.errors || {}).length ? 'Veuillez corriger les champs signalés.' : e.message);
      } else throw e;
    } finally {
      setSubmitting(false);
    }
  };
  return { values, errors, formError, ok, submitting, set, handleSubmit };
}

/** Action ponctuelle (bouton) : état d'attente, message d'erreur et toast de succès. */
export function useAction<A extends unknown[]>(fn: (...args: A) => Promise<unknown>, successMessage?: string) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const run = async (...args: A) => {
    setPending(true); setError('');
    try {
      await fn(...args);
      if (successMessage) toast(successMessage);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message); else throw e;
    } finally {
      setPending(false);
    }
  };
  return { run, pending, error };
}

/** Recharge une ressource dès qu'une notification temps réel concerne ce lien (ex. « /requests/7 »), ou toute notification si link est omis. */
export function useLiveReload(reload: () => void, link?: string) {
  useRealtimeEvent('notification', (n) => { if (!link || n.link === link) reload(); });
}
