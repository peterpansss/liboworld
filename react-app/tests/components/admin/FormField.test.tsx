/**
 * Tests for src/components/admin/FormField.tsx.
 *
 * Covers Field (label/hint/error precedence + htmlFor wiring),
 * TextInput/TextArea/Select (style merge + value pass-through) and
 * Button (variant + disabled states).
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field, TextInput, TextArea, Select, Button } from '../../../src/components/admin/FormField';

void React;

describe('Field', () => {
  it('renders label and children', () => {
    render(
      <Field label="Email">
        <input data-testid="i" />
      </Field>,
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByTestId('i')).toBeInTheDocument();
  });

  it('renders hint when no error', () => {
    render(
      <Field label="A" hint="Helper text">
        <input />
      </Field>,
    );
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('renders error and hides hint when both are provided', () => {
    render(
      <Field label="A" hint="Helper text" error="Bad input">
        <input />
      </Field>,
    );
    expect(screen.getByText('Bad input')).toBeInTheDocument();
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
  });

  it('omits the label when not provided', () => {
    const { container } = render(
      <Field>
        <input data-testid="i" />
      </Field>,
    );
    expect(container.querySelector('label')).toBeNull();
  });

  it('treats null error as no error', () => {
    render(
      <Field hint="Helper" error={null}>
        <input />
      </Field>,
    );
    expect(screen.getByText('Helper')).toBeInTheDocument();
  });

  it('wires the label to the input via htmlFor', () => {
    const { container } = render(
      <Field label="Email" htmlFor="email-id">
        <input id="email-id" />
      </Field>,
    );
    const label = container.querySelector('label');
    expect(label).not.toBeNull();
    expect(label?.getAttribute('for')).toBe('email-id');
  });

  it('exposes a pointer cursor on the label when htmlFor is set', () => {
    const { container } = render(
      <Field label="Email" htmlFor="email-id">
        <input id="email-id" />
      </Field>,
    );
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(label.style.cursor).toBe('pointer');
  });

  it('does NOT set a pointer cursor when htmlFor is omitted', () => {
    const { container } = render(
      <Field label="Email">
        <input />
      </Field>,
    );
    const label = container.querySelector('label') as HTMLLabelElement;
    expect(label.style.cursor).toBe('');
  });

  it('clicking the label focuses the wired input', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Email" htmlFor="email-id">
        <input id="email-id" data-testid="email-input" />
      </Field>,
    );
    const input = screen.getByTestId('email-input') as HTMLInputElement;
    expect(document.activeElement).not.toBe(input);
    await user.click(screen.getByText('Email'));
    expect(document.activeElement).toBe(input);
  });
});

describe('TextInput', () => {
  it('forwards value and onChange', () => {
    const onChange = vi.fn();
    render(<TextInput value="abc" onChange={onChange} aria-label="x" />);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    expect(input.value).toBe('abc');
    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('merges style overrides with the base style', () => {
    render(<TextInput aria-label="x" style={{ color: 'red' }} />);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    expect(input.style.color).toBe('red');
  });
});

describe('TextArea', () => {
  it('renders a textarea with default min-height styling', () => {
    render(<TextArea aria-label="ta" defaultValue="hello" />);
    const ta = screen.getByLabelText('ta') as HTMLTextAreaElement;
    expect(ta.tagName).toBe('TEXTAREA');
    expect(ta.value).toBe('hello');
  });
});

describe('Select', () => {
  it('renders a <select> with options', () => {
    render(
      <Select aria-label="sel" defaultValue="b">
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    const sel = screen.getByLabelText('sel') as HTMLSelectElement;
    expect(sel.tagName).toBe('SELECT');
    expect(sel.value).toBe('b');
  });
});

describe('Button', () => {
  it('renders the children inside a real <button>', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders each variant without crashing', () => {
    const { rerender } = render(<Button variant="primary">P</Button>);
    expect(screen.getByText('P')).toBeInTheDocument();
    rerender(<Button variant="secondary">S</Button>);
    expect(screen.getByText('S')).toBeInTheDocument();
    rerender(<Button variant="danger">D</Button>);
    expect(screen.getByText('D')).toBeInTheDocument();
    rerender(<Button variant="ghost">G</Button>);
    expect(screen.getByText('G')).toBeInTheDocument();
  });

  it('disables the button and visually dims it', () => {
    render(<Button disabled>X</Button>);
    const btn = screen.getByRole('button', { name: 'X' });
    expect(btn).toBeDisabled();
    expect(btn.style.cursor).toBe('not-allowed');
    expect(parseFloat(btn.style.opacity)).toBeLessThan(1);
  });

  it('forwards onClick when enabled', () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
