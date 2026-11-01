/* =========================================================
   KVK FASHION — script.js
   Định tuyến bằng hash: trang chủ, #/san-pham/ID, #/gio-hang
   Lọc & tìm kiếm, chi tiết sản phẩm, giỏ hàng (localStorage),
   thanh toán và đăng ký nhận tin (chỉ mô phỏng, không gửi backend).
   ========================================================= */
'use strict';

/* ===== CẤU HÌNH & DỮ LIỆU MẪU (minh họa) ===== */
const SIZES = ['S', 'M', 'L', 'XL'];
const MAX_QTY = 20;
const SHIP_FEE = 30000;          // phí vận chuyển minh họa
const FREE_SHIP_FROM = 500000;   // miễn phí từ mức này (minh họa)
const KEY_CART = 'kvk_cart';
const KEY_FAV = 'kvk_fav';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

const CATEGORY_LABELS = {
  'ao-thun': 'Áo thun', 'ao-so-mi': 'Áo sơ mi', 'ao-polo': 'Áo polo', 'hoodie': 'Hoodie',
  'quan-jeans': 'Quần jeans', 'quan-kaki': 'Quần kaki', 'ao-khoac': 'Áo khoác'
};
const SWATCHES = { 'Đen': '#111111', 'Trắng': '#FFFFFF', 'Be': '#D9C7AE', 'Xám': '#9A9A9A', 'Navy': '#1F2A44' };

const PRODUCTS = [
  { id: 'P001', name: 'Essential Oversized Tee', category: 'ao-thun', price: 249000, oldPrice: 299000, isNew: false, isBestseller: true, rating: 4.7, reviews: 128, colors: ['Đen', 'Trắng', 'Be'], material: 'Cotton 220gsm', description: 'Áo thun form oversized thoáng mát, cổ tròn dày dặn, dễ phối đồ hằng ngày.' },
  { id: 'P002', name: 'Premium Cotton Shirt', category: 'ao-so-mi', price: 399000, oldPrice: null, isNew: true, isBestseller: false, rating: 4.6, reviews: 64, colors: ['Trắng', 'Xám', 'Navy'], material: 'Cotton Oxford', description: 'Áo sơ mi cotton form slim, phù hợp đi học, đi làm hoặc đi chơi.' },
  { id: 'P003', name: 'Urban Hoodie', category: 'hoodie', price: 549000, oldPrice: null, isNew: false, isBestseller: true, rating: 4.8, reviews: 210, colors: ['Đen', 'Xám', 'Be'], material: 'Nỉ cotton 350gsm', description: 'Hoodie nỉ dày, mũ rộng, phong cách streetwear năng động.' },
  { id: 'P004', name: 'Classic Polo Shirt', category: 'ao-polo', price: 329000, oldPrice: 379000, isNew: false, isBestseller: false, rating: 4.5, reviews: 56, colors: ['Navy', 'Trắng', 'Đen'], material: 'Cotton pique', description: 'Áo polo cổ bẻ kinh điển, chất vải thấm hút tốt.' },
  { id: 'P005', name: 'Vintage Denim Jeans', category: 'quan-jeans', price: 499000, oldPrice: null, isNew: true, isBestseller: false, rating: 4.4, reviews: 39, colors: ['Navy', 'Đen'], material: 'Denim 12oz', description: 'Quần jeans wash nhẹ, form straight, bền và dễ mặc.' },
  { id: 'P006', name: 'Relaxed Fit Trousers', category: 'quan-kaki', price: 459000, oldPrice: null, isNew: false, isBestseller: false, rating: 4.5, reviews: 41, colors: ['Be', 'Đen', 'Xám'], material: 'Kaki cotton co giãn', description: 'Quần kaki form relaxed, thoải mái cho cả ngày dài.' },
  { id: 'P007', name: 'Basic Streetwear Tee', category: 'ao-thun', price: 199000, oldPrice: null, isNew: true, isBestseller: false, rating: 4.3, reviews: 77, colors: ['Trắng', 'Đen'], material: 'Cotton 180gsm', description: 'Áo thun basic gọn gàng, giá dễ tiếp cận cho mọi ngày.' },
  { id: 'P008', name: 'Minimalist Bomber Jacket', category: 'ao-khoac', price: 699000, oldPrice: null, isNew: true, isBestseller: true, rating: 4.9, reviews: 92, colors: ['Đen', 'Be'], material: 'Polyester dù', description: 'Áo khoác bomber tối giản, lớp ngoài chống gió nhẹ.' }
];

/* ===== TRẠNG THÁI ===== */
const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* trình duyệt chặn lưu trữ: bỏ qua */ }
  }
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const favorites = new Set(storage.get(KEY_FAV, []));
const filters = { category: 'all', price: 'all', onlyNew: false, onlyBest: false, query: '' };
const detail = { product: null, size: null, color: null, qty: 1 };

/* ===== TIỆN ÍCH ===== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const formatVND = n => n.toLocaleString('vi-VN') + 'đ';
const findProduct = id => PRODUCTS.find(p => p.id === id);
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let cart = storage.get(KEY_CART, []).filter(item =>
  findProduct(item.id) && item.size && item.color && Number.isInteger(item.qty) && item.qty >= 1
).map(item => ({ ...item, qty: Math.min(MAX_QTY, item.qty) }));

const cartSubtotal = () => cart.reduce((sum, i) => sum + findProduct(i.id).price * i.qty, 0);
const cartCount = () => cart.reduce((sum, i) => sum + i.qty, 0);
const shippingFee = () => (cart.length === 0 || cartSubtotal() >= FREE_SHIP_FROM ? 0 : SHIP_FEE);
const persistCart = () => storage.set(KEY_CART, cart);
const reduceScroll = () => (reduceMotion ? 'auto' : 'smooth');

function getBadge(p) {
  if (p.oldPrice) return 'SALE';
  if (p.isBestseller) return 'HOT';
  if (p.isNew) return 'NEW';
  return '';
}

function starsHTML(rating) {
  const full = Math.round(rating);
  return Array.from({ length: 5 }, (_, i) =>
    `<i class="fa-${i < full ? 'solid' : 'regular'} fa-star" aria-hidden="true"></i>`).join('');
}

/* ===== ẢNH: lazy load & xử lý khi lỗi ===== */
function imgTag(src, alt, cls = '') {
  return `<img class="${cls}" src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" loading="lazy" decoding="async"
    onerror="this.onerror=null;this.src='images/placeholder.svg'">`;
}

/* ===== HIỆU ỨNG XUẤT HIỆN ===== */
const revealObserver = ('IntersectionObserver' in window)
  ? new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 })
  : null;

function observeReveal(root = document) {
  $$('.reveal', root).forEach(el => {
    if (revealObserver && !reduceMotion) revealObserver.observe(el);
    else el.classList.add('visible');
  });
}

/* ===== THÔNG BÁO ===== */
let toastTimer;
function showToast(message, type = 'info') {
  const t = $('#toast');
  t.textContent = message;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ===== ĐỊNH TUYẾN: trang chủ / chi tiết / giỏ hàng ===== */
const VIEWS = ['view-home', 'view-product', 'view-cart'];
function showView(name) {
  VIEWS.forEach(v => { $(`#${v}`).hidden = v !== name; });
  updateHeaderCount();
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: reduceScroll() });
}

function route() {
  const hash = location.hash;
  const productMatch = hash.match(/^#\/san-pham\/(P\d{3})$/);
  if (productMatch && findProduct(productMatch[1])) {
    showProductPage(productMatch[1]);
  } else if (hash === '#/gio-hang') {
    showCartPage();
  } else {
    showHomePage(hash);
  }
  setNav(false);
}

// Trang chủ: nếu hash là mục như #products thì cuộn tới mục đó, nếu không về đầu trang
function showHomePage(hash) {
  showView('view-home');
  const target = hash && hash.length > 1 && !hash.startsWith('#/') ? document.getElementById(hash.slice(1)) : null;
  if (target) {
    requestAnimationFrame(() => target.scrollIntoView({ behavior: reduceScroll() }));
  } else if (!hash || hash === '#' || hash === '#/') {
    scrollToTop();
  }
}

/* ===== LƯỚI SẢN PHẨM ===== */
function productCardHTML(p) {
  const badge = getBadge(p);
  const isFav = favorites.has(p.id);
  const name = escapeHTML(p.name);
  return `
  <article class="product-card reveal" data-id="${p.id}">
    <div class="product-media">
      ${badge ? `<span class="tag tag-${badge.toLowerCase()}">${badge}</span>` : ''}
      <button class="fav-btn ${isFav ? 'active' : ''}" data-action="fav" data-id="${p.id}"
        aria-pressed="${isFav}" aria-label="Yêu thích ${name}">
        <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
      </button>
      <a class="product-link" href="#/san-pham/${p.id}" aria-label="Xem ${name}">${imgTag(`images/${p.id}.svg`, p.name)}</a>
    </div>
    <div class="product-info">
      <p class="product-cat">${CATEGORY_LABELS[p.category]}</p>
      <h3 class="product-name"><a href="#/san-pham/${p.id}">${name}</a></h3>
      <p class="price">${formatVND(p.price)} ${p.oldPrice ? `<del>${formatVND(p.oldPrice)}</del>` : ''}</p>
      <p class="rating">${starsHTML(p.rating)} ${p.rating} (${p.reviews} đánh giá mẫu)</p>
      <div class="product-actions">
        <a class="btn btn-ghost" href="#/san-pham/${p.id}">Xem chi tiết</a>
        <button class="btn btn-primary" data-action="add" data-id="${p.id}">Thêm vào giỏ</button>
      </div>
    </div>
  </article>`;
}

function getFilteredProducts() {
  return PRODUCTS.filter(p => {
    if (filters.category !== 'all' && p.category !== filters.category) return false;
    if (filters.price === 'lt300' && p.price >= 300000) return false;
    if (filters.price === '300-500' && (p.price < 300000 || p.price > 500000)) return false;
    if (filters.price === 'gt500' && p.price <= 500000) return false;
    if (filters.onlyNew && !p.isNew) return false;
    if (filters.onlyBest && !p.isBestseller) return false;
    if (filters.query) {
      const haystack = `${p.name} ${CATEGORY_LABELS[p.category]}`.toLowerCase();
      if (!haystack.includes(filters.query)) return false;
    }
    return true;
  });
}

function renderProducts() {
  const list = getFilteredProducts();
  const grid = $('#productGrid');
  grid.innerHTML = list.map(productCardHTML).join('');
  observeReveal(grid);
  $('#resultCount').textContent = `Hiển thị ${list.length} sản phẩm`;
  $('#emptyMsg').hidden = list.length > 0;
}

function buildChips() {
  const entries = [['all', 'Tất cả'], ...Object.entries(CATEGORY_LABELS)];
  $('#categoryChips').innerHTML = entries
    .map(([key, label]) => `<button class="chip" data-cat="${key}" aria-pressed="false">${label}</button>`)
    .join('');
}

function syncChips() {
  $$('#categoryChips .chip').forEach(btn => {
    const on = btn.dataset.cat === filters.category;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function setCategory(cat) {
  filters.category = cat;
  syncChips();
  renderProducts();
}

function toggleFavorite(id, btn) {
  const on = !favorites.has(id);
  if (on) favorites.add(id); else favorites.delete(id);
  storage.set(KEY_FAV, [...favorites]);
  syncFavButton(btn, on);
  showToast(on ? 'Đã thêm vào danh sách yêu thích.' : 'Đã bỏ khỏi danh sách yêu thích.');
}

function syncFavButton(btn, on) {
  btn.classList.toggle('active', on);
  btn.setAttribute('aria-pressed', String(on));
  const icon = btn.querySelector('i');
  if (icon) icon.className = on ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
}

/* ===== TRANG CHI TIẾT SẢN PHẨM ===== */
function setError(id, message) { $(`#${id}`).textContent = message; }

function syncDetailOptions() {
  $$('#pdSizes .chip').forEach(b => {
    const on = b.dataset.size === detail.size;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $$('#pdColors .swatch').forEach(b => {
    const on = b.dataset.color === detail.color;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
  $('#pdColorName').textContent = detail.color || '';
}

function setDetailQty(n) {
  const safe = Number.isFinite(n) ? Math.floor(n) : 1;
  detail.qty = Math.min(MAX_QTY, Math.max(1, safe));  // không nhỏ hơn 1
  $('#pdQty').value = detail.qty;
}

function showProductPage(id) {
  const p = findProduct(id);
  detail.product = p;
  detail.size = null;
  detail.color = p.colors[0];
  setDetailQty(1);
  setError('pdError', '');

  $('#pdImage').src = `images/${p.id}.svg`;
  $('#pdImage').alt = p.name;
  $('#pdImage').onerror = function () { this.onerror = null; this.src = 'images/placeholder.svg'; };
  $('#bcName').textContent = p.name;
  $('#pdCat').textContent = CATEGORY_LABELS[p.category];
  $('#pdName').textContent = p.name;
  $('#pdRating').innerHTML = `${starsHTML(p.rating)} ${p.rating} (${p.reviews} đánh giá mẫu)`;
  $('#pdPrice').textContent = formatVND(p.price);
  $('#pdOld').textContent = p.oldPrice ? formatVND(p.oldPrice) : '';
  $('#pdDesc').textContent = p.description;
  $('#pdLongDesc').textContent = `${p.description} Chất liệu: ${p.material}. Form dáng thiết kế để dễ phối đồ, phù hợp hằng ngày.`;
  $('#pdMaterial').textContent = p.material;
  $('#pdSizes').innerHTML = SIZES.map(s => `<button class="chip" data-size="${s}" aria-pressed="false">${s}</button>`).join('');
  $('#pdColors').innerHTML = p.colors.map(c =>
    `<button class="swatch" data-color="${c}" style="background:${SWATCHES[c]}" aria-label="Màu ${c}" title="${c}" aria-pressed="false"></button>`).join('');
  syncDetailOptions();

  $('#relatedGrid').innerHTML = PRODUCTS
    .filter(x => x.id !== p.id)
    .sort((a, b) => (b.category === p.category) - (a.category === p.category))
    .slice(0, 4)
    .map(productCardHTML).join('');
  observeReveal($('#view-product'));

  document.title = `${p.name} — KVK FASHION`;
  showView('view-product');
  scrollToTop();
}

/* ===== GIỎ HÀNG ===== */
function addToCart(id, size, color, qty) {
  const key = `${id}|${size}|${color}`;
  const existing = cart.find(i => i.key === key);
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
  else cart.push({ key, id, size, color, qty: Math.min(MAX_QTY, qty) });
  persistCart();
  renderCart();
  showToast(`Đã thêm ${findProduct(id).name} (Size ${size}, ${color}) × ${qty} vào giỏ hàng.`, 'success');
}

function changeCartQty(key, newQty) {
  const item = cart.find(i => i.key === key);
  if (!item) return;
  if (!Number.isFinite(newQty)) { renderCart(); return; }   // nhập sai: giữ nguyên giá trị cũ
  if (newQty > MAX_QTY) showToast(`Tối đa ${MAX_QTY} sản phẩm mỗi loại.`, 'error');
  item.qty = Math.min(MAX_QTY, Math.max(1, Math.floor(newQty)));
  persistCart();
  renderCart();
}

function removeFromCart(key) {
  cart = cart.filter(i => i.key !== key);
  persistCart();
  renderCart();
  showToast('Đã xóa sản phẩm khỏi giỏ hàng.');
}

function cartLineHTML(item) {
  const p = findProduct(item.id);
  const name = escapeHTML(p.name);
  return `
  <li class="cart-line">
    <a class="thumb" href="#/san-pham/${p.id}">${imgTag(`images/${p.id}.svg`, p.name)}</a>
    <div class="line-body">
      <div class="line-top">
        <a href="#/san-pham/${p.id}">${name}</a>
        <strong>${formatVND(p.price * item.qty)}</strong>
      </div>
      <p class="line-meta">Size ${item.size} · Màu ${escapeHTML(item.color)} · ${formatVND(p.price)}/cái</p>
      <div class="line-bottom">
        <div class="qty">
          <button data-action="dec" data-key="${item.key}" aria-label="Giảm số lượng ${name}">−</button>
          <input type="number" min="1" max="${MAX_QTY}" value="${item.qty}" data-key="${item.key}" aria-label="Số lượng ${name}">
          <button data-action="inc" data-key="${item.key}" aria-label="Tăng số lượng ${name}">+</button>
        </div>
        <button class="remove-btn" data-action="remove" data-key="${item.key}">Xóa</button>
      </div>
    </div>
  </li>`;
}

function updateHeaderCount() {
  $('#cartCount').textContent = cartCount();
}

function renderCart() {
  const count = cartCount();
  const hasItems = cart.length > 0;
  updateHeaderCount();
  $('#cartHeadCount').textContent = hasItems ? `(${count} sản phẩm)` : '';
  $('#cartEmpty').hidden = hasItems;
  $('#cartLayout').hidden = !hasItems;
  $('#goCheckout').disabled = !hasItems;
  $('#cartItems').innerHTML = cart.map(cartLineHTML).join('');
  const subtotal = cartSubtotal();
  const ship = shippingFee();
  $('#sumSubtotal').textContent = formatVND(subtotal);
  $('#sumShip').textContent = ship === 0 ? 'Miễn phí' : formatVND(ship);
  $('#sumTotal').textContent = formatVND(subtotal + ship);
  if (!hasItems) $('#checkoutPanel').hidden = true;
}

function showCartPage() {
  showView('view-cart');
  $('#orderSuccess').hidden = true;
  renderCart();
  document.title = 'Giỏ hàng — KVK FASHION';
  scrollToTop();
}

/* ===== FORM THANH TOÁN (DEMO) ===== */
const FIELD_VALIDATORS = {
  name: v => v.trim().length >= 2 || 'Vui lòng nhập họ và tên (ít nhất 2 ký tự).',
  phone: v => PHONE_RE.test(v.replace(/[\s.-]/g, '')) || 'Số điện thoại Việt Nam không hợp lệ (VD: 0912345678).',
  email: v => (!v.trim() || EMAIL_RE.test(v.trim())) || 'Email không đúng định dạng.',
  address: v => v.trim().length >= 5 || 'Vui lòng nhập địa chỉ nhận hàng.',
  province: v => !!v || 'Vui lòng chọn tỉnh/thành phố.'
};

function validateField(name) {
  const input = $(`#checkoutForm [name="${name}"]`);
  const result = FIELD_VALIDATORS[name](input.value);
  $(`#err-${name}`).textContent = result === true ? '' : result;
  input.setAttribute('aria-invalid', String(result !== true));
  return result === true;
}

function clearFormErrors() {
  $$('#checkoutForm .error').forEach(el => { el.textContent = ''; });
  $$('#checkoutForm [aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
}

function openCheckout() {
  if (!cart.length) {
    showToast('Giỏ hàng đang trống, hãy thêm sản phẩm trước khi thanh toán.', 'error');
    return;
  }
  $('#coItems').innerHTML = cart.map(i => {
    const p = findProduct(i.id);
    return `<li><span>${escapeHTML(p.name)} (${i.size}, ${escapeHTML(i.color)}) × ${i.qty}</span><strong>${formatVND(p.price * i.qty)}</strong></li>`;
  }).join('');
  $('#coTotal').textContent = formatVND(cartSubtotal() + shippingFee());
  clearFormErrors();
  $('#checkoutPanel').hidden = false;
  $('#checkoutPanel').scrollIntoView({ behavior: reduceScroll() });
}

function generateOrderCode() {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `KVK-${yyyymmdd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function handleCheckoutSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const allValid = Object.keys(FIELD_VALIDATORS).map(validateField).every(Boolean);
  if (!allValid) {
    $('#checkoutForm [aria-invalid="true"]').focus();
    return;
  }
  const data = new FormData(form);
  const total = cartSubtotal() + shippingFee();
  $('#orderCode').textContent = generateOrderCode();
  $('#successSummary').textContent =
    `Tổng: ${formatVND(total)} · Thanh toán: ${data.get('payment')} · Giao tới: ${data.get('province')}`;

  cart = [];
  persistCart();
  form.reset();
  $('#checkoutPanel').hidden = true;
  $('#cartLayout').hidden = true;
  $('#cartEmpty').hidden = true;
  $('#orderSuccess').hidden = false;
  $('#cartHeadCount').textContent = '';
  updateHeaderCount();
  $('#orderSuccess').scrollIntoView({ behavior: reduceScroll() });
}

/* ===== ĐĂNG KÝ NHẬN TIN (DEMO) ===== */
function handleNewsletterSubmit(e) {
  e.preventDefault();
  const input = $('#nlEmail');
  const msg = $('#newsletterMsg');
  if (!EMAIL_RE.test(input.value.trim())) {
    input.setAttribute('aria-invalid', 'true');
    msg.className = 'msg err';
    msg.textContent = 'Email không đúng định dạng. Vui lòng kiểm tra lại.';
    input.focus();
    return;
  }
  input.removeAttribute('aria-invalid');
  msg.className = 'msg ok';
  msg.textContent = 'Đã ghi nhận email (chế độ demo). Dữ liệu CHƯA được gửi đến hệ thống thực tế.';
  input.value = '';
}

/* ===== MENU MOBILE ===== */
function isNavOpen() { return $('#mainNav').classList.contains('open'); }
function setNav(open) {
  $('#mainNav').classList.toggle('open', open);
  const btn = $('#menuToggle');
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  btn.innerHTML = `<i class="fa-solid ${open ? 'fa-xmark' : 'fa-bars'}" aria-hidden="true"></i>`;
}

/* ===== CUỘN TRANG ===== */
function onScroll() {
  const y = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  $('#header').classList.toggle('scrolled', y > 40);
  $('#scrollProgress').style.width = (maxScroll > 0 ? (y / maxScroll) * 100 : 0) + '%';
  $('#backToTop').classList.toggle('show', y > 600);
}

/* ===== GẮN SỰ KIỆN ===== */
function bindEvents() {
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', onScroll, { passive: true });
  $('#menuToggle').addEventListener('click', () => setNav(!isNavOpen()));
  $$('#mainNav a').forEach(a => a.addEventListener('click', () => setNav(false)));
  $('#searchToggle').addEventListener('click', () => {
    if (location.hash.startsWith('#/')) location.hash = '#products';
    setTimeout(() => $('#searchInput').focus({ preventScroll: true }), 400);
  });
  $('#backToTop').addEventListener('click', scrollToTop);

  // Trang chủ: nút mua ngay và danh mục
  $$('.cat-card').forEach(card => card.addEventListener('click', () => {
    if (location.hash.startsWith('#/')) location.hash = '#categories';
    setCategory(card.dataset.cat);
    setTimeout(() => $('#products').scrollIntoView({ behavior: reduceScroll() }), 50);
  }));
  $('#categoryChips').addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (btn) setCategory(btn.dataset.cat);
  });

  // Tìm kiếm & bộ lọc
  $('#searchInput').addEventListener('input', e => {
    filters.query = e.target.value.trim().toLowerCase();
    renderProducts();
  });
  $('#priceFilter').addEventListener('change', e => { filters.price = e.target.value; renderProducts(); });
  $('#newOnly').addEventListener('change', e => { filters.onlyNew = e.target.checked; renderProducts(); });
  $('#bestOnly').addEventListener('change', e => { filters.onlyBest = e.target.checked; renderProducts(); });
  $('#resetFilters').addEventListener('click', () => {
    Object.assign(filters, { category: 'all', price: 'all', onlyNew: false, onlyBest: false, query: '' });
    $('#searchInput').value = '';
    $('#priceFilter').value = 'all';
    $('#newOnly').checked = false;
    $('#bestOnly').checked = false;
    syncChips();
    renderProducts();
  });

  // Lưới sản phẩm: yêu thích, thêm nhanh (vẫn bắt buộc chọn size ở trang chi tiết)
  $('#productGrid').addEventListener('click', e => {
    const fav = e.target.closest('[data-action="fav"]');
    if (fav) { toggleFavorite(fav.dataset.id, fav); return; }
    const add = e.target.closest('[data-action="add"]');
    if (add) {
      showToast('Vui lòng chọn kích cỡ trước khi thêm vào giỏ hàng.', 'info');
      location.hash = `#/san-pham/${add.dataset.id}`;
    }
  });
  $('#relatedGrid').addEventListener('click', e => {
    const add = e.target.closest('[data-action="add"]');
    if (add) {
      showToast('Vui lòng chọn kích cỡ trước khi thêm vào giỏ hàng.', 'info');
      location.hash = `#/san-pham/${add.dataset.id}`;
    }
  });

  // Trang chi tiết
  $('#pdSizes').addEventListener('click', e => {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    detail.size = b.dataset.size;
    setError('pdError', '');
    syncDetailOptions();
  });
  $('#pdColors').addEventListener('click', e => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    detail.color = b.dataset.color;
    syncDetailOptions();
  });
  $('#view-product .qty').addEventListener('click', e => {
    const b = e.target.closest('[data-qty]');
    if (b) setDetailQty(detail.qty + Number(b.dataset.qty));
  });
  $('#pdQty').addEventListener('change', e => setDetailQty(parseInt(e.target.value, 10)));
  $('#pdAdd').addEventListener('click', () => {
    if (!detail.size) {
      setError('pdError', 'Vui lòng chọn kích cỡ trước khi thêm vào giỏ hàng.');
      return;
    }
    addToCart(detail.product.id, detail.size, detail.color, detail.qty);
  });

  // Giỏ hàng
  $('#cartItems').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const item = cart.find(i => i.key === btn.dataset.key);
    if (!item) return;
    if (btn.dataset.action === 'inc') changeCartQty(item.key, item.qty + 1);
    if (btn.dataset.action === 'dec') changeCartQty(item.key, item.qty - 1);
    if (btn.dataset.action === 'remove') removeFromCart(item.key);
  });
  $('#cartItems').addEventListener('change', e => {
    if (e.target.matches('input[data-key]')) changeCartQty(e.target.dataset.key, parseInt(e.target.value, 10));
  });
  $('#goCheckout').addEventListener('click', openCheckout);

  // Thanh toán
  $('#checkoutForm').addEventListener('submit', handleCheckoutSubmit);
  $('#checkoutForm').addEventListener('input', e => {
    if (e.target.getAttribute('aria-invalid') === 'true') validateField(e.target.name);
  });

  // Đăng ký nhận tin
  $('#newsletterForm').addEventListener('submit', handleNewsletterSubmit);

  // Liên kết/nút minh họa: hiển thị thông báo
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-toast]');
    if (!t) return;
    e.preventDefault();
    showToast(t.dataset.toast, 'info');
  });

  // Phím Escape đóng menu mobile
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isNavOpen()) setNav(false);
  });
}

/* ===== KHỞI TẠO ===== */
function init() {
  document.documentElement.classList.add('js');
  buildChips();
  renderProducts();
  renderCart();
  observeReveal();
  bindEvents();
  onScroll();
  route();
}

document.addEventListener('DOMContentLoaded', init);
