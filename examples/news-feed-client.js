const FEED_ROOT = 'https://zakinu.github.io/MUGnet-News/data/news';
const SITES = new Set(['mugnet', 'music', 'zakinu']);

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isSafeUrl(value) {
  if (!value) return true;
  if (typeof value !== 'string' || /[\u0000-\u001f\\]/.test(value)) return false;
  if (value.startsWith('/')) {
    if (value.startsWith('//')) return false;
    try { return !decodeURIComponent(value).split('/').includes('..'); } catch { return false; }
  }
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

function isValidArticle(article) {
  return article
    && typeof article.id === 'string'
    && typeof article.title === 'string'
    && typeof article.summary === 'string'
    && typeof article.category === 'string'
    && isValidDate(article.date)
    && isSafeUrl(article.linkUrl || '');
}

function createCard(article) {
  const card = document.createElement('article');
  card.className = `news-card${article.featured ? ' news-card--featured' : ''}`;

  const date = document.createElement('time');
  date.className = 'news-card__date';
  date.dateTime = article.date;
  date.textContent = article.date.replaceAll('-', '.');

  const content = document.createElement('div');
  content.className = 'news-card__content';
  const category = document.createElement('p');
  category.className = 'news-card__category';
  category.textContent = article.category;
  const title = document.createElement('h3');
  title.className = 'news-card__title';
  title.textContent = article.title;
  const summary = document.createElement('p');
  summary.className = 'news-card__text';
  summary.textContent = article.summary;
  content.append(category, title, summary);

  if (article.linkUrl) {
    const link = document.createElement('a');
    link.className = 'news-card__link';
    link.href = article.linkUrl;
    link.textContent = article.linkText || '詳細を見る';
    if (/^https?:/i.test(article.linkUrl)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    content.append(link);
  }
  card.append(date, content);
  return card;
}

export async function loadNewsFeed({ site, container, limit, fallbackMessage = 'ニュースを取得できませんでした。' }) {
  if (!SITES.has(site)) throw new Error(`Unsupported news site: ${site}`);
  if (!(container instanceof Element)) throw new Error('News container was not found.');
  const hasEmbeddedFallback = container.childElementCount > 0;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${FEED_ROOT}/${site}.json`, {
      headers: { Accept: 'application/json' },
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const feed = await response.json();
    if (feed?.schemaVersion !== 1 || feed?.site !== site || !Array.isArray(feed.articles)) {
      throw new Error('Unexpected feed format');
    }
    const validArticles = feed.articles.filter(isValidArticle);
    const articles = Number.isInteger(limit) ? validArticles.slice(0, Math.max(0, limit)) : validArticles;
    const nodes = articles.map(createCard);
    if (nodes.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'news-empty';
      empty.textContent = '現在ニュースはありません。';
      nodes.push(empty);
    }
    container.replaceChildren(...nodes);
    container.dataset.newsState = 'loaded';
    return { ok: true, count: articles.length };
  } catch (error) {
    console.warn(`News feed (${site}) could not be loaded; fallback is shown.`, error);
    if (!hasEmbeddedFallback) {
      const fallback = document.createElement('p');
      fallback.className = 'news-fallback';
      fallback.textContent = fallbackMessage;
      container.replaceChildren(fallback);
    }
    container.dataset.newsState = 'fallback';
    return { ok: false, count: 0 };
  } finally {
    clearTimeout(timeout);
  }
}
