/* ============================================================
   NAKAMA5666 — i18n.js
   ระบบภาษา ไทย / English
   ใช้งาน:
     import หรือ <script> โหลดก่อน main.js
     t('key.path')  → string ตาม currentLang
     setLang('en')  → เปลี่ยนภาษา + reload
     getCurrentLang() → 'th' | 'en'
============================================================ */

const LANG = {

  /* ─────────────── THAI ─────────────── */
  th: {
    nav: {
      home:      'หน้าแรก',
      products:  'สินค้า',
      findWiper: 'ค้นหาใบปัด',
      about:     'เกี่ยวกับเรา',
    },
    footer: {
      tagline:     'ผลิตภัณฑ์ดูแลรถยนต์คุณภาพสูง',
      shopOnline:  'ช้อปออนไลน์',
      shopee:      'Shopee',
      lazada:      'Lazada',
      tiktok:      'TikTok Shop',
      followUs:    'ติดตามเรา',
      facebook:    'Facebook',
      instagram:   'Instagram',
      line:        'LINE Official',
      quickLinks:  'ลิงก์ด่วน',
      copyright:   '© 2025 NAKAMA5666. สงวนลิขสิทธิ์',
    },
    hero: {
      slide1: {
        eyebrow:  'NAKAMA5666 WIPER BLADES',
        headline: 'มองชัด\nขับปลอดภัย',
        sub:      'ใบปัดน้ำฝนคุณภาพสูง รองรับรถยนต์ทุกรุ่น ทนทานทุกสภาพอากาศ',
        cta:      'เลือกใบปัดสำหรับรถคุณ',
        cta2:     'ดูสินค้าทั้งหมด',
      },
      slide2: {
        eyebrow:  'FIND YOUR WIPER SIZE',
        headline: 'ไม่รู้ว่าใบปัด\nขนาดไหน?',
        sub:      'กรอกยี่ห้อและรุ่นรถ — ระบบบอกขนาดใบปัดที่เหมาะสมให้เลย',
        cta:      'ค้นหาขนาดใบปัด',
      },
      slide3: {
        eyebrow:  'SPRAY COLLECTION',
        headline: 'ดูแลรถครบ\nจบในแบรนด์เดียว',
        sub:      'สเปรย์ดูแลรถ 14 สูตร ตั้งแต่ล้างเบรค ไปจนถึงขัดไฟหน้า',
        cta:      'ดูสเปรย์ทั้งหมด',
      },
      slide4: {
        eyebrow:  'PROMOTION',
        headline: 'หน้าฝนนี้\nอย่าลืมเช็คใบปัด',
        sub:      'ชุดเซ็ตใบปัด + Brake Cleaner ราคาพิเศษ มีจำนวนจำกัด',
        cta:      'ช้อปเลยที่ Shopee',
      },
    },
    section: {
      bestSellers:        'สินค้าขายดี',
      bestSellersSub:     'ผลิตภัณฑ์ที่ลูกค้าเลือกมากที่สุด',
      sprayCollection:    'Spray Collection',
      sprayCollectionSub: 'ครอบคลุมทุกการดูแลรถยนต์',
      diagramTitle:       'เลือกสินค้าตามตำแหน่งรถ',
      diagramSub:         'คลิกที่จุดบนรถเพื่อดูสินค้าที่เหมาะสม',
      ctaBanner:          'พร้อมดูแลรถของคุณแล้วหรือยัง?',
      ctaBannerSub:       'ช้อปสินค้า NAKAMA5666 ได้ที่ Shopee, Lazada และ TikTok Shop',
      ctaShop:            'ช้อปเลย',
      allProducts:        'สินค้าทั้งหมด',
      findWiperTitle:     'ค้นหาขนาดใบปัดสำหรับรถคุณ',
      findWiperSub:       'เลือกยี่ห้อ รุ่น และปี — ระบบแนะนำขนาดที่เหมาะสม',
      aboutTitle:         'เกี่ยวกับ NAKAMA5666',
    },
    product: {
      shopAtShopee:   'ช้อปที่ Shopee →',
      badgeBestSeller:'🔥 ขายดี',
      badgeNew:       '✨ ใหม่',
      viewAll:        'ดูสินค้าทั้งหมด',
      viewDetails:    'ดูรายละเอียด →',
      variantsLabel:  'เลือกแบบ / ขนาด',
    },
    wiper: {
      brandLabel:       'ยี่ห้อรถ',
      brandPlaceholder: '-- เลือกยี่ห้อ --',
      modelLabel:       'รุ่นรถ',
      modelPlaceholder: '-- เลือกรุ่นรถ --',
      yearLabel:        'ปี (พ.ศ.)',
      yearPlaceholder:  '-- เลือกปี --',
      resultTitle:      'ผลการค้นหา',
      frontDriver:      'ใบปัดหน้า (ฝั่งคนขับ)',
      frontPassenger:   'ใบปัดหน้า (ฝั่งผู้โดยสาร)',
      rear:             'ใบปัดหลัง',
      buyShopee:        'ซื้อที่ Shopee',
      notFound:         'ไม่พบข้อมูลสำหรับรถรุ่นนี้ กรุณาติดต่อเราโดยตรง',
    },
    diagram: {
      toggleCar:  'รถยนต์',
      toggleMoto: 'มอเตอร์ไซค์',
      closePopup: 'ปิด',
      viewProduct:'ดูสินค้า',
    },
    lang: {
      switch: 'EN',
      label:  'ภาษา',
    },
  },

  /* ─────────────── ENGLISH ─────────────── */
  en: {
    nav: {
      home:      'Home',
      products:  'Products',
      findWiper: 'Find Wiper',
      about:     'About',
    },
    footer: {
      tagline:     'Premium Automotive Care Products',
      shopOnline:  'Shop Online',
      shopee:      'Shopee',
      lazada:      'Lazada',
      tiktok:      'TikTok Shop',
      followUs:    'Follow Us',
      facebook:    'Facebook',
      instagram:   'Instagram',
      line:        'LINE Official',
      quickLinks:  'Quick Links',
      copyright:   '© 2025 NAKAMA5666. All rights reserved.',
    },
    hero: {
      slide1: {
        eyebrow:  'NAKAMA5666 WIPER BLADES',
        headline: 'Clear Vision,\nSafe Drive',
        sub:      'Premium wiper blades compatible with all vehicle models, built for every weather condition.',
        cta:      'Find Wipers for Your Car',
        cta2:     'View All Products',
      },
      slide2: {
        eyebrow:  'FIND YOUR WIPER SIZE',
        headline: "Don't Know\nYour Wiper Size?",
        sub:      'Enter your car brand and model — we\'ll tell you the exact size you need.',
        cta:      'Find Wiper Size',
      },
      slide3: {
        eyebrow:  'SPRAY COLLECTION',
        headline: 'Complete Car Care\nin One Brand',
        sub:      '14 spray formulas for every need — from brake cleaning to headlight restoration.',
        cta:      'View All Sprays',
      },
      slide4: {
        eyebrow:  'PROMOTION',
        headline: 'Rainy Season?\nCheck Your Wipers',
        sub:      'Wiper set + Brake Cleaner bundle at special price. Limited stock.',
        cta:      'Shop Now on Shopee',
      },
    },
    section: {
      bestSellers:        'Best Sellers',
      bestSellersSub:     'Most popular products among our customers',
      sprayCollection:    'Spray Collection',
      sprayCollectionSub: 'Complete automotive care coverage',
      diagramTitle:       'Shop by Car Location',
      diagramSub:         'Click a hotspot on the car to see matching products',
      ctaBanner:          'Ready to Take Care of Your Car?',
      ctaBannerSub:       'Shop NAKAMA5666 on Shopee, Lazada, and TikTok Shop',
      ctaShop:            'Shop Now',
      allProducts:        'All Products',
      findWiperTitle:     'Find the Right Wiper Size for Your Car',
      findWiperSub:       'Select brand, model, and year — we\'ll recommend the correct size',
      aboutTitle:         'About NAKAMA5666',
    },
    product: {
      shopAtShopee:    'Shop on Shopee →',
      badgeBestSeller: '🔥 Best Seller',
      badgeNew:        '✨ New',
      viewAll:         'View All Products',
      viewDetails:     'View Details →',
      variantsLabel:   'Select Option / Size',
    },
    wiper: {
      brandLabel:       'Car Brand',
      brandPlaceholder: '-- Select Brand --',
      modelLabel:       'Car Model',
      modelPlaceholder: '-- Select Model --',
      yearLabel:        'Year',
      yearPlaceholder:  '-- Select Year --',
      resultTitle:      'Search Result',
      frontDriver:      'Front Wiper (Driver Side)',
      frontPassenger:   'Front Wiper (Passenger Side)',
      rear:             'Rear Wiper',
      buyShopee:        'Buy on Shopee',
      notFound:         'No data found for this vehicle. Please contact us directly.',
    },
    diagram: {
      toggleCar:  'Car',
      toggleMoto: 'Motorcycle',
      closePopup: 'Close',
      viewProduct:'View Product',
    },
    lang: {
      switch: 'ไทย',
      label:  'Language',
    },
  },
};

/* ─────────────────────────────────────────
   Internal state
───────────────────────────────────────── */
const _STORAGE_KEY = 'nakama_lang';
const _SUPPORTED   = ['th', 'en'];
const _DEFAULT     = 'th';

function _resolve() {
  const stored = localStorage.getItem(_STORAGE_KEY);
  return _SUPPORTED.includes(stored) ? stored : _DEFAULT;
}

let _current = _resolve();

/* ─────────────────────────────────────────
   Public API
───────────────────────────────────────── */

/**
 * ดึงค่า string ตาม key path (dot-notation)
 * เช่น t('nav.home'), t('product.badgeBestSeller')
 * ถ้าไม่เจอ key → return key เอง (ไม่ silent fail)
 */
function t(keyPath) {
  const keys = keyPath.split('.');
  let node = LANG[_current];
  for (const k of keys) {
    if (node == null || typeof node !== 'object') return keyPath;
    node = node[k];
  }
  return (node != null && typeof node === 'string') ? node : keyPath;
}

/**
 * อ่านภาษาปัจจุบัน → 'th' | 'en'
 */
function getCurrentLang() {
  return _current;
}

/**
 * เปลี่ยนภาษา + บันทึกใน localStorage
 * reload = true (default) → reload หน้า
 * reload = false → เปลี่ยน state เฉยๆ (สำหรับ dynamic re-render ในอนาคต)
 */
function setLang(lang, reload = true) {
  if (!_SUPPORTED.includes(lang)) return;
  localStorage.setItem(_STORAGE_KEY, lang);
  _current = lang;
  if (reload) window.location.reload();
}

/**
 * Toggle ระหว่าง th ↔ en
 */
function toggleLang() {
  setLang(_current === 'th' ? 'en' : 'th');
}

/**
 * ดึง translations object ทั้งหมดของ section
 * เช่น tSection('nav') → { home: '...', products: '...', ... }
 */
function tSection(section) {
  return LANG[_current]?.[section] ?? {};
}
