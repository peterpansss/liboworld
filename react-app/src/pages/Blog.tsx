import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { blogArticles } from '../data/blog';
import './Blog.css';

const CATEGORIES = ['All', 'Training', 'Nutrition', 'Lifestyle', 'Guides'];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Blog() {
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
        <nav aria-label="Breadcrumb" className="blog-breadcrumb">
          <Link to="/">Home</Link>
          <span>&rsaquo;</span>
          Resources
          <span>&rsaquo;</span>
          Blog
        </nav>
        <h1 className="font-display">Blog</h1>
        <p className="blog-hero-subtitle">
          Training guides, tips, and insights to level up your fitness.
        </p>
      </section>

      {/* ── Category Filter ── */}
      <div className="blog-filters" role="group" aria-label="Filter by category">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`blog-filter-chip${activeCategory === cat ? ' active' : ''}`}
            aria-pressed={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Article Grid ── */}
      <div className="blog-grid">
        {filtered.length === 0 && (
          <div className="blog-empty">No articles in this category yet.</div>
        )}
        {filtered.map((article) => (
          <article key={article.slug}>
            <Link
              to={`/blog/${article.slug}`}
              className="blog-card"
            >
              <div className="blog-card-emoji" aria-hidden="true">{article.heroEmoji}</div>
              <div className="blog-card-body">
                <span className="blog-card-category">{article.category}</span>
                <h2 className="blog-card-title">{article.title}</h2>
                <p className="blog-card-excerpt">{article.excerpt}</p>
                <div className="blog-card-meta">
                  {article.readTime} min read &middot; <time dateTime={article.date}>{formatDate(article.date)}</time>
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
