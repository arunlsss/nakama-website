(function () {
  'use strict';
  const tooltip = document.createElement('aside');
  tooltip.id = 'chart-detail-popup';
  tooltip.className = 'chart-detail-popup';
  tooltip.setAttribute('role', 'dialog');
  tooltip.setAttribute('aria-label', 'Chart and metric details');
  tooltip.hidden = true;
  document.body.append(tooltip);
  let active = null, pinned = false, dismissed = null, pointerHandled = false;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  function hide(suppress = false) {
    if(suppress) dismissed = active;
    active?.removeAttribute('aria-describedby');
    active?.classList.remove('detail-active');
    tooltip.hidden = true; active = null; pinned = false;
  }
  function position(event) {
    const box = active.getBoundingClientRect(), bounds = tooltip.getBoundingClientRect();
    const width = document.documentElement.clientWidth, height = window.innerHeight;
    let x = event?.clientX ?? box.left + box.width / 2, y = event?.clientY ?? box.top;
    x = Math.max(8, Math.min(x + 14, width - bounds.width - 8));
    y = y + 18 + bounds.height > height - 8 ? y - bounds.height - 14 : y + 18;
    tooltip.style.left = x + 'px';
    tooltip.style.top = Math.max(8, Math.min(y, height - bounds.height - 8)) + 'px';
  }
  function show(target, event, pin = false) {
    let data; try { data = JSON.parse(target.dataset.chartDetail); } catch { return; }
    if(active !== target) hide();
    active = target; pinned = pin;
    target.setAttribute('aria-describedby', tooltip.id);
    target.classList.add('detail-active');
    tooltip.innerHTML = `<button class="detail-close" type="button" aria-label="Close details">×</button><h3>${esc(data.title)}</h3><dl>${(data.rows || []).map(([name, value]) => `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${data.note ? `<p>${esc(data.note)}</p>` : ''}`;
    tooltip.hidden = false; position(event);
  }
  const targetOf = event => event.target.closest?.('[data-chart-detail]');
  document.addEventListener('pointerover', event => {
    if(event.pointerType !== 'mouse' || pinned || tooltip.contains(event.target)) return;
    const target = targetOf(event); if(target && target !== active && target !== dismissed) show(target, event);
  });
  document.addEventListener('pointermove', event => { if(active && !pinned && event.pointerType === 'mouse' && targetOf(event) === active) position(event); });
  document.addEventListener('pointerout', event => {
    if(dismissed && targetOf(event) === dismissed && !dismissed.contains(event.relatedTarget)) dismissed = null;
    if(!pinned && active && targetOf(event) === active && !active.contains(event.relatedTarget) && !tooltip.contains(event.relatedTarget)) hide();
  });
  document.addEventListener('focusin', event => { const target = targetOf(event); if(target && !pinned && target !== dismissed) show(target); });
  document.addEventListener('focusout', event => { if(!pinned && active && targetOf(event) === active && !tooltip.contains(event.relatedTarget)) hide(); });
  document.addEventListener('pointerdown', event => {
    pointerHandled = false;
    const target = targetOf(event);
    if(target && event.button === 0) {
      pointerHandled = true;
      if(active === target && pinned) hide(true);
      else { dismissed = null; show(target, event, true); }
    }
  });
  document.addEventListener('pointercancel', event => { pointerHandled = false; if(targetOf(event) === active) hide(true); });
  document.addEventListener('click', event => {
    if(pointerHandled) { pointerHandled = false; return; }
    if(event.target.closest('.detail-close')) { const previous = active; hide(); previous?.focus({preventScroll:true}); hide(); return; }
    const target = targetOf(event);
    if(target) { const close = active === target && pinned; if(close) hide(true); else { dismissed = null; show(target, undefined, true); } }
    else if(!tooltip.contains(event.target)) hide();
  });
  document.addEventListener('keydown', event => {
    pointerHandled = false;
    if(event.key === 'Escape') hide(true);
    else if((event.key === 'Enter' || event.key === ' ') && targetOf(event) && event.target.tagName !== 'BUTTON') { event.preventDefault(); targetOf(event).dispatchEvent(new MouseEvent('click', {bubbles:true})); }
  });
  window.addEventListener('resize', hide);
  document.addEventListener('scroll', event => { if(active && !tooltip.contains(event.target)) { if(pinned) position(); else hide(); } }, true);
  new MutationObserver(() => { if(active && (!active.isConnected || active.closest('[hidden]'))) hide(); }).observe(document.getElementById('dashboard'), {subtree:true, childList:true, attributes:true, attributeFilter:['hidden']});
  const help = (anchor, title, note, card = false) => {
    if(!anchor) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'metric-help' + (card ? ' card-help' : '');
    button.setAttribute('aria-label', 'Explain ' + title);
    button.dataset.chartDetail = JSON.stringify({title, rows:[], note});
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/></svg>';
    anchor.append(button);
  };
  [
    ['gmv','Order value / GMV','Price × Quantity using the selected sales basis, dates and filters. All includes canceled and returned orders. Fees, refunds, advertising and product costs have not been deducted.'],
    ['orders','Orders','Included orders within the selected sales basis and filters. Platform Processing and excluded unpriced Shopee To Ship rows do not count.'],
    ['units','Units ordered','Selected quantity from imported order records. Check source-verification warnings before relying on unit comparisons.'],
    ['aov','Average order value','Selected order value divided by selected order count. This is not profit per order.']
  ].forEach(([id,title,note]) => help(document.getElementById(id)?.closest('.kpi'),title,note,true));
  [
    ['trend','Sales trend','Hover, tap or focus a chart column for exact values. Prior values are aligned by position in the previous comparison period, with their own dates shown. Missing records are not confirmed zero sales.'],
    ['platform-bars','Marketplace mix','Each segment is a marketplace’s share of selected order value. Details include order count and average order value.'],
    ['weekday-chart','Sales by weekday','Order value divided by the number of calendar occurrences of each weekday within imported months. This is a daily average, not average value per order.'],
    ['lifecycle-mini','Order lifecycle','Uses all statuses for selected dates, store and marketplace. Sales-basis and status filters do not change this view. Returned order value is not a verified refund amount.'],
    ['lifecycle-chart','Order health','Cancellation and return rates use all included orders as their denominator. Statuses come from the latest imported snapshots; refresh exports to review current conditions.'],
    ['orders-chart','Order volume','Exact imported orders by day or month. Blank dates are not independently verified as zero sales.'],
    ['store-chart','Leading stores','Ranked by selected order value. Hover or tap a store for value, orders, units and average order value.'],
    ['product-chart','Top products','Monthly product totals only. One order can contain multiple products, so SKU order counts must not be added together as total orders.']
  ].forEach(([id,title,note]) => help(document.getElementById(id)?.closest('.panel')?.querySelector('.panel-heading'), title, note));
  document.querySelectorAll('#trend,#platform-bars,#weekday-chart,#lifecycle-mini,#lifecycle-chart,#orders-chart,#store-chart,#product-chart').forEach(chart => {
    chart.setAttribute('role','group');
    const hint = document.createElement('p'); hint.className = 'chart-interaction-hint';
    hint.innerHTML = '<span class="desktop-hint">Hover or focus for details</span><span class="touch-hint">Tap for details · tap again to close</span>';
    chart.after(hint);
  });
})();
