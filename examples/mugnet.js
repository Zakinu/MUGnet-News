import { loadNewsFeed } from './news-feed-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-news-site="mugnet"]');
  if (!container) return;
  loadNewsFeed({
    site: 'mugnet',
    container
  });
});
