/**
 * Noble Water — Cart
 * -------------------
 * Drop this file in alongside your existing site (e.g. /cart.js) and add
 *   <script src="cart.js" defer></script>
 * before the closing </body> tag on every page that should have a cart
 * (index.html and checkout.html).
 *
 * How to wire up a product:
 * Add a data-product wrapper and an "Add to Cart" button to each product
 * card, e.g.:
 *
 *   <div class="product-card" data-product
 *        data-id="500ml"
 *        data-name="500 ml Standard Bottle"
 *        data-price="135.00"
 *        data-unit="case of 24 bottles">
 *     ...existing card markup...
 *     <button class="nw-add-btn" data-add-to-cart>Add to Cart</button>
 *   </div>
 *
 * That's it — this script finds every [data-add-to-cart] button, walks up
 * to its closest [data-product] wrapper, and reads the id/name/price/unit
 * from its data-* attributes.
 */

(function () {
  const CART_KEY = 'nw_cart_v1';

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

  // ---------- UI: badge on nav ----------

  function renderBadge() {
    const badge = document.getElementById('nw-cart-badge');
    if (!badge) return;
    const count = cartCount(loadCart());
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  // ---------- UI: drawer ----------

  function ensureDrawer() {
    if (document.getElementById('nw-cart-drawer')) return;

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
          <div id="nw-cart-total-row">
            <span>Total</span>
            <span id="nw-cart-total">M0.00</span>
          </div>
          <a id="nw-cart-checkout-btn" href="checkout.html">Proceed to Checkout</a>
        </footer>
      </aside>
    `;
    document.body.appendChild(drawer);

    document.getElementById('nw-cart-close').addEventListener('click', closeDrawer);
    document.getElementById('nw-cart-overlay').addEventListener('click', closeDrawer);
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

    totalEl.textContent = `M${cartTotal(cart).toFixed(2)}`;
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

  // ---------- init ----------

  document.addEventListener('DOMContentLoaded', () => {
    ensureDrawer();
    renderCart();
    renderBadge();
    wireButtons();

    // If products are added to the DOM after load (rare on a static site),
    // re-scan periodically-cheap alternative: expose a manual hook.
    window.nwRefreshCartButtons = wireButtons;
  });

  // Expose a couple of helpers in case you want a "View Cart" nav link too.
  window.NobleCart = { open: openDrawer, close: closeDrawer, load: loadCart };
})();
