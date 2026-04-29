import { Helmet } from 'react-helmet-async';

interface Props {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, unknown>;
  /** Optional locale alternates: { es: 'https://...', fr: 'https://...' } */
  alternates?: Record<string, string>;
}

const SITE_URL = 'https://liboworld.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/libo-og-image.jpg`;

export function SeoHead({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  jsonLd,
  alternates,
}: Props) {
  const image = ogImage || DEFAULT_OG_IMAGE;
  const desc = description || 'Libo — Your Fitness Training Club. 140+ guided workouts. Train anywhere, anytime.';
  const url = canonical || SITE_URL;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Libo" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={image} />
      {alternates &&
        Object.entries(alternates).map(([lang, href]) => (
          <link key={lang} rel="alternate" hrefLang={lang} href={href} />
        ))}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
