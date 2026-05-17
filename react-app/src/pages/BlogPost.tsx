import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { EmojiIcon } from '../components/EmojiIcon';
import { getBlogArticles } from '../data/blogTranslations';
import './BlogPost.css';

function formatDate(dateStr: string, locale: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatId(id: string) {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function BlogPost() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  const articles = useMemo(() => getBlogArticles(i18n.language), [i18n.language]);
  const { article, prevArticle, nextArticle } = useMemo(() => {
    const idx = articles.findIndex((a) => a.slug === slug);
    return {
      article: idx >= 0 ? articles[idx] : null,
      prevArticle: idx > 0 ? articles[idx - 1] : null,
      nextArticle: idx >= 0 && idx < articles.length - 1 ? articles[idx + 1] : null,
    };
  }, [slug, articles]);
  const categoryLabel = (cat: string) =>
    t(`blog.categories.${cat.toLowerCase()}`, { defaultValue: cat });

  if (!article) {
    return (
      <div className="blogpost-page">
        <SiteNav />
        <div className="blogpost-404">
          <h1 className="font-display">{t('blogPost.notFoundTitle')}</h1>
          <p>{t('blogPost.notFoundBody')}</p>
          <Link to="/blog">{t('blogPost.backToBlog')}</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const hasRelated =
    (article.relatedExercises && article.relatedExercises.length > 0) ||
    (article.relatedPrograms && article.relatedPrograms.length > 0);

  return (
    <div className="blogpost-page">
      <SiteNav />

      {/* ── Header ── */}
      <header className="blogpost-header">
        <nav aria-label={t('blogPost.breadcrumbAria')} className="blogpost-breadcrumb">
          <Link to="/">{t('blogPost.breadcrumbHome')}</Link>
          <span>&rsaquo;</span>
          <Link to="/blog">{t('blogPost.breadcrumbBlog')}</Link>
          <span>&rsaquo;</span>
          <Link to={`/blog?cat=${article.category}`}>{categoryLabel(article.category)}</Link>
          <span>&rsaquo;</span>
          {article.title}
        </nav>

        <div className="blogpost-category">{categoryLabel(article.category)}</div>
        <h1 className="font-display">{article.title}</h1>

        <div className="blogpost-meta">
          <span>{t('blogPost.writtenBy', { author: article.author })}</span>
          <time dateTime={article.date || ''}>{formatDate(article.date, i18n.language)}</time>
          <span>{t('blogPost.minRead', { count: article.readTime })}</span>
        </div>

        {article.heroImage ? (
          <div className="blogpost-hero-img">
            <img src={article.heroImage} alt={article.title} />
          </div>
        ) : (
          <div className="blogpost-emoji" aria-hidden="true">
            <EmojiIcon emoji={article.heroEmoji} size={56} />
          </div>
        )}
      </header>

      {/* ── Article Body ── */}
      <article className="blogpost-body">
        <div
          className="blogpost-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </article>

      {/* ── Related Links ── */}
      {hasRelated && (
        <section className="blogpost-related">
          <h2 className="blogpost-related-title">{t('blogPost.relatedTitle')}</h2>
          <div className="blogpost-related-grid">
            {article.relatedExercises?.map((id) => (
              <Link key={id} to={`/exercises/${id}`} className="blogpost-related-card">
                <span className="blogpost-related-card-type">{t('blogPost.relatedExerciseLabel')}</span>
                {formatId(id)}
              </Link>
            ))}
            {article.relatedPrograms?.map((id) => (
              <Link key={id} to={`/programs/${id}`} className="blogpost-related-card">
                <span className="blogpost-related-card-type">{t('blogPost.relatedProgramLabel')}</span>
                {formatId(id)}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA Banner ── */}
      <div className="blogpost-cta">
        <div className="blogpost-cta-inner">
          <h2 className="font-display">{t('blogPost.ctaTitle')}</h2>
          <p>{t('blogPost.ctaBody')}</p>
          <Link to="/onboarding" className="blogpost-cta-btn">
            {t('blogPost.ctaButton')}
          </Link>
        </div>
      </div>

      {/* ── Prev / Next ── */}
      <nav aria-label={t('blogPost.navAria')} className="blogpost-nav">
        {prevArticle ? (
          <Link to={`/blog/${prevArticle.slug}`} className="blogpost-nav-link">
            <span className="blogpost-nav-label">&larr; {t('blogPost.previous')}</span>
            <span className="blogpost-nav-title">{prevArticle.title}</span>
          </Link>
        ) : (
          <div />
        )}
        {nextArticle ? (
          <Link
            to={`/blog/${nextArticle.slug}`}
            className="blogpost-nav-link blogpost-nav-link--next"
          >
            <span className="blogpost-nav-label">{t('blogPost.next')} &rarr;</span>
            <span className="blogpost-nav-title">{nextArticle.title}</span>
          </Link>
        ) : (
          <div />
        )}
      </nav>

      <SiteFooter />
    </div>
  );
}
