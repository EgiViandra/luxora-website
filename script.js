const menuToggle = document.getElementById('mobile-menu');
    const navbar = document.querySelector('.navbar');

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('is-active');
        navbar.classList.toggle('active');
    });

    // Biar kalau layar diklik di luar menu (opsional, untuk UX lebih bagus)
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target) && !menuToggle.contains(e.target) && navbar.classList.contains('active')) {
            menuToggle.classList.remove('is-active');
            navbar.classList.remove('active');
        }
    });

// Filter functionality for Destination page
const filterSelect = document.getElementById('filter');
if (filterSelect) {
    filterSelect.addEventListener('change', function() {
        const selectedCategory = this.value;
        const cards = document.querySelectorAll('.link-card');
        cards.forEach(card => {
            if (selectedCategory === 'all' || card.getAttribute('data-category') === selectedCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Scroll-triggered animations for selected elements only (start after header/video)
document.addEventListener('DOMContentLoaded', () => {
    // Elements to animate (start from sections below the hero/video)
    const selectors = [
        '.hero-section',
        '.title-atas',
        '.filter-container',
        '.grid .card',
        '.content-section .content-block',
        '.benefit-item',
        '.see-other-btn',
        '.footer-container'
    ];

    // include cards on the "seeother" page
    selectors.push('.other-destination .destination-card');
    selectors.push('.other-destination .destination-item');
    selectors.push('.other-destination .destination-content');

    const items = [];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => items.push(el));
    });

    // Add base class and stagger delay
    items.forEach((el, i) => {
        if (!el.classList.contains('animate-item')) el.classList.add('animate-item');
        el.dataset.animeDelay = `${(i % 10) * 80}ms`;
    });

    let firstScrollHappened = false;

    const io = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            if (firstScrollHappened) {
                el.style.transitionDelay = el.dataset.animeDelay || '0ms';
                el.classList.add('in-view');
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.15 });

    items.forEach(el => io.observe(el));

    // Trigger animations for visible items when the user first scrolls
    function onFirstScroll() {
        firstScrollHappened = true;
        items.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.9 && rect.bottom > 0) {
                el.style.transitionDelay = el.dataset.animeDelay || '0ms';
                el.classList.add('in-view');
                io.unobserve(el);
            }
        });
        window.removeEventListener('scroll', onFirstScroll);
    }

    // Wait for a user scroll action to start animations
    window.addEventListener('scroll', onFirstScroll, { passive: true });
});

// Search overlay: open when user clicks "Search Tour" in navbar and search cards on current page
document.addEventListener('DOMContentLoaded', () => {
    function buildOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'search-overlay';
        overlay.innerHTML = `
            <div class="search-panel">
                <div class="search-header">
                    <input class="search-input" placeholder="Search tours, destinations..." aria-label="Search tours">
                    <button class="search-close" aria-label="Close">✕</button>
                </div>
                <div class="search-results"></div>
            </div>`;
        document.body.appendChild(overlay);
        return overlay;
    }

    const overlay = buildOverlay();
    const input = overlay.querySelector('.search-input');
    const closeBtn = overlay.querySelector('.search-close');
    const resultsEl = overlay.querySelector('.search-results');

    function gatherItems() {
        const nodes = Array.from(document.querySelectorAll('.link-card, .grid .card, .destination-card, .other-destination .destination-card'));
        const items = nodes.map(node => {
            let title = '';
            const t1 = node.querySelector('.title');
            const t2 = node.querySelector('h3');
            if (t1) title = t1.textContent.trim();
            else if (t2) title = t2.textContent.trim();
            else title = node.textContent.trim().slice(0,80);

            let href = '';
            if (node.tagName === 'A') href = node.getAttribute('href');
            else {
                const a = node.querySelector('a');
                if (a) href = a.getAttribute('href');
            }

            const imgEl = node.querySelector('img');
            const img = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src')) : '';
            const text = node.textContent.replace(/\s+/g,' ').trim();

            return { node, title, href, img, text };
        });
        return items.filter(it => it.title || it.text);
    }

    let itemsCache = [];
    let remoteItems = [];

    async function fetchRemoteItems() {
        const paths = ['/data/destinations.json', 'data/destinations.json', '../data/destinations.json', './data/destinations.json'];
        for (const p of paths) {
            try {
                const res = await fetch(p, {cache: 'no-store'});
                if (!res.ok) continue;
                const data = await res.json();
                return data.map(d => ({ node: null, title: d.title || '', href: d.href || '', img: d.img || '', text: (d.excerpt || d.title || '').trim() }));
            } catch (e) {
                // try next
            }
        }
        return [];
    }

    // preload remote items once
    fetchRemoteItems().then(items => { remoteItems = items; }).catch(()=>{ remoteItems = []; });

    function openOverlay() {
        itemsCache = gatherItems().concat(remoteItems);
        overlay.classList.add('open');
        input.value = '';
        resultsEl.innerHTML = '';
        input.focus();
    }

    function closeOverlay() {
        overlay.classList.remove('open');
        // remove highlights
        document.querySelectorAll('.search-highlight').forEach(e => e.classList.remove('search-highlight'));
    }

    closeBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });

    // attach open to any navbar link that contains "Search" text
    document.querySelectorAll('.navbar a').forEach(a => {
        if (/search/i.test(a.textContent)) {
            a.addEventListener('click', (ev) => { ev.preventDefault(); openOverlay(); });
        }
    });

    // basic debounce
    let ti;
    input.addEventListener('input', () => {
        clearTimeout(ti);
        ti = setTimeout(() => doSearch(input.value.trim()), 150);
    });

    function doSearch(q) {
        resultsEl.innerHTML = '';
        document.querySelectorAll('.search-highlight').forEach(e => e.classList.remove('search-highlight'));
        if (!q) { resultsEl.innerHTML = ''; return; }
        const ql = q.toLowerCase();
        const results = itemsCache.map(it => {
            const score = (it.title.toLowerCase().includes(ql) ? 2 : 0) + (it.text.toLowerCase().includes(ql) ? 1 : 0);
            return { it, score };
        }).filter(r => r.score > 0).sort((a,b) => b.score - a.score);

        if (results.length === 0) { resultsEl.innerHTML = '<div style="padding:12px;color:#666">No results</div>'; return; }

        results.slice(0, 20).forEach(r => {
            const it = r.it;
            const link = document.createElement('a');
            link.className = 'search-item';
            link.href = it.href || '#';
            link.innerHTML = `<img src="${it.img || ''}" onerror="this.style.display='none'"/><div class='meta'><strong>${escapeHtml(it.title)}</strong><small style='color:#666'>${escapeHtml((it.text||'').slice(0,120))}</small></div>`;
            link.addEventListener('click', (ev) => {
                // if href is empty, prevent
                if (!it.href) { ev.preventDefault(); closeOverlay(); }
            });
            resultsEl.appendChild(link);
            if (it.node) it.node.classList.add('search-highlight');
        });
    }

    function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
});

// For debugging: expose a helper to prefetch remote items
window.__fetchDestinationsJSON = async function() {
    try { const res = await fetch('/data/destinations.json'); return await res.json(); } catch(e){ return null }
}

