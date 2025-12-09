(() => {
  // =========================================================
  // PW Marketing Pros - Website Audit & QA (On-page)
  // Console script: structured report + checklist + issues
  // + Phone Number Finder (lists + highlights + mismatch check)
  // =========================================================

  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const norm = (s) => (s ?? "").toString().replace(/\s+/g, " ").trim();
  const lc = (s) => norm(s).toLowerCase();
  const uniq = (arr) => [...new Set(arr)];
  const safeURL = (u) => { try { return new URL(u, location.href); } catch { return null; } };
  const toAbs = (u) => safeURL(u)?.href || "";
  const sameHost = (u) => safeURL(u)?.hostname === location.hostname;
  const isHttpUrl = (u) => { const x = safeURL(u); return !!x && (x.protocol === "http:" || x.protocol === "https:"); };

  // Simple SERP pixel width estimate (better than char count)
  const estimatePx = (text) => {
    const t = norm(text);
    let px = 0;
    for (const ch of t) {
      if ("WMW@#%&".includes(ch)) px += 9;
      else if ("ilI1|".includes(ch)) px += 4;
      else if (" .,;:'\"!()[]".includes(ch)) px += 3;
      else px += 7;
    }
    return Math.round(px);
  };

  const includesLoose = (haystack, needle) => {
    if (!needle) return false;
    return lc(haystack).includes(lc(needle));
  };

  // Find phone numbers loosely in text
  const normalizePhone = (p) => lc(p).replace(/[^\d]/g, "");
  const phoneMatches = (text, phone) => {
    if (!phone) return false;
    const t = normalizePhone(text);
    const p = normalizePhone(phone);
    return p.length >= 7 && t.includes(p);
  };

  const addIssue = (issues, severity, area, issue, fix = "") =>
    issues.push({ Severity: severity, Area: area, Issue: issue, Fix: fix });

  const addCheck = (checks, category, item, pass, notes = "") =>
    checks.push({ Category: category, Check: item, Status: pass ? "✅ Pass" : "❌ Flag", Notes: notes });

  // ---------- Config prompts (quick inputs for NAP + keyword rules) ----------
  const cfg = (() => {
    const ask = (label, def = "") => {
      const v = window.prompt(label, def);
      return norm(v ?? "");
    };

    // Keep prompts minimal so it doesn't feel annoying during audits
    const targetKeyword = ask("Target keyword for THIS page? (e.g., house washing san antonio tx)", "");
    const businessName = ask("Business name (GBP exact if possible)", "");
    const phone = ask("Business phone (GBP)", "");
    const addressOrServiceArea = ask("Business address OR service area text (GBP)", "");
    const locationTerm = ask("Primary city/state term to look for (optional)", "");

    return { targetKeyword, businessName, phone, addressOrServiceArea, locationTerm };
  })();

  // ---------- Page basics ----------
  const page = {
    url: location.href,
    host: location.hostname,
    title: norm(document.title),
    titleChars: norm(document.title).length,
    titlePx: estimatePx(document.title),
    metaDescription: norm($('meta[name="description"]')?.getAttribute("content") || ""),
    descChars: norm($('meta[name="description"]')?.getAttribute("content") || "").length,
    descPx: estimatePx($('meta[name="description"]')?.getAttribute("content") || ""),
    viewport: norm($('meta[name="viewport"]')?.getAttribute("content") || ""),
    lang: norm(document.documentElement.getAttribute("lang") || ""),
    canonicalTags: $$('link[rel="canonical"]'),
    canonical: toAbs($('link[rel="canonical"]')?.getAttribute("href") || ""),
    robots: norm($('meta[name="robots"]')?.getAttribute("content") || ""),
    googlebot: norm($('meta[name="googlebot"]')?.getAttribute("content") || "")
  };

  const robotsCombined = norm([page.robots, page.googlebot].filter(Boolean).join(", "));
  const noindex = /noindex/i.test(robotsCombined);
  const nofollow = /nofollow/i.test(robotsCombined);
  const indexable = robotsCombined ? !noindex : true;
  const followable = robotsCombined ? !nofollow : true;

  // ---------- SOP: Meta/Technical Review ----------
  const meta = {
    Indexable: indexable,
    Followable: followable,
    Canonical: page.canonical || "(missing)",
    "Canonical count": page.canonicalTags.length,
    "Canonical valid": !!page.canonical && isHttpUrl(page.canonical),
    "Canonical same host": !!page.canonical && sameHost(page.canonical),
    Title: page.title || "(missing)",
    "Title chars": page.titleChars,
    "Title px(est)": page.title ? page.titlePx : 0,
    Description: page.metaDescription || "(missing)",
    "Desc chars": page.descChars,
    "Desc px(est)": page.metaDescription ? page.descPx : 0,
    Robots: robotsCombined || "(missing)",
    Viewport: page.viewport || "(missing)",
    Lang: page.lang || "(missing)"
  };

  // ---------- Headings ----------
  const headingRows = [];
  const headingsByLevel = {};
  for (let i = 1; i <= 6; i++) {
    const tag = `h${i}`;
    const nodes = $$(tag);
    const texts = nodes.map(n => norm(n.textContent)).filter(Boolean);
    headingsByLevel[tag] = { count: nodes.length, texts };
    headingRows.push({
      Level: tag.toUpperCase(),
      Count: nodes.length,
      Samples: texts.slice(0, 6).join(" | ") || "(none)"
    });
  }
  const h1Count = headingsByLevel.h1.count;

  // ---------- Content + NAP checks ----------
  const bodyText = norm(document.body?.innerText || "");
  const contentLength = bodyText.length;

  // Try to identify header/footer text (best-effort)
  const headerText = norm($("header")?.innerText || "");
  const footerText = norm($("footer")?.innerText || "");

  const nap = {
    "Business name found (body)": cfg.businessName ? includesLoose(bodyText, cfg.businessName) : null,
    "Phone found (body)": cfg.phone ? phoneMatches(bodyText, cfg.phone) : null,
    "Address/Service Area found (body)": cfg.addressOrServiceArea ? includesLoose(bodyText, cfg.addressOrServiceArea) : null,
    "Business name found (footer)": cfg.businessName ? includesLoose(footerText, cfg.businessName) : null,
    "Phone found (footer)": cfg.phone ? phoneMatches(footerText, cfg.phone) : null,
    "Address/Service Area found (footer)": cfg.addressOrServiceArea ? includesLoose(footerText, cfg.addressOrServiceArea) : null,
  };

  // =========================================================
  // PHONE NUMBER FINDER (lists + highlights + mismatch checks)
  // =========================================================
  const digitsOnly = (s) => (s || "").replace(/[^\d]/g, "");

  // US-focused phone regex (tune if needed)
  const phoneRegex =
    /(?:\+?1[\s.-]?)?(?:\(\s*\d{3}\s*\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

  const findNodesContaining = (needle) => {
    if (!needle) return [];
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const t = node.nodeValue;
        if (!t) return NodeFilter.FILTER_REJECT;
        return t.includes(needle) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      const el = n.parentElement;
      if (el) results.push(el);
      if (results.length >= 6) break;
    }
    return results;
  };

  // 1) tel: links (reliable)
  const telLinks = $$('a[href^="tel:"]').map(a => {
    const rawHref = norm(a.getAttribute("href") || "");
    const cleaned = rawHref.replace(/^tel:/i, "");
    return {
      source: "tel: link",
      raw: rawHref,
      displayText: norm(a.textContent),
      digits: digitsOnly(cleaned),
      elements: [a]
    };
  });

  // 2) matches in visible body text
  const textMatches = (document.body?.innerText || "").match(phoneRegex) || [];
  const textRecords = textMatches.map(m => {
    const raw = norm(m);
    return {
      source: "page text",
      raw,
      displayText: raw,
      digits: digitsOnly(raw),
      elements: findNodesContaining(raw)
    };
  });

  // Combine + dedupe by digits
  const phoneRecords = [...telLinks, ...textRecords]
    .filter(r => r.digits.length >= 10)
    .reduce((acc, r) => {
      const key = r.digits;
      if (!acc.map.has(key)) {
        acc.map.set(key, r);
      } else {
        // merge element refs
        const existing = acc.map.get(key);
        existing.elements = uniq([...(existing.elements || []), ...(r.elements || [])]);
        existing.source = existing.source === r.source ? existing.source : `${existing.source} + ${r.source}`;
      }
      return acc;
    }, { map: new Map() });

  const phonesFound = [...phoneRecords.map.values()].map(r => ({
    ...r,
    digits: r.digits.startsWith("1") && r.digits.length === 11 ? r.digits.slice(1) : r.digits // normalize +1
  }));

  const phoneTable = {
    "Unique phone numbers found": phonesFound.length,
    "tel: links found": telLinks.length,
    "Phone matches in page text": textMatches.length
  };

  // Highlight found elements
  const highlightEls = (els) => {
    (els || []).filter(Boolean).forEach(el => {
      el.style.outline = "3px solid #ffcc00";
      el.style.outlineOffset = "2px";
      el.dataset.phoneHighlight = "true";
    });
  };
  const toHighlight = uniq(phonesFound.flatMap(r => r.elements || []));
  highlightEls(toHighlight);

  window.__clearPhoneHighlights = () => {
    document.querySelectorAll("[data-phone-highlight='true']").forEach(el => {
      el.style.outline = "";
      el.style.outlineOffset = "";
      delete el.dataset.phoneHighlight;
    });
    console.log("Cleared phone highlights.");
  };

  // Phone mismatch check vs GBP phone input
  const expectedDigits = cfg.phone ? digitsOnly(cfg.phone) : "";
  const normalizedExpected = expectedDigits.startsWith("1") && expectedDigits.length === 11 ? expectedDigits.slice(1) : expectedDigits;

  const foundDigitsSet = new Set(phonesFound.map(p => p.digits));
  const hasExpectedPhoneOnPage = normalizedExpected ? foundDigitsSet.has(normalizedExpected) : null;

  // Flag if multiple different numbers appear
  const multiplePhones = phonesFound.length > 1;
  const otherPhones = normalizedExpected
    ? phonesFound.filter(p => p.digits !== normalizedExpected)
    : phonesFound;

  // ---------- Links (SEO Minion style checks) ----------
  const anchors = $$("a");
  const hrefRaw = anchors.map(a => norm(a.getAttribute("href") || ""));
  const absUrls = anchors
    .map(a => ({ a, raw: norm(a.getAttribute("href") || ""), abs: toAbs(a.getAttribute("href") || "") }))
    .filter(x => x.raw);

  const internal = absUrls.filter(x => x.abs && sameHost(x.abs));
  const external = absUrls.filter(x => x.abs && !sameHost(x.abs) && /^https?:/i.test(x.abs));
  const mailto = absUrls.filter(x => /^mailto:/i.test(x.raw));
  const tel = absUrls.filter(x => /^tel:/i.test(x.raw));
  const jsLinks = absUrls.filter(x => /^javascript:/i.test(x.raw));
  const hashOnly = absUrls.filter(x => /^#/.test(x.raw));

  // Duplicate anchor text linking repeatedly (common footer issue)
  const anchorTextPairs = absUrls
    .map(x => ({ text: norm(x.a.textContent), abs: x.abs }))
    .filter(x => x.text && x.abs);

  const anchorTextCounts = anchorTextPairs.reduce((acc, { text }) => {
    const key = lc(text);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const repeatedAnchorTexts = Object.entries(anchorTextCounts)
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([text, count]) => ({ anchorText: text.slice(0, 80), count }));

  // External rel hygiene
  const extTargetBlank = external.filter(x => x.a.target === "_blank");
  const missingNoopener = extTargetBlank.filter(x => !/\bnoopener\b/i.test(x.a.rel || ""));
  const missingNoreferrer = extTargetBlank.filter(x => !/\bnoreferrer\b/i.test(x.a.rel || ""));
  const extNofollow = external.filter(x => /\bnofollow\b/i.test(x.a.rel || ""));

  // HTTP links
  const httpLinks = absUrls.filter(x => x.abs && safeURL(x.abs)?.protocol === "http:");

  // Internal links missing? (service pages sometimes have near-zero contextual links)
  const internalCount = internal.length;
  const hasInternalLinks = internalCount > 0;

  const linkTable = {
    "Total links (<a>)": anchors.length,
    "Internal links": internal.length,
    "External links": external.length,
    "mailto:": mailto.length,
    "tel:": tel.length,
    "javascript:": jsLinks.length,
    "hash-only (#)": hashOnly.length,
    "External nofollow": extNofollow.length,
    "HTTP links": httpLinks.length,
    "target=_blank missing noopener": missingNoopener.length,
    "target=_blank missing noreferrer": missingNoreferrer.length,
    "Repeated anchor texts (>=5)": repeatedAnchorTexts.length
  };

  // ---------- Images + alt text (Web Dev tool style checks) ----------
  const imgs = $$("img");

  const imgRecords = imgs.map(img => {
    const alt = img.getAttribute("alt");
    const altNorm = norm(alt);
    const isIcon = (() => {
      // heuristic: class name / filename / aria hint
      const cls = lc(img.className || "");
      const src = lc(img.currentSrc || img.src || img.getAttribute("src") || "");
      return cls.includes("icon") || src.includes("icon") || src.includes("sprite") || src.endsWith(".svg");
    })();

    const wAttr = img.getAttribute("width");
    const hAttr = img.getAttribute("height");
    const hasSize = (!!wAttr && !!hAttr) || (!!img.width && !!img.height);

    const src = norm(img.currentSrc || img.src || img.getAttribute("src") || "");
    const nw = Number(img.naturalWidth || img.width || wAttr || 0);
    const nh = Number(img.naturalHeight || img.height || hAttr || 0);

    const usesKeywordAlt = cfg.targetKeyword ? includesLoose(altNorm, cfg.targetKeyword) : false;

    return {
      src: src.slice(0, 140),
      alt: alt === null ? "(missing)" : altNorm || '"" (empty)',
      isIcon,
      hasSize,
      w: nw,
      h: nh,
      keywordAlt: usesKeywordAlt
    };
  });

  const missingAlt = imgRecords.filter(r => r.alt === "(missing)");
  const emptyAlt = imgRecords.filter(r => r.alt.includes("(empty)"));
  const missingSize = imgRecords.filter(r => !r.hasSize);
  const brokenCandidates = imgs.filter(img => img.complete && img.naturalWidth === 0); // best-effort
  const iconWithKeywordAlt = imgRecords.filter(r => r.isIcon && r.keywordAlt);

  const imageTable = {
    "Total images": imgs.length,
    "Missing alt attribute": missingAlt.length,
    'Empty alt ("")': emptyAlt.length,
    "Missing width/height": missingSize.length,
    "Broken image candidates": brokenCandidates.length,
    "Icons w/ keyword alt (should NOT)": iconWithKeywordAlt.length
  };

  // ---------- Schema / FAQ / rich plugin hints ----------
  const jsonLdScripts = $$('script[type="application/ld+json"]');
  const jsonLdTypes = [];
  const jsonLdErrors = [];

  const collectTypes = (obj) => {
    if (!obj) return;
    if (Array.isArray(obj)) return obj.forEach(collectTypes);
    if (typeof obj === "object") {
      if (obj["@type"]) jsonLdTypes.push(obj["@type"]);
      for (const k of Object.keys(obj)) collectTypes(obj[k]);
    }
  };

  jsonLdScripts.forEach(s => {
    try {
      const data = JSON.parse(s.textContent || "null");
      collectTypes(data);
    } catch (e) {
      jsonLdErrors.push("Invalid JSON-LD block");
    }
  });

  const schemaTypesUnique = uniq(jsonLdTypes.flatMap(t => Array.isArray(t) ? t : [t]).map(String));
  const hasFAQSchema = schemaTypesUnique.some(t => lc(t).includes("faqpage"));
  const hasLocalBusiness = schemaTypesUnique.some(t => lc(t).includes("localbusiness"));
  const hasOrganization = schemaTypesUnique.some(t => lc(t).includes("organization"));

  const schemaTable = {
    "JSON-LD blocks": jsonLdScripts.length,
    "JSON-LD parse issues": jsonLdErrors.length,
    "Types (unique, top 20)": schemaTypesUnique.slice(0, 20).join(" | ") || "(none detected)",
    "FAQ schema detected": hasFAQSchema
  };

  // ---------- CTAs (older accounts missing) ----------
  const ctaPhrases = [
    "get a free quote",
    "call now",
    "request a quote",
    "book now",
    "schedule",
    "contact us",
    "free estimate"
  ];
  const ctaFound = ctaPhrases.filter(p => lc(bodyText).includes(p));
  const ctaButtons = $$("a, button").filter(el => {
    const t = lc(el.textContent || "");
    return ctaPhrases.some(p => t.includes(p));
  });

  // ---------- Footer checks (NAP + social links follow) ----------
  const socialDomains = ["facebook.com", "instagram.com", "youtube.com", "tiktok.com", "x.com", "twitter.com", "linkedin.com"];
  const footerLinks = $$("footer a").map(a => ({
    text: norm(a.textContent),
    href: toAbs(a.getAttribute("href") || ""),
    rel: norm(a.getAttribute("rel") || "")
  })).filter(x => x.href);

  const socialLinks = footerLinks.filter(x => socialDomains.some(d => x.href.includes(d)));
  const socialNofollow = socialLinks.filter(x => /\bnofollow\b/i.test(x.rel));

  // Address link points to GBP listing? (best-effort)
  const possibleGbpLinks = footerLinks.filter(x =>
    x.href.includes("google.com/maps") || x.href.includes("goo.gl/maps") || x.href.includes("g.page") || x.href.includes("business.google.com")
  );

  // ---------- Map embed hints (location pages) ----------
  const mapIframes = $$('iframe[src*="google.com/maps"], iframe[src*="www.google.com/maps"]');
  const mapTable = {
    "Google Maps iframes": mapIframes.length,
    "GBP/maps links (footer)": possibleGbpLinks.length
  };

  // ---------- Issues + Checklist ----------
  const issues = [];
  const checks = [];

  // A) URL & Indexing
  addCheck(checks, "Meta & Technical", "Page indexable (noindex not present)", indexable, robotsCombined ? robotsCombined : "No meta robots found (often OK)");
  addCheck(checks, "Meta & Technical", "Page followable (nofollow not present)", followable, robotsCombined ? robotsCombined : "No meta robots found (often OK)");

  if (!indexable) addIssue(issues, "High", "Meta & Technical", "Page is set to NOINDEX.", "Remove noindex if this page should rank.");
  if (!followable) addIssue(issues, "Med", "Meta & Technical", "Page is set to NOFOLLOW.", "Remove nofollow unless intentionally blocking link equity.");

  // Canonical
  const canonicalValid = !!page.canonical && isHttpUrl(page.canonical);
  const canonicalCountOk = page.canonicalTags.length <= 1;
  addCheck(checks, "Meta & Technical", "Canonical present", !!page.canonical, page.canonical || "Missing canonical");
  addCheck(checks, "Meta & Technical", "Single canonical tag", canonicalCountOk, `Found ${page.canonicalTags.length}`);
  addCheck(checks, "Meta & Technical", "Canonical is valid absolute URL", canonicalValid, page.canonical || "(missing)");

  if (!page.canonical) addIssue(issues, "Med", "Canonical", "Missing canonical URL.", "Add canonical to reduce duplicate URL risk.");
  if (!canonicalCountOk) addIssue(issues, "Med", "Canonical", "Multiple canonical tags found.", "Keep only one canonical per page.");
  if (page.canonical && !canonicalValid) addIssue(issues, "High", "Canonical", "Canonical is not a valid http(s) URL.", "Use an absolute http(s) canonical URL.");

  // B) Meta Title
  const titleOk = !!page.title;
  const titleHasKeyword = cfg.targetKeyword ? includesLoose(page.title, cfg.targetKeyword) : null;
  const titleNotTooWide = page.title ? page.titlePx <= 580 : false; // heuristic
  addCheck(checks, "Meta Title", "Title present", titleOk, page.title || "(missing)");
  if (cfg.targetKeyword) addCheck(checks, "Meta Title", "Title includes primary keyword", !!titleHasKeyword, `Keyword: ${cfg.targetKeyword}`);
  addCheck(checks, "Meta Title", "Title not likely truncated (px est.)", titleNotTooWide, `px est: ${page.titlePx}`);

  if (!titleOk) addIssue(issues, "High", "Meta Title", "Missing <title> tag.", "Add a unique, descriptive title.");
  if (cfg.targetKeyword && !titleHasKeyword) addIssue(issues, "Med", "Meta Title", "Title missing target keyword (based on your input).", "Include primary keyword naturally.");
  if (page.title && !titleNotTooWide) addIssue(issues, "Low", "Meta Title", "Title likely too wide and may truncate.", "Shorten or front-load key terms.");

  // C) Meta Description SOP (name, phone, location, service)
  const descOk = !!page.metaDescription;
  const descHasName = cfg.businessName ? includesLoose(page.metaDescription, cfg.businessName) : null;
  const descHasPhone = cfg.phone ? phoneMatches(page.metaDescription, cfg.phone) : null;
  const descHasLocation = cfg.locationTerm ? includesLoose(page.metaDescription, cfg.locationTerm) : null;

  addCheck(checks, "Meta Description", "Meta description present", descOk, page.metaDescription || "(missing)");
  if (cfg.businessName) addCheck(checks, "Meta Description", "Description includes business name", !!descHasName, cfg.businessName);
  if (cfg.phone) addCheck(checks, "Meta Description", "Description includes phone", !!descHasPhone, cfg.phone);
  if (cfg.locationTerm) addCheck(checks, "Meta Description", "Description includes location term", !!descHasLocation, cfg.locationTerm);
  addCheck(checks, "Meta Description", "Description length reasonable (70-170 chars)", page.descChars >= 70 && page.descChars <= 170, `chars: ${page.descChars}`);

  if (!descOk) addIssue(issues, "Med", "Meta Description", "Missing meta description.", "Add a unique description that supports CTR.");
  if (descOk && (page.descChars < 70 || page.descChars > 170))
    addIssue(issues, "Low", "Meta Description", "Meta description length outside recommended range.", "Aim ~70–170 chars (avoid truncation).");

  // D) Heading Structure
  addCheck(checks, "Headings", "Exactly one H1", h1Count === 1, `H1 count: ${h1Count}`);
  if (h1Count === 0) addIssue(issues, "Med", "Headings", "No H1 found.", "Add one descriptive H1 aligned to the page intent.");
  if (h1Count > 1) addIssue(issues, "Low", "Headings", "Multiple H1s found.", "Usually OK, but simplify if structure feels messy.");

  // Internal links / anchor text
  addCheck(checks, "Links", "Has internal links", hasInternalLinks, `Internal: ${internal.length}`);
  addCheck(checks, "Links", "No HTTP links", httpLinks.length === 0, `HTTP count: ${httpLinks.length}`);
  addCheck(checks, "Links", "No javascript: links", jsLinks.length === 0, `javascript: count: ${jsLinks.length}`);
  addCheck(checks, "Links", "Repeated anchor text not excessive", repeatedAnchorTexts.length === 0, repeatedAnchorTexts.length ? "See repeated anchor texts table" : "Good");

  if (!hasInternalLinks) addIssue(issues, "Med", "Links", "No internal links detected.", "Add contextual internal links (service pages should link to related services/locations/contact).");
  if (httpLinks.length) addIssue(issues, "Med", "Links", "HTTP links detected.", "Update to HTTPS where possible.");
  if (jsLinks.length) addIssue(issues, "Med", "Links", "javascript: links detected.", "Replace with real URLs or proper buttons (accessibility + SEO).");

  // Image & alt
  addCheck(checks, "Images", "No missing alt attributes", missingAlt.length === 0, `Missing alt: ${missingAlt.length}`);
  addCheck(checks, "Images", "Icons do NOT use keyword alt", iconWithKeywordAlt.length === 0, `Icons w/ keyword alt: ${iconWithKeywordAlt.length}`);
  addCheck(checks, "Images", "No broken images detected (best-effort)", brokenCandidates.length === 0, `Broken candidates: ${brokenCandidates.length}`);
  addCheck(checks, "Images", "Width/height set (CLS help)", missingSize.length === 0, `Missing size: ${missingSize.length}`);

  if (missingAlt.length) addIssue(issues, "Med", "Images", `${missingAlt.length} image(s) missing alt attribute.`, 'Add alt text or alt="" for decorative images.');
  if (iconWithKeywordAlt.length) addIssue(issues, "Med", "Images", "Icons appear to have keyword-based alt text (should not).", "Remove keyword alt from icons; reserve keyword alt for relevant photos.");
  if (brokenCandidates.length) addIssue(issues, "High", "Images", "Broken images detected (naturalWidth=0).", "Fix media URLs/uploads; replace or remove broken elements.");
  if (missingSize.length) addIssue(issues, "Low", "Images", "Some images missing width/height attributes (CLS risk).", "Add explicit dimensions or CSS aspect-ratio.");

  // NAP verification (expected phone string match)
  if (cfg.businessName) addCheck(checks, "NAP", "Business name present on page", nap["Business name found (body)"], "Body scan");
  if (cfg.phone) addCheck(checks, "NAP", "Phone present on page (string match)", nap["Phone found (body)"], "Body scan");
  if (cfg.addressOrServiceArea) addCheck(checks, "NAP", "Address/Service area present on page", nap["Address/Service Area found (body)"], "Body scan");

  if (cfg.businessName && !nap["Business name found (body)"]) addIssue(issues, "Med", "NAP", "Business name not found in page text (based on your input).", "Confirm NAP placement in header/footer/contact sections.");
  if (cfg.phone && !nap["Phone found (body)"]) addIssue(issues, "Med", "NAP", "Phone not found in page text (based on your input).", "Confirm phone appears in header/footer/contact and matches GBP.");
  if (cfg.addressOrServiceArea && !nap["Address/Service Area found (body)"]) addIssue(issues, "Low", "NAP", "Address/service area text not found in page text (based on your input).", "Confirm consistency in footer/contact/location sections.");

  // PHONE QA checks (new)
  addCheck(checks, "Phone Numbers", "At least 1 phone number found on page", phonesFound.length > 0, `Found: ${phonesFound.length}`);
  if (cfg.phone) addCheck(checks, "Phone Numbers", "Expected GBP phone appears among detected numbers", !!hasExpectedPhoneOnPage, normalizedExpected ? `Expected digits: ${normalizedExpected}` : "No expected phone provided");
  addCheck(checks, "Phone Numbers", "No multiple different phone numbers (potential inconsistency)", !multiplePhones, multiplePhones ? "Multiple unique numbers detected—review table" : "Single number detected");

  if (phonesFound.length === 0) addIssue(issues, "Med", "Phone Numbers", "No phone-like numbers detected on the page.", "Confirm phone is visible and/or add tel: link.");
  if (cfg.phone && hasExpectedPhoneOnPage === false) {
    addIssue(issues, "High", "Phone Numbers", "Expected GBP phone NOT found among detected phone numbers.", "Fix NAP consistency; update header/footer/buttons and tel: links.");
  }
  if (multiplePhones) {
    addIssue(
      issues,
      "Med",
      "Phone Numbers",
      "Multiple different phone numbers detected on page (possible NAP inconsistency).",
      normalizedExpected
        ? `Expected: ${normalizedExpected}. Review other numbers: ${otherPhones.map(p => p.digits).join(", ")}`
        : "Review and confirm which number should be used sitewide."
    );
  }

  // CTA checks
  addCheck(checks, "CTAs", "CTA text present (Get a Free Quote / Call Now / etc.)", ctaFound.length > 0 || ctaButtons.length > 0, ctaFound.length ? `Found: ${ctaFound.join(", ")}` : `Buttons found: ${ctaButtons.length}`);
  if (ctaFound.length === 0 && ctaButtons.length === 0)
    addIssue(issues, "Low", "CTAs", "No common CTA phrases detected.", 'Add/ensure CTAs: "Get a Free Quote", "Call Now", buttons top/mid/bottom.');

  // Schema/FAQ checks
  addCheck(checks, "Schema", "JSON-LD present", jsonLdScripts.length > 0, `Blocks: ${jsonLdScripts.length}`);
  addCheck(checks, "Schema", "FAQ schema detected (if page has FAQs)", hasFAQSchema, schemaTypesUnique.slice(0, 8).join(" | ") || "No types detected");
  if (jsonLdErrors.length) addIssue(issues, "Med", "Schema", "Invalid JSON-LD detected.", "Fix JSON-LD formatting (must be valid JSON).");
  if (!jsonLdScripts.length) addIssue(issues, "Low", "Schema", "No JSON-LD detected.", "Consider adding schema (Organization/LocalBusiness/Service/FAQPage where appropriate).");

  // Footer/social follow
  addCheck(checks, "Footer", "Footer exists", !!$("footer"), $("footer") ? "Footer found" : "No <footer> tag found");
  addCheck(checks, "Footer", "Social links not set to nofollow", socialNofollow.length === 0, `Social links: ${socialLinks.length}, nofollow: ${socialNofollow.length}`);
  if (socialNofollow.length) addIssue(issues, "Low", "Footer", "Some social links are nofollow.", "If SOP requires follow, remove nofollow from social links.");

  // Map hints
  addCheck(checks, "Location Pages", "Google map embed present (if location page)", mapIframes.length > 0 || possibleGbpLinks.length > 0, `iframes: ${mapIframes.length}, links: ${possibleGbpLinks.length}`);

  // ---------- Output formatting ----------
  const severityRank = { High: 0, Med: 1, Low: 2 };

  console.clear?.();

  console.group("%cPWMP Website Audit & QA Report", "font-weight:bold; font-size: 14px;");
  console.log("URL:", page.url);
  console.log("Inputs:", cfg);
  console.groupEnd();

  console.group("%c1) Meta & Technical SEO Review", "font-weight:bold;");
  console.table(meta);
  console.groupEnd();

  console.group("%c2) Heading Structure (H1–H6)", "font-weight:bold;");
  console.table(headingRows);
  console.groupEnd();

  console.group("%c3) Links (Internal/External/Anchors)", "font-weight:bold;");
  console.table(linkTable);
  if (repeatedAnchorTexts.length) {
    console.log("Repeated anchor texts (possible bottom-section duplication):");
    console.table(repeatedAnchorTexts);
  }
  if (httpLinks.length) {
    console.log("HTTP links (sample up to 20):");
    console.table(httpLinks.slice(0, 20).map(x => ({ href: x.abs, text: norm(x.a.textContent).slice(0, 60) })));
  }
  console.groupEnd();

  console.group("%c4) Images & Alt Text", "font-weight:bold;");
  console.table(imageTable);
  if (missingAlt.length) console.table(missingAlt.slice(0, 20).map(r => ({ src: r.src, alt: r.alt, isIcon: r.isIcon })));
  if (iconWithKeywordAlt.length) console.table(iconWithKeywordAlt.slice(0, 20).map(r => ({ src: r.src, alt: r.alt })));
  console.groupEnd();

  console.group("%c5) NAP Verification (best-effort)", "font-weight:bold;");
  console.table(nap);
  console.groupEnd();

  // NEW PHONE SECTION
  console.group("%c5B) Phone Numbers Found (scan + highlight)", "font-weight:bold;");
  console.table(phoneTable);
  if (phonesFound.length) {
    console.log("Unique phone numbers found (deduped by digits):");
    console.table(phonesFound.map(p => ({
      digits: p.digits,
      source: p.source,
      raw: p.raw,
      displayText: p.displayText,
      occurrencesFound: (p.elements || []).length
    })));
    if (cfg.phone) console.log("Expected (GBP) phone digits:", normalizedExpected || "(none provided)");
    console.log("Highlighted elements containing phone numbers (outline).");
    console.log("To remove highlights, run: window.__clearPhoneHighlights()");
  }
  console.groupEnd();

  console.group("%c6) Schema / FAQ / Structured Data", "font-weight:bold;");
  console.table(schemaTable);
  console.groupEnd();

  console.group("%c7) Map / Footer / Social (best-effort)", "font-weight:bold;");
  console.table({ ...mapTable, "Footer social links": socialLinks.length, "Footer social nofollow": socialNofollow.length });
  console.groupEnd();

  console.group("%cQA Checklist (Pass/Flag)", "font-weight:bold;");
  console.table(checks);
  console.groupEnd();

  console.group("%cIssues & Flagging Protocol (SEO vs Web)", "font-weight:bold;");
  const sortedIssues = issues.sort((a, b) => (severityRank[a.Severity] ?? 9) - (severityRank[b.Severity] ?? 9));
  console.table(sortedIssues);

  const seoTeamKeywords = ["duplicate content", "metadata", "schema", "internal links", "keyword", "nap", "canonical", "noindex", "nofollow", "phone"];
  const webTeamKeywords = ["layout", "broken images", "media", "plugin", "map", "navigation", "padding", "margins", "button"];

  const route = (iss) => {
    const s = lc(`${iss.Area} ${iss.Issue}`);
    const seo = seoTeamKeywords.some(k => s.includes(lc(k)));
    const web = webTeamKeywords.some(k => s.includes(lc(k)));
    if (web && !seo) return "Web Team";
    if (seo && !web) return "SEO Team";
    return "SEO/Web (confirm)";
  };

  if (sortedIssues.length) {
    console.log("Routing suggestions:");
    console.table(sortedIssues.map(i => ({ ...i, Route: route(i) })));
  } else {
    console.log("No issues flagged 🎉");
  }
  console.groupEnd();

  console.log("Page Content Length (characters):", contentLength);

  // ---------- Optional: Markdown summary to copy ----------
  const md = (() => {
    const topIssues = sortedIssues.slice(0, 10);
    const passCount = checks.filter(c => c.Status.includes("Pass")).length;
    const flagCount = checks.length - passCount;

    return [
      `# Website Audit & QA Summary`,
      ``,
      `**URL:** ${page.url}`,
      `**Keyword:** ${cfg.targetKeyword || "(not provided)"}`,
      ``,
      `## Snapshot`,
      `- Indexable: **${indexable ? "Yes" : "No"}**`,
      `- Followable: **${followable ? "Yes" : "No"}**`,
      `- Canonical: **${page.canonical || "(missing)"}**`,
      `- H1 count: **${h1Count}**`,
      `- Internal links: **${internal.length}** | External links: **${external.length}** | HTTP links: **${httpLinks.length}**`,
      `- Images: **${imgs.length}** | Missing alt: **${missingAlt.length}** | Broken candidates: **${brokenCandidates.length}**`,
      `- Phones found: **${phonesFound.length}**${cfg.phone ? ` | Expected present: **${hasExpectedPhoneOnPage ? "Yes" : "No"}**` : ""}`,
      `- JSON-LD blocks: **${jsonLdScripts.length}** | FAQ schema: **${hasFAQSchema ? "Yes" : "No"}**`,
      ``,
      `## QA Checklist Result`,
      `- ✅ Pass: **${passCount}**`,
      `- ❌ Flag: **${flagCount}**`,
      ``,
      `## Top Issues (first 10)`,
      ...(topIssues.length
        ? topIssues.map(i => `- **[${i.Severity}] ${i.Area}:** ${i.Issue}${i.Fix ? ` _(Fix: ${i.Fix})_` : ""}`)
        : [`- None`]),
      ``,
      `## Phone Numbers Found`,
      ...(phonesFound.length
        ? phonesFound.map(p => `- ${p.digits} (${p.source})`)
        : [`- None detected`]),
      ``,
      `## Notes`,
      `- Tools outside browser script (manual): Siteliner (duplicate content), Screaming Frog (crawl + internal link structure), Redirect Path (redirect chains), GBP (reviews/NAP/hours/map type).`
    ].join("\n");
  })();

  console.group("%cCopy/Paste Summary", "font-weight:bold;");
  console.log(md);
  console.log("Tip: run `copy($0)` in Chrome DevTools on the log selection, or use the function below.");
  console.groupEnd();

  // Provide a helper to copy markdown
  window.PWMP_AUDIT = {
    cfg,
    page,
    meta,
    headingRows,
    linkTable,
    imageTable,
    schemaTable,
    nap,
    phonesFound,          // <-- NEW
    phoneTable,           // <-- NEW
    clearPhoneHighlights: () => window.__clearPhoneHighlights?.(), // <-- NEW
    checks,
    issues: sortedIssues,
    markdown: md,
    copyMarkdown: async () => {
      try {
        await navigator.clipboard.writeText(md);
        console.log("✅ Copied audit markdown to clipboard.");
      } catch (e) {
        console.warn("Could not copy automatically. You can manually copy from the console output.");
      }
    }
  };

  console.log("%cAudit object available as window.PWMP_AUDIT", "font-weight:bold;");
  console.log("Run: PWMP_AUDIT.copyMarkdown() to copy the markdown summary.");
  console.log("Run: PWMP_AUDIT.clearPhoneHighlights() to remove phone highlights.");
})();
