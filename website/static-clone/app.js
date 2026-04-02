const STORAGE_CART = 'zariya.cart.v2';
const STORAGE_INQUIRIES = 'zariya.inquiries.v1';
const STORAGE_NEWSLETTER = 'zariya.newsletter.v1';
const ADMIN_STORAGE_KEY = 'zariya.admin.products.v1';
const DEFAULT_SIZE = 'M';
const VALID_PRODUCT_TYPES = new Set(['tshirt', 'hoodie', 'crewneck']);
const PRODUCT_IMAGE_FALLBACK = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22900%22 height=%221200%22 viewBox=%220 0 900 1200%22%3E%3Cdefs%3E%3ClinearGradient id=%22bg%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%25%22 stop-color=%22%23f5f4f0%22/%3E%3Cstop offset=%22100%25%22 stop-color=%22%23eeedea%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22900%22 height=%221200%22 fill=%22url(%23bg)%22/%3E%3Ctext x=%2250%25%22 y=%2248%25%22 text-anchor=%22middle%22 fill=%22%23b08d57%22 font-size=%22118%22 font-family=%22Georgia%22 letter-spacing=%226%22%3EZARIYA%3C/text%3E%3Ctext x=%2250%25%22 y=%2254%25%22 text-anchor=%22middle%22 fill=%22%236b6b6b%22 opacity=%220.7%22 font-size=%2240%22 font-family=%22Arial%22 letter-spacing=%2210%22%3ELUXURY STREETWEAR%3C/text%3E%3C/svg%3E';
const DEFAULT_PRODUCTS = Array.isArray(window.PRODUCTS) ? window.PRODUCTS.map((product) => ({ ...product })) : [];
const DEFAULT_PRODUCT_MAP = new Map(DEFAULT_PRODUCTS.map((product) => [product.handle, product]));

function buildHandleFromTitle(title, index = 0) {
  const normalized = String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `zariya-piece-${index + 1}`;
}

function fallbackImage(type = 'tshirt', index = 0) {
  return `https://picsum.photos/seed/zariya-${encodeURIComponent(type)}-${index}/900/1200`;
}

function resolveImageSource(image, type, index = 0) {
  const value = typeof image === 'string' ? image.trim() : '';
  if (value && (/^https?:\/\//i.test(value) || value.startsWith('data:image/') || value.startsWith('images/') || value.startsWith('./') || value.startsWith('../'))) {
    return value;
  }
  return fallbackImage(type, index);
}

function normalizeProduct(rawProduct, index = 0) {
  const candidate = rawProduct && typeof rawProduct === 'object' ? rawProduct : {};
  const byHandle = candidate.handle ? DEFAULT_PRODUCT_MAP.get(String(candidate.handle).trim()) : undefined;
  const byTitle = !byHandle && candidate.title
    ? DEFAULT_PRODUCTS.find((product) => product.title === candidate.title)
    : undefined;
  const base = byHandle || byTitle || {};
  const merged = { ...base, ...candidate };

  const type = VALID_PRODUCT_TYPES.has(String(merged.type || '').toLowerCase())
    ? String(merged.type).toLowerCase()
    : 'tshirt';

  const product = {
    handle: String(merged.handle || '').trim() || buildHandleFromTitle(merged.title, index),
    title: String(merged.title || '').trim() || `Zariya Piece ${index + 1}`,
    vendor: String(merged.vendor || '').trim() || 'ZARIYA',
    type,
    compareAt: Number(merged.compareAt) > 0 ? Number(merged.compareAt) : 0,
    price: Number(merged.price) > 0 ? Number(merged.price) : Number(base.price) || 699,
    image: '',
    description: String(merged.description || '').trim() || 'Premium Zariya piece built with sharp detailing and bold identity.',
  };

  product.image = resolveImageSource(merged.image || base.image, product.type, index);
  return product;
}

function normalizeProducts(list) {
  const source = Array.isArray(list) ? list : DEFAULT_PRODUCTS;
  return source.map((product, index) => normalizeProduct(product, index));
}

// Load products from admin if modified, otherwise use defaults
function loadProducts() {
  const adminProducts = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (!adminProducts) {
    window.PRODUCTS = normalizeProducts(DEFAULT_PRODUCTS);
    return;
  }
  try {
    window.PRODUCTS = normalizeProducts(JSON.parse(adminProducts));
  } catch {
    window.PRODUCTS = normalizeProducts(DEFAULT_PRODUCTS);
  }
}

// Listen for admin updates
window.addEventListener('zariya-products-updated', (e) => {
  loadProducts();
  // Refresh current view if on product pages
  if (document.querySelector('[data-cart-drawer]')) {
    renderCartDrawer();
  }
  if (document.body.dataset.page === 'collection') {
    location.reload();
  }
});

loadProducts();

const state = {
  cart: [],
  quantity: 1,
  selectedSize: DEFAULT_SIZE,
  activeProduct: null,
  collectionType: 'all',
  collectionQuery: '',
  revealObserver: null,
};

const TYPE_LABELS = {
  tshirt: 'T-Shirts',
  hoodie: 'Hoodies',
  crewneck: 'Crewnecks',
};

const FIT_LABELS = {
  tshirt: 'Boxy fit',
  hoodie: 'Oversized',
  crewneck: 'Relaxed',
};

function formatMoney(value) {
  return `Rs. ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function salePercent(price, compareAt) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function hashValue(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function productHue(product) {
  return 28 + (hashValue(product.handle) % 8) * 18;
}

function productHueAlt(product) {
  return (productHue(product) + 36) % 360;
}

function productLabel(product) {
  return (TYPE_LABELS[product.type] || 'Edition').toUpperCase();
}

function productFit(product) {
  return FIT_LABELS[product.type] || 'Refined fit';
}

function shortTitle(title) {
  return title
    .replace(/[:]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .join(' ')
    .toUpperCase();
}

function productSummary(product) {
  if (product.type === 'hoodie') {
    return 'A heavyweight layer with a structured body, brushed interior, and a premium street-ready drape.';
  }
  if (product.type === 'crewneck') {
    return 'A dense crewneck built with a clean neckline, stable shape, and a refined everyday silhouette.';
  }
  return 'A premium tee with a boxy profile, crisp handfeel, and graphic-first placement.';
}

function productNotes(product) {
  return `${productSummary(product)} Limited quantities, sharp lines, and a finish that feels tuned for the luxury streetwear lane.`;
}

function getProduct(handle) {
  return window.PRODUCTS.find((product) => product.handle === handle) || window.PRODUCTS[0];
}

function buildCard(product) {
  const pct = salePercent(product.price, product.compareAt);
  const href = `product.html?handle=${encodeURIComponent(product.handle)}`;
  const imageSource = resolveImageSource(product.image, product.type, hashValue(product.handle));
  return `
    <article class="product-card reveal" style="--art-hue:${productHue(product)}; --art-hue-2:${productHueAlt(product)}">
      <a class="product-card-media" href="${href}">
        <div class="product-card-badge">${escapeHtml(productLabel(product))}</div>
        <div class="product-card-art">
          <img class="product-card-image" src="${escapeHtml(imageSource)}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${PRODUCT_IMAGE_FALLBACK}'">
        </div>
      </a>
      <div class="product-card-body">
        <p class="vendor">${escapeHtml(product.vendor || 'ZARIYA')}</p>
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        <div class="price-row">
          ${product.compareAt ? `<span class="old-price">${formatMoney(product.compareAt)}</span>` : ''}
          <span class="price">${formatMoney(product.price)}</span>
          ${pct ? `<span class="badge">${pct}% OFF</span>` : ''}
        </div>
        <div class="card-actions">
          <a class="button button-ghost" href="${href}">View</a>
          <button class="button button-solid" type="button" data-action="quick-add" data-handle="${escapeHtml(product.handle)}" data-size="${DEFAULT_SIZE}">Quick add</button>
        </div>
      </div>
    </article>
  `;
}

function buildSearchResult(product) {
  const href = `product.html?handle=${encodeURIComponent(product.handle)}`;
  const imageSource = resolveImageSource(product.image, product.type, hashValue(product.handle));
  return `
    <article class="search-result" style="--art-hue:${productHue(product)}; --art-hue-2:${productHueAlt(product)}">
      <a class="search-result-art" href="${href}">
        <img class="search-result-image" src="${escapeHtml(imageSource)}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${PRODUCT_IMAGE_FALLBACK}'">
      </a>
      <div>
        <p class="eyebrow">${escapeHtml(productLabel(product))}</p>
        <h4>${escapeHtml(product.title)}</h4>
        <p>${escapeHtml(formatMoney(product.price))}</p>
      </div>
      <button class="button button-solid" type="button" data-action="quick-add" data-handle="${escapeHtml(product.handle)}" data-size="${DEFAULT_SIZE}">Add</button>
    </article>
  `;
}

function loadCart() {
  try {
    const raw = window.localStorage.getItem(STORAGE_CART);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.handle) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  window.localStorage.setItem(STORAGE_CART, JSON.stringify(state.cart));
}

function cartKey(handle, size) {
  return `${handle}::${size}`;
}

function updateCartCount() {
  const total = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('[data-cart-count]').forEach((node) => {
    node.textContent = String(total);
  });
}

function showToast(message) {
  const toast = document.querySelector('[data-toast]');
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => {
      toast.hidden = true;
    }, 320);
  }, 2200);
}

function openOverlay(target) {
  const overlay = document.querySelector('[data-overlay]');
  if (overlay) {
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('is-open'));
  }
  if (target) {
    target.hidden = false;
    requestAnimationFrame(() => target.classList.add('is-open'));
  }
  document.body.classList.add('modal-open');
}

function closeOverlay(target) {
  if (target) target.classList.remove('is-open');
  window.setTimeout(() => {
    if (target) target.hidden = true;
    const openAny = ['[data-cart-drawer]', '[data-search-modal]', '[data-account-modal]', '[data-mobile-menu]']
      .some((selector) => {
        const node = document.querySelector(selector);
        return node && !node.hidden;
      });
    const overlay = document.querySelector('[data-overlay]');
    if (!openAny && overlay) {
      overlay.classList.remove('is-open');
      window.setTimeout(() => {
        overlay.hidden = true;
        document.body.classList.remove('modal-open');
        document.body.classList.remove('menu-open');
      }, 320);
    }
  }, 320);
}

function closeAllOverlays() {
  document.querySelectorAll('[data-cart-drawer], [data-search-modal], [data-account-modal], [data-mobile-menu]').forEach((node) => {
    if (!node.hidden) closeOverlay(node);
  });
}

function addToCart(handle, size, quantity) {
  const product = getProduct(handle);
  const nextSize = size || DEFAULT_SIZE;
  const nextQuantity = Number(quantity) || 1;
  const existing = state.cart.find((item) => cartKey(item.handle, item.size) === cartKey(handle, nextSize));
  if (existing) {
    existing.quantity += nextQuantity;
  } else {
    state.cart.push({ handle: product.handle, size: nextSize, quantity: nextQuantity });
  }
  saveCart();
  updateCartCount();
  renderCartDrawer();
  showToast(`✓ ${product.title} added to cart`);
}

function changeCartQuantity(handle, size, delta) {
  const item = state.cart.find((entry) => cartKey(entry.handle, entry.size) === cartKey(handle, size));
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter((entry) => cartKey(entry.handle, entry.size) !== cartKey(handle, size));
  }
  saveCart();
  updateCartCount();
  renderCartDrawer();
}

function renderCartDrawer() {
  const itemsNode = document.querySelector('[data-cart-items]');
  const subtotalNode = document.querySelector('[data-cart-subtotal]');
  const drawerNote = document.querySelector('[data-cart-note]');
  if (!itemsNode || !subtotalNode || !drawerNote) return;

  if (!state.cart.length) {
    itemsNode.innerHTML = '<p class="muted">Your cart is empty. Add a piece from the collection or product page.</p>';
    subtotalNode.textContent = formatMoney(0);
    drawerNote.textContent = 'Start with a product to unlock quick cart actions.';
    return;
  }

  const rows = state.cart.map((item) => {
    const product = getProduct(item.handle);
    const lineTotal = product.price * item.quantity;
    const imageSource = resolveImageSource(product.image, product.type, hashValue(`${product.handle}-${item.size}`));
    return `
      <article class="drawer-item" style="--art-hue:${productHue(product)}; --art-hue-2:${productHueAlt(product)}">
        <div class="drawer-item-art">
          <img class="drawer-item-image" src="${escapeHtml(imageSource)}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${PRODUCT_IMAGE_FALLBACK}'">
        </div>
        <div class="drawer-item-details" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <h4>${escapeHtml(product.title)}</h4>
              <p>${escapeHtml(productLabel(product))}</p>
              <p>${escapeHtml(formatMoney(product.price))} | Size ${escapeHtml(item.size)}</p>
            </div>
            <strong>${escapeHtml(formatMoney(lineTotal))}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 12px;">
            <div class="qty" style="margin-top: 0;">
              <button type="button" data-action="cart-decrease" data-handle="${escapeHtml(item.handle)}" data-size="${escapeHtml(item.size)}">-</button>
              <strong>${item.quantity}</strong>
              <button type="button" data-action="cart-increase" data-handle="${escapeHtml(item.handle)}" data-size="${escapeHtml(item.size)}">+</button>
            </div>
            <button class="button button-ghost" style="min-height: 32px; padding: 0 12px; font-size: 0.8rem;" type="button" data-action="cart-remove" data-handle="${escapeHtml(item.handle)}" data-size="${escapeHtml(item.size)}">Remove</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  const subtotal = state.cart.reduce((sum, item) => {
    const product = getProduct(item.handle);
    return sum + product.price * item.quantity;
  }, 0);

  itemsNode.innerHTML = rows;
  subtotalNode.textContent = formatMoney(subtotal);
  drawerNote.textContent = state.cart.length ? `${state.cart.length} item${state.cart.length === 1 ? '' : 's'} in your cart` : 'Your cart is empty. Browse the collection to get started.';
}

function openCart() {
  renderCartDrawer();
  const drawer = document.querySelector('[data-cart-drawer]');
  if (drawer) openOverlay(drawer);
}

function openSearch() {
  const modal = document.querySelector('[data-search-modal]');
  if (!modal) return;
  renderSearchResults('');
  openOverlay(modal);
  window.setTimeout(() => {
    modal.querySelector('[data-search-input]')?.focus();
  }, 120);
}

function openAccount() {
  const modal = document.querySelector('[data-account-modal]');
  if (!modal) return;
  openOverlay(modal);
  window.setTimeout(() => {
    modal.querySelector('[data-account-email]')?.focus();
  }, 120);
}

function openMenu() {
  const menu = document.querySelector('[data-mobile-menu]');
  if (!menu) return;
  menu.hidden = false;
  requestAnimationFrame(() => menu.classList.add('is-open'));
  const overlay = document.querySelector('[data-overlay]');
  if (overlay) overlay.hidden = false;
  document.body.classList.add('menu-open');
}

function renderSearchResults(query) {
  const resultsNode = document.querySelector('[data-search-results]');
  const countNode = document.querySelector('[data-search-count]');
  if (!resultsNode) return;

  const normalized = query.trim().toLowerCase();
  const matches = window.PRODUCTS.filter((product) => {
    if (!normalized) return true;
    return [product.title, product.handle, product.type, product.vendor]
      .join(' ')
      .toLowerCase()
      .includes(normalized);
  }).slice(0, 8);

  if (!normalized) {
    if (countNode) countNode.textContent = '';
    resultsNode.innerHTML = '<p class="muted">Start typing to search...</p>';
    return;
  }

  if (countNode) {
    countNode.textContent = `${matches.length} result${matches.length === 1 ? '' : 's'}`;
  }

  if (!matches.length) {
    resultsNode.innerHTML = '<p class="muted">No pieces match this search. Try a different word or open the collection.</p>';
    return;
  }

  resultsNode.innerHTML = matches.map(buildSearchResult).join('');
  syncReveals(resultsNode);
}

function setCollectionFilter(type) {
  state.collectionType = type;
  document.querySelectorAll('[data-filter-type]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.filterType === type);
  });
}

function sortProducts(products, sortBy) {
  const list = [...products];
  if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
  if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (sortBy === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
  return list;
}

function applyRevealDelays(nodes) {
  nodes.forEach((node, index) => {
    if (node.style.getPropertyValue('--reveal-delay')) return;
    const delay = Math.min((index % 6) * 70, 350);
    node.style.setProperty('--reveal-delay', `${delay}ms`);
  });
}

function syncReveals(scope = document) {
  const nodes = scope.querySelectorAll ? Array.from(scope.querySelectorAll('.reveal:not(.is-visible)')) : [];
  if (!nodes.length) return;

  applyRevealDelays(nodes);

  if (!state.revealObserver) {
    nodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }
  nodes.forEach((node) => state.revealObserver.observe(node));
}

function setupRevealObserver() {
  const nodes = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }
  state.revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        state.revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -10% 0px',
  });
  syncReveals();
}

function renderHome() {
  const featuredNode = document.getElementById('featured-grid');
  const editNode = document.getElementById('edit-grid');
  if (featuredNode) {
    featuredNode.innerHTML = window.PRODUCTS.slice(0, 4).map(buildCard).join('');
    syncReveals(featuredNode);
  }
  if (editNode) {
    const edit = window.PRODUCTS.filter((product) => product.type !== 'tshirt').slice(0, 4);
    editNode.innerHTML = edit.map(buildCard).join('');
    syncReveals(editNode);
  }
}

function renderCollection() {
  const grid = document.getElementById('collection-grid');
  if (!grid) return;

  const query = state.collectionQuery.trim().toLowerCase();
  const sortBy = document.getElementById('sort-select')?.value || 'featured';
  const filtered = window.PRODUCTS.filter((product) => {
    const matchesType = state.collectionType === 'all' || product.type === state.collectionType;
    if (!matchesType) return false;
    if (!query) return true;
    return [product.title, product.handle, product.type, product.vendor, product.description]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  const list = sortProducts(filtered, sortBy);
  grid.innerHTML = list.map(buildCard).join('');
  syncReveals(grid);

  const summary = document.querySelector('[data-collection-summary]');
  if (summary) {
    summary.textContent = `Showing ${list.length} of ${window.PRODUCTS.length} pieces`;
  }
  const count = document.querySelector('[data-collection-count]');
  if (count) count.textContent = String(list.length);
  document.querySelectorAll('[data-filter-count]').forEach((node) => {
    const type = node.dataset.filterCount;
    node.textContent = String(window.PRODUCTS.filter((product) => product.type === type).length);
  });
}

function updateProductPage(product) {
  state.activeProduct = product;
  state.quantity = 1;
  state.selectedSize = DEFAULT_SIZE;

  document.title = `${product.title} | Zariya`;
  document.getElementById('product-vendor').textContent = product.vendor || 'ZARIYA';
  document.getElementById('product-title').textContent = product.title;
  document.getElementById('product-price').textContent = formatMoney(product.price);
  document.getElementById('product-compare').textContent = product.compareAt ? formatMoney(product.compareAt) : '';
  document.getElementById('product-badge').textContent = salePercent(product.price, product.compareAt) ? `${salePercent(product.price, product.compareAt)}% OFF` : '';
  document.getElementById('product-desc').textContent = productSummary(product);
  document.getElementById('product-notes').textContent = productNotes(product);
  document.getElementById('product-category').textContent = productLabel(product);
  document.getElementById('product-fit').textContent = productFit(product);

  const galleryMain = document.getElementById('product-gallery-main');
  if (galleryMain) {
    const imageSource = resolveImageSource(product.image, product.type, hashValue(product.handle));
    galleryMain.innerHTML = `
      <img class="product-hero-image" src="${escapeHtml(imageSource)}" alt="${escapeHtml(product.title)}" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${PRODUCT_IMAGE_FALLBACK}'">
    `;
    galleryMain.style.setProperty('--art-hue', String(productHue(product)));
    galleryMain.style.setProperty('--art-hue-2', String(productHueAlt(product)));
  }

  const stackNode = document.getElementById('product-gallery-stack');
  if (stackNode) {
    stackNode.innerHTML = [
      ['Fit', productFit(product)],
      ['Material', product.type === 'hoodie' ? 'Heavy fleece' : product.type === 'crewneck' ? 'Dense knit' : 'Premium cotton'],
      ['Dispatch', '24-48 hrs'],
    ].map(([label, value]) => `
      <div class="gallery-chip">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join('');
    syncReveals(stackNode);
  }

  const sizeNode = document.getElementById('size-options');
  if (sizeNode) {
    sizeNode.innerHTML = ['S', 'M', 'L', 'XL', '2XL'].map((size) => `
      <button class="size-button ${size === state.selectedSize ? 'is-active' : ''}" type="button" data-action="select-size" data-size="${size}">${size}</button>
    `).join('');
  }

  const quantityNode = document.getElementById('quantity-value');
  if (quantityNode) quantityNode.textContent = String(state.quantity);

  const related = window.PRODUCTS
    .filter((entry) => entry.handle !== product.handle)
    .sort((left, right) => Number(right.type === product.type) - Number(left.type === product.type))
    .slice(0, 4);
  const relatedNode = document.getElementById('related-grid');
  if (relatedNode) {
    relatedNode.innerHTML = related.map(buildCard).join('');
    syncReveals(relatedNode);
  }
}

function renderProduct() {
  const params = new URLSearchParams(window.location.search);
  const handle = params.get('handle') || 'elite-rs-911';
  updateProductPage(getProduct(handle));
}

function initForms() {
  document.querySelectorAll('[data-newsletter-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = form.querySelector('button');
      const originalText = button.textContent;
      button.textContent = 'Joining...';
      button.disabled = true;
      button.style.opacity = '0.6';
      
      window.setTimeout(() => {
        const email = new FormData(form).get('email');
        const list = JSON.parse(window.localStorage.getItem(STORAGE_NEWSLETTER) || '[]');
        list.push({ email, date: new Date().toISOString() });
        window.localStorage.setItem(STORAGE_NEWSLETTER, JSON.stringify(list));
        form.reset();
        button.textContent = originalText;
        button.disabled = false;
        button.style.opacity = '1';
        showToast('✓ Joined the newsletter');
      }, 600);
    });
  });

  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = contactForm.querySelector('button');
      const originalText = button.textContent;
      button.textContent = 'Sending...';
      button.disabled = true;
      button.style.opacity = '0.6';
      
      window.setTimeout(() => {
        const formData = new FormData(contactForm);
        const inquiry = Object.fromEntries(formData.entries());
        const inquiries = JSON.parse(window.localStorage.getItem(STORAGE_INQUIRIES) || '[]');
        inquiries.push({ ...inquiry, date: new Date().toISOString() });
        window.localStorage.setItem(STORAGE_INQUIRIES, JSON.stringify(inquiries));
        contactForm.reset();
        button.textContent = originalText;
        button.disabled = false;
        button.style.opacity = '1';
        showToast('✓ Message received. Support will follow up soon.');
      }, 600);
    });
  }
}

function initChrome() {
  const body = document.body;
  if (!document.querySelector('[data-overlay]')) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="overlay-layer" data-overlay hidden></div>
      <aside class="side-drawer" data-cart-drawer hidden>
        <div class="drawer-head">
          <div>
            <p class="eyebrow">Cart</p>
            <h2>Your selections</h2>
          </div>
          <button class="button button-ghost modal-close" type="button" data-action="close-overlays">Close</button>
        </div>
        <div class="drawer-items" data-cart-items></div>
        <div class="drawer-footer">
          <div class="drawer-total">
            <span>Subtotal</span>
            <strong data-cart-subtotal>${formatMoney(0)}</strong>
          </div>
          <p class="muted" data-cart-note>Start with a product to unlock quick cart actions.</p>
          <button class="button button-solid" type="button" data-action="checkout">Proceed to checkout</button>
        </div>
      </aside>
      <div class="modal-shell" data-search-modal hidden>
        <div class="modal-card">
          <div class="drawer-head">
            <div>
              <p class="eyebrow">Search</p>
              <h2>Find pieces quickly</h2>
            </div>
            <button class="button button-ghost modal-close" type="button" data-action="close-overlays">Close</button>
          </div>
          <label class="field">
            <span>Search the catalog</span>
            <input type="search" data-search-input placeholder="Type a product, category, or handle">
          </label>
          <p class="eyebrow" data-search-count></p>
          <div class="search-results" data-search-results></div>
        </div>
      </div>
      <div class="modal-shell" data-account-modal hidden>
        <div class="modal-card">
          <div class="drawer-head">
            <div>
              <p class="eyebrow">Account</p>
              <h2>Welcome</h2>
            </div>
            <button class="button button-ghost modal-close" type="button" data-action="close-overlays">Close</button>
          </div>
          <div class="auth-tabs">
            <button class="auth-tab active" type="button" data-auth-tab="signin">Sign in</button>
            <button class="auth-tab" type="button" data-auth-tab="signup">Sign up</button>
          </div>
          <form class="panel auth-form active" data-auth-tab-form="signin">
            <label class="field"><span>Email</span><input type="email" data-account-email placeholder="Email address" required></label>
            <label class="field"><span>Password</span><input type="password" placeholder="Password" required></label>
            <button class="button button-solid" type="submit" style="width: 100%; margin-top: 16px;">Sign in</button>
          </form>
          <form class="panel auth-form" data-auth-tab-form="signup">
            <label class="field"><span>Full name</span><input type="text" placeholder="Your name" required></label>
            <label class="field"><span>Email</span><input type="email" placeholder="Email address" required></label>
            <label class="field"><span>Password</span><input type="password" placeholder="Minimum 8 characters" required></label>
            <label class="field"><span>Confirm password</span><input type="password" placeholder="Re-enter password" required></label>
            <button class="button button-solid" type="submit" style="width: 100%; margin-top: 16px;">Create account</button>
          </form>
        </div>
      </div>
      <div class="mobile-menu" data-mobile-menu hidden>
        <div class="mobile-menu-inner">
          <button class="button button-ghost modal-close" type="button" data-action="close-overlays">Close</button>
          <div class="mobile-menu-links">
            <a href="index.html">Home</a>
            <a href="collection.html">Collection</a>
            <a href="index.html#lookbook">Lookbook</a>
            <a href="contact.html">Contact</a>
            <a href="contact.html#faq">FAQ</a>
          </div>
          <div class="inline-actions">
            <button class="button button-solid" type="button" data-action="search">Search</button>
            <button class="button button-ghost" type="button" data-action="cart">Cart</button>
          </div>
        </div>
      </div>
      <div class="toast" data-toast hidden></div>
    `;
    body.appendChild(wrapper);
  }

  const accountForm = document.querySelector('[data-account-form]');
  if (accountForm) {
    accountForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = accountForm.querySelector('button');
      const originalText = button.textContent;
      button.textContent = 'Signing in...';
      button.disabled = true;
      button.style.opacity = '0.6';
      
      window.setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        button.style.opacity = '1';
        showToast('✓ Account verified');
        closeAllOverlays();
      }, 600);
    });
  }

  // Auth tabs
  document.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.authTab;
      document.querySelectorAll('[data-auth-tab]').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('[data-auth-tab-form]').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`[data-auth-tab-form="${tabName}"]`)?.classList.add('active');
    });
  });

  // Auth form handlers
  document.querySelectorAll('[data-auth-tab-form]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const button = form.querySelector('button');
      const isSignup = form.dataset.authTabForm === 'signup';
      const originalText = button.textContent;
      button.textContent = isSignup ? 'Creating account...' : 'Signing in...';
      button.disabled = true;
      button.style.opacity = '0.6';
      
      window.setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        button.style.opacity = '1';
        showToast(isSignup ? '✓ Account created' : '✓ Signed in successfully');
        closeAllOverlays();
      }, 600);
    });
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (!trigger) {
      const overlay = event.target.closest('[data-overlay]');
      if (overlay) closeAllOverlays();
      return;
    }

    const action = trigger.dataset.action;
    if (action === 'menu') {
      event.preventDefault();
      openMenu();
      return;
    }
    if (action === 'close-overlays') {
      event.preventDefault();
      closeAllOverlays();
      return;
    }
    if (action === 'search') {
      event.preventDefault();
      openSearch();
      return;
    }
    if (action === 'account') {
      event.preventDefault();
      openAccount();
      return;
    }
    if (action === 'cart') {
      event.preventDefault();
      openCart();
      return;
    }
    if (action === 'checkout') {
      event.preventDefault();
      closeAllOverlays();
      window.setTimeout(() => {
        window.location.href = 'checkout.html';
      }, 300);
      return;
    }
    if (action === 'quick-add') {
      event.preventDefault();
      addToCart(trigger.dataset.handle, trigger.dataset.size || DEFAULT_SIZE, 1);
      return;
    }
    if (action === 'add-to-cart') {
      event.preventDefault();
      if (!state.activeProduct) return;
      addToCart(state.activeProduct.handle, state.selectedSize, state.quantity);
      return;
    }
    if (action === 'buy-now') {
      event.preventDefault();
      if (!state.activeProduct) return;
      addToCart(state.activeProduct.handle, state.selectedSize, state.quantity);
      openCart();
      return;
    }
    if (action === 'quantity-minus') {
      event.preventDefault();
      state.quantity = Math.max(1, state.quantity - 1);
      document.getElementById('quantity-value').textContent = String(state.quantity);
      return;
    }
    if (action === 'quantity-plus') {
      event.preventDefault();
      state.quantity += 1;
      document.getElementById('quantity-value').textContent = String(state.quantity);
      return;
    }
    if (action === 'select-size') {
      event.preventDefault();
      state.selectedSize = trigger.dataset.size || DEFAULT_SIZE;
      document.querySelectorAll('[data-action="select-size"]').forEach((node) => {
        node.classList.toggle('is-active', node.dataset.size === state.selectedSize);
      });
      showToast(`✓ Size ${state.selectedSize} selected`);
      return;
    }
    if (action === 'cart-increase') {
      event.preventDefault();
      changeCartQuantity(trigger.dataset.handle, trigger.dataset.size, 1);
      return;
    }
    if (action === 'cart-decrease') {
      event.preventDefault();
      changeCartQuantity(trigger.dataset.handle, trigger.dataset.size, -1);
      return;
    }
    if (action === 'cart-remove') {
      event.preventDefault();
      state.cart = state.cart.filter((entry) => cartKey(entry.handle, entry.size) !== cartKey(trigger.dataset.handle, trigger.dataset.size));
      saveCart();
      updateCartCount();
      renderCartDrawer();
      showToast('✓ Item removed');
      return;
    }
    if (action === 'reset-filters') {
      event.preventDefault();
      state.collectionType = 'all';
      state.collectionQuery = '';
      document.querySelector('[data-collection-search]').value = '';
      document.getElementById('sort-select').value = 'featured';
      setCollectionFilter('all');
      renderCollection();
      showToast('✓ Filters reset');
      return;
    }
    if (action === 'filter-type') {
      event.preventDefault();
      setCollectionFilter(trigger.dataset.filterType || 'all');
      renderCollection();
      return;
    }
  });

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.matches('[data-search-input]')) {
      renderSearchResults(target.value);
    }
    if (target.matches('[data-collection-search]')) {
      state.collectionQuery = target.value;
      renderCollection();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeAllOverlays();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    }
  });

  const overlay = document.querySelector('[data-overlay]');
  if (overlay) {
    overlay.addEventListener('click', closeAllOverlays);
  }
}

function init() {
  state.cart = loadCart();
  state.collectionType = 'all';
  const params = new URLSearchParams(window.location.search);
  const initialType = params.get('type');
  if (initialType && TYPE_LABELS[initialType]) {
    state.collectionType = initialType;
  }

  initChrome();
  initForms();
  updateCartCount();
  setupRevealObserver();

  const page = document.body.dataset.page;
  if (page === 'home') renderHome();
  if (page === 'collection') {
    const searchNode = document.querySelector('[data-collection-search]');
    if (searchNode) searchNode.value = params.get('q') || '';
    state.collectionQuery = searchNode ? searchNode.value : '';
    const select = document.getElementById('sort-select');
    if (select) select.addEventListener('change', renderCollection);
    document.querySelectorAll('[data-filter-type]').forEach((button) => {
      button.addEventListener('click', () => {
        setCollectionFilter(button.dataset.filterType || 'all');
        renderCollection();
      });
    });
    setCollectionFilter(state.collectionType);
    renderCollection();
  }
  if (page === 'product') renderProduct();
}

document.addEventListener('DOMContentLoaded', init);
