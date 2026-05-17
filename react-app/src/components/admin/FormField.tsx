import {
  cloneElement,
  isValidElement,
  useId,
  type ReactNode,
  type ReactElement,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
} from 'react';
import { colors } from '../../theme';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: colors.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 6,
};

const baseInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  color: colors.text,
  outline: 'none',
  boxSizing: 'border-box',
};

/**
 * Field wraps a single form control with a `<label>` and (optionally) a hint
 * or error message.
 *
 * Accessibility:
 *   - The `<label>` is associated to its child input via `htmlFor`/`id`. If
 *     the consumer doesn't pass `id`, one is auto-generated with `useId()`
 *     and forwarded to the child via `cloneElement`. This means screen
 *     readers announce the label text when the input is focused, and
 *     clicking the label moves focus to the input.
 *   - Existing `id` props on the child take precedence (so callers that
 *     wire their own ids — e.g. `fm-email` — keep working).
 */
export function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id?: string;
  label?: string;
  error?: string | null;
  children: ReactNode;
  hint?: string;
}) {
  const generatedId = useId();
  // Only wire an id to the input when there's a label to associate with it
  // AND the child is a real React element we can clone. Pure text children
  // (e.g. <Field label="Plain">just text</Field>) get no htmlFor — there
  // is nothing to point to, and emitting an orphan htmlFor would be worse
  // than no htmlFor at all.
  const explicitChildId =
    isValidElement(children) ? ((children.props as { id?: string }).id ?? undefined) : undefined;
  const canAttachId = label && (id || isValidElement(children));
  const childId: string | undefined = canAttachId ? id ?? explicitChildId ?? generatedId : undefined;

  let renderedChildren: ReactNode = children;
  if (childId && isValidElement(children) && !explicitChildId) {
    renderedChildren = cloneElement(children as ReactElement<{ id?: string }>, { id: childId });
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label htmlFor={childId} style={labelStyle}>
          {label}
        </label>
      )}
      {renderedChildren}
      {hint && !error && <div style={{ fontSize: 12, color: colors.dim, marginTop: 4 }}>{hint}</div>}
      {error && <div style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...baseInputStyle, ...props.style }} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...baseInputStyle, resize: 'vertical', minHeight: 80, ...props.style }} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...baseInputStyle, ...props.style }} />;
}

export function Button({
  variant = 'primary',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' }) {
  const styles: Record<typeof variant, React.CSSProperties> = {
    primary: { background: colors.accent, color: '#080B10', border: `1px solid ${colors.accent}` },
    secondary: { background: colors.bg3, color: colors.text, border: `1px solid ${colors.border}` },
    danger: { background: colors.errorDim, color: colors.error, border: `1px solid ${colors.error}` },
    warning: { background: colors.warningDim, color: colors.warning, border: `1px solid ${colors.warning}` },
    ghost: { background: 'transparent', color: colors.text, border: `1px solid ${colors.border}` },
  };
  return (
    <button
      {...rest}
      style={{
        padding: '9px 16px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        opacity: rest.disabled ? 0.5 : 1,
        transition: 'opacity 120ms ease, transform 120ms ease',
        ...styles[variant],
        ...rest.style,
      }}
    >
      {children}
    </button>
  );
}
