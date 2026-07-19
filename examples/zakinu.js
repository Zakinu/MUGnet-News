import { loadNewsFeed } from './news-feed-client.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-news-site="zakinu"]');
  const requestedLimit = Number.parseInt(container?.dataset.newsLimit || '', 10);
  loadNewsFeed({
    site: 'zakinu',
    container,
    limit: Number.isInteger(requestedLimit) ? requestedLimit : undefined
  });
});
