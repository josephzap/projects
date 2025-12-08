# WordPress Site Speed Optimization (Code & Config Only)

This doc is focused on **specific settings and code snippets** for optimization on a typical **WordPress + Elementor + Astra** stack.

---

## 1. Fonts (Elementor as Font Boss)

### 1.1 Fallback Font Stack (CSS)

Use CSS variables to define font stacks with system font fallbacks to reduce layout shifts when webfonts load.

```css
:root {
  /* Font families with fallbacks to prevent layout shift when webfonts load */
  --ff-h: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI",
          Roboto, "Helvetica Neue", Arial, sans-serif;

  --ff-sh: "Roboto Condensed", "Arial Narrow", "Helvetica Condensed",
           Arial, sans-serif;

  --ff-b: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI",
          Roboto, "Helvetica Neue", Arial, sans-serif;

  --ff-body: "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
             "Helvetica Neue", Arial, sans-serif;
}

/* Apply font stacks */

body {
  font-family: var(--ff-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--ff-h);
}
```

---

## 2. Images (Critical LCP Images)

### 2.1 Force Above-the-Fold Images to `loading="eager"`

Use this when a lazy-loading plugin/theme is making your hero image / main banner image lazy, which can hurt **Largest Contentful Paint (LCP)**.

Adjust the selectors in `criticalSelectors` (e.g. `.banner-hp`, `.above-the-fold`) to match the actual hero/above-the-fold sections on the site.

Add this to `functions.php`:

```php
/**
 * Set critical images to eager loading for better LCP
 * This improves Largest Contentful Paint by loading above-the-fold images immediately
 */
function set_critical_images_eager_loading() {
  ?>
  <script>
  // Run immediately (or as early as possible) for critical images
  (function() {
    // Critical images that should load immediately (above-the-fold)
    var criticalSelectors = [
      'header img',
      '.banner-hp img',
      '.cm-banner img',
      '.above-the-fold img'
    ];

    function setEagerLoading() {
      criticalSelectors.forEach(function(selector) {
        var images = document.querySelectorAll(selector);
        images.forEach(function(img) {
          img.setAttribute('loading', 'eager');
        });
      });
    }

    // Run when DOM is ready, or immediately if already ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setEagerLoading);
    } else {
      setEagerLoading();
    }

    // Also run after a short delay to catch dynamically loaded images
    setTimeout(setEagerLoading, 100);
  })();
  </script>
  <?php
}
add_action( 'wp_head', 'set_critical_images_eager_loading', 10 );
```

---

## 3. Header Animation (CLS-Safe Fade-in)

Use this to fade in the header smoothly on page load **without causing layout shift** (CLS-safe).

JS adds a class (`header-loaded`) to `<body>` as soon as the DOM is ready; CSS handles the fade/slide with a fallback if JS fails.

### 3.1 PHP + JS (`functions.php`)

Add this to `functions.php`:

```php
add_action( 'wp_footer', function() { ?>
<script>
(function() {
  function showHeader() {
    // Avoid doing this twice
    if (document.body.classList.contains('header-loaded')) return;
    document.body.classList.add('header-loaded');
  }

  function initHeaderReveal() {
    // If browser supports the Font Loading API
    if (document.fonts && document.fonts.ready) {
      // Wait until all fonts are loaded
      document.fonts.ready.then(function() {
        showHeader();
      }).catch(function() {
        // If something goes wrong, still show the header
        showHeader();
      });

      // Safety timeout: show header anyway after 3s
      setTimeout(showHeader, 3000);
    } else {
      // Fallback for older browsers: wait for full page load
      if (document.readyState === 'complete') {
        showHeader();
      } else {
        window.addEventListener('load', showHeader);
      }

      // Extra safety fallback
      setTimeout(showHeader, 3000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeaderReveal);
  } else {
    initHeaderReveal();
  }
})();
</script>
<?php });
```

### 3.2 CSS (Additional CSS or Theme Stylesheet)

```css
/* Smooth header fade-in (Elementor header) */
header.elementor-location-header {
  opacity: 0;
  transition: opacity 0.6s ease-out;
  /* Optional: CSS-only fallback if JS totally fails */
  animation: header-fallback 0.1s 1.5s forwards;
}

body.header-loaded header.elementor-location-header {
  opacity: 1;
  animation: none; /* Disable fallback animation when JS works */
}

/* Fallback animation for when JavaScript doesn't load */
@keyframes header-fallback {
  to {
    opacity: 1;
  }
}
```

---

## 4. Header & Logo Sizing (Prevent Header CLS)

Lock in a predictable header height and logo size so the header doesn’t randomly grow/shrink as fonts, logos, or JS load (helps with CLS).

### 4.1 CSS

```css
:root {
  /* Header/layout sizing tokens */
  --header-max-height: 100px;
  --logo-max-height: 60px;
}

/* Constrain header height so it doesn't expand unexpectedly */
header {
  max-height: var(--header-max-height);
  overflow: hidden; /* prevent content from visually pushing beyond max-height */
}

/* Constrain logo size */
header img,
header .site-logo img,
header .custom-logo {
  max-height: var(--logo-max-height);
  height: auto;
  width: auto;
}
```
---

## 5. Disable animation for banner and above the fold elements

### 5.1 CSS

Use this when animations or transitions on the hero banner or above-the-fold sections are causing CLS or jank during page load (especially on cached pages or slower devices).

```css
/* Disable animations for all above-the-fold hero sections */
.cm-banner,
.cm-banner *:not(button):not(button *):not(a):not(a *):not([role="button"]):not([role="button"] *),
.above-the-fold,
.above-the-fold *:not(button):not(button *):not(a):not(a *):not([role="button"]):not([role="button"] *),
.hero,
.hero *:not(button):not(button *):not(a):not(a *):not([role="button"]):not([role="button"] *),
.hero-bg,
.hero-bg *:not(button):not(button *):not(a):not(a *):not([role="button"]):not([role="button"] *) {
  transition: none !important;
  animation: none !important;
}
```

---
