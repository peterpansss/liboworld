import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { EmojiIcon } from '../components/EmojiIcon';
import { blogArticles } from '../data/blog';
import './BlogPost.css';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatId(id: string) {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { article, prevArticle, nextArticle } = useMemo(() => {
    const idx = blogArticles.findIndex((a) => a.slug === slug);
    return {
      article: idx >= 0 ? blogArticles[idx] : null,
      prevArticle: idx > 0 ? blogArticles[idx - 1] : null,
      nextArticle: idx >= 0 && idx < blogArticles.length - 1 ? blogArticles[idx + 1] : null,
    };
  }, [slug]);

  if (!article) {
    return (
      <div className="blogpost-page">
        <SiteNav />
        <div className="blogpost-404">
          <h1 className="font-display">Article Not Found</h1>
          <p>The article you are looking for does not exist.</p>
          <Link to="/blog">Back to Blog</Link>
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
        <nav aria-label="Breadcrumb" className="blogpost-breadcrumb">
          <Link to="/">Home</Link>
          <span>&rsaquo;</span>
          <Link to="/blog">Blog</Link>
          <span>&rsaquo;</span>
          <Link to={`/blog?cat=${article.category}`}>{article.category}</Link>
          <span>&rsaquo;</span>
          {article.title}
        </nav>

        <div className="blogpost-category">{article.category}</div>
        <h1 className="font-display">{article.title}</h1>

        <div className="blogpost-meta">
          <span>{article.author}</span>
          <time dateTime={article.date || ''}>{formatDate(article.date)}</time>
          <span>{article.readTime} min read</span>
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
          <h2 className="blogpost-related-title">Explore Related</h2>
          <div className="blogpost-related-grid">
            {article.relatedExercises?.map((id) => (
              <Link key={id} to={`/exercises/${id}`} className="blogpost-related-card">
                <span className="blogpost-related-card-type">Exercise</span>
                {formatId(id)}
              </Link>
            ))}
            {article.relatedPrograms?.map((id) => (
              <Link key={id} to={`/programs/${id}`} className="blogpost-related-card">
                <span className="blogpost-related-card-type">Program</span>
                {formatId(id)}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA Banner ── */}
      <div className="blogpost-cta">
        <div className="blogpost-cta-inner">
          <h2 className="font-display">Start Training with Libo</h2>
          <p>718 exercises. 140 guided workouts. Structured programs. All free to start.</p>
          <Link to="/onboarding" className="blogpost-cta-btn">
            Get Started
          </Link>
        </div>
      </div>

      {/* ── Prev / Next ── */}
      <nav aria-label="Article navigation" className="blogpost-nav">
        {prevArticle ? (
          <Link to={`/blog/${prevArticle.slug}`} className="blogpost-nav-link">
            <span className="blogpost-nav-label">&larr; Previous</span>
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
            <span className="blogpost-nav-label">Next &rarr;</span>
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
