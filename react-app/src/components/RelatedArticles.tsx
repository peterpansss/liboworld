/**
 * Three blog post cards related to the current exercise's primary muscle group.
 * Falls back to most-recent articles if no muscle-specific match exists.
 */
import { Link } from 'react-router-dom';
import { blogArticles, type BlogArticle } from '../data/blog';
import './RelatedArticles.css';

interface Props {
  /** Primary muscle group (one of the 13 keys), used to score relevance. */
  muscleGroup?: string;
  /** Exercise id whose muscle this relates to — used to filter blog articles
   *  whose `relatedExercises` reference exercises in the same muscle group. */
  exerciseId?: string;
  limit?: number;
}

function scoreArticle(article: BlogArticle, muscleGroup?: string): number {
  if (!muscleGroup) return 0;
  const lower = muscleGroup.toLowerCase();
  let score = 0;
  if (article.title.toLowerCase().includes(lower)) score += 5;
  if (article.category.toLowerCase().includes(lower)) score += 3;
  if (article.excerpt.toLowerCase().includes(lower)) score += 2;
  if (article.relatedExercises?.some((id) => id.toLowerCase().includes(lower))) score += 4;
  return score;
}

export function RelatedArticles({ muscleGroup, limit = 3 }: Props) {
  const scored = blogArticles
    .map((a) => ({ article: a, score: scoreArticle(a, muscleGroup) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.article.date.localeCompare(a.article.date);
    });

  const picks = scored.slice(0, limit).map((s) => s.article);
  if (picks.length === 0) return null;

  return (
    <section className="rel-articles">
      <h2 className="rel-articles__title">Related articles</h2>
      <div className="rel-articles__grid">
        {picks.map((a) => (
          <Link
            key={a.slug}
            to={`/blog/${a.slug}`}
            className="rel-articles__card"
          >
            <div className="rel-articles__media">
              {a.heroImage ? (
                <img
                  src={a.heroImage}
                  alt=""
                  loading="lazy"
                  className="rel-articles__img"
                />
              ) : (
                <div className="rel-articles__emoji">{a.heroEmoji}</div>
              )}
            </div>
            <div className="rel-articles__body">
              <h3 className="rel-articles__name">{a.title}</h3>
              <div className="rel-articles__meta">
                <span className="rel-articles__category">{a.category}</span>
                <span className="rel-articles__date">{a.date}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
