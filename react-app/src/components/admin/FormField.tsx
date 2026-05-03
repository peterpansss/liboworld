import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
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

export function Field({
  label,
  error,
  children,
  hint,
  htmlFor,
}: {
  label?: string;
  error?: string | null;
  children: ReactNode;
  hint?: string;
  /** When provided, wires the <label> to the input via htmlFor and exposes
   *  a pointer cursor to advertise that the label is genuinely clickable. */
  htmlFor?: string;
}) {
  // When the label is associated with an input via htmlFor, clicking the
  // label focuses the input - surface that affordance with a pointer cursor.
  const labelStyleWithCursor: React.CSSProperties = htmlFor
    ? { ...labelStyle, cursor: 'pointer' }
    : labelStyle;
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label htmlFor={htmlFor} style={labelStyleWithCursor}>
          {label}
        </label>
      )}
      {children}
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
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles: Record<typeof variant, React.CSSProperties> = {
    primary: { background: colors.accent, color: '#080B10', border: `1px solid ${colors.accent}` },
    secondary: { background: colors.bg3, color: colors.text, border: `1px solid ${colors.border}` },
    danger: { background: colors.errorDim, color: colors.error, border: `1px solid ${colors.error}` },
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
