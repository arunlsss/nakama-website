'use strict';
const NKM_STORE_LABELS = Object.freeze({
  "CKW_SHP": "Chakkawan Shopee",
  "Manual Orders": "Manual Orders",
  "NKM LazChoice_TH": "Nakama LazChoice",
  "NKM_LZD": "Nakama Lazada",
  "NKM_SHP": "Nakama Shopee",
  "NKM_TM": "Nakama Thai Mart",
  "NKM_TT": "Nakama TikTok Shop",
  "OEMP_SHP": "OEM Plus Shopee",
  "OEMP_TT": "OEM Plus TikTok Shop",
  "SG_SHP": "Super Gloss Shopee",
  "SG_TT": "Super Gloss TikTok Shop",
  "SG(GB)_SHP": "Super Gloss Global shopee",
  "WCH_LZD": "Wanchaiyont Lazada",
  "WCH_SHP": "Wanchaiyont Shopee"
});
const nkmStoreLabel = code => NKM_STORE_LABELS[code] || code;

