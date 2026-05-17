import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { EmojiIcon } from '../components/EmojiIcon';
import { getBlogArticles } from '../data/blogTranslations';
import './Blog.css';

const CATEGORY_KEYS = ['all', 'training', 'nutrition', 'lifestyle', 'guides'] as const;
const CATEGORY_VALUES: Record<(typeof CATEGORY_KEYS)[number], string> = {
  all: 'All',
  training: 'Training',
  nutrition: 'Nutrition',
  lifestyle: 'Lifestyle',
  guides: 'Guides',
};
const VALID_CATEGORIES = Object.values(CATEGORY_VALUES);

export default function Blog() {
  const { t, i18n } = useTranslation();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  // Active category is driven by the `?cat=` query param so the nav
  // dropdown can deep-link to a pre-filtered view (e.g. /blog?cat=Training).
  // Falls back to "All" when missing or unrecognized.
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const activeCategory = catParam && VALID_CATEGORIES.includes(catParam) ? catParam : 'All';

  const setActiveCategory = (next: string) => {
    if (next === 'All') {
      // Drop the query param entirely so /blog stays clean.
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ cat: next }, { replace: true });
    }
  };

  const articles = useMemo(() => getBlogArticles(i18n.language), [i18n.language]);
  const filtered = useMemo(() => {
    if (activeCategory === 'All') return articles;
    // Cross-topic posts surface under any of their secondary categories
    // without duplicating in "All" (each article is one object).
    return articles.filter(
      (a) =>
        a.category === activeCategory ||
        a.secondaryCategories?.includes(activeCategory)
    );
  }, [activeCategory, articles]);

  // Carousel scroll state — track whether the prev/next arrows should be
  // enabled. The scroll container is the ref'd element; we listen to its
  // scroll events and recompute on resize / filter change so disabled state
  // stays in sync after the row width or item count changes.
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const update = () => {
      // 2px slack to forgive sub-pixel scroll positions at the extremes.
      setCanScrollPrev(el.scrollLeft > 2);
      setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [filtered.length]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="blog-page">
      <SiteNav />

      {/* ── Hero ── */}
      <section className="blog-hero">
        <nav aria-label={t('blog.breadcrumbAria')} className="blog-breadcrumb">
          <Link to="/">{t('blog.breadcrumbHome')}</Link>
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

      {/* ── Article Carousel ── */}
      {filtered.length === 0 ? (
        <div className="blog-grid">
          <div className="blog-empty">{t('blog.empty')}</div>
        </div>
      ) : (
        <div className="blog-carousel-wrap">
          <button
            type="button"
            className="blog-carousel-arrow blog-carousel-arrow--prev"
            onClick={() => scrollByPage(-1)}
            disabled={!canScrollPrev}
            aria-label={t('blog.prevPage', { defaultValue: 'Previous articles' })}
          >
            &larr;
          </button>
          <div className="blog-carousel" ref={carouselRef}>
            {filtered.map((article) => (
              <article key={article.slug} className="blog-carousel-item">
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
                    <span className="blog-card-category">{t(`blog.categories.${article.category.toLowerCase()}`, { defaultValue: article.category })}</span>
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
          <button
            type="button"
            className="blog-carousel-arrow blog-carousel-arrow--next"
            onClick={() => scrollByPage(1)}
            disabled={!canScrollNext}
            aria-label={t('blog.nextPage', { defaultValue: 'Next articles' })}
          >
            &rarr;
          </button>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
