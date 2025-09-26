(() => {
  const get = (selector, attr = 'content') =>
    document.querySelector(selector)?.[attr] || '';

  // --- Meta & link data ---
  const robotsContent = get('meta[name="robots"]');
  const canonical = get('link[rel="canonical"]', 'href');
  const seoData = {
    pageTitle: document.title || '(missing)',
    titleLength: document.title.length,
    metaDescription: get('meta[name="description"]') || '(missing)',
    metaDescriptionLength: get('meta[name="description"]')?.length || 0,
    canonical: canonical || '(missing)',
    canonicalValid: canonical?.startsWith('http') || false,
    ogTitle: get('meta[property="og:title"]') || '(missing)',
    ogDescription: get('meta[property="og:description"]') || '(missing)',
    ogImage: get('meta[property="og:image"]') || '(missing)',
    twitterTitle: get('meta[name="twitter:title"]') || '(missing)',
    twitterDescription: get('meta[name="twitter:description"]') || '(missing)',
    robots: robotsContent || '(missing)',
    indexable: robotsContent ? !/noindex/i.test(robotsContent) : true,
    viewport: get('meta[name="viewport"]') || '(missing)'
  };

  // --- Heading details table (H1–H6) ---
  const headingTable = [];
  let totalHeadings = 0;
  for (let i = 1; i <= 6; i++) {
    const tag = `h${i}`;
    const nodes = [...document.querySelectorAll(tag)];
    totalHeadings += nodes.length;
    headingTable.push({
      Level: tag.toUpperCase(),
      Count: nodes.length,
      Texts: nodes.map(n => n.textContent.trim()).filter(Boolean).join(' | ') || '(none)'
    });
  }
  const missingH1 = headingTable[0].Count === 0;

  // --- Image alt & size coverage ---
  const imgs = [...document.querySelectorAll('img')];
  const missingAlt = imgs.filter(img => !img.hasAttribute('alt') || img.alt.trim() === '');
  const missingSize = imgs.filter(img => !img.width || !img.height);
  const imgData = {
    totalImages: imgs.length,
    withAlt: imgs.length - missingAlt.length,
    missingAlt: missingAlt.length,
    missingSize: missingSize.length
  };

  // --- Frame/Iframe title coverage ---
  const frames = [...document.querySelectorAll('frame, iframe')];
  const missingTitles = frames.filter(el => !el.hasAttribute('title') || el.title.trim() === '');
  const frameData = {
    totalFrames: frames.length,
    withTitle: frames.length - missingTitles.length,
    missingTitle: missingTitles.length
  };

  // --- Internal/External links ---
  const links = [...document.querySelectorAll('a')];
  const internalLinks = links.filter(a => a.href.includes(location.hostname));
  const externalLinks = links.filter(a => !a.href.includes(location.hostname));
  const nofollowLinks = externalLinks.filter(a => a.rel.includes('nofollow'));
  const linkData = {
    totalLinks: links.length,
    internalLinks: internalLinks.length,
    externalLinks: externalLinks.length,
    nofollowLinks: nofollowLinks.length
  };

  // --- Page content length ---
  const contentLength = document.body.innerText.trim().length;

  // --- Output ---
  console.group('SEO Meta Data');
  console.table(seoData);
  if (seoData.pageTitle === '(missing)' || seoData.titleLength < 30 || seoData.titleLength > 60) {
    console.warn('Check title length (optimal 50-60 chars) or missing title.');
  }
  if (seoData.metaDescription === '(missing)' || seoData.metaDescriptionLength < 70 || seoData.metaDescriptionLength > 160) {
    console.warn('Check meta description length (optimal 70-160 chars) or missing description.');
  }
  if (!seoData.canonicalValid) console.warn('Canonical URL missing or invalid.');
  console.groupEnd();

  console.group('Heading Structure (H1–H6)');
  console.table(headingTable);
  if (missingH1) console.warn('No H1 found on page.');
  console.groupEnd();

  console.group('Image Alt & Size Coverage');
  console.table([imgData]);
  console.groupEnd();

  console.group('Frame/Iframe Title Coverage');
  console.table([frameData]);
  console.groupEnd();

  console.group('Internal/External Links');
  console.table([linkData]);
  console.groupEnd();

  console.log('Page Content Length (characters):', contentLength);
})();
