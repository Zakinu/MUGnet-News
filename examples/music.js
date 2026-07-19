import { loadNewsFeed } from './news-feed-client.js';

document.addEventListener('DOMContentLoaded', () => {
  loadNewsFeed({
    site: 'music',
    container: document.querySelector('[data-news-site="music"]'),
    limit: 3
  });
});
