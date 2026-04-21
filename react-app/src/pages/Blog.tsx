import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { EmojiIcon } from '../components/EmojiIcon';
import { blogArticles } from '../data/blog';
import './Blog.css';

const CATEGORY_KEYS = ['all', 'training', 'nutrition', 'lifestyle', 'guides'] as const;
const CATEGORY_VALUES: Record<(typeof CATEGORY_KEYS)[number], string> = {
  all: 'All',
  training: 'Training',
  nutrition: 'Nutrition',
  lifestyle: 'Lifestyle',
  guides: 'Guides',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Blog() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = useMemo(() => {
    if (activeCategory === 'All') return blogArticles;
    return blogArticles.filter((a) => a.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="blog-page">
      <SiteNav />

      {/* ── Hero ── */}
      <section className="blog-hero">
        <nav aria-label={t('blog.breadcrumbAria')} className="blog-breadcrumb">
          <Link to="/">{t('blog.breadcrumbHome')}</Link>
          <span>&rsaquo;</span>
          {t('blog.breadcrumbResources')}
          <span>&rsaquo;</span>
          {t('blog.breadcrumbBlog')}
        </nav>
        <h1 className="font-display">{t('blog.title')}</h1>
        <p className="blog-hero-subtitle">{t('blog.subtitle')}</p>
      </section>

      {/* ── Category Filter ── */}
      <div className="blog-filters" role="group" aria-label={t('blog.filterAria')}>
        {CATEGORY_KEYS.map((key) => {
          const value = CATEGORY_VALUES[key];
          return (
            <button
              key={value}
              className={`blog-filter-chip${activeCategory === value ? ' active' : ''}`}
              aria-pressed={activeCategory === value}
              onClick={() => setActiveCategory(value)}
            >
              {t(`blog.categories.${key}`)}
            </button>
          );
        })}
      </div>

      {/* ── Article Grid ── */}
      <div className="blog-grid">
        {filtered.length === 0 && (
          <div className="blog-empty">{t('blog.empty')}</div>
        )}
        {filtered.map((article) => (
          <article key={article.slug}>
            <Link
              to={`/blog/${article.slug}`}
              className="blog-card"
            >
              {article.heroImage ? (
                <div className="blog-card-img">
                  <img src={article.heroImage} alt={article.title} loading="lazy" />
                </div>
              ) : (
                <div className="blog-card-emoji" aria-hidden="true">
                  <EmojiIcon emoji={article.heroEmoji} size={40} />
                </div>
              )}
              <div className="blog-card-body">
                <span className="blog-card-category">{article.category}</span>
                <h2 className="blog-card-title">{article.title}</h2>
                <p className="blog-card-excerpt">{article.excerpt}</p>
                <div className="blog-card-meta">
                  {t('blog.minRead', { count: article.readTime })} &middot; <time dateTime={article.date}>{formatDate(article.date)}</time>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
