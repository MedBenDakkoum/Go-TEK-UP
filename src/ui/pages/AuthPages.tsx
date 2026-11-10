'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { LEVELS } from '@/domain/constants';
import { api, ApiError } from '../api';
import { Field, Form } from '../components/forms';
import { useAction, useForm } from '../hooks';
import { useAuth } from '../providers/auth';
import { schemas } from '../validation';

/** Redirection après connexion : uniquement vers une page de l'application (jamais vers un site externe). */
const safeFrom = (from?: string) => (from && from.startsWith('/') && !from.startsWith('//') ? from : undefined);

export function Login({ from }: { from?: string }) {
  const { login } = useAuth();
  const router = useRouter();
  const [unverified, setUnverified] = useState('');
  const form = useForm({
    initial: { email: '', password: '' },
    schema: schemas.login,
    onSubmit: async (v) => {
      setUnverified('');
      try {
        const u = await login(v);
        router.replace(safeFrom(from) || (u.role === 'admin' ? '/admin' : '/dashboard'));
        router.refresh();
      } catch (e) {
        if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') setUnverified(v.email.trim());
        throw e;
      }
    },
  });
  const resend = useAction(async () => { await api('/auth/resend-verification', { method: 'POST', body: { email: unverified } }); }, 'Un nouveau lien vient d’être envoyé (si le compte existe).');
  return (
    <div className="narrow">
      <h1>Connexion</h1>
      <Form form={form} submit="Se connecter" pending="Connexion…">
        <Field form={form} name="email" label="Adresse e-mail" type="email" required autoComplete="email" />
        <Field form={form} name="password" label="Mot de passe" type="password" required autoComplete="current-password" />
      </Form>
      {unverified && (
        <div className="alert">
          <MailCheck size={20} aria-hidden="true" />
          <span>Vous n’avez pas reçu l’e-mail de confirmation ?{' '}
            <button type="button" className="linklike" disabled={resend.pending} onClick={() => resend.run()}>Renvoyer le lien</button></span>
        </div>
      )}
      <p className="muted"><Link href="/forgot-password">Mot de passe oublié ?</Link></p>
      <p className="muted">Pas encore de compte ? <Link href="/register">Inscrivez-vous</Link>.</p>

    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState('');
  const form = useForm({
    initial: { name: '', email: '', password: '', confirm: '', speciality: '', level: 'ING1', skills: '' },
    schema: schemas.register,
    onSubmit: async (v) => {
      const r = await register(v);
      if (r.pendingVerification) setPending(r.email ?? v.email);
      else { router.replace('/dashboard'); router.refresh(); }
    },
  });
  const resend = useAction(async () => { await api('/auth/resend-verification', { method: 'POST', body: { email: pending } }); }, 'Un nouveau lien vient d’être envoyé.');
  if (pending) {
    return (
      <div className="narrow">
        <h1>Vérifiez votre boîte mail</h1>
        <div className="alert alert-ok" role="status">
          <MailCheck size={24} aria-hidden="true" />
          <span>Un e-mail de confirmation vient d’être envoyé à <strong>{pending}</strong>. Cliquez sur le lien (valable 24 heures) pour activer votre compte, puis connectez-vous.</span>
        </div>
        <p className="muted">Rien reçu ? Regardez dans les courriers indésirables, ou{' '}
          <button type="button" className="linklike" disabled={resend.pending} onClick={() => resend.run()}>renvoyez le lien</button>.</p>
        <p><Link href="/login">Aller à la connexion</Link></p>
      </div>
    );
  }
  return (
    <div className="narrow">
      <h1>Créer mon compte</h1>
      <p className="muted">Inscription réservée aux étudiants de l’école : utilisez votre adresse e-mail institutionnelle.</p>
      <Form form={form} submit="S’inscrire" pending="Création…">
        <Field form={form} name="name" label="Nom complet" required maxLength={60} autoComplete="name" />
        <Field form={form} name="email" label="Adresse e-mail de l’école" type="email" required maxLength={120} autoComplete="email" />
        <Field form={form} name="password" label="Mot de passe" type="password" required autoComplete="new-password"
          hint="8 caractères minimum, avec au moins une lettre et un chiffre." />
        <Field form={form} name="confirm" label="Confirmer le mot de passe" type="password" required autoComplete="new-password" />
        <Field form={form} name="speciality" label="Spécialité" required maxLength={60} hint="Ex. : Informatique, Télécommunications…" />
        <Field form={form} name="level" label="Niveau" as="select" options={LEVELS} required />
        <Field form={form} name="skills" label="Compétences" maxLength={200}
          hint="Séparées par des virgules (ex. : React, SQL, algèbre). Elles servent aux recommandations." />
      </Form>
      <p className="muted">Déjà inscrit ? <Link href="/login">Connectez-vous</Link>.</p>
    </div>
  );
}

/** Le lien reçu par e-mail ouvre cette page ; la confirmation se fait par un clic (évite qu'un antivirus de messagerie consomme le lien). */
export function VerifyEmail({ token = '' }: { token?: string }) {
  const [done, setDone] = useState(false);
  const verify = useAction(async () => { await api('/auth/verify-email', { method: 'POST', body: { token } }); setDone(true); }, 'Adresse e-mail confirmée.');
  if (!token) return <div className="narrow"><p role="alert" className="alert alert-error">Lien invalide. <Link href="/login">Retour à la connexion</Link>.</p></div>;
  return (
    <div className="narrow">
      <h1>Confirmation de l’adresse e-mail</h1>
      {done ? (
        <>
          <p role="status" className="alert alert-ok">Votre adresse est confirmée : votre compte est actif.</p>
          <Link className="btn btn-primary" href="/login">Se connecter</Link>
        </>
      ) : (
        <>
          {verify.error && <p role="alert" className="alert alert-error">{verify.error} <Link href="/login">Demander un nouveau lien depuis la page de connexion</Link>.</p>}
          <button className="btn btn-primary" disabled={verify.pending} onClick={() => verify.run()}>{verify.pending ? 'Confirmation…' : 'Confirmer mon adresse e-mail'}</button>
        </>
      )}
    </div>
  );
}

export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const form = useForm({
    initial: { email: '' },
    schema: schemas.forgot,
    onSubmit: async (v) => { await api('/auth/forgot', { method: 'POST', body: v }); setSent(true); },
  });
  return (
    <div className="narrow">
      <h1>Mot de passe oublié</h1>
      {sent ? (
        <p role="status" className="alert alert-ok">
          Si un compte existe pour cette adresse, un e-mail contenant un lien de réinitialisation (valable 1 heure) vient d’être envoyé.
        </p>
      ) : (
        <Form form={form} submit="Envoyer le lien" pending="Envoi…">
          <Field form={form} name="email" label="Adresse e-mail" type="email" required autoComplete="email" />
        </Form>
      )}
      <p><Link href="/login">Retour à la connexion</Link></p>
    </div>
  );
}

export function ResetPassword({ token = '' }: { token?: string }) {
  const router = useRouter();
  const form = useForm({
    initial: { password: '', confirm: '' },
    schema: schemas.reset,
    onSubmit: async (v) => {
      await api('/auth/reset', { method: 'POST', body: { token, ...v } });
      router.replace('/login');
      return 'Mot de passe modifié : vous pouvez vous connecter.';
    },
  });
  if (!token) return <div className="narrow"><p role="alert" className="alert alert-error">Lien invalide. <Link href="/forgot-password">Refaire une demande</Link>.</p></div>;
  return (
    <div className="narrow">
      <h1>Nouveau mot de passe</h1>
      <Form form={form} submit="Enregistrer" pending="Enregistrement…">
        <Field form={form} name="password" label="Nouveau mot de passe" type="password" required autoComplete="new-password"
          hint="8 caractères minimum, avec au moins une lettre et un chiffre." />
        <Field form={form} name="confirm" label="Confirmer le mot de passe" type="password" required autoComplete="new-password" />
      </Form>
    </div>
  );
}
