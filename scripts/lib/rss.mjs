function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function normalizeArticleUrl(article, siteChannels, fallbackUrl) {
  const baseUrl = siteChannels[article.sites[0]]?.link || fallbackUrl;
  const value = article.externalUrl || article.url || '';
  return value ? new URL(value, baseUrl).href : baseUrl;
}

export function buildRssFeed({ title, description, link, feedUrl, articles, siteChannels }) {
  const items = articles.map(article => {
    const articleUrl = normalizeArticleUrl(article, siteChannels, link);
    const pubDate = new Date(`${article.date}T00:00:00Z`).toUTCString();
    return [
      '    <item>',
      `      <title>${escapeXml(article.title)}</title>`,
      `      <link>${escapeXml(articleUrl)}</link>`,
      `      <description>${escapeXml(article.summary)}</description>`,
      `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
      `      <guid isPermaLink="false">${escapeXml(article.id)}</guid>`,
      '    </item>'
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(title)}</title>`,
    `    <description>${escapeXml(description)}</description>`,
    `    <link>${escapeXml(link)}</link>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    ''
  ].filter((line, index) => line || index === 0).join('\n');
}

export function rssGuids(xml) {
  return [...xml.matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map(match => match[1]);
}

export { escapeXml };
