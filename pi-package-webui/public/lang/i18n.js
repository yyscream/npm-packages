/**
 * Pi Web UI - Internationalization (i18n) Support
 *
 * Detects browser language, loads translations, and patches the UI.
 * Supports URL parameter ?lang=zh to override browser language.
 *
 * Usage:
 *   <script src="/lang/i18n.js"></script>
 *   <script src="/app.js"></script>
 *
 *   In HTML: <span data-i18n="Settings">Settings</span>
 *   In JS:   make('button', 'cls', t('Send'))
 */

(function () {
  "use strict";

  // --- 1. Detect Language ---
  function detectLanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = urlParams.get("lang");
    if (langParam) return langParam;

    const navLang = (navigator.language || "").toLowerCase();
    if (navLang.startsWith("zh")) return "zh";
    if (navLang.startsWith("ja")) return "ja";
    if (navLang.startsWith("ko")) return "ko";
    return "en";
  }

  const LANG = detectLanguage();
  const DEFAULT_LANG = "en";

  // --- 2. Translation Table ---
  let translations = {};

  async function loadTranslations() {
    try {
      const langFile = LANG === DEFAULT_LANG ? "en" : LANG;
      const resp = await fetch(`/lang/${langFile}.json`);
      if (resp.ok) {
        translations = await resp.json();
      } else {
        // Fallback to en
        const fallbackResp = await fetch("/lang/en.json");
        if (fallbackResp.ok) {
          translations = await fallbackResp.json();
        }
      }
    } catch (e) {
      console.warn("[i18n] Failed to load translations:", e.message);
    }
  }

  // --- 3. Translation Function ---
  function t(key) {
    if (!key || typeof key !== "string") return key || "";
    // Return translation if available, otherwise return the original key
    return translations[key] || key;
  }

  // --- 4. DOM Translation ---
  function translateDOM() {
    // Translate all elements with data-i18n attribute
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const translated = t(key);
      if (translated !== key) {
        // For input/textarea elements, translate placeholder
        if (
          (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
          el.placeholder
        ) {
          el.placeholder = translated;
        } else {
          el.textContent = translated;
        }
      }
    });

    // Translate aria-label attributes
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      const translated = t(key);
      if (translated !== key) {
        el.setAttribute("aria-label", translated);
      }
    });

    // Translate title attributes
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      const translated = t(key);
      if (translated !== key) {
        el.setAttribute("title", translated);
      }
    });
  }

  // --- 5. Patch make() after app.js loads ---
  function patchMake() {
    if (typeof make !== "function") {
      // make() not loaded yet, wait and retry
      setTimeout(patchMake, 50);
      return;
    }

    const originalMake = make;
    make = function (tag, className, text) {
      const args = [tag, className];
      if (text !== undefined) {
        args.push(t(text));
      }
      return originalMake.apply(null, args);
    };
  }

  // --- 6. Watch for dynamically added elements ---
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let needsTranslate = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          needsTranslate = true;
          break;
        }
      }
      if (needsTranslate) {
        // Delay to let the app finish rendering
        setTimeout(translateNewElements, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function translateNewElements() {
    document
      .querySelectorAll("[data-i18n]:not([data-i18n-done])")
      .forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const translated = t(key);
        if (translated !== key) {
          if (
            (el.tagName === "INPUT" || el.tagName === "TEXTAREA") &&
            el.placeholder
          ) {
            el.placeholder = translated;
          } else {
            el.textContent = translated;
          }
        }
        el.setAttribute("data-i18n-done", "");
      });

    document
      .querySelectorAll("[data-i18n-aria]:not([data-i18n-done])")
      .forEach((el) => {
        const key = el.getAttribute("data-i18n-aria");
        el.setAttribute("aria-label", t(key));
        el.setAttribute("data-i18n-done", "");
      });

    document
      .querySelectorAll("[data-i18n-title]:not([data-i18n-done])")
      .forEach((el) => {
        el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
        el.setAttribute("data-i18n-done", "");
      });
  }

  // --- 7. Set lang attribute on HTML ---
  function setLangAttribute() {
    document.documentElement.lang = LANG;
  }

  // --- 8. Initialize ---
  async function init() {
    setLangAttribute();
    await loadTranslations();

    // Expose globals
    window.t = t;
    window.i18n = {
      lang: LANG,
      translations: translations,
      t: t,
    };

    // Translate static DOM
    translateDOM();

    // Patch make() after a short delay (app.js may not be loaded yet)
    setTimeout(patchMake, 200);

    // Watch for dynamic content
    if (document.body) {
      setupMutationObserver();
    } else {
      document.addEventListener("DOMContentLoaded", setupMutationObserver);
    }
  }

  // Run as early as possible
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
