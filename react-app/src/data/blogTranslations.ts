import type { BlogArticle } from './blog';
import { blogArticles as enArticles } from './blog';
import deOverlay from './blog.de';
import esOverlay from './blog.es';
import frOverlay from './blog.fr';
import ptOverlay from './blog.pt';

type BlogOverlay = Record<string, { title: string; excerpt: string; content: string }>;

const OVERLAYS: Record<string, BlogOverlay> = {
  de: deOverlay,
  es: esOverlay,
  fr: frOverlay,
  pt: ptOverlay,
};

export function getBlogArticles(language: string): BlogArticle[] {
  const langCode = (language || 'en').split('-')[0];
  const overlay = OVERLAYS[langCode];
  if (!overlay) return enArticles;
  return enArticles.map((article) => {
    const translated = overlay[article.slug];
    if (!translated) return article;
    return {
      ...article,
      title: translated.title,
      excerpt: translated.excerpt,
      content: translated.content,
    };
  });
}
