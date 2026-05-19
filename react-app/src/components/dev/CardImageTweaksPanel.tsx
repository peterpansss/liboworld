import { useEffect, useRef, useState } from 'react';
import './CardImageTweaksPanel.css';

const DEFAULTS = {
  saturation: 0.85,
  brightness: 0.95,
  contrast: 1.05,
};

type Knob = 'saturation' | 'brightness' | 'contrast';

const KNOBS: Array<{ key: Knob; label: string; min: number; max: number; step: number; cssVar: string }> = [
  { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.05, cssVar: '--card-img-saturation' },
  { key: 'brightness', label: 'Brightness', min: 0.5, max: 1.5, step: 0.05, cssVar: '--card-img-brightness' },
  { key: 'contrast',   label: 'Contrast',   min: 0.5, max: 1.5, step: 0.05, cssVar: '--card-img-contrast' },
];

function readVar(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function writeVar(name: string, value: number) {
  document.documentElement.style.setProperty(name, String(value));
}

export default function CardImageTweaksPanel() {
  const [values, setValues] = useState(DEFAULTS);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  // Seed from current CSS custom property values on mount (refresh-safe).
  useEffect(() => {
    setValues({
      saturation: readVar('--card-img-saturation', DEFAULTS.saturation),
      brightness: readVar('--card-img-brightness', DEFAULTS.brightness),
      contrast:   readVar('--card-img-contrast',   DEFAULTS.contrast),
    });
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  function update(key: Knob, value: number) {
    setValues(v => ({ ...v, [key]: value }));
    const knob = KNOBS.find(k => k.key === key)!;
    writeVar(knob.cssVar, value);
  }

  function reset() {
    setValues(DEFAULTS);
    KNOBS.forEach(k => writeVar(k.cssVar, DEFAULTS[k.key]));
  }

  function copyCss() {
    const snippet =
      `:root {\n` +
      `  --card-img-saturation: ${values.saturation};\n` +
      `  --card-img-brightness: ${values.brightness};\n` +
      `  --card-img-contrast: ${values.contrast};\n` +
      `}\n`;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <aside className="citp" aria-label="Card image grade tweaks">
      <h3 className="citp-title">CARD IMAGE GRADE</h3>
      <div className="citp-sliders">
        {KNOBS.map(k => (
          <label key={k.key} className="citp-row">
            <span className="citp-label">{k.label}</span>
            <input
              className="citp-range"
              type="range"
              min={k.min}
              max={k.max}
              step={k.step}
              value={values[k.key]}
              onChange={e => update(k.key, parseFloat(e.target.value))}
            />
            <span className="citp-value">{values[k.key].toFixed(2)}</span>
          </label>
        ))}
      </div>
      <div className="citp-actions">
        <button type="button" className="citp-btn citp-btn--ghost" onClick={reset}>
          Reset
        </button>
        <button type="button" className="citp-btn citp-btn--accent" onClick={copyCss}>
          Copy CSS
        </button>
        <span className={`citp-toast ${copied ? 'is-visible' : ''}`} aria-live="polite">
          Copied!
        </span>
      </div>
    </aside>
  );
}
