/* ============================================================
   NAKAMA5666 — wiper.js
   Wiper Size Finder logic
   ใช้ใน: find-wiper.html (full)
============================================================ */

function initWiperFinder() {
  var wiperFormEl = document.getElementById('wiper-finder-root');
  if (!wiperFormEl) return;

  var DB          = [];
  var currentBrand = '';
  var currentModel = '';
  var currentYear  = '';

  wiperFormEl.innerHTML = buildWiperHTML();

  /* ── Custom dropdown elements ── */
  var bInput    = document.getElementById('wiperBrandInput');
  var bList     = document.getElementById('wiperBrandList');
  var bWrap     = document.getElementById('wiperBrandWrap');
  var bHidden   = document.getElementById('wiperBrandValue');

  var mInput    = document.getElementById('wiperModelInput');
  var mList     = document.getElementById('wiperModelList');
  var mWrap     = document.getElementById('wiperModelWrap');
  var mHidden   = document.getElementById('wiperModelValue');

  /* ── Load data ── */
  fetch('assets/data/wiper-data.json')
    .then(function(r) { return r.json(); })
    .then(function(json) {
      DB = json.wipers;
      document.getElementById('wiperStateLoading').style.display = 'none';
      document.getElementById('wiperStateEmpty').style.display   = 'block';
    })
    .catch(function() {
      document.getElementById('wiperStateLoading').textContent =
        'โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบไฟล์ wiper-data.json';
    });

  document.getElementById('wiperStateLoading').style.display = 'block';
  document.getElementById('wiperStateEmpty').style.display   = 'none';

  /* ──────────────────────────────────────────
     Brand dropdown
  ────────────────────────────────────────── */
  function getBrands(query) {
    var all = [...new Set(DB.map(function(r) { return r.brand; }))].sort();
    if (!query) return all;
    var q = query.toLowerCase();
    return all.filter(function(b) { return b.toLowerCase().indexOf(q) !== -1; });
  }

  function renderBrandList(query) {
    var brands = getBrands(query);
    bList.innerHTML = '';
    if (!brands.length) {
      bList.innerHTML = '<li class="wiper-dd-empty">ไม่พบยี่ห้อ</li>';
      return;
    }
    brands.forEach(function(b) {
      var li = document.createElement('li');
      li.className = 'wiper-dd-item';
      li.textContent = b;
      if (b === currentBrand) li.classList.add('selected');
      li.addEventListener('mousedown', function(e) {
        e.preventDefault();
        selectBrand(b);
      });
      bList.appendChild(li);
    });
  }

  function openBrandDrop() {
    renderBrandList(bInput.value);
    bWrap.classList.add('open');
    bList.style.display = 'block';
  }

  function closeBrandDrop() {
    bWrap.classList.remove('open');
    bList.style.display = 'none';
  }

  function selectBrand(b) {
    currentBrand = b;
    bHidden.value = b;
    bInput.value = b;
    closeBrandDrop();
    resetModel();
    wiperHide();
  }

  bInput.addEventListener('focus', function() { openBrandDrop(); });
  bInput.addEventListener('input', function() { openBrandDrop(); currentBrand = ''; bHidden.value = ''; resetModel(); wiperHide(); });
  bInput.addEventListener('blur',  function() { setTimeout(closeBrandDrop, 150); });

  /* ──────────────────────────────────────────
     Model dropdown
  ────────────────────────────────────────── */
  function getModels(brand, query) {
    var seen = new Set();
    var rows = DB.filter(function(r) { return r.brand === brand; });
    // sort ASC by model then year
    rows.sort(function(a, b) {
      if (a.model < b.model) return -1;
      if (a.model > b.model) return 1;
      if (a.year < b.year) return -1;
      if (a.year > b.year) return 1;
      return 0;
    });
    var result = [];
    rows.forEach(function(r) {
      var key = r.model + '||' + r.year;
      if (seen.has(key)) return;
      seen.add(key);
      var yearLabel = r.year && r.year !== '-' ? ' (' + r.year + ')' : '';
      var label = r.model + yearLabel;
      if (query) {
        var q = query.toLowerCase();
        if (label.toLowerCase().indexOf(q) === -1) return;
      }
      result.push({ key: key, label: label });
    });
    return result;
  }

  function renderModelList(query) {
    if (!currentBrand) return;
    var models = getModels(currentBrand, query);
    mList.innerHTML = '';
    if (!models.length) {
      mList.innerHTML = '<li class="wiper-dd-empty">ไม่พบรุ่น</li>';
      return;
    }
    models.forEach(function(m) {
      var li = document.createElement('li');
      li.className = 'wiper-dd-item';
      li.textContent = m.label;
      if (m.key === currentModel + '||' + currentYear) li.classList.add('selected');
      li.addEventListener('mousedown', function(e) {
        e.preventDefault();
        selectModel(m.key, m.label);
      });
      mList.appendChild(li);
    });
  }

  function openModelDrop() {
    if (!currentBrand) return;
    renderModelList(mInput.value);
    mWrap.classList.add('open');
    mList.style.display = 'block';
  }

  function closeModelDrop() {
    mWrap.classList.remove('open');
    mList.style.display = 'none';
  }

  function selectModel(key, label) {
    var parts  = key.split('||');
    currentModel = parts[0];
    currentYear  = parts[1];
    mHidden.value = key;
    mInput.value  = label;
    closeModelDrop();
    var row = DB.find(function(r) {
      return r.brand === currentBrand && r.model === currentModel && r.year === currentYear;
    });
    if (row) wiperPlayThenShow(row); else wiperHide();
  }

  function resetModel() {
    currentModel = '';
    currentYear  = '';
    mHidden.value = '';
    mInput.value  = '';
    mInput.disabled = !currentBrand;
    mInput.placeholder = currentBrand ? '— พิมพ์หรือเลือกรุ่น —' : '— เลือกยี่ห้อก่อน —';
  }

  mInput.addEventListener('focus', function() { openModelDrop(); });
  mInput.addEventListener('input', function() { openModelDrop(); currentModel = ''; currentYear = ''; mHidden.value = ''; wiperHide(); });
  mInput.addEventListener('blur',  function() { setTimeout(closeModelDrop, 150); });

  /* ── Close on outside click ── */
  document.addEventListener('click', function(e) {
    if (!bWrap.contains(e.target)) closeBrandDrop();
    if (!mWrap.contains(e.target)) closeModelDrop();
  });

  /* ── Reveal wipe animation then show result ── */
  function wiperPlayThenShow(row) {
    var resultEl = document.getElementById('wiperStateResult');
    var emptyEl  = document.getElementById('wiperStateEmpty');

    emptyEl.style.display = 'none';
    resultEl.classList.remove('show');

    wiperShowResult(row);

    resultEl.style.transition = 'none';
    resultEl.style.clipPath = 'inset(0 100% 0 0)';
    resultEl.style.opacity = '1';

    void resultEl.offsetWidth;
    resultEl.style.transition = 'clip-path 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
    resultEl.style.clipPath = 'inset(0 0% 0 0)';
  }

  function wiperShowResult(r) {
    var hasF = !!r.front1, hasR = !!r.rear;
    var yearLabel = r.year && r.year !== '-' ? r.year : '';

    document.getElementById('wiperResName').textContent = r.brand + ' ' + r.model;
    document.getElementById('wiperResYear').textContent = yearLabel ? 'ปี ' + yearLabel : '';

    var badge = document.getElementById('wiperResBadge');
    if (hasF && hasR)    { badge.textContent = 'หน้า + หลัง'; badge.className = 'wiper-badge badge-both'; }
    else if (hasF)       { badge.textContent = 'ใบปัดหน้า';   badge.className = 'wiper-badge badge-front'; }
    else                 { badge.textContent = 'ใบปัดหลัง';   badge.className = 'wiper-badge badge-rear'; }

    var grid = document.getElementById('wiperSizeGrid');
    var html = '';
    if (hasF && hasR) {
      grid.className = 'wiper-size-grid two-col';
      html = sectionFront(r) + sectionRear(r);
    } else if (hasF) {
      grid.className = 'wiper-size-grid one-col';
      html = sectionFront(r);
    } else {
      grid.className = 'wiper-size-grid one-col';
      html = sectionRear(r);
    }
    grid.innerHTML = html;


    // ── CTA 2 ปุ่ม ──
    var ctaEl = document.getElementById('wiperResCta');
    if (ctaEl) {
      ctaEl.innerHTML = `
        <div class="wiper-result-cta-btns">
          <a href="${r.shopee_url || '#'}" target="_blank" rel="noopener"
             class="product-modal-variant-btn product-modal-variant-btn--shopee">
            <img src="assets/images/logo/shopee-logo.webp" alt="Shopee" class="product-modal-platform-icon">
            ซื้อบน Shopee
          </a>
          <a href="${r.tiktok_url || '#'}" target="_blank" rel="noopener"
             class="product-modal-variant-btn product-modal-variant-btn--tiktok">
            <img src="assets/images/logo/tiktok-shop-icon-logo-symbol-free-png.webp" alt="TikTok Shop" class="product-modal-platform-icon">
            ซื้อบน TikTok Shop
          </a>
        </div>
      `;
    }

    document.getElementById('wiperStateResult').classList.add('show');
  }

  function sectionFront(r) {
    return `<div class="wiper-size-section">
      <div class="wiper-size-section-title">ใบปัดหน้า</div>
      <div class="wiper-size-cols">
        <div class="wiper-size-box"><div class="wlbl">ฝั่งคนขับ</div><div class="wnum">${r.front1}</div><div class="wunit">นิ้ว</div></div>
        <div class="wiper-size-box"><div class="wlbl">ฝั่งผู้โดยสาร</div><div class="wnum">${r.front2}</div><div class="wunit">นิ้ว</div></div>
      </div>
    </div>`;
  }

  function sectionRear(r) {
    var typeTag = r.rearType ? `<div class="wiper-rear-type">ขั้ว ${r.rearType}</div>` : '';
    return `<div class="wiper-size-section">
      <div class="wiper-size-section-title">ใบปัดหลัง</div>
      <div class="wiper-size-cols single">
        <div class="wiper-size-box">
          <div class="wlbl">กระจกหลัง</div>
          <div class="wiper-rear-row">
            <span class="wnum">${r.rear}</span>
            ${typeTag}
          </div>
          <div class="wunit">นิ้ว</div>
        </div>
      </div>
    </div>`;
  }

  function wiperHide() {
    var resultEl = document.getElementById('wiperStateResult');
    resultEl.classList.remove('show');
    resultEl.style.transition = 'none';
    resultEl.style.clipPath = '';
    resultEl.style.opacity = '';
    document.getElementById('wiperStateEmpty').style.display = 'block';
  }
}

/* ── Build HTML ── */
function buildWiperHTML() {
  var searchSVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';

  return `
    <div class="wiper-card">
      <div class="wiper-field-row">

        <div class="wiper-field">
          <label>ยี่ห้อรถ</label>
          <div class="wiper-dd-wrap" id="wiperBrandWrap">
            <div class="wiper-dd-input-row">
              <span class="wiper-dd-search-icon">${searchSVG}</span>
              <input type="text" id="wiperBrandInput" class="wiper-dd-input"
                     placeholder="— พิมพ์หรือเลือกยี่ห้อ —" autocomplete="off">
            </div>
            <ul class="wiper-dd-list" id="wiperBrandList" style="display:none"></ul>
            <input type="hidden" id="wiperBrandValue">
          </div>
        </div>

        <div class="wiper-field">
          <label>รุ่น / ปี</label>
          <div class="wiper-dd-wrap" id="wiperModelWrap">
            <div class="wiper-dd-input-row">
              <span class="wiper-dd-search-icon">${searchSVG}</span>
              <input type="text" id="wiperModelInput" class="wiper-dd-input"
                     placeholder="— เลือกยี่ห้อก่อน —" autocomplete="off" disabled>
            </div>
            <ul class="wiper-dd-list" id="wiperModelList" style="display:none"></ul>
            <input type="hidden" id="wiperModelValue">
          </div>
        </div>

      </div>
    </div>

    <div class="wiper-result-card">
      <div class="wiper-loading" id="wiperStateLoading" style="display:none">กำลังโหลดข้อมูล...</div>

      <div class="wiper-empty" id="wiperStateEmpty">
        <div class="wiper-anim-wrap">
          <svg class="wiper-anim-svg" viewBox="0 0 280 210" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M35 170 L24 133 Q22 110 46 103 L70 70 Q92 45 140 43 Q188 45 210 70 L234 103 Q258 110 256 133 L245 170 Z"
                  stroke="#444" stroke-width="2.2" fill="#181818" stroke-linejoin="round"/>
            <path d="M74 103 L80 67 Q98 49 140 47 Q182 49 200 67 L206 103 Z"
                  stroke="#333" stroke-width="1.5" fill="#222" stroke-linejoin="round"/>
            <line x1="140" y1="103" x2="140" y2="47" stroke="#2a2a2a" stroke-width="1"/>
            <ellipse cx="72" cy="170" rx="22" ry="10" stroke="#444" stroke-width="1.5" fill="#222"/>
            <ellipse cx="208" cy="170" rx="22" ry="10" stroke="#444" stroke-width="1.5" fill="#222"/>
            <rect x="30" y="119" width="26" height="14" rx="4" stroke="#333" stroke-width="1.2" fill="#222"/>
            <rect x="224" y="119" width="26" height="14" rx="4" stroke="#333" stroke-width="1.2" fill="#222"/>
            <rect x="112" y="123" width="56" height="16" rx="4" stroke="#333" stroke-width="1.2" fill="#222"/>
            <g id="wiperArmGroup" style="transform-origin:92px 103px;">
              <line x1="92" y1="103" x2="92" y2="63" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="94" y1="103" x2="94" y2="63" stroke="#d51428" stroke-width="3.5" stroke-linecap="round"/>
            </g>
            <g id="wiperArmGroup2" style="transform-origin:140px 103px;">
              <line x1="140" y1="103" x2="140" y2="63" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="142" y1="103" x2="142" y2="63" stroke="#d51428" stroke-width="3.5" stroke-linecap="round"/>
            </g>
            <circle cx="92" cy="103" r="3" fill="#666"/>
            <circle cx="140" cy="103" r="3" fill="#666"/>
          </svg>
        </div>
        <p>เลือกยี่ห้อและรุ่นรถด้านบน</p>
      </div>

      <div class="wiper-result" id="wiperStateResult">
        <div class="wiper-result-header">
          <div>
            <div class="wiper-result-name" id="wiperResName"></div>
            <div class="wiper-result-year" id="wiperResYear"></div>
          </div>
          <span class="wiper-badge" id="wiperResBadge"></span>
        </div>
        <div class="wiper-size-grid" id="wiperSizeGrid"></div>
        <div class="wiper-result-cta" id="wiperResCta"></div>
        
      </div>
    </div>
  `;
}
