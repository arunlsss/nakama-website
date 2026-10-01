/* ============================================================
   NAKAMA5666 — main.js
   Sections:
   1. Component Loader (navbar/footer)
   2. Active Nav Link
   3. Hamburger Menu
   4. Hero Slider
   5. Products (render cards from JSON)
   6. Spray Highlight (render from JSON)
   7. Product Modal (showProductModal / closeProductModal)
   8. Product Sections (products.html — grouped by subcategory)
   9. Find Wiper (find-wiper.html only)
   10. Init
============================================================ */


/* ============ 1. COMPONENT LOADER ============ */
async function loadComponents() {
  const res  = await fetch('components.html');
  const html = await res.text();
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, 'text/html');

  const navbarSlot = document.querySelector('#navbar');
  const footerSlot = document.querySelector('#footer');

  if (navbarSlot) {
    navbarSlot.innerHTML =
      doc.querySelector('#navbar-component').innerHTML;
  }
  if (footerSlot) {
    footerSlot.innerHTML =
      doc.querySelector('#footer-component').innerHTML;
  }
}


/* ============ 2. ACTIVE NAV LINK ============ */
function setActiveNav() {
  const page = document.body.dataset.page; // set data-page="home" on each <body>
  if (!page) return;
  const link = document.querySelector(`.navbar-links a[data-page="${page}"]`);
  if (link) link.classList.add('active');
}


/* ============ 3. HAMBURGER MENU ============ */
function initHamburger() {
  const btn  = document.querySelector('.navbar-hamburger');
  const menu = document.querySelector('.navbar-mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    menu.classList.toggle('open');
  });
}


/* ============ 4. HERO SLIDER ============ */
const SLIDES = [
  {
  eyebrow:   'NAKAMA5666 - YOUR CAR PARTNER',
  headline:  'คิดดูแลรถ\nคิดถึงเรา',
  sub:       '· ยอดขายใบปัดน้ำฝนอันดับ 1 ในไทย\n· ขายมาแล้วมากกว่า 1,000,000 ชิ้น',
  cta_text:  'ดูสินค้าทั้งหมด',
  cta_url:   'products.html',
  cta2_text: 'ค้นหาใบปัดรถคุณ',
  cta2_url:  'find-wiper.html',
  bg:        'assets/images/hero/slide-1.png',
},
  {
  eyebrow:   'NAKAMA5666 - WIPER BLADES',
  headline:  'ปรับทัศนวิสัย\nขับขี่ปลอดภัย',
  sub:       'ใบปัดหน้า-หลัง คุณภาพสูง รองรับรถยนต์กว่า 50 รุ่น',
  cta_text:  'ค้นหาใบปัดสำหรับรถคุณ',
  cta_url:   'find-wiper.html',
  cta2_text: 'ดูใบปัดทั้งหมด',
  cta2_url:  'products.html#wiper',
  bg:        'assets/images/hero/slide-2.png',
},
  {
  eyebrow:   'SPRAY COLLECTION',
  headline:  'ดูแลรถครบ\nจบทุกปัญหา',
  sub:       'สเปรย์ 11 สูตร ครอบคลุมทั้งภายนอกและภายใน',
  cta_text:  'ดูสเปรย์ทั้งหมด',
  cta_url:   'products.html#spray',
  cta2_text: null,
  cta2_url:  null,
  bg:        'assets/images/hero/slide-3.png',
},
  {
  eyebrow:   'CARE COLLECTION',
  headline:  'ฟื้นฟูรถให้\nเหมือนใหม่',
  sub:       'น้ำยาขัดไฟหน้า · น้ำยาลบรอยขีดข่วน · น้ำยาขัดกระจกใส',
  cta_text:  'ดู Care Collection',
  cta_url:   'products.html#care',
  cta2_text: null,
  cta2_url:  null,
  bg:        'assets/images/hero/slide-4.png',
},
  {
  eyebrow:   'BECOME A DEALER',
  headline:  'ร่วมเป็น\nตัวแทนจำหน่าย',
  sub:       'รับสินค้าคุณภาพดีไปจำหน่ายที่ร้านของคุณในราคาพิเศษ',
  cta_text:  'ติดต่อเราทาง LINE',
  cta_url:   'https://lin.ee/sWgi73H',   /* ← LINE_URL */
  cta2_text: null,
  cta2_url:  null,
  bg:        'assets/images/hero/slide-5.png',
},
];

function buildSlider() {
  const slider = document.querySelector('#hero-slider');
  if (!slider) return;

  // Build slides
  SLIDES.forEach((s, i) => {
    const slide = document.createElement('div');
    slide.className = 'hero-slide' + (i === 0 ? ' active' : '');
    slide.innerHTML = `
      <div class="hero-slide-bg" style="background-image:url('${s.bg}')"></div>
      <div class="hero-slide-content">
        <p class="hero-eyebrow">${s.eyebrow}</p>
        <h1 class="hero-headline">${s.headline.replace('\n','<br>')}</h1>
        <p class="hero-sub">${s.sub.replace(/\n/g, '<br>')}</p>
        <div class="hero-cta-group">
          <a href="${s.cta_url}" class="btn btn-primary">${s.cta_text}</a>
          ${s.cta2_text ? `<a href="${s.cta2_url}" class="btn btn-ghost">${s.cta2_text}</a>` : ''}
        </div>
      </div>
    `;
    slider.appendChild(slide);
  });

  // Dots
  const dotsEl = document.querySelector('#hero-dots');
  SLIDES.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsEl.appendChild(dot);
  });

  // Arrows
  document.querySelector('#hero-prev')?.addEventListener('click', () => goTo(current - 1));
  document.querySelector('#hero-next')?.addEventListener('click', () => goTo(current + 1));

  // Auto-play
  let current = 0;
  let timer   = startAuto();

  function goTo(n) {
    const slides = slider.querySelectorAll('.hero-slide');
    const dots   = dotsEl.querySelectorAll('.hero-dot');
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (n + SLIDES.length) % SLIDES.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function startAuto() {
    return setInterval(() => goTo(current + 1), 5500);
  }

  // Pause on hover
  slider.addEventListener('mouseenter', () => clearInterval(timer));
  slider.addEventListener('mouseleave', () => { timer = startAuto(); });
}


/* ============ 5. PRODUCT CARDS ============ */

/**
 * Helper: ดึง string จาก field ที่อาจเป็น string หรือ { th, en }
 * fallback ไปหา 'th' ถ้า getCurrentLang ไม่พร้อม
 */
function _localise(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  const lang = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'th';
  return field[lang] ?? field['th'] ?? '';
}

async function loadProducts(containerId, filter = null, limit = null, badgeFilter = null) {
  const el = document.querySelector(`#${containerId}`);
  if (!el) return;

  const res  = await fetch('assets/data/products.json');
  const data = await res.json();

  let items = filter ? data.filter(p => p.category === filter || p.subcategory === filter) : data;
  if (badgeFilter) items = items.filter(p => p.badge?.includes(badgeFilter));
  if (limit) items = items.slice(0, limit);

  const viewLabel      = (typeof t === 'function') ? t('product.viewDetails')    : 'ดูรายละเอียด →';
  const badgeBestLabel = (typeof t === 'function') ? t('product.badgeBestSeller') : '🔥 ขายดี';
  const badgeNewLabel  = (typeof t === 'function') ? t('product.badgeNew')        : '✨ ใหม่';

  el.innerHTML = items.map(p => `
    <div class="product-card" data-modal-id="${p.id}">
      <div class="product-card-img">
        <img src="${p.image}" alt="${_localise(p.name)}" loading="lazy">
        ${p.badge?.includes('best-seller')
          ? `<span class="product-card-badge badge badge-red">${badgeBestLabel}</span>`
          : ''}
        ${p.badge?.includes('new')
          ? `<span class="product-card-badge badge badge-dark">${badgeNewLabel}</span>`
          : ''}
      </div>
      <div class="product-card-body">
        <p class="product-card-name">${_localise(p.name)}</p>
        <p class="product-card-desc">${_localise(p.description)}</p>
        <span class="product-card-action">${viewLabel}</span>
      </div>
    </div>
  `).join('');

  // bind click → modal
  el.querySelectorAll('.product-card[data-modal-id]').forEach(card => {
    card.addEventListener('click', () => showProductModal(card.dataset.modalId));
  });
}


/* ============ 6. SPRAY HIGHLIGHT ============ */
async function loadSprayHighlight(containerId) {
  const el = document.querySelector(`#${containerId}`);
  if (!el) return;

  const res   = await fetch('assets/data/products.json');
  const data  = await res.json();
  const sprays = data.filter(p => p.category === 'spray' || p.category === 'care');

  el.innerHTML = sprays.map(p => `
    <div class="spray-card" data-modal-id="${p.id}">
      <div class="spray-card-img">
        <img src="${p.image}" alt="${_localise(p.name)}" loading="lazy">
      </div>
      <p class="spray-card-name">${_localise(p.name)}</p>
    </div>
  `).join('');

  el.querySelectorAll('.spray-card[data-modal-id]').forEach(card => {
    card.addEventListener('click', () => showProductModal(card.dataset.modalId));
  });
}


/* ============ 7. PRODUCT MODAL ============ */

/**
 * Cache สินค้าทั้งหมดหลัง fetch ครั้งแรก
 * เพื่อไม่ต้อง fetch ซ้ำทุกครั้งที่เปิด modal
 */
let _productsCache = null;

async function _getProducts() {
  if (_productsCache) return _productsCache;
  const res = await fetch('assets/data/products.json');
  _productsCache = await res.json();
  return _productsCache;
}

/**
 * สร้าง modal overlay ครั้งเดียวใน DOM แล้วนำกลับมาใช้ซ้ำ
 */
function _ensureModalDOM() {
  let overlay = document.querySelector('#product-modal-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id        = 'product-modal-overlay';
  overlay.className = 'product-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="product-modal" id="product-modal-box">
      <div class="product-modal-img" id="product-modal-img-wrap">
        <img id="product-modal-img" src="" alt="">
        <button class="product-modal-close" id="product-modal-close" aria-label="ปิด">✕</button>
      </div>
      <div class="product-modal-body">
        <p class="product-modal-name" id="product-modal-name"></p>
        <p class="product-modal-desc" id="product-modal-desc"></p>
        <div id="product-modal-scroll-hint" class="product-modal-scroll-hint">
          <span>เลื่อนลงเพื่อเลือกซื้อ</span>
          <span class="product-modal-scroll-arrow">V</span>
        </div>
        <div class="product-modal-divider"></div>
        <div class="product-modal-variants" id="product-modal-variants"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // ปิดเมื่อกดปุ่ม ✕
  overlay.querySelector('#product-modal-close')
    .addEventListener('click', closeProductModal);

  // ปิดเมื่อคลิก overlay (นอก modal box)
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeProductModal();
  });

  // ปิดเมื่อกด Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeProductModal();
  });

  return overlay;
}

/**
 * เปิด product modal
 * @param {string} productId  — id จาก products.json
 */
async function showProductModal(productId) {
  const products = await _getProducts();
  const product  = products.find(p => p.id === productId);
  if (!product) { console.warn('[Modal] product not found:', productId); return; }

  const lang           = (typeof getCurrentLang === 'function') ? getCurrentLang() : 'th';
  const buyLabel       = (typeof t === 'function') ? t('product.shopAtShopee')      : 'ช้อปที่ Shopee →';
  const badgeBestLabel = (typeof t === 'function') ? t('product.badgeBestSeller')   : '🔥 ขายดี';
  const badgeNewLabel  = (typeof t === 'function') ? t('product.badgeNew')          : '✨ ใหม่';

  const overlay = _ensureModalDOM();

  // ── รูปสินค้า ──
  const imgEl = overlay.querySelector('#product-modal-img');
  imgEl.src = product.image;
  imgEl.alt = _localise(product.name);

  // ── Badge บน image ──
  const imgWrap = overlay.querySelector('#product-modal-img-wrap');
  imgWrap.querySelectorAll('.product-card-badge').forEach(b => b.remove());
  if (product.badge?.includes('best-seller')) {
    imgWrap.insertAdjacentHTML('afterbegin',
      `<span class="product-card-badge badge badge-red">${badgeBestLabel}</span>`);
  }
  if (product.badge?.includes('new')) {
    imgWrap.insertAdjacentHTML('afterbegin',
      `<span class="product-card-badge badge badge-dark">${badgeNewLabel}</span>`);
  }

  // ── ชื่อ + description ──
  overlay.querySelector('#product-modal-name').textContent = _localise(product.name);
  overlay.querySelector('#product-modal-desc').textContent = _localise(product.description);

  // ── Variant rows ──
  const variantsEl = overlay.querySelector('#product-modal-variants');
  const variants   = product.variants ?? [];

  // ── single variant = ปุ่มใหญ่เต็มแถว (2 ปุ่ม) / หลาย variant = rows ──
  if (variants.length === 1) {
    variantsEl.innerHTML = `
      <div class="product-modal-variant-dual">
        <a href="${variants[0].shopee_url}" target="_blank" rel="noopener"
           class="product-modal-variant-btn product-modal-variant-btn--shopee">
          <img src="assets/images/logo/shopee-logo.webp" alt="Shopee" class="product-modal-platform-icon">
          Shopee
        </a>
        <a href="${variants[0].tiktok_url ?? '#'}" target="_blank" rel="noopener"
           class="product-modal-variant-btn product-modal-variant-btn--tiktok">
          <img src="assets/images/logo/tiktok-shop-icon-logo-symbol-free-png.webp" alt="TikTok Shop" class="product-modal-platform-icon">
          TikTok Shop
        </a>
      </div>
    `;
  } else {
    variantsEl.innerHTML = variants.map(v => {
      const vName = (typeof v.name === 'string') ? v.name : (v.name?.[lang] ?? v.name?.['th'] ?? '');
      return `
        <div class="product-modal-variant">
          <span class="product-modal-variant-name">${vName}</span>
          <div class="product-modal-variant-btns">
            <a href="${v.shopee_url}" target="_blank" rel="noopener"
               class="product-modal-variant-btn product-modal-variant-btn--shopee">
              <img src="assets/images/logo/shopee-logo.webp" alt="Shopee" class="product-modal-platform-icon">
              Shopee
            </a>
            <a href="${v.tiktok_url ?? '#'}" target="_blank" rel="noopener"
               class="product-modal-variant-btn product-modal-variant-btn--tiktok">
              <img src="assets/images/logo/tiktok-shop-icon-logo-symbol-free-png.webp" alt="TikTok Shop" class="product-modal-platform-icon">
              TikTok
            </a>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── scroll hint (แสดงเฉพาะเมื่อ variants มีมากกว่า 1) ──
  const scrollHintEl = overlay.querySelector('#product-modal-scroll-hint');
  if (scrollHintEl) {
    scrollHintEl.style.display = variants.length > 1 ? 'flex' : 'none';
  }

  // ── เปิด modal + scroll กลับบนสุด ──
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const box = overlay.querySelector('#product-modal-box');
  if (box) box.scrollTop = 0;
}

/**
 * ปิด product modal
 */
function closeProductModal() {
  const overlay = document.querySelector('#product-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}


/* ============ 8. PRODUCT SECTIONS (products.html) ============ */

/**
 * render แต่ละ category เป็น section ใหญ่
 * ภายใน category — grid แยกต่อ subcategory (ขึ้นแถวใหม่ตาม category)
 * แต่ละ card มี badge ชื่อ subcategory อยู่ใต้ชื่อสินค้า ไม่ทับภาพ
 */
async function loadProductSections() {
  const root = document.querySelector('#products-sections');
  if (!root) return;
  if (typeof PRODUCTS_CONFIG === 'undefined') {
    console.warn('[loadProductSections] PRODUCTS_CONFIG not defined');
    return;
  }

  const all = await _getProducts();

  const badgeBestLabel = (typeof t === 'function') ? t('product.badgeBestSeller') : '🔥 ขายดี';
  const badgeNewLabel  = (typeof t === 'function') ? t('product.badgeNew')        : '✨ ใหม่';
  const viewLabel      = (typeof t === 'function') ? t('product.viewDetails')     : 'ดูรายละเอียด →';

  const html = PRODUCTS_CONFIG.map(catGroup => {
    const catProducts = all.filter(p => p.category === catGroup.category);
    if (!catProducts.length) return '';

    // รวม card ทุกตัวจากทุก subcategory ลงใน grid เดียว
    // แต่ละ card มี .product-card-sub แสดงชื่อหมวดย่อย
    const cards = catGroup.subcategories.flatMap(sub => {
      return all
        .filter(p => p.category === catGroup.category && p.subcategory === sub.key)
        .map(p => `
          <div class="product-card" data-modal-id="${p.id}">
            <div class="product-card-img">
              <img src="${p.image}" alt="${_localise(p.name)}" loading="lazy">
              ${p.badge?.includes('best-seller')
                ? `<span class="product-card-badge badge badge-red">${badgeBestLabel}</span>`
                : ''}
              ${p.badge?.includes('new')
                ? `<span class="product-card-badge badge badge-dark">${badgeNewLabel}</span>`
                : ''}
            </div>
            <div class="product-card-body">
              <p class="product-card-name">${_localise(p.name)}</p>
              <p class="product-card-desc">${_localise(p.description)}</p>
              <span class="product-card-sub">${sub.label}</span>
              <span class="product-card-action">${viewLabel}</span>
            </div>
          </div>
        `);
    }).join('');

    return `
      <section class="section products-cat-section" id="${catGroup.anchor}">
        <div class="container">
          <div class="section-header">
            <div class="section-title-block">
              <span class="section-label">${catGroup.category.toUpperCase()}</span>
              <h2>${catGroup.label}</h2>
              <div class="divider-red"></div>
            </div>
          </div>
          <div class="product-grid products-subgrid">${cards}</div>
        </div>
      </section>
    `;
  }).join('');

  root.innerHTML = html;

  root.querySelectorAll('.product-card[data-modal-id]').forEach(card => {
    card.addEventListener('click', () => showProductModal(card.dataset.modalId));
  });
  const hash = window.location.hash;
  if (hash) {
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }
}


/* ============ 9. FIND WIPER (find-wiper.html only) ============ */
function initFindWiper() {
  if (!document.querySelector('#find-wiper-form')) return;

  let wiperData = [];

  fetch('assets/data/wiper-sizes.json')
    .then(r => r.json())
    .then(data => {
      wiperData = data;
      populateBrands(data);
    });

  function populateBrands(data) {
    const brands = [...new Set(data.map(d => d.brand))].sort();
    const sel = document.querySelector('#wiper-brand');
    brands.forEach(b => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = b;
      sel.appendChild(opt);
    });
  }

  document.querySelector('#wiper-brand')?.addEventListener('change', function () {
    const models = [...new Set(
      wiperData.filter(d => d.brand === this.value).map(d => d.model)
    )].sort();
    const sel = document.querySelector('#wiper-model');
    sel.innerHTML = '<option value="">-- เลือกรุ่นรถ --</option>';
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = m;
      sel.appendChild(opt);
    });
    sel.disabled = false;
    document.querySelector('#wiper-year').innerHTML = '<option value="">-- เลือกปี --</option>';
    document.querySelector('#wiper-year').disabled = true;
    document.querySelector('#wiper-result').innerHTML = '';
  });

  document.querySelector('#wiper-model')?.addEventListener('change', function () {
    const brand = document.querySelector('#wiper-brand').value;
    const years = wiperData
      .filter(d => d.brand === brand && d.model === this.value)
      .flatMap(d => {
        const yrs = [];
        for (let y = d.year_start; y <= d.year_end; y++) yrs.push(y);
        return yrs;
      })
      .sort((a, b) => b - a);
    const sel = document.querySelector('#wiper-year');
    sel.innerHTML = '<option value="">-- เลือกปี (พ.ศ.) --</option>';
    [...new Set(years)].forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y + 543; // แปลง ค.ศ. → พ.ศ.
      sel.appendChild(opt);
    });
    sel.disabled = false;
    document.querySelector('#wiper-result').innerHTML = '';
  });

  document.querySelector('#wiper-year')?.addEventListener('change', function () {
    const brand = document.querySelector('#wiper-brand').value;
    const model = document.querySelector('#wiper-model').value;
    const year  = parseInt(this.value);
    const match = wiperData.find(
      d => d.brand === brand && d.model === model
        && year >= d.year_start && year <= d.year_end
    );
    showWiperResult(match);
  });

  function showWiperResult(match) {
    const el = document.querySelector('#wiper-result');
    if (!match) {
      el.innerHTML = `<p class="wiper-not-found">ไม่พบข้อมูลสำหรับรถรุ่นนี้ กรุณาติดต่อเราโดยตรง</p>`;
      return;
    }
    el.innerHTML = `
      <div class="wiper-result-card">
        <h3>ผลการค้นหา: ${match.brand} ${match.model}</h3>
        <div class="wiper-sizes">
          <div class="wiper-size-item">
            <span class="wiper-size-label">ใบปัดหน้า (ฝั่งคนขับ)</span>
            <span class="wiper-size-value">${match.front_driver}"</span>
            <a href="${match.shopee_url_front}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
              ซื้อที่ Shopee
            </a>
          </div>
          <div class="wiper-size-item">
            <span class="wiper-size-label">ใบปัดหน้า (ฝั่งผู้โดยสาร)</span>
            <span class="wiper-size-value">${match.front_passenger}"</span>
            <a href="${match.shopee_url_front}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
              ซื้อที่ Shopee
            </a>
          </div>
          ${match.rear ? `
          <div class="wiper-size-item">
            <span class="wiper-size-label">ใบปัดหลัง</span>
            <span class="wiper-size-value">${match.rear}"</span>
            <a href="${match.shopee_url_rear}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
              ซื้อที่ Shopee
            </a>
          </div>` : ''}
        </div>
      </div>
    `;
  }
}


/* ============ 9. INIT ============ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadComponents();
  setActiveNav();
  initHamburger();
  buildSlider();

  const page = document.body.dataset.page;

  if (page === 'home') {
    loadProducts('best-sellers-grid', null, 4, 'best-seller');
    loadSprayHighlight('spray-highlight-list');
    if (typeof initDiagramTeaser === 'function') initDiagramTeaser();
  }

  if (page === 'products') {
    loadProductSections();
    if (typeof initDiagramFull === 'function') initDiagramFull();
  }

  if (page === 'find-wiper') {
    if (typeof initWiperFinder === 'function') initWiperFinder();
  }
});

/* ── bfcache fix ──
   เมื่อ browser restore หน้าจาก bfcache (กด Back)
   หน้าจะถูก snapshot ก่อน loadComponents() inject เสร็จ
   ทำให้ได้ HTML เก่ากลับมา — แก้โดย force reload
── */
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    window.location.reload();
  }
});

// reset overflow ก่อน navigate ออก ป้องกัน modal ค้าง
window.addEventListener('pagehide', () => {
  document.body.style.overflow = '';
});
