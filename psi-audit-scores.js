(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ----------------- 1. Core Web Vitals / Lab Metrics ----------------- */
  const metricVal = (tab, metric) => {
    const el = $(`div[aria-labelledby="${tab}_tab"] #${metric} .lh-metric__value`);
    return el ? el.innerText.replace(/[^0-9.]/g, '') : '';
  };

  const collectMetrics = (tab) => ({
    Device: tab[0].toUpperCase() + tab.slice(1),
    Score: $(`div[aria-labelledby="${tab}_tab"] .lh-gauge__percentage`)?.innerText || '',
    'First Contentful Paint (s)': metricVal(tab, 'first-contentful-paint'),
    'Speed Index (s)':            metricVal(tab, 'speed-index'),
    'Total Blocking Time (ms)':   metricVal(tab, 'total-blocking-time'),
    'Largest Contentful Paint (s)': metricVal(tab, 'largest-contentful-paint'),
    'Cumulative Layout Shift':    metricVal(tab, 'cumulative-layout-shift')
  });

  const labMetrics = [collectMetrics('mobile'), collectMetrics('desktop')];

  console.log('=== LAB METRICS ===');
  console.table(labMetrics);

  /* ----------------- 2. Failed Audits ----------------- */
  function getFailedAudits(container) {
    const audits = container.querySelectorAll('.lh-audit.lh-audit--fail');
    const unique = new Map();
    audits.forEach(el => {
      const title = el.querySelector('.lh-audit__title')?.innerText.trim() || '';
      const extra = el.querySelector('.lh-audit__display-text')?.innerText.trim() || '';
      const key   = el.id || title;
      if (title && !unique.has(key)) unique.set(key, { title, extra });
    });
    return [...unique.values()];
  }

  const mobileRoot  = $('div[aria-labelledby="mobile_tab"]');
  const desktopRoot = $('div[aria-labelledby="desktop_tab"]');

  const failedAudits = {
    Mobile:  mobileRoot  ? getFailedAudits(mobileRoot)  : [],
    Desktop: desktopRoot ? getFailedAudits(desktopRoot) : []
  };

  console.log('=== FAILED AUDITS ===');
  console.log('Mobile');
  console.table(failedAudits.Mobile);
  console.log('Desktop');
  console.table(failedAudits.Desktop);
})();
