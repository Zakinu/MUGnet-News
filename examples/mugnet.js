import { loadNewsFeed } from './news-feed-client.js';

document.addEventListener('DOMContentLoaded', () => {
  loadNewsFeed({
    site: 'mugnet',
    container: document.querySelector('[data-news-site="mugnet"]')
  });
});
