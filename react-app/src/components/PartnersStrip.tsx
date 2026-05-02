import { useTranslation } from 'react-i18next';
import './PartnersStrip.css';

/**
 * Strip of partner / press wordmarks under the hero.
 *
 * Each entry is a text wordmark rendered in Barlow Condensed for now —
 * swap to <img> tags with grayscale partner logos when those assets land.
 * The strip is intentionally data-driven so the array can be replaced
 * without touching markup.
 */

interface Partner {
  name: string;
  url?: string;
}

// Default partner list. Update with real partners as they sign on.
// Mix of: own apparel brand (LiboWear), gym partner (LMCT), and
// methodology references (ACSM, NASM) that we align with rather
// than formally partner with.
const DEFAULT_PARTNERS: Partner[] = [
  { name: 'LiboWear' },
  { name: 'LMCT' },
  { name: 'ACSM Aligned' },
  { name: 'NASM Certified' },
  { name: 'WHO Guidelines' },
  { name: 'ACE Coaches' },
];

interface Props {
  partners?: Partner[];
  eyebrowKey?: string;
  defaultEyebrow?: string;
}

export function PartnersStrip({
  partners = DEFAULT_PARTNERS,
  eyebrowKey = 'partners.eyebrow',
  defaultEyebrow = 'BUILT WITH PROFESSIONALS WE TRUST',
}: Props) {
  const { t } = useTranslation();
  return (
    <section className="partners-strip" aria-label={t(eyebrowKey, { defaultValue: defaultEyebrow })}>
      <div className="partners-strip__inner">
        <div className="partners-strip__eyebrow">
          {t(eyebrowKey, { defaultValue: defaultEyebrow })}
        </div>
        <ul className="partners-strip__list">
          {partners.map((p) => (
            <li key={p.name} className="partners-strip__item">
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="partners-strip__logo">
                  {p.name}
                </a>
              ) : (
                <span className="partners-strip__logo">{p.name}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
