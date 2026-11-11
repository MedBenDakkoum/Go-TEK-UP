import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { FormApi } from '@/ui/hooks';
import { SubjectCombobox } from '@/ui/components/SubjectCombobox';

function Harness() {
  const [values, setValues] = useState<Record<string, string>>({ subject: 'Mathématiques' });
  const form = {
    values,
    errors: {},
    formError: '',
    ok: '',
    submitting: false,
    set: (name: string, value: unknown) => setValues((current) => ({ ...current, [name]: String(value) })),
    handleSubmit: async () => {},
  } as unknown as FormApi;
  return (
    <>
      <SubjectCombobox form={form} label="Matière" required />
      <output aria-label="valeur">{values.subject}</output>
    </>
  );
}

describe('sélecteur de matière', () => {
  it('filtre sans accent et sélectionne une suggestion au clavier', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Matière' });
    await user.type(input, 'algo');
    expect(screen.getAllByRole('option', { name: /Algorithmique/ }).length).toBeGreaterThan(0);
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('valeur')).toHaveTextContent('Algorithmique');
  });

  it('permet de saisir une matière personnalisée', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'Matière' });
    await user.type(input, 'Astrophysique');
    await user.click(screen.getByRole('option', { name: 'Utiliser « Astrophysique »' }));
    expect(screen.getByLabelText('valeur')).toHaveTextContent('Astrophysique');
  });
});
