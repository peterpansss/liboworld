/**
 * Tests for src/components/admin/FormField.tsx.
 *
 * Pins the label/input association behaviour added to fix the a11y bug
 * where `<label>` had no `htmlFor` and the input had no `id`. After the
 * fix, `getByLabelText(...)` should resolve to the underlying input
 * without consumers having to wire ids manually.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field, TextInput, TextArea, Select, Button } from '../../../src/components/admin/FormField';

void React;

describe('Field — label/input association (a11y)', () => {
  it('auto-wires htmlFor + id so getByLabelText resolves to the input', () => {
    render(
      <Field label="Email">
        <TextInput type="email" defaultValue="" />
      </Field>,
    );

    // Both queries must hit the SAME element — proving the label-input
    // relationship is plumbed correctly.
    const byLabel = screen.getByLabelText('Email');
    const byRole = screen.getByRole('textbox', { name: 'Email' });
    expect(byLabel).toBe(byRole);
    expect(byLabel.tagName).toBe('INPUT');
  });

  it('clicking the label focuses the input', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Email">
        <TextInput type="email" defaultValue="" />
      </Field>,
    );

    const label = screen.getByText('Email');
    const input = screen.getByLabelText('Email');
    expect(input).not.toHaveFocus();
    // userEvent simulates the real browser semantics: clicking a label
    // with htmlFor moves focus to the associated control. fireEvent.click
    // doesn't (jsdom plumbs that through pointer events, not click).
    await user.click(label);
    expect(input).toHaveFocus();
  });

  it('respects an id passed on the Field (consumer-controlled)', () => {
    render(
      <Field id="my-custom-id" label="Name">
        <TextInput defaultValue="" />
      </Field>,
    );
    const input = screen.getByLabelText('Name');
    expect(input.id).toBe('my-custom-id');
  });

  it('respects an id already set on the child input (does not overwrite)', () => {
    render(
      <Field label="Code">
        <TextInput id="otp-code" defaultValue="" />
      </Field>,
    );
    const input = screen.getByLabelText('Code');
    expect(input.id).toBe('otp-code');
  });

  it('works for TextArea', () => {
    render(
      <Field label="Bio">
        <TextArea defaultValue="" />
      </Field>,
    );
    const ta = screen.getByLabelText('Bio');
    expect(ta.tagName).toBe('TEXTAREA');
  });

  it('works for Select', () => {
    render(
      <Field label="Tier">
        <Select defaultValue="b">
          <option value="a">A</option>
          <option value="b">B</option>
        </Select>
      </Field>,
    );
    const sel = screen.getByLabelText('Tier');
    expect(sel.tagName).toBe('SELECT');
  });

  it('does not wire htmlFor when no label is provided', () => {
    const { container } = render(
      <Field>
        <TextInput defaultValue="" />
      </Field>,
    );
    expect(container.querySelector('label')).toBeNull();
  });

  it('omits htmlFor on the label when no usable id can be derived (non-element child)', () => {
    // Pure text child — there is nothing to clone an id onto, but the
    // label must still render the visible text.
    render(<Field label="Plain">just some text</Field>);
    expect(screen.getByText('Plain')).toBeInTheDocument();
    expect(screen.getByText('just some text')).toBeInTheDocument();
  });
});

describe('Field — label/error/hint precedence (preserved)', () => {
  it('renders the hint when no error is present', () => {
    render(
      <Field label="A" hint="Helper text">
        <TextInput defaultValue="" />
      </Field>,
    );
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('hides the hint when an error is present', () => {
    render(
      <Field label="A" hint="Helper text" error="Bad input">
        <TextInput defaultValue="" />
      </Field>,
    );
    expect(screen.getByText('Bad input')).toBeInTheDocument();
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
  });

  it('treats null error as no error', () => {
    render(
      <Field label="A" hint="Helper" error={null}>
        <TextInput defaultValue="" />
      </Field>,
    );
    expect(screen.getByText('Helper')).toBeInTheDocument();
  });
});

describe('TextInput / TextArea / Select forward props', () => {
  it('TextInput forwards value + onChange', () => {
    const onChange = vi.fn();
    render(<TextInput value="abc" onChange={onChange} aria-label="x" />);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    expect(input.value).toBe('abc');
    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('TextInput merges style overrides', () => {
    render(<TextInput aria-label="x" style={{ color: 'red' }} />);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    expect(input.style.color).toBe('red');
  });

  it('TextInput forwards the id prop directly', () => {
    render(<TextInput id="direct-id" aria-label="x" />);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    expect(input.id).toBe('direct-id');
  });
});

describe('Button', () => {
  it('renders inside a real <button>', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('disables and dims when disabled', () => {
    render(<Button disabled>X</Button>);
    const btn = screen.getByRole('button', { name: 'X' });
    expect(btn).toBeDisabled();
    expect(btn.style.cursor).toBe('not-allowed');
  });

  it('forwards onClick when enabled', () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
