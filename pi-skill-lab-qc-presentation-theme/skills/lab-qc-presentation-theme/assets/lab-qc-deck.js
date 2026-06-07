(() => {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const deck = document.getElementById('deck');
  const progressBar = document.getElementById('progressBar');
  const slideNumber = document.getElementById('slideNumber');
  const slideTotal = document.getElementById('slideTotal');
  const overview = document.getElementById('overview');
  const overviewGrid = document.getElementById('overviewGrid');
  const overviewBtn = document.getElementById('overviewBtn');
  const closeOverview = document.getElementById('closeOverview');
  const notesBtn = document.getElementById('notesBtn');
  const printBtn = document.getElementById('printBtn');

  let current = 0;

  function slideFromHash() {
    const match = window.location.hash.match(/#(slide-)?(\d+)/i);
    if (!match) return 0;
    const idx = Number(match[2]) - 1;
    return Number.isFinite(idx) ? Math.min(Math.max(idx, 0), slides.length - 1) : 0;
  }

  function updateOverviewActive() {
    overviewGrid?.querySelectorAll('.overview-card').forEach((card, idx) => {
      card.classList.toggle('active', idx === current);
    });
  }

  function showSlide(index, options = {}) {
    if (!slides.length) return;
    const next = Math.min(Math.max(index, 0), slides.length - 1);
    slides.forEach((slide, idx) => {
      const active = idx === next;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    current = next;
    if (slideNumber) slideNumber.textContent = String(current + 1);
    if (slideTotal) slideTotal.textContent = String(slides.length);
    if (progressBar) progressBar.style.width = `${((current + 1) / slides.length) * 100}%`;
    if (options.hash !== false) history.replaceState(null, '', `#${current + 1}`);
    updateOverviewActive();
    deck?.focus({ preventScroll: true });
  }

  function nextSlide() { showSlide(current + 1); }
  function previousSlide() { showSlide(current - 1); }

  function buildOverview() {
    if (!overviewGrid) return;
    overviewGrid.innerHTML = '';
    slides.forEach((slide, idx) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'overview-card';
      button.innerHTML = `<span>${String(idx + 1).padStart(2, '0')}</span><strong>${slide.dataset.title || `Folie ${idx + 1}`}</strong>`;
      button.addEventListener('click', () => {
        showSlide(idx);
        hideOverview();
      });
      overviewGrid.appendChild(button);
    });
  }

  function showOverview() {
    if (!overview) return;
    overview.hidden = false;
    updateOverviewActive();
    overviewGrid?.querySelector('.overview-card.active')?.focus({ preventScroll: true });
  }

  function hideOverview() {
    if (!overview) return;
    overview.hidden = true;
    deck?.focus({ preventScroll: true });
  }

  function toggleNotes() {
    document.body.classList.toggle('show-notes');
    notesBtn?.classList.toggle('active', document.body.classList.contains('show-notes'));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  document.addEventListener('keydown', (event) => {
    const key = event.key;
    const target = event.target;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    if (overview && !overview.hidden && key === 'Escape') {
      event.preventDefault();
      hideOverview();
      return;
    }

    switch (key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        event.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
      case 'PageUp':
      case 'Backspace':
        event.preventDefault();
        previousSlide();
        break;
      case 'Home':
        event.preventDefault();
        showSlide(0);
        break;
      case 'End':
        event.preventDefault();
        showSlide(slides.length - 1);
        break;
      case 'o':
      case 'O':
        event.preventDefault();
        overview?.hidden ? showOverview() : hideOverview();
        break;
      case 'n':
      case 'N':
        event.preventDefault();
        toggleNotes();
        break;
      case 'p':
      case 'P':
        event.preventDefault();
        window.print();
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        toggleFullscreen();
        break;
    }
  });

  let touchStartX = null;
  deck?.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0]?.screenX ?? null;
  }, { passive: true });
  deck?.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const delta = (event.changedTouches[0]?.screenX ?? touchStartX) - touchStartX;
    if (Math.abs(delta) > 60) delta < 0 ? nextSlide() : previousSlide();
    touchStartX = null;
  }, { passive: true });

  overviewBtn?.addEventListener('click', showOverview);
  closeOverview?.addEventListener('click', hideOverview);
  notesBtn?.addEventListener('click', toggleNotes);
  printBtn?.addEventListener('click', () => window.print());
  overview?.addEventListener('click', (event) => {
    if (event.target === overview) hideOverview();
  });
  window.addEventListener('hashchange', () => showSlide(slideFromHash(), { hash: false }));

  buildOverview();
  showSlide(slideFromHash(), { hash: false });
})();
