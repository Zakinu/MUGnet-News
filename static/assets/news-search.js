export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesNewsItem(record, filters) {
  const query = normalizeSearchText(filters.query);
  if (query && !normalizeSearchText(record.search).includes(query)) return false;
  if (filters.year && record.year !== filters.year) return false;
  if (filters.category && record.category !== filters.category) return false;
  if (filters.site && !record.sites.includes(filters.site)) return false;
  if (filters.work && !record.works.includes(filters.work)) return false;
  return true;
}

function valuesFromForm(form) {
  const data = new FormData(form);
  return {
    query: String(data.get('q') || ''),
    year: String(data.get('year') || ''),
    category: String(data.get('category') || ''),
    site: String(data.get('site') || ''),
    work: String(data.get('work') || '')
  };
}

function recordFromItem(item) {
  return {
    search: item.dataset.search || '',
    year: item.dataset.year || '',
    category: item.dataset.category || '',
    sites: (item.dataset.sites || '').split('|').filter(Boolean),
    works: (item.dataset.works || '').split('|').filter(Boolean)
  };
}

function applyUrlState(form) {
  const params = new URLSearchParams(location.search);
  for (const [name, parameter] of [['q', 'q'], ['year', 'year'], ['category', 'category'], ['site', 'site'], ['work', 'work']]) {
    const field = form.elements.namedItem(name);
    const value = params.get(parameter);
    if (!field || value === null) continue;
    if (field instanceof HTMLSelectElement && ![...field.options].some(option => option.value === value)) continue;
    field.value = value;
  }
}

function updateUrl(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ q: filters.query, year: filters.year, category: filters.category, site: filters.site, work: filters.work })) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
}

function initializeSearch(root) {
  const form = root.querySelector('[data-news-search]');
  const count = root.querySelector('[data-result-count]');
  const noResults = root.querySelector('[data-no-results]');
  const items = [...document.querySelectorAll('[data-news-item]')];
  if (!form || !count || !noResults || !items.length) return;

  form.hidden = false;
  applyUrlState(form);

  const apply = () => {
    const filters = valuesFromForm(form);
    let visible = 0;
    for (const item of items) {
      const matches = matchesNewsItem(recordFromItem(item), filters);
      item.hidden = !matches;
      if (matches) visible += 1;
    }
    count.textContent = `${visible}件 / ${items.length}件`;
    noResults.hidden = visible !== 0;
    updateUrl(filters);
  };

  form.addEventListener('input', apply);
  form.addEventListener('change', apply);
  form.addEventListener('reset', () => setTimeout(apply));
  apply();
}

if (typeof document !== 'undefined') {
  for (const root of document.querySelectorAll('[data-news-search-root]')) initializeSearch(root);
}
