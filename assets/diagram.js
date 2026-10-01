/* ============================================================
   NAKAMA5666 — diagram.js
   Interactive Car & Motorcycle Diagram
   ใช้ใน: products.html (full), index.html (teaser)

   แต่ละ item ใน DIAGRAM_PRODUCTS มี:
     product_id  — id จาก products.json (ถ้ามี → คลิกได้เปิด modal)
                   ถ้าไม่มี / ไม่แน่ใจ → ใส่ null ไว้ก่อน
     image       — path รูปสินค้า (ถ้ามี → แสดงรูป, ถ้าไม่มี → fallback emoji)
     emoji       — fallback เมื่อไม่มีรูป
     name        — ชื่อที่แสดงใน popup
     desc        — คำอธิบาย
============================================================ */

var DIAGRAM_PRODUCTS = {

  /* ── CAR ── */
  windshield: {
    zone:  'จุดที่ 1 — กระจกหน้า / ใบปัดน้ำฝน',
    title: 'ทัศนวิสัยชัด ขับขี่ปลอดภัย',
    items: [
      {
        product_id: 'wiper-standard',
        image:      'assets/images/merchant/wiper/main_wiper/ปก.png',
        emoji:      '🌧️',
        name:       'ใบปัดน้ำฝนคู่หน้า Standard',
        desc:       'รองรับ Toyota, Honda, Mazda, Isuzu และอีกกว่า 50 รุ่น'
      },
      {
        product_id: 'glass-restore',
        image:      'assets/images/merchant/spray/12.GlassRestore/เดี่ยว ปก.png',
        emoji:      '🪟',
        name:       'Glass Restore',
        desc:       'ขจัดคราบน้ำ คราบหินปูน ฟื้นฟูกระจกให้ใสเหมือนใหม่'
      },
    ]
  },

  headlight: {
    zone:  'จุดที่ 2 — ไฟหน้ารถ',
    title: 'ฟื้นฟูไฟหน้าให้ใสเหมือนใหม่',
    items: [
      {
        product_id: 'headlight-restoration',
        image:      'assets/images/merchant/spray/13.HeadlightRestoration/เดี่ยว ปก.png',
        emoji:      '💡',
        name:       'Headlight Restoration',
        desc:       'ขัดฟื้นฟูไฟหน้าเหลือง หมอง ขุ่น เคลือบ UV ป้องกันระยะยาว'
      },
    ]
  },

  engine: {
    zone:  'จุดที่ 3 — ห้องเครื่อง / ระบบไฟฟ้า',
    title: 'ทำความสะอาดเครื่องยนต์ครบจบ',
    items: [
      {
        product_id: 'spray-engine-degreaser',
        image:      'assets/images/merchant/spray/04.EngineDegreaser/2026/เดี่ยว ปก.png',
        emoji:      '🔧',
        name:       'Engine Degreaser',
        desc:       'สเปรย์ล้างคราบน้ำมัน คราบไขมันในห้องเครื่องยนต์'
      },
      {
        product_id: 'spray-carb-cleaner',
        image:      'assets/images/merchant/spray/05.CarbCleaner/2026/เดี่ยว ปก.png',
        emoji:      '⚙️',
        name:       'Carb Cleaner',
        desc:       'ล้างคาร์บูเรเตอร์ ลดการอุดตัน เครื่องสตาร์ทง่ายขึ้น'
      },
      {
        product_id: 'spray-contact-cleaner',
        image:      'assets/images/merchant/spray/01.ContactCleaner/2026/เดี่ยว ปก.png',
        emoji:      '🔌',
        name:       'Contact Cleaner',
        desc:       'ล้างแผงวงจร ECU กล่องฟิวส์ ขั้วต่อไฟฟ้า'
      },
      {
        product_id: 'spray-derust',
        image:      'assets/images/merchant/spray/06.DerustLubricating/2026/เดี่ยว ปก.png',
        emoji:      '🛢️',
        name:       'De-rust & Lubricating',
        desc:       'หล่อลื่น กำจัดสนิม ไล่ความชื้น คลายสกรูแน่น'
      },
    ]
  },

  wheel: {
    zone:  'จุดที่ 4 — ล้อ / ยาง / เบรค',
    title: 'ดูแลระบบล้อและเบรคครบชุด',
    items: [
      {
        product_id: 'spray-tire-shine',
        image:      'assets/images/merchant/spray/09.TireShine/2026/เดี่ยว ปก.png',
        emoji:      '⚫',
        name:       'Tire Shine',
        desc:       'เคลือบยางดำเงาเหมือนใหม่ ป้องกัน UV และความร้อน'
      },
      {
        product_id: 'spray-tire-sealer',
        image:      'assets/images/merchant/spray/08.TireSealer/2026/เดี่ยว ปก.png',
        emoji:      '🚨',
        name:       'Tire Sealer',
        desc:       'ปะยาง + เติมลมภายใน 1 นาที ไม่ต้องถอดล้อ'
      },
      {
        product_id: 'spray-brake-cleaner',
        image:      'assets/images/merchant/spray/03.BrakeCleaner/2026/เดี่ยว ปก.png',
        emoji:      '🛑',
        name:       'Brake Cleaner',
        desc:       'ล้างจานเบรค ผ้าเบรค คาลิปเปอร์ แห้งเร็ว'
      },
    ]
  },

  body: {
    zone:  'จุดที่ 5 — ตัวถัง / สีรถ',
    title: 'บำรุงสีรถให้เงางามตลอดเวลา',
    items: [
      {
        product_id: 'scratch-remover',
        image:      'assets/images/merchant/spray/14.ScratchRemover/เดี่ยว ปก.png',
        emoji:      '✨',
        name:       'Scratch Remover',
        desc:       'ลบรอยขีดข่วน รอยเบียด รอยขนแมว'
      },
      {
        product_id: 'spray-pitch-spot',
        image:      'assets/images/merchant/spray/07.PitchSpot/2026/เดี่ยว ปก.png',
        emoji:      '🛤️',
        name:       'Pitch & Spot',
        desc:       'ลบคราบยางมะตอย คราบแมลง คราบดินโคลน'
      },
      {
        product_id: 'spray-sticker-remover',
        image:      'assets/images/merchant/spray/02.StickerRemover/ปกไม่เตือน.png',
        emoji:      '🏷️',
        name:       'Sticker Remover',
        desc:       'ลบคราบสติกเกอร์และกาวเหนียวภายใน 10-15 วินาที'
      },
    ]
  },

  plastic: {
    zone:  'จุดที่ 6 — พลาสติก / ยางตัวถัง',
    title: 'ฟื้นฟูชิ้นส่วนพลาสติกทั่วคัน',
    items: [
      {
        product_id: 'spray-plastic-restore',
        image:      'assets/images/merchant/spray/10.PlasticRestore/2026/เดี่ยว ปก.png',
        emoji:      '🔲',
        name:       'Plastic Restore',
        desc:       'ฟื้นฟูพลาสติกซีดจาง กันชน คิ้วประตู คอนโซล ป้องกัน UV'
      },
    ]
  },

  rear: {
    zone:  'จุดที่ 7 — กระจกหลัง / ใบปัดหลัง',
    title: 'ทัศนวิสัยด้านหลังชัดเจน',
    items: [
      {
        product_id: 'wiper-rear',
        image:      'assets/images/merchant/wiper/rear_wiper/ปก.png',
        emoji:      '🌧️',
        name:       'ใบปัดน้ำฝนหลัง',
        desc:       'ขนาดตามรุ่นรถ รองรับหลายยี่ห้อ'
      },
      {
        product_id: 'glass-restore',
        image:      'assets/images/merchant/spray/12.GlassRestore/เดี่ยว ปก.png',
        emoji:      '🪟',
        name:       'Glass Restore',
        desc:       'ขจัดคราบฝังแน่นบนกระจกหลัง'
      },
    ]
  },

  /* ── MOTO ── */
  moto_windshield: {
    zone:  'จุดที่ 1 — กระจกหน้า / วิชเชอร์',
    title: 'ทัศนวิสัยชัดขณะขับขี่',
    items: [
      {
        product_id: 'glass-restore',
        image:      'assets/images/merchant/spray/12.GlassRestore/เดี่ยว ปก.png',
        emoji:      '🪟',
        name:       'Glass Restore',
        desc:       'ขจัดคราบน้ำ คราบหินปูน ฟื้นฟูกระจกหน้ามอเตอร์ไซค์'
      },
    ]
  },

  moto_headlight: {
    zone:  'จุดที่ 2 — ไฟหน้า',
    title: 'ฟื้นฟูไฟหน้าให้ใสสว่าง',
    items: [
      {
        product_id: 'headlight-restoration',
        image:      'assets/images/merchant/spray/13.HeadlightRestoration/เดี่ยว ปก.png',
        emoji:      '💡',
        name:       'Headlight Restoration',
        desc:       'ขัดฟื้นฟูไฟหน้าเหลือง หมอง เคลือบ UV'
      },
    ]
  },

  moto_engine: {
    zone:  'จุดที่ 3 — เครื่องยนต์ / ชิ้นส่วนเครื่องกล',
    title: 'ทำความสะอาดเครื่องยนต์มอเตอร์ไซค์',
    items: [
      {
        product_id: 'spray-engine-degreaser',
        image:      'assets/images/merchant/spray/04.EngineDegreaser/2026/เดี่ยว ปก.png',
        emoji:      '🔧',
        name:       'Engine Degreaser',
        desc:       'ล้างคราบน้ำมัน คราบไขมันบนเครื่องยนต์และชิ้นส่วน'
      },
      {
        product_id: 'spray-carb-cleaner',
        image:      'assets/images/merchant/spray/05.CarbCleaner/2026/เดี่ยว ปก.png',
        emoji:      '⚙️',
        name:       'Carb Cleaner',
        desc:       'ล้างคาร์บูเรเตอร์ ลดการอุดตัน เหมาะมากกับมอเตอร์ไซค์'
      },
      {
        product_id: 'spray-contact-cleaner',
        image:      'assets/images/merchant/spray/01.ContactCleaner/2026/เดี่ยว ปก.png',
        emoji:      '🔌',
        name:       'Contact Cleaner',
        desc:       'ล้างขั้วต่อไฟฟ้า เซนเซอร์ วงจรควบคุม'
      },
      {
        product_id: 'spray-derust',
        image:      'assets/images/merchant/spray/06.DerustLubricating/2026/เดี่ยว ปก.png',
        emoji:      '🛢️',
        name:       'De-rust & Lubricating',
        desc:       'หล่อลื่นโซ่ เฟือง สกรู ไล่สนิม'
      },
    ]
  },

  moto_wheel: {
    zone:  'จุดที่ 4 — ล้อ / ยาง / เบรค',
    title: 'ดูแลล้อมอเตอร์ไซค์ให้ปลอดภัย',
    items: [
      {
        product_id: 'spray-tire-shine',
        image:      'assets/images/merchant/spray/09.TireShine/2026/เดี่ยว ปก.png',
        emoji:      '⚫',
        name:       'Tire Shine',
        desc:       'เคลือบยางมอเตอร์ไซค์ให้ดำเงา ป้องกัน UV'
      },
      {
        product_id: 'spray-tire-sealer',
        image:      'assets/images/merchant/spray/08.TireSealer/2026/เดี่ยว ปก.png',
        emoji:      '🚨',
        name:       'Tire Sealer — ปะยางฉุกเฉิน',
        desc:       'ปะยางรั่วมอเตอร์ไซค์ได้ทันที'
      },
      {
        product_id: 'spray-brake-cleaner',
        image:      'assets/images/merchant/spray/03.BrakeCleaner/2026/เดี่ยว ปก.png',
        emoji:      '🛑',
        name:       'Brake Cleaner',
        desc:       'ล้างจานเบรค ดิสก์ คาลิปเปอร์ของมอเตอร์ไซค์'
      },
    ]
  },

  moto_body: {
    zone:  'จุดที่ 5 — ตัวถัง / ฝาครอบ',
    title: 'ดูแลตัวถังและฝาครอบมอเตอร์ไซค์',
    items: [
      {
        product_id: 'scratch-remover',
        image:      'assets/images/merchant/spray/14.ScratchRemover/เดี่ยว ปก.png',
        emoji:      '✨',
        name:       'Scratch Remover',
        desc:       'ลบรอยขีดข่วนบนฝาครอบและตัวถัง'
      },
      {
        product_id: 'spray-sticker-remover',
        image:      'assets/images/merchant/spray/02.StickerRemover/ปกไม่เตือน.png',
        emoji:      '🏷️',
        name:       'Sticker Remover',
        desc:       'ลบสติกเกอร์ คราบกาว ออกจากตัวถัง'
      },
      {
        product_id: 'spray-plastic-restore',
        image:      'assets/images/merchant/spray/10.PlasticRestore/2026/เดี่ยว ปก.png',
        emoji:      '🔲',
        name:       'Plastic Restore',
        desc:       'ฟื้นฟูฝาครอบพลาสติกที่ซีดจางจากแดด'
      },
    ]
  },

  moto_helmet: {
    zone:  'จุดที่ 6 — หมวกกันน็อค',
    title: 'ดูแลหมวกกันน็อคให้สะอาดหอม',
    items: [
      {
        product_id: 'spray-helmet-foam',
        image:      'assets/images/merchant/spray/11.HelmetFoam/2026/เดี่ยว ปก.png',
        emoji:      '⛑️',
        name:       'Helmet Foam',
        desc:       'สเปรย์ล้างหมวกกันน็อค ขจัดคราบมัน แบคทีเรีย กลิ่นหอมสดชื่น'
      },
    ]
  }
};


/* ─────────────────────────────────────────
   Popup
───────────────────────────────────────── */
function diagramShowPopup(key) {
  var d = DIAGRAM_PRODUCTS[key];
  if (!d) return;

  document.getElementById('diagramPopupZone').textContent  = d.zone;
  document.getElementById('diagramPopupTitle').textContent = d.title;

  var list = document.getElementById('diagramProductList');
  list.innerHTML = '';

  d.items.forEach(function(p) {
    var el = document.createElement('div');
    var clickable = !!p.product_id;
    el.className = 'dpopup-item' + (clickable ? ' is-clickable' : '');

    // thumbnail — รูปสินค้าถ้ามี, fallback emoji
    var thumbHTML = p.image
      ? '<div class="dpopup-thumb"><img src="' + p.image + '" alt="' + p.name + '" loading="lazy"></div>'
      : '<div class="dpopup-thumb"><span class="dpopup-thumb-placeholder">' + (p.emoji || '📦') + '</span></div>';

    var hintHTML = clickable
      ? '<div class="dpopup-tap-hint">แตะเพื่อดูรายละเอียด →</div>'
      : '';

    el.innerHTML =
      thumbHTML +
      '<div>' +
        '<div class="dpopup-name">' + p.name + '</div>' +
        '<div class="dpopup-desc">' + p.desc + '</div>' +
        hintHTML +
      '</div>';

    if (clickable) {
      el.addEventListener('click', function() {
        diagramClosePopup();
        // เรียก showProductModal จาก main.js
        if (typeof showProductModal === 'function') {
          showProductModal(p.product_id);
        }
      });
    }

    list.appendChild(el);
  });

  document.getElementById('diagramOverlay').classList.add('open');
}

function diagramClosePopup() {
  document.getElementById('diagramOverlay').classList.remove('open');
}


/* ─────────────────────────────────────────
   Mode switch
───────────────────────────────────────── */
var diagramCurrentMode = 'car';

function diagramSetMode(mode) {
  diagramCurrentMode = mode;
  var container = document.getElementById('diagramVehicleContainer');
  var mainImg   = document.getElementById('diagramMainImg');
  var helmet    = document.getElementById('diagramHelmetOverlay');
  var hintText  = document.getElementById('diagramHintText');

  document.getElementById('diagramBtnCar').classList.toggle('active', mode === 'car');
  document.getElementById('diagramBtnMoto').classList.toggle('active', mode === 'moto');

  if (mode === 'car') {
    mainImg.src = 'assets/images/diagram/GR86.png';
    mainImg.alt = 'รถยนต์ NAKAMA 5666';
    mainImg.className = 'diagram-main-img mode-car-img';
    container.className = 'diagram-vehicle-container mode-car';
    helmet.style.display = 'none';
    hintText.textContent = 'กดจุดบนรถเพื่อดูสินค้าที่เหมาะกับชิ้นส่วนนั้น';
    document.getElementById('diagramZonesCar').style.display  = 'flex';
    document.getElementById('diagramZonesMoto').style.display = 'none';
  } else {
    mainImg.src = 'assets/images/diagram/S1000RR.png';
    mainImg.alt = 'มอเตอร์ไซค์ NAKAMA 5666';
    mainImg.className = 'diagram-main-img mode-moto-img';
    container.className = 'diagram-vehicle-container mode-moto';
    helmet.style.display = 'block';
    hintText.textContent = 'กดจุดบนมอเตอร์ไซค์เพื่อดูสินค้าที่เหมาะกับชิ้นส่วนนั้น';
    document.getElementById('diagramZonesCar').style.display  = 'none';
    document.getElementById('diagramZonesMoto').style.display = 'flex';
  }

  document.querySelectorAll('#diagramVehicleContainer .hotspot').forEach(function(el) {
    var dm = el.getAttribute('data-mode');
    el.classList.toggle('hidden', !(dm === 'both' || dm === mode));
  });
}


/* ─────────────────────────────────────────
   Init full diagram (products.html)
───────────────────────────────────────── */
function initDiagramFull() {
  var el = document.getElementById('diagram-full');
  if (!el) return;

  el.innerHTML = buildDiagramHTML('full');

  document.getElementById('diagramOverlay').addEventListener('click', function(e) {
    if (e.target === this) diagramClosePopup();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') diagramClosePopup();
  });
}


/* ─────────────────────────────────────────
   Init teaser diagram (index.html)
───────────────────────────────────────── */
function initDiagramTeaser() {
  var el = document.getElementById('diagram-teaser-stage');
  if (!el) return;

  el.innerHTML = buildDiagramHTML('teaser');

  var overlay = document.getElementById('diagramOverlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === this) diagramClosePopup();
    });
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') diagramClosePopup();
  });
}


/* ─────────────────────────────────────────
   Build HTML (shared)
───────────────────────────────────────── */
function buildDiagramHTML(mode) {
  var isTeaser = mode === 'teaser';
  return `
    <!-- Toggle -->
    <div class="diagram-stage${isTeaser ? ' is-teaser' : ''}">

      <div class="diagram-toggle">
        <button class="diagram-toggle-btn active" id="diagramBtnCar"  onclick="diagramSetMode('car')">รถยนต์</button>
        <button class="diagram-toggle-btn"        id="diagramBtnMoto" onclick="diagramSetMode('moto')">มอเตอร์ไซค์</button>
      </div>

      <div class="diagram-vehicle-container mode-car" id="diagramVehicleContainer">

        <img class="diagram-main-img mode-car-img" id="diagramMainImg"
             src="assets/images/diagram/GR86.png"
             alt="รถยนต์ NAKAMA 5666" draggable="false"/>

        <!-- Helmet overlay (moto only) -->
        <div id="diagramHelmetOverlay" style="display:none; position:absolute; left:85%; top:18%; width:22%; aspect-ratio:1; z-index:15; transform:translate(-50%,-50%);">
          <img src="assets/images/diagram/HELMET.png"
               alt="หมวกกันน็อค" draggable="false"
               style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.6)) drop-shadow(0 0 20px rgba(213,20,40,0.45))"/>
        </div>

        <!-- CAR hotspots -->
        <div class="hotspot" data-mode="car" style="left:47%;top:31%;" onclick="diagramShowPopup('windshield')" title="กระจกหน้า / ใบปัดน้ำฝน">
          <div class="dot-ring"><div class="dot-core">1</div></div>
        </div>
        <div class="hotspot" data-mode="car" style="left:38%;top:52%;" onclick="diagramShowPopup('headlight')" title="ไฟหน้า">
          <div class="dot-ring"><div class="dot-core">2</div></div>
        </div>
        <div class="hotspot" data-mode="car" style="left:20%;top:45%;" onclick="diagramShowPopup('engine')" title="ห้องเครื่อง">
          <div class="dot-ring"><div class="dot-core">3</div></div>
        </div>
        <div class="hotspot" data-mode="car" style="left:50%;top:65%;" onclick="diagramShowPopup('wheel')" title="ล้อ / ยาง / เบรค">
          <div class="dot-ring"><div class="dot-core">4</div></div>
        </div>
        <div class="hotspot" data-mode="car" style="left:76%;top:52%;" onclick="diagramShowPopup('body')" title="ตัวถัง / สีรถ">
          <div class="dot-ring"><div class="dot-core">5</div></div>
        </div>
        <div class="hotspot" data-mode="car" style="left:33%;top:65%;" onclick="diagramShowPopup('plastic')" title="พลาสติก / ทริม">
          <div class="dot-ring"><div class="dot-core">6</div></div>
        </div>
        <div class="hotspot" data-mode="car" style="left:73%;top:31%;" onclick="diagramShowPopup('rear')" title="กระจกหลัง / ใบปัดหลัง">
          <div class="dot-ring"><div class="dot-core">7</div></div>
        </div>

        <!-- MOTO hotspots -->
        <div class="hotspot hidden" data-mode="moto" style="left:38%;top:18%;" onclick="diagramShowPopup('moto_windshield')" title="กระจกหน้า">
          <div class="dot-ring"><div class="dot-core">1</div></div>
        </div>
        <div class="hotspot hidden" data-mode="moto" style="left:36%;top:38%;" onclick="diagramShowPopup('moto_headlight')" title="ไฟหน้า">
          <div class="dot-ring"><div class="dot-core">2</div></div>
        </div>
        <div class="hotspot hidden" data-mode="moto" style="left:55%;top:45%;" onclick="diagramShowPopup('moto_engine')" title="เครื่องยนต์">
          <div class="dot-ring"><div class="dot-core">3</div></div>
        </div>
        <div class="hotspot hidden" data-mode="moto" style="left:31%;top:72%;" onclick="diagramShowPopup('moto_wheel')" title="ล้อ / ยาง / เบรค">
          <div class="dot-ring"><div class="dot-core">4</div></div>
        </div>
        <div class="hotspot hidden" data-mode="moto" style="left:45%;top:58%;" onclick="diagramShowPopup('moto_body')" title="ตัวถัง / ฝาครอบ">
          <div class="dot-ring"><div class="dot-core">5</div></div>
        </div>
        <div class="hotspot hidden" data-mode="moto" style="left:85%;top:12%;" onclick="diagramShowPopup('moto_helmet')" title="หมวกกันน็อค">
          <div class="dot-ring"><div class="dot-core">6</div></div>
        </div>

      </div><!-- end vehicle-container -->

      ${isTeaser ? `
      <div class="diagram-teaser-overlay" id="diagramTeaserOverlay">
        <div class="diagram-teaser-cta">
          <p><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"/>
  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
</svg> สำรวจสินค้าทุกจุดของรถ</p>
          <a href="products.html" class="btn btn-primary">เปิด Diagram เต็มรูปแบบ →</a>
        </div>
      </div>` : ''}

      <div class="diagram-hint">
        <span class="diagram-hint-dot"></span>
        <span id="diagramHintText">กดจุดบนรถเพื่อดูสินค้าที่เหมาะกับชิ้นส่วนนั้น</span>
      </div>

      <!-- Zone badges — car -->
      <div class="diagram-zones" id="diagramZonesCar">
        <span class="zone-badge" onclick="diagramShowPopup('windshield')">① กระจกหน้า / ใบปัด</span>
        <span class="zone-badge" onclick="diagramShowPopup('headlight')">② ไฟหน้า</span>
        <span class="zone-badge" onclick="diagramShowPopup('engine')">③ ห้องเครื่อง</span>
        <span class="zone-badge" onclick="diagramShowPopup('wheel')">④ ล้อ / ยาง / เบรค</span>
        <span class="zone-badge" onclick="diagramShowPopup('body')">⑤ ตัวถัง / สีรถ</span>
        <span class="zone-badge" onclick="diagramShowPopup('plastic')">⑥ พลาสติก / ทริม</span>
        <span class="zone-badge" onclick="diagramShowPopup('rear')">⑦ กระจกหลัง</span>
      </div>

      <!-- Zone badges — moto -->
      <div class="diagram-zones" id="diagramZonesMoto" style="display:none;">
        <span class="zone-badge" onclick="diagramShowPopup('moto_windshield')">① กระจกหน้า</span>
        <span class="zone-badge" onclick="diagramShowPopup('moto_headlight')">② ไฟหน้า</span>
        <span class="zone-badge" onclick="diagramShowPopup('moto_engine')">③ เครื่องยนต์</span>
        <span class="zone-badge" onclick="diagramShowPopup('moto_wheel')">④ ล้อ / ยาง / เบรค</span>
        <span class="zone-badge" onclick="diagramShowPopup('moto_body')">⑤ ตัวถัง / ฝาครอบ</span>
        <span class="zone-badge" onclick="diagramShowPopup('moto_helmet')">⑥ หมวกกันน็อค</span>
      </div>

    </div><!-- end stage -->

    <!-- Diagram Popup -->
    <div class="diagram-overlay" id="diagramOverlay">
      <div class="diagram-popup" id="diagramPopup">
        <div class="dpopup-header">
          <div class="dpopup-zone"  id="diagramPopupZone"></div>
          <div class="dpopup-title" id="diagramPopupTitle"></div>
          <button class="dpopup-close" onclick="diagramClosePopup()">✕</button>
        </div>
        <div class="dpopup-body">
          <div class="dpopup-list" id="diagramProductList"></div>
        </div>
      </div>
    </div>
  `;
}
