import { loadNewsFeed } from './news-feed-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-news-site="music"]');
  if (!container) return;
  loadNewsFeed({
    site: 'music',
    container,
    limit: 3
  });
});
