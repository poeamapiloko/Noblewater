/**
 * Noble Water — Cart (with coupon support)
 * -----------------------------------------
 * Add to every page that should have a cart:
 *   <script src="cart.js" defer></script>
 *
 * Product card wiring (unchanged):
 *   <div class="product-card" data-product
 *        data-id="500ml" data-name="500 ml Standard Bottle"
 *        data-price="135.00" data-unit="case of 24 bottles">
 *     ...
 *     <button class="nw-add-btn" data-add-to-cart>Add to Cart</button>
 *   </div>
 *
 * Coupons: edit the COUPONS list below to add, change or remove codes.
 */

(function () {
  const CART_KEY = 'nw_cart_v1';
  const COUPON_KEY = 'nw_coupon_v1';

  // ===================== EDIT YOUR COUPONS HERE =====================
  // type: 'perCase'  -> value is a Loti amount taken off EACH case (5 cases x M10 = M50 off)
  //       'fixed'    -> value is a Loti amount taken off the whole order (M10 off)
  //       'percent'  -> value is a percentage taken off the order
  //       'shipping' -> removes the delivery fee (applied at checkout)
  // expires (optional): 'YYYY-MM-DD'
  const COUPONS = {
    CONFERENCE: { type: 'perCase', value: 10, label: 'M10 off each case' },
    NOBLE10:    { type: 'percent', value: 10, label: '10% off' },
    WELCOME5:   { type: 'percent', value: 5,  label: '5% off' },
    FREESHIP:   { type: 'shipping',            label: 'Free delivery' }
  };
  // ==================================================================

  // ---------- storage ----------

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
    renderBadge();
  }

  function addToCart(item) {
    const cart = loadCart();
    const existing = cart.find((c) => c.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...item, qty: 1 });
    }
    saveCart(cart);
    openDrawer();

    if (typeof gtag === 'function') {
      gtag('event', 'add_to_cart', {
        currency: 'LSL',
        value: item.price,
        items: [{ item_id: item.id, item_name: item.name, price: item.price }],
      });
    }
  }

  function updateQty(id, qty) {
    let cart = loadCart();
    if (qty <= 0) {
      cart = cart.filter((c) => c.id !== id);
    } else {
      const item = cart.find((c) => c.id === id);
      if (item) item.qty = qty;
    }
    saveCart(cart);
  }

  function cartTotal(cart) {
    return cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  }

  function cartCount(cart) {
    return cart.reduce((sum, c) => sum + c.qty, 0);
  }

  // ---------- coupons ----------

  function isCouponValid(code) {
    const c = COUPONS[code];
    if (!c) return false;
    if (c.expires && new Date() > new Date(c.expires + 'T23:59:59')) return false;
    return true;
  }

  // Returns the active coupon code (string) or null
  function getActiveCoupon() {
    let code = null;
    try {
      code = localStorage.getItem(COUPON_KEY);
    } catch {}
    return code && isCouponValid(code) ? code : null;
  }

  function setCoupon(code) {
    try {
      if (code) localStorage.setItem(COUPON_KEY, code);
      else localStorage.removeItem(COUPON_KEY);
    } catch {}
  }

  // Amount (in Loti) taken off. deliveryFee is only needed for 'shipping' coupons.
  function couponDiscount(subtotal, deliveryFee) {
    const code = getActiveCoupon();
    if (!code || subtotal <= 0) return 0;
    const c = COUPONS[code];
    if (c.type === 'percent') return Math.round(subtotal * c.value) / 100;
    if (c.type === 'perCase') return Math.min(c.value * cartCount(loadCart()), subtotal);
    if (c.type === 'fixed') return Math.min(c.value, subtotal);
    if (c.type === 'shipping') return deliveryFee || 0;
    return 0;
  }

  function setCouponMessage(text, ok) {
    ['nw-coupon-msg', 'promoMsg'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      el.className = ok ? 'ok' : 'err';
    });
  }

  // Called from the drawer box and from the Specials-section promo box
  function applyCouponFromInput(inputEl) {
    const code = (inputEl.value || '').trim().toUpperCase();
    if (!code) {
      setCouponMessage('Please enter a coupon code.', false);
      return;
    }
    if (!isCouponValid(code)) {
      setCoupon(null);
      setCouponMessage('Invalid or expired coupon.', false);
    } else {
      setCoupon(code);
      setCouponMessage('Coupon ' + code + ' applied: ' + COUPONS[code].label + '!', true);
    }
    inputEl.value = '';
    renderCart();
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponMessage('', true);
    renderCart();
  }

  // ---------- UI: badge on nav ----------

  function renderBadge() {
    const badge = document.getElementById('nw-cart-badge');
    if (!badge) return;
    const count = cartCount(loadCart());
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  // ---------- UI: drawer ----------

  function injectCouponStyles() {
    if (document.getElementById('nw-coupon-styles')) return;
    const style = document.createElement('style');
    style.id = 'nw-coupon-styles';
    style.textContent = `
      #nw-coupon-box{padding:12px 0 4px}
      #nw-coupon-row{display:flex;gap:8px}
      #nw-coupon-input{flex:1;padding:9px 12px;border:1px solid #d5dde3;border-radius:100px;
        text-transform:uppercase;font-size:13px;outline:none;font-family:inherit}
      #nw-coupon-input:focus{border-color:#2FBF71}
      #nw-coupon-btn{background:#2FBF71;color:#fff;border:none;border-radius:100px;
        padding:9px 16px;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit}
      #nw-coupon-msg{font-size:12px;margin-top:6px;min-height:1em}
      #nw-coupon-msg.ok{color:#1e8e55}
      #nw-coupon-msg.err{color:#c0392b}
      .nw-sum-row{display:flex;justify-content:space-between;font-size:14px;padding:3px 0}
      .nw-sum-discount{color:#1e8e55;font-weight:600}
      .nw-sum-discount button{background:none;border:none;color:#c0392b;cursor:pointer;
        font-size:12px;margin-left:6px;text-decoration:underline;padding:0}
      .nw-old-total{text-decoration:line-through;color:#8a97a0;font-size:13px;margin-right:6px;font-weight:400}
    `;
    document.head.appendChild(style);
  }

  function ensureDrawer() {
    if (document.getElementById('nw-cart-drawer')) return;
    injectCouponStyles();

    const drawer = document.createElement('div');
    drawer.id = 'nw-cart-drawer';
    drawer.innerHTML = `
      <div id="nw-cart-overlay"></div>
      <aside id="nw-cart-panel" aria-label="Shopping cart">
        <header>
          <h2>Your Order</h2>
          <button id="nw-cart-close" aria-label="Close cart">&times;</button>
        </header>
        <div id="nw-cart-items"></div>
        <footer>
          <div id="nw-coupon-box">
            <div id="nw-coupon-row">
              <input type="text" id="nw-coupon-input" placeholder="Coupon code" autocomplete="off">
              <button type="button" id="nw-coupon-btn">Apply</button>
            </div>
            <div id="nw-coupon-msg"></div>
          </div>
          <div id="nw-cart-summary"></div>
          <div id="nw-cart-total-row">
            <span>Total</span>
            <span><span id="nw-cart-old-total"></span><span id="nw-cart-total">M0.00</span></span>
          </div>
          <a id="nw-cart-checkout-btn" href="checkout.html">Proceed to Checkout</a>
        </footer>
      </aside>
    `;
    document.body.appendChild(drawer);

    document.getElementById('nw-cart-close').addEventListener('click', closeDrawer);
    document.getElementById('nw-cart-overlay').addEventListener('click', closeDrawer);

    const input = document.getElementById('nw-coupon-input');
    document.getElementById('nw-coupon-btn').addEventListener('click', () => applyCouponFromInput(input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyCouponFromInput(input);
    });
  }

  function openDrawer() {
    ensureDrawer();
    document.getElementById('nw-cart-drawer').classList.add('nw-open');
  }

  function closeDrawer() {
    const el = document.getElementById('nw-cart-drawer');
    if (el) el.classList.remove('nw-open');
  }

  function renderCart() {
    ensureDrawer();
    const cart = loadCart();
    const itemsEl = document.getElementById('nw-cart-items');
    const totalEl = document.getElementById('nw-cart-total');
    const oldTotalEl = document.getElementById('nw-cart-old-total');
    const summaryEl = document.getElementById('nw-cart-summary');

    if (cart.length === 0) {
      itemsEl.innerHTML = `<p class="nw-cart-empty">Your cart is empty.</p>`;
    } else {
      itemsEl.innerHTML = cart
        .map(
          (item) => `
        <div class="nw-cart-row" data-id="${item.id}">
          <div class="nw-cart-row-info">
            <strong>${item.name}</strong>
            <span>${item.unit || ''}</span>
          </div>
          <div class="nw-cart-row-controls">
            <button class="nw-qty-btn" data-action="dec">−</button>
            <span class="nw-qty">${item.qty}</span>
            <button class="nw-qty-btn" data-action="inc">+</button>
          </div>
          <div class="nw-cart-row-price">M${(item.price * item.qty).toFixed(2)}</div>
        </div>
      `
        )
        .join('');

      itemsEl.querySelectorAll('.nw-cart-row').forEach((row) => {
        const id = row.getAttribute('data-id');
        const item = cart.find((c) => c.id === id);
        row.querySelector('[data-action="inc"]').addEventListener('click', () =>
          updateQty(id, item.qty + 1)
        );
        row.querySelector('[data-action="dec"]').addEventListener('click', () =>
          updateQty(id, item.qty - 1)
        );
      });
    }

    // ----- totals with coupon -----
    const subtotal = cartTotal(cart);
    const code = getActiveCoupon();
    const c = code ? COUPONS[code] : null;
    // Shipping coupons are applied at checkout, where the delivery fee is known
    const discount = c && c.type !== 'shipping' ? couponDiscount(subtotal, 0) : 0;
    const finalTotal = Math.max(subtotal - discount, 0);

    let summary = '';
    if (cart.length > 0 && code) {
      summary += `<div class="nw-sum-row"><span>Subtotal</span><span>M${subtotal.toFixed(2)}</span></div>`;
      if (c.type === 'shipping') {
        summary += `<div class="nw-sum-row nw-sum-discount"><span>Coupon ${code}: ${c.label} (at checkout)
          <button type="button" id="nw-coupon-remove">Remove</button></span><span></span></div>`;
      } else {
        const detail = c.type === 'perCase' ? ` (${cartCount(cart)} cases × M${c.value})` : '';
        summary += `<div class="nw-sum-row nw-sum-discount"><span>Coupon ${code}${detail}
          <button type="button" id="nw-coupon-remove">Remove</button></span><span>-M${discount.toFixed(2)}</span></div>`;
      }
    }
    summaryEl.innerHTML = summary;
    const rm = document.getElementById('nw-coupon-remove');
    if (rm) rm.addEventListener('click', removeCoupon);

    oldTotalEl.innerHTML = discount > 0 ? `<span class="nw-old-total">M${subtotal.toFixed(2)}</span>` : '';
    totalEl.textContent = `M${finalTotal.toFixed(2)}`;
  }

  // ---------- wire up "Add to Cart" buttons ----------

  function wireButtons() {
    document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
      if (btn.dataset.nwWired) return;
      btn.dataset.nwWired = 'true';
      btn.addEventListener('click', () => {
        const card = btn.closest('[data-product]');
        if (!card) return;
        addToCart({
          id: card.dataset.id,
          name: card.dataset.name,
          price: parseFloat(card.dataset.price),
          unit: card.dataset.unit || '',
        });
      });
    });
  }

  // Wire the optional promo box in the Specials section (#promoInput / #promoBtn)
  function wirePageCouponBox() {
    const input = document.getElementById('promoInput');
    const btn = document.getElementById('promoBtn');
    if (!input || !btn || btn.dataset.nwWired) return;
    btn.dataset.nwWired = 'true';
    btn.addEventListener('click', () => applyCouponFromInput(input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyCouponFromInput(input);
    });
    const code = getActiveCoupon();
    if (code) setCouponMessage('Coupon ' + code + ' applied: ' + COUPONS[code].label + '!', true);
  }

  // ---------- init ----------

  document.addEventListener('DOMContentLoaded', () => {
    ensureDrawer();
    renderCart();
    renderBadge();
    wireButtons();
    wirePageCouponBox();

    window.nwRefreshCartButtons = wireButtons;
  });

  // Helpers (also usable from checkout.html)
  window.NobleCart = {
    open: openDrawer,
    close: closeDrawer,
    load: loadCart,
    subtotal: function () { return cartTotal(loadCart()); },
    couponCode: getActiveCoupon,                       // e.g. "CONFERENCE" or null
    couponType: function () { const c = getActiveCoupon(); return c ? COUPONS[c].type : null; },
    discount: couponDiscount,                          // discount(subtotal, deliveryFee) -> Loti amount
  };
})();
