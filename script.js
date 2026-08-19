// ===========================
// GLOBAL STATE
// ===========================
var cart = []; // {name, price, oldPrice, img, cat, qty}
var currentLocation = localStorage.getItem('uc_location') || 'Mumbai Central, Mumbai';
var currentCategoryKey = null;

// ===========================
// TOAST (used only for non-product, informational messages)
// ===========================
function showToast(message) {
  $('#toastText').text(message);
  $('#toast').stop(true, true).fadeIn(200);
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(function() { $('#toast').fadeOut(300); }, 2500);
}

// ===========================
// HELPERS
// ===========================
function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function enc(obj) { return encodeURIComponent(JSON.stringify(obj)); }
function dec(str) { return JSON.parse(decodeURIComponent(str)); }
function money(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

// ===========================
// CART LOGIC (real e-commerce cart, no toast)
// ===========================
function addToCart(item) {
  var existing = cart.find(function(c) { return c.name === item.name; });
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      name: item.name,
      price: item.price,
      oldPrice: item.oldPrice || null,
      img: item.img || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80',
      cat: item.cat || 'Services',
      qty: 1
    });
  }
  syncAllCartUI();
}

function addToCartFromPage(encodedItem) {
  var item = dec(encodedItem);
  addToCart({
    name: item.name,
    price: item.price,
    oldPrice: item.oldPrice || null,
    img: item.img,
    cat: item.cat || (currentCategoryKey && pageData[currentCategoryKey] ? pageData[currentCategoryKey].title : 'Services')
  });
}

function changeQty(name, delta) {
  var idx = cart.findIndex(function(c) { return c.name === name; });
  if (idx === -1) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  syncAllCartUI();
}

function removeFromCart(name) {
  cart = cart.filter(function(c) { return c.name !== name; });
  syncAllCartUI();
}

function updateCartCount() {
  var count = cart.reduce(function(sum, c) { return sum + c.qty; }, 0);
  var el = $('#cartCount');
  el.text(count);
  if (count > 0) { el.css('display', 'flex'); } else { el.css('display', 'none'); }
}

function syncAllCartUI() {
  updateCartCount();
  renderCart();
  syncAddButtons();
  renderFloatingCartWidgets();
}

// "Add" button <-> quantity stepper, built from the item JSON stored on the element
function buildAddAreaHtml(item) {
  var inCart = cart.find(function(c) { return c.name === item.name; });
  if (inCart) {
    return '<div class="qty-box small">' +
      '<button onclick="changeQty(\'' + item.name.replace(/'/g, "\\'") + '\',-1)">−</button>' +
      '<span>' + inCart.qty + '</span>' +
      '<button onclick="changeQty(\'' + item.name.replace(/'/g, "\\'") + '\',1)">+</button>' +
    '</div>';
  }
  return '<button class="add-btn" onclick="addToCartFromPage(\'' + enc(item) + '\')">Add</button>';
}

function syncAddButtons() {
  document.querySelectorAll('.add-area[data-item]').forEach(function(el) {
    try {
      var item = dec(el.getAttribute('data-item'));
      el.innerHTML = buildAddAreaHtml(item);
    } catch (e) {  }
  });
  try { syncWishlistUI(); } catch (e) {}
}

var suggestPool = [
  { name: 'Quick comfort therapy', price: 999, oldPrice: 1199, img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=300&q=80', rating: 4.81, reviews: '19K', cat: 'Massage for Men' },
  { name: 'Head massage', price: 129, img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=300&q=80', rating: 4.85, reviews: '89K', cat: 'Salon for Men', options: 4 },
  { name: 'Head, neck & shoulder massage', price: 349, img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=300&q=80', rating: 4.81, reviews: '54K', cat: 'Salon for Men' },
  { name: 'Hydrating face massage (10 mins)', price: 199, img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=300&q=80', rating: 4.80, reviews: '12K', cat: 'Salon for Men' },
  { name: 'Foot massage', price: 569, img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&q=80', rating: 4.86, reviews: '31K', cat: 'Massage for Men' }
];

function renderCart() {
  var body = document.getElementById('cartBody');
  if (!body) return;
  if (cart.length === 0) {
    body.innerHTML =
      '<div class="cart-empty">' +
      '<div class="cart-icon">🛒</div>' +
      '<h3>Your cart is empty</h3>' +
      '<p>Lets add some services</p>' +
      '<button class="explore-btn" onclick="closeCart()">Explore services</button>' +
      '</div>';
    return;
  }

  var itemTotal = cart.reduce(function(sum, c) { return sum + c.price * c.qty; }, 0);
  var tax = Math.round(itemTotal * 0.07);
  var total = itemTotal + tax;

  var groupTitle = cart[0].cat || 'Services';

  var itemsHtml = cart.map(function(c) {
    return '<div class="cart-item-row">' +
      '<div>' +
        '<div class="cart-item-name">' + c.name + '</div>' +
      '</div>' +
      '<div class="cart-row-flex">' +
        '<div class="qty-box">' +
          '<button onclick="changeQty(\'' + c.name.replace(/'/g,"\\'") + '\',-1)">−</button>' +
          '<span>' + c.qty + '</span>' +
          '<button onclick="changeQty(\'' + c.name.replace(/'/g,"\\'") + '\',1)">+</button>' +
        '</div>' +
        '<div class="cart-item-price">' + money(c.price * c.qty) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  var suggestHtml = suggestPool.filter(function(s) {
    return !cart.find(function(c) { return c.name === s.name; });
  }).slice(0, 4).map(function(s) {
    var priceRow = s.oldPrice
      ? '<span class="suggest-price">' + money(s.price) + '</span> <span class="old-price">' + money(s.oldPrice) + '</span>'
      : (s.options ? '<div><div style="font-size:11px;color:#6b7280">Starts at</div><span class="suggest-price">' + money(s.price) + '</span></div>' : '<span class="suggest-price">' + money(s.price) + '</span>');
    var btnLabel = s.options ? 'Add<div style="font-size:10px;font-weight:400">' + s.options + ' options</div>' : 'Add';
    return '<div class="suggest-card">' +
      '<img src="' + s.img + '" alt="" />' +
      '<div class="suggest-name">' + s.name + '</div>' +
      '<div class="suggest-meta"><i class="fas fa-star" style="color:#fbbf24"></i> ' + s.rating + ' (' + s.reviews + ')</div>' +
      '<div class="suggest-price-row">' + priceRow +
      '<button class="suggest-add-btn" onclick="addToCartFromPage(\'' + enc(s) + '\')">' + btnLabel + '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  body.innerHTML =
    '<div class="cart-layout">' +
      '<div class="cart-main">' +
        '<div class="cart-group-title">' + groupTitle + '</div>' +
        itemsHtml +
        '<div class="suggest-title">People also take</div>' +
        '<div class="suggest-grid">' + suggestHtml + '</div>' +
      '</div>' +
      '<div class="cart-side">' +
        '<div class="payment-box">' +
          '<h4>Payment summary</h4>' +
          '<div class="pay-row"><span>Item total</span><span>' + money(itemTotal) + '</span></div>' +
          '<div class="pay-row"><span>Taxes and Fee</span><span>' + money(tax) + '</span></div>' +
          '<div class="pay-row total"><span>Total amount</span><span>' + money(total) + '</span></div>' +
          '<div class="pay-row amount"><span>Amount to pay</span><span>' + money(total) + '</span></div>' +
        '</div>' +
        '<div class="coupon-box" onclick="openLoginModal()">' +
          '<div class="pct"><i class="fas fa-percent"></i></div>' +
          '<div><strong>Coupons and offers</strong><span>Login/Sign up to view offers</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function openCart() {
  renderCart();
  document.getElementById('cartPage').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartPage').classList.remove('open');
  document.body.style.overflow = '';
}

// Mini-cart / floating "view cart" widgets shown inside any open page's sidebar
function renderFloatingCartWidgets() {
  ['instaMiniCart', 'catMiniCart'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (cart.length === 0) {
      el.innerHTML = '<div class="icon">🛒</div><p>No items in your cart</p>';
    } else {
      var count = cart.reduce(function(s, c) { return s + c.qty; }, 0);
      var total = cart.reduce(function(s, c) { return s + c.price * c.qty; }, 0);
      el.innerHTML =
        '<div class="cart-floating-bar">' +
          '<div><div class="cfb-amount">' + money(total) + '</div><div class="cfb-count">' + count + ' item(s) in cart</div></div>' +
          '<button onclick="openCart()">View Cart</button>' +
        '</div>';
    }
  });
}
// backward-compat aliases
function renderInstaMiniCart() { renderFloatingCartWidgets(); }
function renderSalonMiniCart() { renderFloatingCartWidgets(); }

// ===========================
// WISHLIST (Favorites)
// ===========================
var wishlist = [];
try { wishlist = JSON.parse(localStorage.getItem('uc_wishlist') || '[]'); } catch (e) { wishlist = []; }

function saveWishlist() {
  try { localStorage.setItem('uc_wishlist', JSON.stringify(wishlist)); } catch (e) {}
  updateWishlistCount();
}

function updateWishlistCount() {
  var count = wishlist.length;
  var el = $('#wishlistCount');
  el.text(count);
  if (count > 0) el.css('display', 'flex'); else el.css('display', 'none');
}

function isInWishlist(name) {
  return wishlist.findIndex(function(w) { return w.name === name; }) !== -1;
}

function addToWishlist(item) {
  if (!item || !item.name) return;
  if (isInWishlist(item.name)) return;
  wishlist.push({ name: item.name, price: item.price || 0, img: item.img || '', rating: item.rating || '', cat: item.cat || '' });
  saveWishlist();
  renderWishlist();
  syncWishlistUI();
}

function removeFromWishlist(name) {
  wishlist = wishlist.filter(function(w) { return w.name !== name; });
  saveWishlist();
  renderWishlist();
  syncWishlistUI();
}

function toggleWishlistForElement(btn) {
  var itemData = btn.getAttribute('data-item');
  var item = null;
  if (itemData) {
    try { item = dec(itemData); } catch (e) { item = null; }
  }
  // fallback: find nearest card and extract name/img
  if (!item) {
    var card = btn.closest('.svc-card, .note-card, .spot-card, .product-item, .light-prod-card, .pref-list-item') || btn.parentElement;
    item = extractItemFromCard(card) || { name: 'Unknown' };
  }
  if (isInWishlist(item.name)) removeFromWishlist(item.name);
  else addToWishlist(item);
}

function extractItemFromCard(card) {
  if (!card) return null;
  var img = card.querySelector('img') ? card.querySelector('img').getAttribute('src') : '';
  var nameEl = card.querySelector('.svc-card-name, .note-name, .product-name, h4, .subcat-name');
  var name = nameEl ? nameEl.textContent.trim() : (card.getAttribute('data-name') || '').trim();
  var priceEl = card.querySelector('.svc-card-price, .native-card-price, .product-price, .suggest-price');
  var priceText = priceEl ? priceEl.textContent.trim().replace(/[^0-9]/g,'') : '';
  var price = priceText ? Number(priceText) : 0;
  var ratingEl = card.querySelector('.svc-card-meta, .native-card-rating, .suggest-meta');
  var rating = ratingEl ? ratingEl.textContent.trim() : '';
  return { name: name || 'Unknown', img: img || '', price: price, rating: rating, cat: '' };
}

function openWishlist() {
  renderWishlist();
  document.getElementById('wishlistPage').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeWishlist() {
  document.getElementById('wishlistPage').classList.remove('open');
  document.body.style.overflow = '';
}

function renderWishlist() {
  var body = document.getElementById('wishlistBody');
  if (!body) return;
  if (wishlist.length === 0) {
    body.innerHTML =
      '<div class="cart-empty">' +
      '<div class="cart-icon">♡</div>' +
      '<h3>Your wishlist is empty</h3>' +
      '<p>Save services you love to view or book later.</p>' +
      '<button class="explore-btn" onclick="closeWishlist()">Continue browsing</button>' +
      '</div>';
    return;
  }

  var itemsHtml = wishlist.map(function(w) {
    return '<div class="cart-item-row wishlist-row">' +
      '<div style="display:flex;gap:12px;align-items:center">' +
        '<img src="' + (w.img || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80') + '" style="width:64px;height:64px;object-fit:cover;border-radius:8px" />' +
        '<div>' +
          '<div class="cart-item-name">' + w.name + '</div>' +
          '<div style="font-size:13px;color:#6b7280">' + (w.rating || '') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cart-row-flex" style="align-items:center">' +
        '<div style="font-weight:700">' + (w.price ? money(w.price) : '') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;margin-left:12px">' +
          '<button class="add-btn" onclick="addToCartFromWishlist(\'' + encodeURIComponent(w.name) + '\')">Add to cart</button>' +
          '<button class="explore-btn" style="background:transparent;color:#f43f5e;border:1px solid rgba(244,63,94,0.12)" onclick="removeFromWishlistEncoded(\'' + encodeURIComponent(w.name) + '\')">Remove</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  body.innerHTML = '<div class="cart-layout"><div class="cart-main">' + itemsHtml + '</div></div>';
}

function addToCartFromWishlist(encodedName) {
  var name = decodeURIComponent(encodedName);
  var item = wishlist.find(function(w) { return w.name === name; });
  if (!item) return;
  addToCart({ name: item.name, price: item.price || 0, oldPrice: null, img: item.img, cat: item.cat || 'Services' });
  showToast(item.name + ' added to cart');
}

function removeFromWishlistEncoded(encodedName) {
  var name = decodeURIComponent(encodedName);
  removeFromWishlist(name);
}

// Sync heart buttons across the site
function syncWishlistUI() {
  // ensure counts
  updateWishlistCount();
  // attach heart buttons to cards that have a data-item add-area
  document.querySelectorAll('.add-area[data-item]').forEach(function(el) {
    var card = el.closest('.svc-row, .svc-card, .light-prod-card, .product-item') || el.parentElement;
    if (!card) return;
    if (card.querySelector('.wish-btn')) return; // already attached
    var item = null;
    try { item = dec(el.getAttribute('data-item')); } catch (e) { item = null; }
    var btn = document.createElement('button');
    btn.className = 'wish-btn';
    btn.setAttribute('type','button');
    if (item) btn.setAttribute('data-item', enc(item));
    btn.innerHTML = '<i class="far fa-heart"></i>';
    btn.onclick = function(e) { e.stopPropagation(); toggleWishlistForElement(btn); };
    card.style.position = card.style.position || '';
    card.insertBefore(btn, card.firstChild);
  });

  // attach to common static card types if not present
  var selectors = ['.svc-card', '.note-card', '.spot-card', '.product-item', '.light-prod-card'];
  selectors.forEach(function(sel) {
    document.querySelectorAll(sel).forEach(function(card) {
      if (card.querySelector('.wish-btn')) return;
      var btn = document.createElement('button');
      btn.className = 'wish-btn';
      btn.setAttribute('type','button');
      btn.innerHTML = '<i class="far fa-heart"></i>';
      btn.onclick = function(e) { e.stopPropagation(); toggleWishlistForElement(btn); };
      card.insertBefore(btn, card.firstChild);
    });
  });

  // reflect active state
  document.querySelectorAll('.wish-btn').forEach(function(btn) {
    var itemData = btn.getAttribute('data-item');
    var name = null;
    if (itemData) {
      try { name = dec(itemData).name; } catch (e) { name = null; }
    }
    if (!name) {
      var card = btn.closest('.svc-card, .note-card, .spot-card, .product-item, .light-prod-card, .pref-list-item') || btn.parentElement;
      var info = extractItemFromCard(card);
      name = info ? info.name : null;
    }
    if (name && isInWishlist(name)) {
      btn.classList.add('active');
      var ic = btn.querySelector('i'); if (ic) { ic.classList.remove('far'); ic.classList.add('fas'); }
    } else {
      btn.classList.remove('active');
      var ic2 = btn.querySelector('i'); if (ic2) { ic2.classList.remove('fas'); ic2.classList.add('far'); }
    }
  });
}

// keep wishlist UI in sync on DOM load
document.addEventListener('DOMContentLoaded', function() {
  syncWishlistUI();
});

// ===========================
// NAV LINK ACTIVE STATE / FULL PAGES
// ===========================
function setActiveLink(name) {
  $('.nav-links a').removeClass('active');
  $('#link-' + name).addClass('active');
  closeMobileMenu();
  if (name === 'Revamp') openPage('revampPage');
  else if (name === 'Native') openPage('nativePage');
  else if (name === 'Beauty') openPage('beautyPage');
}

function openPage(pageId) {
  $('#' + pageId).addClass('open');
  $('body').css('overflow', 'hidden');
  window.scrollTo(0, 0);
}
function closePage(pageId) {
  document.getElementById(pageId).classList.remove('open');
  document.body.style.overflow = '';
}
function switchPage(fromId, toId) {
  closePage(fromId);
  openPage(toId);
}

// ===========================
// LOCATION MODAL
// ===========================
function openLocationModal() {
  $('#locationModal').addClass('open');
  $('body').css('overflow', 'hidden');
  $('#cityList').show();
  filterCityList('');
  setTimeout(function() { $('#locSearchInput').focus(); }, 200);
}
function closeLocationModal() {
  $('#locationModal').removeClass('open');
  $('body').css('overflow', '');
  $('#locSearchInput').val('');
  filterCityList('');
}
function closeLocModal(event) {
  if (event.target === document.getElementById('locationModal')) closeLocationModal();
}
function filterCityList(query) {
  var q = (query || '').toLowerCase().trim();
  var anyVisible = false;
  document.querySelectorAll('.city-item').forEach(function(el) {
    var match = !q || el.getAttribute('data-name').toLowerCase().includes(q);
    el.style.display = match ? '' : 'none';
    if (match) anyVisible = true;
  });
  document.querySelectorAll('.city-list-label').forEach(function(el) {
    // hide a label if every item following it (until the next label) is hidden
    var next = el.nextElementSibling, hasVisible = false;
    while (next && !next.classList.contains('city-list-label')) {
      if (next.classList.contains('city-item') && next.style.display !== 'none') hasVisible = true;
      next = next.nextElementSibling;
    }
    el.style.display = hasVisible ? '' : 'none';
  });
  document.getElementById('cityNoResults').style.display = anyVisible ? 'none' : 'block';
}
function setCity(cityName) {
  currentLocation = cityName;
  try { localStorage.setItem('uc_location', cityName); } catch (e) { /* ignore storage errors */ }
  $('.loc-sync').text(cityName);
  closeLocationModal();
  showToast('Location set to ' + cityName);
}
function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation not supported');
    return;
  }

  navigator.geolocation.getCurrentPosition(function(pos) {
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;
    var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon);
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function(res) { return res.ok ? res.json() : Promise.reject(); })
      .then(function(data) {
        var addr = data && data.address ? data.address : {};
        var area = addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || addr.town || addr.city_district || addr.locality || addr.county || addr.state_district;
        var city = addr.city || addr.town || addr.county || addr.state || '';
        var display = '';
        if (area && city && area.toLowerCase() !== city.toLowerCase()) display = area + ', ' + city;
        else if (city) display = city;
        else if (area) display = area;
        else display = currentLocation;
        setCity(display);
      })
      .catch(function() {
        showToast('Unable to determine address');
      });

  }, function(err) {
    if (err && err.code === 1) {
      showToast('Location access denied');
    } else {
      showToast('Unable to access location');
    }
  }, { timeout: 10000 });
}

// Initialize location UI on page load
document.addEventListener('DOMContentLoaded', function() {
  try { $('.loc-sync').text(currentLocation); } catch (e) {}
  try { $('#locationText').text(currentLocation); } catch (e) {}
  try { $('#instaLocText').text(currentLocation); } catch (e) {}
});

// ===========================
// LOGIN MODAL
// ===========================
function openLoginModal() {
  $('#loginModal').addClass('open');
  $('body').css('overflow', 'hidden');
  $('#loginTip').hide();
}
function closeLogin() {
  $('#loginModal').removeClass('open');
  $('body').css('overflow', '');
}
function closeLoginModal(event) {
  if (event.target === document.getElementById('loginModal')) closeLogin();
}
function checkPhoneReady() {
  var phone = $('#phoneInput').val();
  var btn = $('#continueBtn');
  if (phone.length >= 10) btn.addClass('ready'); else btn.removeClass('ready');
}
function handleContinue() {
  var phone = $('#phoneInput').val();
  if (phone.length >= 10) {
    closeLogin();
    showToast('OTP sent to +91 ' + phone);
  }
}

// ===========================
// SUBCATEGORY PICKERS (first-level, matches real UC bottom-sheets)
// ===========================
var subcategoryData = {
  "Women's Salon & Spa": {
    type: 'grid',
    items: [
      { name: 'Salon for Women', icon: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&q=80', action: 'tier:salonForWomen' },
      { name: 'Spa for Women', icon: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&q=80', mins: '55 mins', action: 'tier:spaForWomen' },
      { name: 'Hair Studio for Women', icon: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=200&q=80', action: 'page:hairStudioForWomen' },
      { name: 'Makeup, Saree & Styling', icon: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=200&q=80', action: 'page:makeupSareeStyling' }
    ]
  },
  "Men's Salon & Massage": {
    type: 'grid',
    items: [
      { name: 'Salon for Men', icon: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=200&q=80', action: 'page:salonMenPrime' },
      { name: 'Massage for Men', icon: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=200&q=80', action: 'page:massageMenPrime' }
    ]
  },
  "Cleaning & Pest Control": {
    type: 'grouped',
    groups: [
      {
        label: 'Cleaning',
        items: [
          { name: 'Bathroom Cleaning', icon: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&q=80', action: 'page:bathroomCleaning' },
          { name: 'Kitchen Cleaning', icon: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=200&q=80', action: 'page:kitchenCleaning' },
          { name: 'Living & Bedroom Cleaning', icon: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=200&q=80', action: 'page:livingBedroomCleaning' },
          { name: 'Full Home/By Room Cleaning', icon: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&q=80', action: 'page:fullHomeCleaning' }
        ]
      },
      {
        label: 'Pest Control',
        items: [
          { name: 'Cockroach Control', icon: 'https://loremflickr.com/200/200/pestcontrol,spray', action: 'page:cockroachControl' },
          { name: 'Termite Control', icon: 'https://loremflickr.com/200/200/termite,woodpest', action: 'page:termiteControl' },
          { name: 'Ants & Bed Bugs Control', icon: 'https://loremflickr.com/200/200/bedbug,pestcontrol', action: 'page:antsBedBugsControl' }
        ]
      }
    ]
  },
  "Home repair & installation": {
    type: 'grid',
    items: [
      { name: 'Electrician', icon: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&q=80', action: 'page:electrician' },
      { name: 'Plumber', icon: 'https://loremflickr.com/200/200/plumber,pipe', action: 'page:plumber' },
      { name: 'Carpenter', icon: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=200&q=80', action: 'page:carpenter' },
      { name: 'Furniture Assembly', icon: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&q=80', action: 'page:furnitureAssembly' }
    ]
  }
};

function resolveAction(action) {
  if (!action) return '';
  var parts = action.split(':');
  var type = parts[0], key = parts[1];
  if (type === 'page') return "closeSubcat();openCategoryPage('" + key + "')";
  if (type === 'tier') return "openTierMenu('" + key + "')";
  return '';
}

function openSubcat(title) {
  var data = subcategoryData[title];
  if (!data) { return; }

  document.getElementById('subcatTitle').textContent = title;
  document.getElementById('subcatTitle').style.display = 'block';
  document.getElementById('subcatGrid').style.display = '';
  document.getElementById('subcatBackBtn').style.display = 'none';
  document.getElementById('subcatBackBtn').onclick = closeSubcat;

  var html = '';
  if (data.type === 'grid') {
    data.items.forEach(function(item) {
      html += '<div class="subcat-card" onclick="' + resolveAction(item.action) + '">';
      html += '<div class="subcat-icon-box">';
      html += '<img src="' + item.icon + '" alt="' + item.name + '" />';
      if (item.mins) html += '<span class="subcat-min">' + item.mins + '</span>';
      html += '</div>';
      html += '<div class="subcat-name">' + item.name + '</div>';
      html += '</div>';
    });
  } else if (data.type === 'grouped') {
    data.groups.forEach(function(group) {
      html += '<div class="subcat-section-label">' + group.label + '</div>';
      group.items.forEach(function(item) {
        html += '<div class="subcat-card" onclick="' + resolveAction(item.action) + '">';
        html += '<div class="subcat-icon-box"><img src="' + item.icon + '" alt="' + item.name + '" /></div>';
        html += '<div class="subcat-name">' + item.name + '</div>';
        html += '</div>';
      });
    });
  }
  document.getElementById('subcatGrid').innerHTML = html;
  document.getElementById('subcatModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSubcat() {
  document.getElementById('subcatModal').classList.remove('open');
  document.body.style.overflow = '';
}
function closeSubcatModal(event) {
  if (event.target === document.getElementById('subcatModal')) closeSubcat();
}
function subcatGoBack() {
  closeSubcat();
}

// ===========================
// TIER MENUS (second-level: e.g. Salon for Women -> Luxe / Prime)
// ===========================
var tierMenus = {
  salonForWomen: {
    bannerTag: 'New launch',
    bannerImg: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=800&q=80',
    bannerHeading: 'Japanese glow rituals',
    bannerSub: 'Now at your doorstep',
    tiers: [
      { name: 'Luxe', img: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=200&q=80', tags: ['CASMARA', 'CIREPIL'], note: 'Facials starting at ₹1,649', pageKey: 'salonLuxeWomen' },
      { name: 'Prime', img: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=200&q=80', tags: ['O3+', 'RICA'], note: 'Facials starting at ₹999', pageKey: 'salonPrimeWomen' }
    ]
  },
  spaForWomen: {
    bannerTag: null,
    bannerImg: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
    bannerHeading: 'Relax your body, soul & mind',
    bannerSub: 'Spa bliss at your home',
    tiers: [
      { name: 'Ayurveda', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&q=80', tags: [], note: 'Experts in ancient techniques & herbal oils', pageKey: 'spaAyurvedaWomen' },
      { name: 'Prime', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=200&q=80', tags: [], note: 'Certified therapists & essential oils', pageKey: 'spaPrimeWomen' },
      { name: 'Luxe', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=200&q=80', tags: [], note: 'High-rated therapists & premium-grade oils', pageKey: 'spaLuxeWomen' }
    ]
  }
};

function openTierMenu(key) {
  var data = tierMenus[key];
  if (!data) return;
  var html = '';
  html += '<div class="tier-banner">';
  if (data.bannerTag) html += '<div class="tier-banner-tag">' + data.bannerTag + '</div>';
  html += '<img src="' + data.bannerImg + '" alt="" />';
  html += '<div class="tier-banner-text"><h3>' + data.bannerHeading + '</h3>' + (data.bannerSub ? '<p>' + data.bannerSub + '</p>' : '') + '</div>';
  html += '</div>';
  data.tiers.forEach(function(t) {
    html += '<div class="pref-list-item" style="grid-column:1/-1" onclick="closeSubcat();openCategoryPage(\'' + t.pageKey + '\')">' +
      '<img src="' + t.img + '" alt="' + t.name + '" />' +
      '<div><h5>' + t.name + '</h5>' +
      t.tags.map(function(tag) { return '<span class="pref-tag">' + tag + '</span>'; }).join('') +
      (t.note ? '<div style="font-size:12.5px;color:#6b7280;margin-top:4px">' + t.note + '</div>' : '') +
      '</div><i class="fas fa-chevron-right chev"></i></div>';
  });

  document.getElementById('subcatTitle').style.display = 'none';
  document.getElementById('subcatBackBtn').style.display = 'block';
  document.getElementById('subcatBackBtn').onclick = closeSubcat;
  document.getElementById('subcatGrid').style.display = 'block';
  document.getElementById('subcatGrid').innerHTML = html;
  document.getElementById('subcatModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ===========================
// SALON FOR MEN — homepage grid "See all" preference picker (Luxe / Prime)
// ===========================
function openSalonPreference() {
  document.getElementById('subcatTitle').style.display = 'none';
  document.getElementById('subcatBackBtn').style.display = 'block';
  document.getElementById('subcatBackBtn').onclick = closeSubcat;

  var html =
    '<div class="pref-list-item" onclick="closeSubcat();openSeeAll(\'salonmenluxe\')" style="grid-column:1/-1;border-top:none">' +
      '<img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&q=80" alt="Luxe" />' +
      '<div><h5>Luxe</h5><span class="pref-tag">INOA</span><span class="pref-tag">REPÊCHAGE</span><span class="pref-tag">O3+</span></div>' +
      '<i class="fas fa-chevron-right chev"></i>' +
    '</div>' +
    '<div class="pref-list-item" onclick="closeSubcat();openSeeAll(\'salonmenprime\')" style="grid-column:1/-1">' +
      '<img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&q=80" alt="Prime" />' +
      "<div><h5>Prime</h5><span class=\"pref-tag\">L'ORÉAL</span><span class=\"pref-tag\">BOMBAY SHAVING COMPANY</span></div>" +
      '<i class="fas fa-chevron-right chev"></i>' +
    '</div>';

  document.getElementById('subcatGrid').innerHTML = html;
  document.getElementById('subcatGrid').style.display = 'block';
  document.getElementById('subcatModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ===========================
// GENERIC CATEGORY DETAIL PAGE ENGINE
// (used for every service — Salon Luxe/Prime, Spa, Hair Studio, Makeup,
//  Electrician, Plumber, Carpenter, AC Repair, Cleaning, Pest Control, etc.)
// ===========================
var pageData = {

  // ---------- WOMEN'S SALON & SPA ----------
  salonLuxeWomen: {
    title: 'Salon Luxe', rating: 4.89, reviews: '2.0 M bookings',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=900&q=80', heading: 'Premium ingredients', sub: 'Only the finest brands, on your skin' },
      { img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=900&q=80', heading: 'Top-rated professionals', sub: 'Handpicked & highly trained' },
      { img: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=900&q=80', heading: 'A salon-grade experience', sub: 'Without leaving your home' }
    ],
    nav: [
      { id: 'ssp', label: 'Super saver packages', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=200&q=80', badge: 'Upto 20% OFF' },
      { id: 'waxing', label: 'Waxing', img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=200&q=80' },
      { id: 'forest', label: 'Forest Essentials facial', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&q=80' },
      { id: 'korean', label: 'Korean facial', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=200&q=80' },
      { id: 'signature', label: 'Signature facials', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=200&q=80' },
      { id: 'cleanup', label: 'Cleanup', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&q=80' },
      { id: 'manicure', label: 'Pedicure & manicure', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&q=80' },
      { id: 'threading', label: 'Threading & face wax', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=200&q=80' },
      { id: 'bleach', label: 'Bleach, detan & massage', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&q=80' }
    ],
    sections: [
      { id: 'ssp', title: 'Super saver packages', items: [
        { name: 'Make your own package', price: 5387, oldPrice: 6734, duration: '5 hrs', rating: 4.90, reviews: '1.3M reviews', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80', badge: 'PACKAGE', bullets: ['Waxing: Full arms (including underarms) - RICA', 'Facial: Forest Essentials facial', 'Fully customisable — add or remove any service'] }
      ]},
      { id: 'waxing', title: 'Waxing', items: [
        { name: 'RICA full body waxing (Luxe)', price: 2499, oldPrice: 2999, duration: '2 hrs', rating: 4.88, reviews: '84K reviews', img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&q=80', bullets: ['Premium Italian wax for silky smooth skin', 'Suitable for sensitive skin'] },
        { name: 'RICA Brazilian stripless bikini waxing', price: 1599, oldPrice: 1899, duration: '45 mins', rating: 4.89, reviews: '61K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['Painless peel-off wax', 'Covers full pelvic area'] },
        { name: 'Chocolate waxing (Full arms & legs)', price: 1299, duration: '1 hr', rating: 4.86, reviews: '39K reviews', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', bullets: ['Rich in antioxidants', 'Nourishes while it removes hair'] }
      ]},
      { id: 'forest', title: 'Forest Essentials facial', items: [
        { name: 'Forest Essentials Rejuvenating facial', price: 2499, duration: '1 hr 30 mins', rating: 4.87, reviews: '22K reviews', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', bullets: ['Ayurvedic luxury skincare brand', 'Deeply nourishes & restores radiance'] }
      ]},
      { id: 'korean', title: 'Korean facial', items: [
        { name: 'Korean Glass hydration facial (Luxe)', price: 2199, duration: '1 hr 30 mins', rating: 4.85, reviews: '31K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['Glass-skin glow with deep hydration'] },
        { name: 'Korean Gold radiance facial', price: 2499, duration: '1 hr 40 mins', rating: 4.86, reviews: '18K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['24k gold infused mask', 'Instant brightening effect'] }
      ]},
      { id: 'signature', title: 'Signature facials', items: [
        { name: 'O3+ Diamond facial', price: 2199, duration: '1 hr 20 mins', rating: 4.85, reviews: '46K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['Diamond peptides for firmer skin'] },
        { name: 'Signature Gold facial', price: 1999, duration: '1 hr 15 mins', rating: 4.84, reviews: '52K reviews', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', bullets: ['Restores glow & elasticity'] }
      ]},
      { id: 'cleanup', title: 'Cleanup', items: [
        { name: 'Luxe brightening cleanup', price: 999, duration: '50 mins', rating: 4.87, reviews: '29K reviews', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', bullets: ['Deep-cleans pores', 'Instant glow finish'] }
      ]},
      { id: 'manicure', title: 'Pedicure & manicure', items: [
        { name: 'Luxe Mani-Pedi combo', price: 1999, duration: '2 hrs', rating: 4.86, reviews: '41K reviews', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', bullets: ['Premium hydrating scrubs & masks'] }
      ]},
      { id: 'threading', title: 'Threading & face wax', items: [
        { name: 'Eyebrow & upperlip threading', price: 99, startingAt: true, duration: '15 mins', rating: 4.85, reviews: '210K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', options: 4, bullets: ['Precise shaping by trained experts'] }
      ]},
      { id: 'bleach', title: 'Bleach, detan & massage', items: [
        { name: 'Luxe bleach & detan', price: 499, startingAt: true, duration: '40 mins', rating: 4.84, reviews: '58K reviews', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80', options: 3, bullets: ['Evens skin tone & removes tan'] }
      ]}
    ]
  },

  salonPrimeWomen: {
    title: 'Salon Prime', rating: 4.85, reviews: '17.9 M bookings',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=900&q=80', heading: 'Everyday salon care', sub: 'Trusted by millions across India' },
      { img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=900&q=80', heading: 'Hygienic & branded products', sub: "L'Oreal, O3+, RICA & more" }
    ],
    nav: [
      { id: 'ssp', label: 'Super saver packages', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=200&q=80' },
      { id: 'waxing', label: 'Waxing & threading', img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=200&q=80' },
      { id: 'korean', label: 'Korean facial', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=200&q=80' },
      { id: 'signature', label: 'Signature facial', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=200&q=80' },
      { id: 'cleanup', label: 'Cleanup', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&q=80' },
      { id: 'manicure', label: 'Pedicure & manicure', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&q=80' },
      { id: 'hair', label: 'Hair, bleach & detan', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=200&q=80' }
    ],
    sections: [
      { id: 'ssp', title: 'Super saver packages', items: [
        { name: 'Make your own package', price: 3461, oldPrice: 4326, duration: '3 hrs 35 mins', rating: 4.85, reviews: '8.7M reviews', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80', badge: 'PACKAGE', bullets: ['Fully customisable package of your choice'] },
        { name: 'Monthly maintenance package', price: 2119, oldPrice: 2354, duration: '2 hrs 10 mins', rating: 4.85, reviews: '6.5M reviews', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', badge: 'PACKAGE', bullets: ['Everything you need every month'] },
        { name: 'Wax & glow', price: 2656, oldPrice: 3125, duration: '2 hrs 30 mins', rating: 4.85, reviews: '7.1M reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', badge: 'PACKAGE', bullets: ['Waxing + brightening facial combo'] }
      ]},
      { id: 'waxing', title: 'Waxing & threading', items: [
        { name: 'Spatula waxing (Full arms, legs & underarms)', price: 699, startingAt: true, rating: 4.86, reviews: '157K reviews', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', options: 2, bullets: ['Painless & irritation-free hair removal'] },
        { name: 'Roll-on waxing (Full arms, legs & underarms)', price: 899, startingAt: true, rating: 4.86, reviews: '194K reviews', img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&q=80', options: 2, bullets: ['Hygienic, single-use, no risk of burns'] },
        { name: 'RICA Brazilian stripless bikini waxing', price: 1299, oldPrice: 1648, duration: '45 mins', rating: 4.89, reviews: '152K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['Full pelvic area coverage'] },
        { name: 'Threading', price: 49, startingAt: true, rating: 4.85, reviews: '2.8M reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', options: 8, bullets: ['Fast, precise brow & face shaping'] }
      ]},
      { id: 'korean', title: 'Korean facial', items: [
        { name: 'Korean Glass hydration facial', price: 1749, duration: '1 hr 20 mins', rating: 4.83, reviews: '71K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', badge: 'BESTSELLER', bullets: ['Suitable for normal to dry skin'] },
        { name: 'Korean Glow facial', price: 1399, duration: '1 hr 20 mins', rating: 4.82, reviews: '64K reviews', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', bullets: ['Revives dull skin & restores hydration'] }
      ]},
      { id: 'signature', title: 'Signature facial', items: [
        { name: 'Aroma Magic instant glow facial', price: 999, duration: '1 hr 5 mins', rating: 4.85, reviews: '67K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['Refreshes tired skin & brings back a glow'] },
        { name: 'O3+ shine & glow facial', price: 1749, duration: '1 hr 20 mins', rating: 4.84, reviews: '102K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['Reduces hyperpigmentation to even out tone'] }
      ]},
      { id: 'cleanup', title: 'Cleanup', items: [
        { name: 'Power glow cleanup', price: 699, duration: '50 mins', rating: 4.86, reviews: '114K reviews', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80', bullets: ['Clears deep-rooted impurities'] },
        { name: 'Anti-Tan Brightening Cleanup', price: 929, duration: '45 mins', rating: 4.84, reviews: '114K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['Targets tan & dullness'] }
      ]},
      { id: 'manicure', title: 'Pedicure & manicure', items: [
        { name: 'Essential Mani-Pedi Combo', price: 1359, startingAt: true, duration: '1 hr 40 mins', rating: 4.85, reviews: '246K reviews', img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80', bullets: ['Enriched with Kojic acid for brightening'] },
        { name: 'Crystal rose pedicure', price: 759, startingAt: true, duration: '1 hr 15 mins', rating: 4.84, reviews: '509K reviews', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80', bullets: ['Olive & jojoba oil for intense hydration'] }
      ]},
      { id: 'hair', title: 'Hair, bleach & detan', items: [
        { name: 'Head massage', price: 249, startingAt: true, rating: 4.87, reviews: '198K reviews', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80', options: 2, bullets: ['Relaxing oil massage to relieve stress'] },
        { name: 'Bleach', price: 349, startingAt: true, rating: 4.84, reviews: '99K reviews', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80', options: 6, bullets: ['Helps even out skin tone & reduce tan'] },
        { name: 'Detan', price: 399, startingAt: true, rating: 4.85, reviews: '115K reviews', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80', options: 6, bullets: ['Targeted detan to reduce pigmentation'] }
      ]}
    ]
  },

  spaAyurvedaWomen: {
    title: 'Spa Ayurveda', rating: 4.81, reviews: '1.1 M bookings',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=80', heading: 'Understanding your doshas', sub: '' },
      { img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=900&q=80', heading: 'Specialised massage beds', sub: '' },
      { img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=900&q=80', heading: 'Curated ancient Ayurvedic therapies', sub: '' }
    ],
    nav: [
      { id: 'stress', label: 'Stress relief', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&q=80' },
      { id: 'pain', label: 'Pain relief', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=200&q=80' },
      { id: 'addons', label: 'Add-ons', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=200&q=80' }
    ],
    sections: [
      { id: 'stress', title: 'Stress relief', items: [
        { name: 'Abhyangam neck-to-toe stress relief massage', price: 899, duration: '40 mins', rating: 4.81, reviews: '61K reviews', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80', bullets: ['Medium pressure neck to toe massage with herbal oils'] },
        { name: 'Shiro abhyanga head, neck & shoulder massage', price: 699, duration: '30 mins', rating: 4.80, reviews: '19K reviews', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80', bullets: ['Helps with eyestrain & fatigue, improves sleep quality', 'Pressure point massage on 5 Marma points'] },
        { name: 'Bhringadi head massage', price: 349, duration: '20 mins', rating: 4.78, reviews: '9K reviews', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&q=80', bullets: ['Nourishing herbal oil for scalp & hair'] }
      ]},
      { id: 'pain', title: 'Pain relief', items: [
        { name: 'Vedic signature massage', price: 1489, startingAt: true, duration: '60 mins', rating: 4.82, reviews: '78K reviews', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&q=80', badge: 'BESTSELLER', bullets: ['Supports post-workout relaxation', 'Add pack of 4 to unlock ₹1139/massage'] },
        { name: 'Vedic signature with head massage', price: 1729, oldPrice: 1929, duration: '1 hr 15 mins', rating: 4.81, reviews: '5K reviews', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80', badge: 'VALUE-SAVER', bullets: ['60 mins Ashwagandha massage & 20 mins foot massage'] }
      ]},
      { id: 'addons', title: 'Add-ons', items: [
        { name: 'Massage top-up (15 mins)', price: 199, duration: '15 mins', rating: 4.78, reviews: '11K reviews', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&q=80', bullets: ['Extend your relaxation with 15 extra minutes'] },
        { name: 'Hot bed', price: 49, rating: 4.79, reviews: '11K reviews', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&q=80', bullets: ['Advanced technology for ambient massage temperature', 'Improves blood circulation & removes stiffness'] }
      ]}
    ]
  },

  spaPrimeWomen: {
    title: 'Spa Prime', rating: 4.80, reviews: '640K bookings',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=900&q=80', heading: 'Certified therapists', sub: 'Every session, every time' }
    ],
    nav: [
      { id: 'stress', label: 'Stress relief', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=200&q=80' },
      { id: 'pain', label: 'Pain relief', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=200&q=80' },
      { id: 'addons', label: 'Add-ons', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=200&q=80' }
    ],
    sections: [
      { id: 'stress', title: 'Stress relief', items: [
        { name: 'Swedish stress relief massage', price: 799, duration: '45 mins', rating: 4.80, reviews: '32K reviews', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80', bullets: ['Gentle full-body strokes to relax muscles'] }
      ]},
      { id: 'pain', title: 'Pain relief', items: [
        { name: 'Deep tissue pain relief massage', price: 999, duration: '60 mins', rating: 4.79, reviews: '28K reviews', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&q=80', bullets: ['Targets deep muscle knots & tension'] }
      ]},
      { id: 'addons', title: 'Add-ons', items: [
        { name: 'Aromatherapy oil upgrade', price: 149, rating: 4.77, reviews: '9K reviews', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&q=80', bullets: ['Essential-oil blend for deeper relaxation'] }
      ]}
    ]
  },

  spaLuxeWomen: {
    title: 'Spa Luxe', rating: 4.88, reviews: '410K bookings',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=900&q=80', heading: 'An indulgent, five-star experience', sub: 'Premium-grade oils & top-rated therapists' }
    ],
    nav: [
      { id: 'signature', label: 'Signature therapies', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=200&q=80' },
      { id: 'addons', label: 'Add-ons', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=200&q=80' }
    ],
    sections: [
      { id: 'signature', title: 'Signature therapies', items: [
        { name: 'Balinese luxe massage', price: 1999, duration: '75 mins', rating: 4.89, reviews: '17K reviews', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&q=80', badge: 'BESTSELLER', bullets: ['Rhythmic strokes with premium essential oils'] },
        { name: 'Hot stone therapy', price: 2499, duration: '90 mins', rating: 4.87, reviews: '9K reviews', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&q=80', bullets: ['Heated basalt stones melt away tension'] }
      ]},
      { id: 'addons', title: 'Add-ons', items: [
        { name: 'Premium oil upgrade', price: 299, rating: 4.85, reviews: '6K reviews', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80', bullets: ['Imported aromatherapy oil blend'] }
      ]}
    ]
  },

  hairStudioForWomen: {
    title: 'Hair Studio for Women', rating: 4.78, reviews: '312K bookings',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=900&q=80', heading: 'Salon-grade hair care, at home', sub: "L'Oreal certified stylists" }
    ],
    nav: [
      { id: 'packages', label: 'Packages', img: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=200&q=80' },
      { id: 'cut', label: 'Cut & style', img: 'https://loremflickr.com/200/200/womanhaircut,salon' },
      { id: 'haircare', label: 'Hair care', img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&q=80' },
      { id: 'keratin', label: 'Keratin & botox', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=200&q=80' },
      { id: 'fashioncolor', label: 'Fashion color', img: 'https://loremflickr.com/200/200/haircolor,woman' }
    ],
    sections: [
      { id: 'packages', title: 'Packages', items: [
        { name: 'Wedding-ready group hairstyling', price: 1199, startingAt: true, rating: 4.63, reviews: '780 reviews', img: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=400&q=80', options: 3, bullets: ['Group hairstyling: blow-dry, straightening or tong curls'] },
        { name: 'Hair trim & styling', price: 598, oldPrice: 840, duration: '1 hr 5 mins', rating: 4.82, reviews: '161K reviews', img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', badge: 'PACKAGE', bullets: ['Styling: blow-dry, in-curl / out-curl', 'Hair trim included'] },
        { name: 'Hair trim & spa', price: 1548, oldPrice: 1748, duration: '1 hr 20 mins', rating: 4.80, reviews: '68K reviews', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80', badge: 'PACKAGE', bullets: ["Hair trim + L'Oreal hair spa"] }
      ]},
      { id: 'cut', title: 'Cut & style', items: [
        { name: 'Haircut for women', price: 549, duration: '45 mins', rating: 4.82, reviews: '133K reviews', img: 'https://loremflickr.com/400/400/womanhaircut,salon', bullets: ['Expert haircut tailored to your style', 'Blow-dry not included'] },
        { name: 'Haircut for girls', price: 649, duration: '45 mins', rating: 4.82, reviews: '7K reviews', img: 'https://loremflickr.com/400/400/girlhaircut,kids', bullets: ['A gentle, stylish haircut for girls aged 6-15'] }
      ]},
      { id: 'haircare', title: 'Hair care', items: [
        { name: "L'Oreal hair repair mask", price: 649, duration: '40 mins', rating: 4.78, reviews: '3K reviews', img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', bullets: ['Intensive repair mask therapy to strengthen & restore hair'] },
        { name: 'Head massage', price: 349, duration: '20 mins', rating: 4.78, reviews: '5K reviews', img: 'https://loremflickr.com/400/400/womanheadmassage,spa', bullets: ['Gentle massage to promote blood flow', 'Hair wash & blow-dry not included'] }
      ]},
      { id: 'keratin', title: 'Keratin & botox', items: [
        { name: 'Hair nanoplastia', price: 5499, oldPrice: 5999, duration: '3 hrs', rating: 4.65, reviews: '13 reviews', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80', badge: 'New launch', bullets: ['For dry, frizzy & damaged hair', 'Frizz control that lasts'] }
      ]},
      { id: 'fashioncolor', title: 'Fashion color', items: [
        { name: "L'Oreal Inoa shades", price: 2999, startingAt: true, rating: 4.53, reviews: '621 reviews', img: 'https://loremflickr.com/400/400/haircolor,woman', options: 3, bullets: ["L'Oreal Inoa base colour with fashion shades, ammonia-free"] },
        { name: "L'Oreal balayage/ombre color", price: 3899, startingAt: true, rating: 4.57, reviews: '1K reviews', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80', options: 4, bullets: ['Seamless application with a soft colour transition', 'Blow-dry & hair wash not included'] }
      ]}
    ]
  },

  makeupSareeStyling: {
    title: 'Makeup, Saree & Styling', rating: 4.74, reviews: '314K bookings',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=900&q=80', heading: 'Look your best for every occasion', sub: 'Bridal, party & everyday glam' }
    ],
    nav: [
      { id: 'packages', label: 'Packages', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=200&q=80' },
      { id: 'wedding', label: 'Wedding combos', img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=80' },
      { id: 'hairstyling', label: 'Hair styling', img: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=200&q=80' },
      { id: 'addons', label: 'Add-ons', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=200&q=80' }
    ],
    sections: [
      { id: 'packages', title: 'Packages', items: [
        { name: 'Basic makeup package', price: 2099, duration: '1 hr 30 mins', rating: 4.71, reviews: '13K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['Ideal for daytime events, office occasions & brunches', 'Includes basic makeup & basic hairstyling'] },
        { name: 'Luxe makeup package', price: 3799, duration: '2 hrs', rating: 4.67, reviews: '2K reviews', img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80', bullets: ['Ideal for festive gatherings, parties & weddings', 'Includes luxury makeup & advance hairstyling'] },
        { name: 'HD makeup package', price: 3299, duration: '1 hr 45 mins', rating: 4.74, reviews: '983 reviews', img: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=400&q=80', bullets: ['Ideal for formal events & photoshoots', 'Includes HD makeup & advance hairstyling'] }
      ]},
      { id: 'wedding', title: 'Wedding combos', items: [
        { name: 'Premium wedding combo', price: 4249, oldPrice: 4497, duration: '2 hrs 40 mins', rating: 4.72, reviews: '61K reviews', img: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80', bullets: ['Luxe full-glam glow with high-end products'] },
        { name: 'Complete event combo', price: 3749, oldPrice: 3997, duration: '2 hrs 20 mins', rating: 4.72, reviews: '62K reviews', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=400&q=80', bullets: ['A flawless, HD finish for every camera angle'] },
        { name: 'Glow smart combo', price: 2599, oldPrice: 2697, duration: '1 hr 50 mins', rating: 4.72, reviews: '65K reviews', img: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=400&q=80', bullets: ['Soft, fresh glam — subtle & wearable'] }
      ]},
      { id: 'hairstyling', title: 'Hair styling', items: [
        { name: 'Basic hairstyling', price: 599, duration: '45 mins', rating: 4.71, reviews: '17K reviews', img: 'https://images.unsplash.com/photo-1522336572468-97b06e8ef143?w=400&q=80', bullets: ['Open, soft buns, pony or braid'] },
        { name: 'Advance hairstyling', price: 999, duration: '60 mins', rating: 4.72, reviews: '21K reviews', img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80', bullets: ['Braids, curls, waves, low buns, up-dos & party styles'] }
      ]},
      { id: 'addons', title: 'Add-ons', items: [
        { name: 'Basic eye makeup', price: 599, duration: '20 mins', rating: 4.70, reviews: '5K reviews', img: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80', bullets: ['1-shade wash, soft smokey or classic blend'] }
      ]}
    ]
  },

  // ---------- MEN'S SALON & MASSAGE ----------
  salonMenPrime: {
    title: 'Salon for Men', rating: 4.86, reviews: '477K bookings',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&q=80', heading: 'Sharp looks, at your doorstep', sub: 'Grooming essentials for men' }
    ],
    nav: [
      { id: 'haircut', label: 'Haircut & beard', img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=200&q=80' },
      { id: 'facial', label: 'Facial & cleanup', img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=200&q=80' },
      { id: 'massage', label: 'Massage', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=200&q=80' },
      { id: 'manicure', label: 'Pedicure & manicure', img: 'https://loremflickr.com/200/200/manpedicure,mensgrooming' }
    ],
    sections: [
      { id: 'haircut', title: 'Haircut & beard', items: [
        { name: 'Haircut for men', price: 259, rating: 4.86, reviews: '477K reviews', img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80', bullets: ['Precision cut by trained barbers'] },
        { name: 'Beard styling', price: 199, rating: 4.83, reviews: '210K reviews', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80', bullets: ['Sharp shape-up & trim'] }
      ]},
      { id: 'facial', title: 'Facial & cleanup', items: [
        { name: 'O3+ facial for men', price: 899, duration: '50 mins', rating: 4.80, reviews: '54K reviews', img: 'https://loremflickr.com/400/400/manfacial,mensgrooming', bullets: ["De-tan & brightening for men's skin"] }
      ]},
      { id: 'massage', title: 'Massage', items: [
        { name: 'Head massage', price: 249, rating: 4.85, reviews: '89K reviews', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80', bullets: ['Relaxing oil massage for the scalp'] }
      ]},
      { id: 'manicure', title: 'Pedicure & manicure', items: [
        { name: 'Pedicure for men', price: 399, duration: '40 mins', rating: 4.81, reviews: '31K reviews', img: 'https://loremflickr.com/400/400/manpedicure,mensgrooming', bullets: ['Deep cleansing & nail care'] }
      ]}
    ]
  },

  massageMenPrime: {
    title: 'Massage for Men', rating: 4.85, reviews: '198K bookings',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=900&q=80', heading: 'Unwind, at home', sub: 'Certified male therapists' }
    ],
    nav: [
      { id: 'quick', label: 'Quick relief', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&q=80' },
      { id: 'full', label: 'Full body', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=200&q=80' },
      { id: 'addons', label: 'Add-ons', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=200&q=80' }
    ],
    sections: [
      { id: 'quick', title: 'Quick relief', items: [
        { name: 'Foot massage', price: 569, rating: 4.86, reviews: '31K reviews', img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80', bullets: ['Instant relief for tired feet'] },
        { name: 'Quick comfort therapy', price: 999, oldPrice: 1199, rating: 4.81, reviews: '19K reviews', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&q=80', bullets: ['A quick 30-min stress-buster'] },
        { name: 'Head, neck & shoulder massage', price: 669, rating: 4.86, reviews: '54K reviews', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80', bullets: ['Targets tension from desk work'] }
      ]},
      { id: 'full', title: 'Full body', items: [
        { name: 'Full body massage', price: 1299, duration: '90 mins', rating: 4.88, reviews: '22K reviews', img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&q=80', badge: 'BESTSELLER', bullets: ['Complete relaxation from head to toe'] },
        { name: 'Deep tissue massage', price: 1499, duration: '90 mins', rating: 4.83, reviews: '14K reviews', img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=400&q=80', bullets: ['Firm pressure to release deep tension'] }
      ]},
      { id: 'addons', title: 'Add-ons', items: [
        { name: 'Aroma oil upgrade', price: 199, rating: 4.79, reviews: '5K reviews', img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400&q=80', bullets: ['Essential-oil blend upgrade'] }
      ]}
    ]
  },

  // ---------- ELECTRICIAN / PLUMBER / CARPENTER / FURNITURE ----------
  electrician: {
    title: 'Electrician', rating: 4.74, reviews: '2.1 M bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=900&q=80', heading: 'Safe, certified electricians', sub: 'For every wiring & fitting need' }],
    nav: [
      { id: 'consult', label: 'Consultation', img: 'https://loremflickr.com/200/200/electrician,consultation' },
      { id: 'switch', label: 'Switch & socket', img: 'https://images.unsplash.com/photo-1558002038-1055907dfa19?w=200&q=80' },
      { id: 'fan', label: 'Fan & light', img: 'https://images.unsplash.com/photo-1587145717034-9c46b16c9eaa?w=200&q=80' },
      { id: 'wiring', label: 'Wiring', img: 'https://loremflickr.com/200/200/electricalwiring,electrician' }
    ],
    sections: [
      { id: 'consult', title: 'Consultation', items: [
        { name: 'Electrician consultation', price: 49, rating: 4.74, reviews: '144K reviews', img: 'https://loremflickr.com/400/400/electrician,consultation', bullets: ['Expert diagnosis before any repair'] }
      ]},
      { id: 'switch', title: 'Switch & socket', items: [
        { name: 'Switchboard repair & replacement', price: 99, rating: 4.83, reviews: '76K reviews', img: 'https://images.unsplash.com/photo-1558002038-1055907dfa19?w=400&q=80', bullets: ['Safe replacement of faulty switches'] }
      ]},
      { id: 'fan', title: 'Fan & light', items: [
        { name: 'Fan repair', price: 149, rating: 4.80, reviews: '158K reviews', img: 'https://images.unsplash.com/photo-1587145717034-9c46b16c9eaa?w=400&q=80', bullets: ['Fixes noise, speed & wobble issues'] },
        { name: 'Regular ceiling fan installation', price: 99, rating: 4.85, reviews: '61K reviews', img: 'https://loremflickr.com/400/400/ceilingfan,installation', bullets: ['Secure mounting & wiring check'] },
        { name: 'Tubelight repair & installation', price: 99, rating: 4.85, reviews: '44K reviews', img: 'https://loremflickr.com/400/400/tubelight,lightbulb', bullets: ['Quick fix for flickering or dead lights'] }
      ]},
      { id: 'wiring', title: 'Wiring', items: [
        { name: 'House wiring inspection', price: 299, rating: 4.72, reviews: '19K reviews', img: 'https://loremflickr.com/400/400/electricalwiring,electrician', bullets: ['Full safety check of home wiring'] }
      ]}
    ]
  },

  plumber: {
    title: 'Plumber', rating: 4.73, reviews: '1.8 M bookings',
    carousel: [{ img: 'https://loremflickr.com/900/500/plumber,pipe', heading: 'Leak-free, hassle-free', sub: 'Trusted plumbers near you' }],
    nav: [
      { id: 'consult', label: 'Consultation', img: 'https://loremflickr.com/200/200/plumber,pipe' },
      { id: 'tap', label: 'Tap & pipe', img: 'https://loremflickr.com/200/200/tap,faucet' },
      { id: 'bathroom', label: 'Bathroom fittings', img: 'https://loremflickr.com/200/200/bathroom,sink' },
      { id: 'tank', label: 'Water tank', img: 'https://loremflickr.com/200/200/watertank,plumbing' }
    ],
    sections: [
      { id: 'consult', title: 'Consultation', items: [
        { name: 'Plumber consultation', price: 49, rating: 4.73, reviews: '174K reviews', img: 'https://loremflickr.com/400/400/plumber,pipe', bullets: ['On-site diagnosis of plumbing issues'] }
      ]},
      { id: 'tap', title: 'Tap & pipe', items: [
        { name: 'Tap repair', price: 99, rating: 4.78, reviews: '82K reviews', img: 'https://loremflickr.com/400/400/tap,faucet', bullets: ['Fixes leaks & low pressure'] },
        { name: 'Pipe leakage repair', price: 199, rating: 4.75, reviews: '61K reviews', img: 'https://loremflickr.com/400/400/pipe,leak', bullets: ['Stops leaks at the source'] }
      ]},
      { id: 'bathroom', title: 'Bathroom fittings', items: [
        { name: 'Flush tank repair', price: 149, rating: 4.76, reviews: '38K reviews', img: 'https://loremflickr.com/400/400/toilet,bathroom', bullets: ['Fixes running or leaking flush tanks'] },
        { name: 'Wash basin installation', price: 349, rating: 4.77, reviews: '22K reviews', img: 'https://loremflickr.com/400/400/washbasin,sink', bullets: ['Secure fitting & leak-free sealing'] }
      ]},
      { id: 'tank', title: 'Water tank', items: [
        { name: 'Water tank cleaning', price: 599, rating: 4.74, reviews: '29K reviews', img: 'https://loremflickr.com/400/400/watertank,plumbing', bullets: ['Removes sediment & sanitises the tank'] }
      ]}
    ]
  },

  carpenter: {
    title: 'Carpenter', rating: 4.66, reviews: '890K bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=900&q=80', heading: 'Skilled hands for your home', sub: 'Furniture repair & more' }],
    nav: [
      { id: 'consult', label: 'Consultation', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=200&q=80' },
      { id: 'furniture', label: 'Furniture repair', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=200&q=80' },
      { id: 'door', label: 'Door & window', img: 'https://images.unsplash.com/photo-1622372738946-62e02505feb3?w=200&q=80' }
    ],
    sections: [
      { id: 'consult', title: 'Consultation', items: [
        { name: 'Carpenter consultation', price: 49, rating: 4.66, reviews: '154K reviews', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&q=80', bullets: ['Expert advice before any repair work'] }
      ]},
      { id: 'furniture', title: 'Furniture repair', items: [
        { name: 'Cupboard repair', price: 89, rating: 4.79, reviews: '44K reviews', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&q=80', bullets: ['Fixes hinges, shelves & alignment'] },
        { name: 'Pull out drawer repair/replacement', price: 129, rating: 4.76, reviews: '18K reviews', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&q=80', bullets: ['Smooth-gliding drawer mechanism fix'] },
        { name: 'Bed / sofa repair', price: 249, rating: 4.74, reviews: '12K reviews', img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=400&q=80', bullets: ['Fixes creaks, wobble & broken joints'] }
      ]},
      { id: 'door', title: 'Door & window', items: [
        { name: 'Door lock repair & installation', price: 129, rating: 4.79, reviews: '28K reviews', img: 'https://images.unsplash.com/photo-1622372738946-62e02505feb3?w=400&q=80', bullets: ['Secure fitting of new or repaired locks'] }
      ]}
    ]
  },

  furnitureAssembly: {
    title: 'Furniture Assembly', rating: 4.79, reviews: '210K bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=80', heading: 'From box to built', sub: 'Professional assembly, no stress' }],
    nav: [
      { id: 'beds', label: 'Beds', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&q=80' },
      { id: 'wardrobes', label: 'Wardrobes', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&q=80' },
      { id: 'office', label: 'Office furniture', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&q=80' }
    ],
    sections: [
      { id: 'beds', title: 'Beds', items: [
        { name: 'Bed assembly', price: 399, rating: 4.80, reviews: '31K reviews', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80', bullets: ['For flat-pack & knockdown beds'] }
      ]},
      { id: 'wardrobes', title: 'Wardrobes', items: [
        { name: 'Wardrobe assembly', price: 599, rating: 4.78, reviews: '24K reviews', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80', bullets: ['Includes shelf & door alignment'] }
      ]},
      { id: 'office', title: 'Office furniture', items: [
        { name: 'Study table assembly', price: 249, rating: 4.79, reviews: '14K reviews', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80', bullets: ['Sturdy, wobble-free assembly'] },
        { name: 'Office chair assembly', price: 149, rating: 4.80, reviews: '9K reviews', img: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80', bullets: ['Quick assembly, ready to use'] }
      ]}
    ]
  },

  // ---------- AC & APPLIANCE REPAIR ----------
  acRepair: {
    title: 'AC & Appliance Repair', rating: 4.77, reviews: '13.5 M bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=900&q=80', heading: 'Beat the heat', sub: 'Foam-jet deep cleaning for your AC' }],
    nav: [
      { id: 'annual', label: 'Annual plan', img: 'https://loremflickr.com/200/200/airconditioner,calendar' },
      { id: 'service', label: 'AC service', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=200&q=80' },
      { id: 'repair', label: 'AC repair', img: 'https://loremflickr.com/200/200/airconditioner,technician' },
      { id: 'install', label: 'Installation', img: 'https://loremflickr.com/200/200/airconditioner,installation' },
      { id: 'gas', label: 'Gas refill', img: 'https://loremflickr.com/200/200/airconditioner,gas' }
    ],
    sections: [
      { id: 'annual', title: 'Annual plan', items: [
        { name: 'Annual plan [2 times/year]', price: 1098, oldPrice: 1198, startingAt: true, rating: 4.76, reviews: '2.8M reviews', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&q=80', options: 6, bullets: ['Get 1st service now, choose 2nd service anytime in the year', 'Applicable for both window or split ACs', 'Add more & save up to 25%'] }
      ]},
      { id: 'service', title: 'AC service', items: [
        { name: 'Foam-jet AC service', price: 599, startingAt: true, rating: 4.76, reviews: '2.8M reviews', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&q=80', badge: 'BESTSELLER', options: 9, bullets: ['Applicable for both window & split ACs', 'Indoor unit deep cleaning with foam & jet spray', 'Add more & save up to 25%'] },
        { name: 'Foam-jet service (2 ACs)', price: 1098, oldPrice: 1198, duration: '1 hr 30 mins', rating: 4.76, reviews: '2.8M reviews', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&q=80', bullets: ['₹549 per AC', 'Indoor unit deep cleaning with foam & jet spray'] },
        { name: 'Foam-jet service (3 ACs)', price: 1497, oldPrice: 1797, duration: '2 hrs 15 mins', rating: 4.76, reviews: '2.8M reviews', img: 'https://loremflickr.com/400/400/airconditioner,clean', bullets: ['₹499 per AC'] }
      ]},
      { id: 'repair', title: 'Repair & gas refill', items: [
        { name: 'AC repair', price: 299, startingAt: true, rating: 4.73, reviews: '831K reviews', img: 'https://loremflickr.com/400/400/airconditioner,technician', options: 4, bullets: ['Complete check-up to identify issues before repair', 'Covers power-on issues, water leakage, cooling & noise'] },
        { name: 'AC uninstallation', price: 649, startingAt: true, rating: 4.80, reviews: '137K reviews', img: 'https://loremflickr.com/400/400/airconditioner,uninstall', options: 2, bullets: ['Uninstallation of both indoor & outdoor units'] }
      ]},
      { id: 'install', title: 'Installation', items: [
        { name: 'AC installation', price: 799, startingAt: true, rating: 4.69, reviews: '145K reviews', img: 'https://loremflickr.com/400/400/airconditioner,installation', options: 2, bullets: ['Installation of indoor & outdoor units with free gas check'] }
      ]},
      { id: 'gas', title: 'Gas refill', items: [
        { name: 'Gas refill & check-up', price: 2800, duration: '2 hrs 30 mins', rating: 4.78, reviews: '113K reviews', img: 'https://loremflickr.com/400/400/airconditioner,gas', bullets: ['Restores optimal cooling performance', 'Includes leak testing & fixing'] }
      ]}
    ]
  },

  // ---------- CLEANING ----------
  bathroomCleaning: {
    title: 'Bathroom Cleaning', rating: 4.83, reviews: '7.3 M bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=900&q=80', heading: 'Sparkling clean, every corner', sub: 'Machine-powered deep cleaning' }],
    nav: [
      { id: 'packs', label: '3-visit packs', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&q=80' },
      { id: 'value', label: 'Value deals', img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&q=80' },
      { id: 'onetime', label: 'One time deep clean', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200&q=80' },
      { id: 'mini', label: 'Mini services', img: 'https://loremflickr.com/200/200/bathroom,mirror' }
    ],
    sections: [
      { id: 'packs', title: '3-visit packs', items: [
        { name: '3 visits (Weekdays only): Intense bathroom cleaning', price: 1197, oldPrice: 1497, startingAt: true, rating: 4.80, reviews: '5.8M reviews', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80', options: 6, bullets: ['Starts at ₹399/bathroom', 'Book 3 visits at a discounted price', 'Avail first visit now & remaining within 6 months'] },
        { name: '3 visits: Intense bathroom cleaning', price: 1347, oldPrice: 1497, startingAt: true, rating: 4.80, reviews: '5.8M reviews', img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&q=80', options: 6, bullets: ['Starts at ₹449/bathroom', 'Book 3 visits at a discounted price', 'Avail first visit now & remaining within 6 months'] }
      ]},
      { id: 'value', title: 'Value deals', items: [
        { name: 'Intense cleaning (2 bathrooms)', price: 923, oldPrice: 998, duration: '2 hrs', rating: 4.80, reviews: '5.8M reviews', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80', bullets: ['₹462 per bathroom', 'Floor & tile cleaning with a scrub machine'] },
        { name: 'Intense cleaning (3 bathrooms)', price: 1347, oldPrice: 1497, duration: '3 hrs', rating: 4.80, reviews: '5.8M reviews', img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&q=80', bullets: ['₹449 per bathroom', 'Floor & tile cleaning with a scrub machine'] },
        { name: 'Bathroom & ceiling fan cleaning (pack of 2)', price: 1121, oldPrice: 1196, duration: '2 hrs 20 mins', rating: 4.80, reviews: '5.8M reviews', img: 'https://loremflickr.com/400/400/ceilingfan,bathroom', bullets: ['Includes 2 intense bathroom & 2 ceiling fans cleaning'] }
      ]},
      { id: 'onetime', title: 'One time deep clean', items: [
        { name: 'Intense bathroom cleaning', price: 499, startingAt: true, duration: '60 mins', rating: 4.80, reviews: '6.1M reviews', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80', badge: 'BESTSELLER', bullets: ['Floor & tile cleaning with scrubbing machine', 'Recommended for deep-cleaning and tough stains'] },
        { name: 'Move-in bathroom cleaning', price: 579, startingAt: true, duration: '1 hr 30 mins', rating: 4.81, reviews: '1.4M reviews', img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&q=80', bullets: ['Extra 30 mins of machine scrubbing of floor and tiles', 'Recommended before moving into a new or unused bathroom'] }
      ]},
      { id: 'mini', title: 'Mini services', items: [
        { name: 'Bathroom exhaust fan cleaning (additional)', price: 89, duration: '15 mins', rating: 4.79, reviews: '109K reviews', img: 'https://loremflickr.com/400/400/exhaustfan,bathroom', bullets: ['One fan is already covered in bathroom service'] },
        { name: 'Washbasin cleaning (additional)', price: 89, duration: '10 mins', rating: 4.83, reviews: '304K reviews', img: 'https://loremflickr.com/400/400/washbasin,sink', bullets: ['One washbasin is already covered in bathroom service'] },
        { name: 'Ceiling fan cleaning', price: 99, duration: '10 mins', rating: 4.83, reviews: '593K reviews', img: 'https://loremflickr.com/400/400/ceilingfan', bullets: ['Not covered in bathroom service'] },
        { name: 'Mirror cleaning (additional)', price: 59, duration: '10 mins', rating: 4.83, reviews: '42K reviews', img: 'https://loremflickr.com/400/400/mirror,bathroom', bullets: ['One mirror is already covered in bathroom service'] }
      ]}
    ]
  },

  kitchenCleaning: {
    title: 'Kitchen Cleaning', rating: 4.81, reviews: '3.2 M bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=900&q=80', heading: 'A kitchen you can eat off', sub: 'Degreasing & sanitisation included' }],
    nav: [
      { id: 'chimney', label: 'Chimney', img: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=200&q=80' },
      { id: 'fridge', label: 'Fridge', img: 'https://loremflickr.com/200/200/refrigerator,kitchen' },
      { id: 'full', label: 'Full kitchen', img: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=200&q=80' }
    ],
    sections: [
      { id: 'chimney', title: 'Chimney', items: [
        { name: 'Chimney cleaning', price: 399, rating: 4.84, reviews: '210K reviews', img: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400&q=80', bullets: ['Degreases filters & improves suction'] }
      ]},
      { id: 'fridge', title: 'Fridge', items: [
        { name: 'Fridge cleaning', price: 399, rating: 4.83, reviews: '190K reviews', img: 'https://loremflickr.com/400/400/refrigerator,kitchen', bullets: ['Interior & exterior deep clean'] }
      ]},
      { id: 'full', title: 'Full kitchen', items: [
        { name: 'Full kitchen deep cleaning', price: 1299, rating: 4.80, reviews: '88K reviews', img: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400&q=80', bullets: ['Cabinets, counters, sink & floor covered'] }
      ]}
    ]
  },

  livingBedroomCleaning: {
    title: 'Living & Bedroom Cleaning', rating: 4.79, reviews: '1.4 M bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=900&q=80', heading: 'Fresh, dust-free living spaces', sub: '' }],
    nav: [
      { id: 'sofa', label: 'Sofa', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&q=80' },
      { id: 'carpet', label: 'Carpet', img: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=200&q=80' },
      { id: 'room', label: 'Full room', img: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=200&q=80' }
    ],
    sections: [
      { id: 'sofa', title: 'Sofa', items: [
        { name: 'Sofa cleaning (5 seater)', price: 799, rating: 4.78, reviews: '120K reviews', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80', bullets: ['Vacuum + shampoo wash'] }
      ]},
      { id: 'carpet', title: 'Carpet', items: [
        { name: 'Carpet cleaning', price: 599, rating: 4.76, reviews: '54K reviews', img: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&q=80', bullets: ['Removes dust, mites & stains'] }
      ]},
      { id: 'room', title: 'Full room', items: [
        { name: 'Living room deep cleaning', price: 999, rating: 4.77, reviews: '61K reviews', img: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&q=80', bullets: ['Floor, furniture & surfaces covered'] }
      ]}
    ]
  },

  fullHomeCleaning: {
    title: 'Full Home / By Room Cleaning', rating: 4.81, reviews: '980K bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80', heading: 'A spotless home, top to bottom', sub: '' }],
    nav: [
      { id: '1bhk', label: '1 BHK', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&q=80' },
      { id: '2bhk', label: '2 BHK', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&q=80' },
      { id: '3bhk', label: '3 BHK', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&q=80' }
    ],
    sections: [
      { id: '1bhk', title: '1 BHK', items: [
        { name: 'Full home cleaning (1 BHK)', price: 2499, rating: 4.81, reviews: '410K reviews', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80', bullets: ['Every room covered, top to bottom'] }
      ]},
      { id: '2bhk', title: '2 BHK', items: [
        { name: 'Full home cleaning (2 BHK)', price: 3499, rating: 4.81, reviews: '320K reviews', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80', bullets: ['Ideal for mid-sized homes'] }
      ]},
      { id: '3bhk', title: '3 BHK', items: [
        { name: 'Full home cleaning (3 BHK)', price: 4499, rating: 4.80, reviews: '150K reviews', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80', bullets: ['Complete deep clean for larger homes'] }
      ]}
    ]
  },

  // ---------- PEST CONTROL ----------
  cockroachControl: {
    title: 'Cockroach Control', rating: 4.83, reviews: '1.4 M bookings',
    carousel: [{ img: 'https://loremflickr.com/900/500/cockroach,pestcontrol', heading: 'Cockroach-free, guaranteed', sub: 'Odourless, gel-based treatment' }],
    nav: [
      { id: 'kitchen', label: 'Kitchen/Bathroom', img: 'https://loremflickr.com/200/200/pestcontrol,spray' },
      { id: 'apartment', label: 'Apartment/Bunglow', img: 'https://loremflickr.com/200/200/pestcontrol,gel' }
    ],
    sections: [
      { id: 'kitchen', title: 'Kitchen/Bathroom', items: [
        { name: 'Pest control (includes utensil removal)', price: 1249, startingAt: true, rating: 4.79, reviews: '162K reviews', img: 'https://loremflickr.com/400/400/pestcontrol,spray', options: 6, bullets: ['Treatment completed in 2 visits with 2 weeks gap', "We'll remove utensils before the service begins"] },
        { name: 'Pest control (no utensil removal)', price: 998, startingAt: true, rating: 4.80, reviews: '90K reviews', img: 'https://loremflickr.com/400/400/pestcontrol,gel', options: 6, bullets: ['Treatment completed in 2 visits with 2 weeks gap', 'Excludes removal of utensils & objects before service'] }
      ]},
      { id: 'apartment', title: 'Apartment/Bunglow', items: [
        { name: 'Apartment pest control (utensil removal by customer)', price: 1549, startingAt: true, rating: 4.81, reviews: '79K reviews', img: 'https://loremflickr.com/400/400/pestcontrol,ants', options: 5, bullets: ['Spray treatment followed by gel treatment after 2 weeks', 'Excludes removal of utensils & objects'] },
        { name: 'Bungalow pest control (utensil removal by customer)', price: 2099, startingAt: true, rating: 4.74, reviews: '2K reviews', img: 'https://loremflickr.com/400/400/pestcontrol,house', options: 4, bullets: ['Spray treatment followed by gel treatment after 2 weeks', 'Excludes removal of utensils & objects'] },
        { name: 'Apartment pest control (includes utensil removal)', price: 1849, startingAt: true, rating: 4.79, reviews: '102K reviews', img: 'https://loremflickr.com/400/400/pestcontrol,kitchen', options: 5, bullets: ['Spray treatment followed by gel treatment after 2 weeks', "We'll remove utensils before the service begins"] },
        { name: 'Bungalow pest control (includes utensil removal)', price: 2399, startingAt: true, rating: 4.73, reviews: '3K reviews', img: 'https://loremflickr.com/400/400/pestcontrol,villa', options: 4, bullets: ['Spray treatment followed by gel treatment after 2 weeks', "We'll remove utensils before the service begins"] }
      ]}
    ]
  },

  termiteControl: {
    title: 'Termite Control', rating: 4.78, reviews: '410K bookings',
    carousel: [{ img: 'https://loremflickr.com/900/500/termite,woodpest', heading: "Protect your home's foundation", sub: '' }],
    nav: [
      { id: 'spot', label: 'Spot treatment', img: 'https://loremflickr.com/200/200/termite,wood' },
      { id: 'full', label: 'Full home', img: 'https://loremflickr.com/200/200/termite,pestcontrol' }
    ],
    sections: [
      { id: 'spot', title: 'Spot treatment', items: [
        { name: 'Termite spot treatment', price: 899, rating: 4.76, reviews: '120K reviews', img: 'https://loremflickr.com/400/400/termite,wood', bullets: ['Targets visible termite-affected areas'] }
      ]},
      { id: 'full', title: 'Full home', items: [
        { name: 'Full home termite control', price: 2499, rating: 4.80, reviews: '61K reviews', img: 'https://loremflickr.com/400/400/termite,pestcontrol', bullets: ['Comprehensive anti-termite treatment', 'Includes post-treatment warranty'] }
      ]}
    ]
  },

  antsBedBugsControl: {
    title: 'Ants & Bed Bugs Control', rating: 4.77, reviews: '360K bookings',
    carousel: [{ img: 'https://loremflickr.com/900/500/bedbug,pestcontrol', heading: 'Sleep easy again', sub: '' }],
    nav: [
      { id: 'ants', label: 'Ants', img: 'https://loremflickr.com/200/200/ants,pestcontrol' },
      { id: 'bedbugs', label: 'Bed bugs', img: 'https://loremflickr.com/200/200/bedbug,mattress' }
    ],
    sections: [
      { id: 'ants', title: 'Ants', items: [
        { name: 'Ants control', price: 599, rating: 4.76, reviews: '90K reviews', img: 'https://loremflickr.com/400/400/ants,pestcontrol', bullets: ['Safe for kitchens & pantries'] }
      ]},
      { id: 'bedbugs', title: 'Bed bugs', items: [
        { name: 'Bed bugs control', price: 1899, rating: 4.77, reviews: '76K reviews', img: 'https://loremflickr.com/400/400/bedbug,mattress', bullets: ['Steam + spray treatment for mattresses'] }
      ]}
    ]
  },

  // ---------- PAINTING & WALL PANELS ----------
  paintingWaterproofing: {
    title: 'Painting & Water-proofing', rating: 4.72, reviews: '210K bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=900&q=80', heading: 'A fresh coat, done right', sub: 'Asian Paints certified applicators' }],
    nav: [
      { id: 'consult', label: 'Consultation', img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=200&q=80' },
      { id: 'painting', label: 'Wall painting', img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=200&q=80' },
      { id: 'waterproof', label: 'Waterproofing', img: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=200&q=80' }
    ],
    sections: [
      { id: 'consult', title: 'Consultation', items: [
        { name: 'Painting consultation', price: 49, rating: 4.70, reviews: '18K reviews', img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80', bullets: ['Free colour & material guidance'] }
      ]},
      { id: 'painting', title: 'Wall painting', items: [
        { name: 'Room painting (per room)', price: 2999, startingAt: true, rating: 4.73, reviews: '61K reviews', img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80', bullets: ['Asian Paints, 2 coats included'] }
      ]},
      { id: 'waterproof', title: 'Waterproofing', items: [
        { name: 'Waterproofing treatment', price: 4999, startingAt: true, rating: 4.71, reviews: '9K reviews', img: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400&q=80', bullets: ['Seepage-proof coating with warranty'] }
      ]}
    ]
  },

  wallPanels: {
    title: 'Wall Panels by Revamp', rating: 4.75, reviews: '48K bookings',
    carousel: [{ img: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900&q=80', heading: 'Level up your walls', sub: 'Transform your home in a day' }],
    nav: [
      { id: 'tv', label: 'TV wall', img: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=200&q=80' },
      { id: 'living', label: 'Living room', img: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&q=80' },
      { id: 'bedroom', label: 'Bedroom', img: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=200&q=80' }
    ],
    sections: [
      { id: 'tv', title: 'TV wall', items: [
        { name: 'TV wall panel installation', price: 8999, startingAt: true, rating: 4.75, reviews: '12K reviews', img: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&q=80', bullets: ['Free at-home consultation included'] }
      ]},
      { id: 'living', title: 'Living room', items: [
        { name: 'Living room wall panel', price: 12999, startingAt: true, rating: 4.74, reviews: '9K reviews', img: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80', bullets: ['Premium wood-finish PVC panels'] }
      ]},
      { id: 'bedroom', title: 'Bedroom', items: [
        { name: 'Bedroom wall panel', price: 9999, startingAt: true, rating: 4.76, reviews: '7K reviews', img: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&q=80', bullets: ['Warm, cozy accent wall finish'] }
      ]}
    ]
  }
};

function openCategoryPage(key) {
  var data = pageData[key];
  if (!data) return;
  currentCategoryKey = key;
  renderCategoryPage(data);
  document.getElementById('categoryPage').classList.add('open');
  document.body.style.overflow = 'hidden';
  var scroller = document.getElementById('categoryPage');
  if (scroller) scroller.scrollTop = 0;
}
function closeCategoryPage() {
  document.getElementById('categoryPage').classList.remove('open');
  document.body.style.overflow = '';
  currentCategoryKey = null;
}
function scrollToCatSection(id) {
  var el = document.getElementById('cs-' + id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSvcRow(item) {
  if (currentCategoryKey && !item.catKey) item = Object.assign({}, item, { catKey: currentCategoryKey });
  var key = slugify(item.name);
  var priceHtml = (item.startingAt ? 'Starts at ' : '') + money(item.price);
  if (item.oldPrice) priceHtml += ' <s>' + money(item.oldPrice) + '</s>';
  if (item.duration) priceHtml += ' <span style="color:#374151;font-weight:400;font-size:12px">• ' + item.duration + '</span>';
  var badgeHtml = item.badge ? '<span style="color:#059669;font-size:11px;font-weight:700;margin-left:6px">' + item.badge + '</span>' : '';

  // PACKAGE items with a discount show a dedicated gray "% OFF" box + Add
  // button (matching the real site), instead of a product photo.
  var isPackageDiscount = item.badge === 'PACKAGE' && item.oldPrice;
  var rightSideHtml;
  if (isPackageDiscount) {
    var pct = Math.round((item.oldPrice - item.price) / item.oldPrice * 100);
    rightSideHtml =
      '<div class="discount-box">' +
        '<div class="discount-pct">' + pct + '%<br>OFF</div>' +
        '<div class="add-area" id="addarea-' + key + '" data-item="' + enc(item) + '"></div>' +
      '</div>';
  } else {
    rightSideHtml =
      '<div>' +
        '<div class="svc-img-wrap"><img src="' + item.img + '" alt="" onload="this.classList.add(\'loaded\')" /></div>' +
        '<div class="add-area" id="addarea-' + key + '" data-item="' + enc(item) + '"></div>' +
        (item.options ? '<div class="opt-note">' + item.options + ' options</div>' : '') +
      '</div>';
  }

  return '<div class="svc-row" id="row-' + key + '">' +
    '<div class="svc-info">' +
      '<div class="svc-title">' + item.name + badgeHtml + '</div>' +
      '<div class="svc-rating"><i class="fas fa-circle" style="font-size:9px"></i> ' + item.rating + ' (' + item.reviews + ')</div>' +
      '<div class="svc-price">' + priceHtml + '</div>' +
      '<span class="view-details" onclick="openDetailsModal(\'' + enc(item) + '\')">View details</span>' +
    '</div>' +
    rightSideHtml +
  '</div>';
}

function renderCategoryPage(data) {
  document.getElementById('catPageTitle').textContent = data.title;
  document.getElementById('catPageRating').innerHTML = '<i class="fas fa-star"></i> ' + data.rating + ' (' + data.reviews + ')';
  var searchInput = document.querySelector('#categoryPage .insta-search input');
  if (searchInput) searchInput.placeholder = 'Search in ' + data.title;

  document.getElementById('catPageNav').innerHTML = data.nav.map(function(n) {
    return '<div class="service-select-item" onclick="scrollToCatSection(\'' + n.id + '\')">' +
      '<div class="service-select-icon">' + (n.badge ? '<span class="sel-badge">' + n.badge + '</span>' : '') + '<img src="' + n.img + '" alt="" /></div>' +
      '<div class="service-select-label">' + n.label + '</div>' +
    '</div>';
  }).join('');

  var carouselHtml = '';
  if (data.carousel && data.carousel.length) {
    carouselHtml += '<div class="page-carousel" id="catCarousel" data-slide="0">';
    carouselHtml += '<div class="carousel-track">';
    data.carousel.forEach(function(slide, i) {
      carouselHtml += '<div class="carousel-slide" style="display:' + (i === 0 ? 'block' : 'none') + '">' +
        '<img src="' + slide.img + '" alt="" />' +
        '<div class="carousel-text"><h3>' + slide.heading + '</h3>' + (slide.sub ? '<p>' + slide.sub + '</p>' : '') + '</div>' +
      '</div>';
    });
    carouselHtml += '</div>';
    if (data.carousel.length > 1) {
      carouselHtml += '<div class="carousel-arrow left" onclick="moveCarousel(-1)"><i class="fas fa-chevron-left"></i></div>';
      carouselHtml += '<div class="carousel-arrow right" onclick="moveCarousel(1)"><i class="fas fa-chevron-right"></i></div>';
      carouselHtml += '<div class="carousel-dots">' + data.carousel.map(function(_, i) { return '<div class="carousel-dot' + (i === 0 ? ' active' : '') + '"></div>'; }).join('') + '</div>';
    }
    carouselHtml += '</div>';
  }
  document.getElementById('catPageCarousel').innerHTML = carouselHtml;

  document.getElementById('catPageSections').innerHTML = data.sections.map(function(sec) {
    return '<div class="section-head" id="cs-' + sec.id + '">' + sec.title + '</div>' + sec.items.map(renderSvcRow).join('');
  }).join('');

  syncAddButtons();
  renderFloatingCartWidgets();
}

function moveCarousel(dir) {
  var el = document.getElementById('catCarousel');
  if (!el) return;
  var slides = el.querySelectorAll('.carousel-slide');
  var dots = el.querySelectorAll('.carousel-dot');
  var cur = parseInt(el.getAttribute('data-slide'), 10) || 0;
  var next = (cur + dir + slides.length) % slides.length;
  slides[cur].style.display = 'none';
  slides[next].style.display = 'block';
  if (dots[cur]) dots[cur].classList.remove('active');
  if (dots[next]) dots[next].classList.add('active');
  el.setAttribute('data-slide', next);
}

// ===========================
// DETAILS MODAL (View details -> real product details + reviews)
// ===========================
var sampleReviews = [
  { name: 'Rohini Gera', rating: 5, date: 'Jun 20, 2026', text: 'Great job done! Very professional and on time.' },
  { name: 'Jyothi', rating: 5, date: 'Jul 3, 2025', text: 'Good, I am happy with the service.' },
  { name: 'Monika Gupta', rating: 5, date: 'Aug 24, 2025', text: 'Very polite and good service overall.' },
  { name: 'Vijeyta', rating: 4, date: 'Aug 26, 2025', text: 'Loved the service, will book again!' }
];

// ===========================
// CATEGORY-SPECIFIC "VIEW DETAILS" CONTENT
// Real equipment / process / tips / FAQs per category — shown in the
// details modal so each service type looks distinct, not a copy-paste.
// ===========================
var categoryDetailsData = {
  cockroachControl: {
    equipment: ['Diluted liquid chemical spray (visit 1)', 'Semi-solid gel treatment (visit 2)', 'Pump sprayer & PPE kit'],
    process: [
      'Thorough inspection of the kitchen/bathroom for hiding spots',
      'Visit 1: Spraying of a diluted liquid chemical in all infested areas',
      'Wait 2 weeks for the treatment to take effect',
      'Visit 2: Gel treatment applied deep into drains & cracks to break the breeding cycle'
    ],
    tips: [
      'Empty kitchen cabinets & utensils before the professional arrives',
      "Don't touch sprayed surfaces until fully dry",
      'Once dry, wipe with a dry cloth only — avoid soap & water',
      'Keep children & pets away from sprayed areas until dry'
    ],
    faqs: [
      { q: 'Will I have to empty the kitchen before the visit?', a: 'Yes, customers need to empty the kitchen before the 1st visit — or add it as an add-on for the professional to do it for you.' },
      { q: 'Why do I need the second visit?', a: 'The second visit targets eggs that hatch later and newly-born cockroaches, giving long-lasting results.' },
      { q: 'Is the service safe for children and pets?', a: 'Yes, but keep them away from sprayed surfaces until they dry.' }
    ],
    warranty: '3-month warranty against recurring cockroaches'
  },
  termiteControl: {
    equipment: ['Anti-termite chemical spray', 'Wood-injection drilling kit', 'Post-treatment sealant'],
    process: [
      'Detailed inspection of wooden furniture, doors & foundation for termite activity',
      'Spray & injection treatment applied to affected & vulnerable areas',
      'Follow-up gel treatment after 2 weeks to eliminate remaining colonies'
    ],
    tips: ['Move furniture away from walls before the visit', 'Avoid varnishing treated wood for 48 hours', 'Report any fresh mud tubes to the technician'],
    faqs: [
      { q: 'How long does the treatment last?', a: 'Our termite treatment typically protects your home for several months with a warranty period after service.' },
      { q: 'Is it safe for wooden furniture?', a: 'Yes, our chemicals are specifically formulated to be safe for wood while eliminating termites.' }
    ],
    warranty: 'Warranty against re-infestation included'
  },
  antsBedBugsControl: {
    equipment: ['Non-staining ant gel bait', 'Steam treatment machine for mattresses', 'Bed bug spray (odourless)'],
    process: [
      'Inspection of mattress seams, furniture joints & kitchen entry points',
      'Steam treatment of mattresses & upholstery to kill bed bugs & eggs',
      'Gel/spray treatment along ant trails and entry points'
    ],
    tips: ['Strip and wash all bedding in hot water after treatment', 'Vacuum mattresses & furniture before the professional arrives', 'Keep the treated room ventilated for a few hours after'],
    faqs: [
      { q: 'Do I need to leave the house during treatment?', a: 'No, but it\'s best to stay out of the treated room until it dries.' },
      { q: 'How soon will I see results?', a: 'Most customers notice a significant reduction within 48-72 hours of treatment.' }
    ],
    warranty: 'Re-visit within warranty period if pests recur'
  },
  bathroomCleaning: {
    equipment: ['Hand scrubber & scrubbing machine', 'Microfiber duster & wipers', 'Professional-grade Taski chemicals'],
    process: [
      'Floor, WC seat & washbasin cleaned with disinfecting chemicals',
      'Mirrors, windows, doors, exhaust fan & geyser wiped down',
      'All bathroom fittings cleaned with professional-grade chemicals',
      'Machine scrubbing of floor & tiles for tough stains'
    ],
    tips: [
      "Don't let standing water collect — wipe floors after every use",
      'Use a self-cleaning toilet flush cleaner between professional visits',
      'Every booking includes customer protection up to ₹10,000 against damage',
      'Deep cleaning does not remove old rust stains on fittings — mention these upfront'
    ],
    faqs: [
      { q: 'How soon can I use the bathroom after cleaning?', a: 'As soon as the professional confirms it — during the process the bathroom will be unusable.' },
      { q: 'Are the cleaning agents pet-friendly?', a: 'Yes, they are professional-grade and safe for pets.' },
      { q: 'Do you fix bathroom leaks or repairs?', a: 'No — deep cleaning doesn\'t cover repairs. Book a Plumber for leaks separately.' }
    ],
    warranty: 'Customer protection coverage up to ₹10,000 against damage'
  },
  kitchenCleaning: {
    equipment: ['Degreasing spray & scrubbing pads', 'Steam cleaner for stubborn grease', 'Food-safe disinfectant'],
    process: [
      'Degreasing of chimney, hob, counters & tiles',
      'Deep cleaning inside & outside of the fridge (if selected)',
      'Sanitisation of all surfaces with food-safe disinfectant'
    ],
    tips: ['Clear out perishables from the fridge before the visit', 'Keep fragile crockery aside', 'Ventilate the kitchen for an hour after service'],
    faqs: [
      { q: 'Is it safe to store food right after cleaning?', a: 'Yes — all chemicals used are food-safe & rinsed off thoroughly.' }
    ],
    warranty: 'Re-clean within 24 hours if you\'re not satisfied'
  },
  acRepair: {
    equipment: ['Foam-jet & power-jet cleaning gun', 'Nitrogen leak-testing kit', 'Gas charging & brazing tools'],
    process: [
      'Pre-service inspection including gas level checks',
      'Deep cleaning of filters, coil, fins & drain trays with foam + power jet',
      'Leak testing with nitrogen/soap solution if repair is needed',
      'Final checks — pipe blockage, drain tray leakage, cooling performance'
    ],
    tips: ['Switch off the AC at least 30 mins before the visit', 'Clear the area below the outdoor unit for access', 'Ask for the inspection quotation before repairs begin'],
    faqs: [
      { q: 'What problems are covered under AC repair?', a: 'Power-on issues, water leakage, less/no cooling, and unwanted noise or smell.' },
      { q: 'Is there a warranty on repairs?', a: 'Yes, Urban Company provides a 30-day warranty on all AC services and repairs.' }
    ],
    warranty: '30-day warranty on all AC services & repairs'
  },
  electrician: {
    equipment: ['Multimeter & voltage tester', 'Insulated tool kit', 'Genuine replacement parts (switches, MCBs)'],
    process: ['Safety check — mains switched off before any work', 'Diagnosis of the fault using a multimeter', 'Repair/replacement using genuine parts', 'Final function test before wrap-up'],
    tips: ['Keep the fuse box accessible', 'Note down when the issue occurs (e.g. only at night) to help diagnosis', 'Avoid using the affected point until the professional arrives'],
    faqs: [{ q: 'Are spare parts included in the price?', a: 'Basic parts are quoted upfront; premium/branded parts may be quoted separately after inspection.' }],
    warranty: '30-day warranty on electrical repairs'
  },
  plumber: {
    equipment: ['Pipe wrench & sealing tape', 'Leak-detection dye', 'Standard CP fittings & washers'],
    process: ['Inspection of the leak/fault source', 'Shut-off of water supply to the work area', 'Repair or replacement of the faulty part', 'Leak & pressure test before finishing'],
    tips: ['Locate your main water valve before the visit', 'Clear the area under the sink/tank for access', 'Mention if hot water lines are involved'],
    faqs: [{ q: 'Do you fix major pipeline leakages?', a: 'Minor to moderate leaks are covered; major re-piping work may need a separate quote after inspection.' }],
    warranty: '30-day warranty on plumbing repairs'
  },
  carpenter: {
    equipment: ['Cordless drill & driver set', 'Wood filler & polish', 'Hinges, locks & channel hardware'],
    process: ['Inspection of the furniture/fitting', 'Repair or part replacement as needed', 'Alignment & smooth-operation check', 'Final polish/finish touch-up'],
    tips: ['Empty cupboards/drawers before repair', 'Point out all loose or noisy areas, not just the main issue'],
    faqs: [{ q: 'Can you match my furniture\'s exact finish?', a: 'We use the closest matching stock finish — exact colour matching may need a custom order.' }],
    warranty: '30-day warranty on carpentry work'
  },
  salonLuxeWomen: {
    equipment: ['Premium international brand products (L\'Oréal, Rica, O3+)', 'Sanitised, single-use tools', 'Steamer & LED facial devices for select services'],
    process: ['Skin/hair consultation before starting', 'Prep & patch test for sensitive treatments', 'Service performed by a Salon Luxe-certified professional', 'Aftercare tips shared post-service'],
    tips: ['Avoid sun exposure right before a facial', 'Do a patch test 24 hrs before if you have sensitive skin', 'Keep the area clean & ventilated for the professional to set up'],
    faqs: [{ q: 'What makes Salon Luxe different from Prime?', a: 'Luxe uses premium international brand products and more experienced, specially-trained professionals.' }],
    warranty: 'Redo within 48 hours if you\'re not fully satisfied'
  },
  wallPanels: {
    equipment: ['PVC/WPC waterproof panel boards', 'Adhesive & trims', 'Laser level & cutting tools'],
    process: ['Free site visit & wall measurement', 'Design & material selection with our expert', 'Surface prep & panel installation', 'Final finishing with trims & edge sealing'],
    tips: ['Share reference photos of the look you want during consultation', 'Ensure the wall is dry and free of active seepage before installation'],
    faqs: [{ q: 'Are the panels waterproof?', a: 'Yes, our panels are 100% waterproof, termite-proof, and ideal for damp-prone walls.' }],
    warranty: '7-year warranty against damage'
  }
};

function getCategoryDetails(item) {
  if (item.catKey && categoryDetailsData[item.catKey]) return categoryDetailsData[item.catKey];
  return null;
}

function openDetailsModal(encodedItem) {
  var item = dec(encodedItem);
  document.getElementById('detailsImg').src = item.img;
  document.getElementById('detailsTitle').textContent = item.name;
  document.getElementById('detailsRatingRow').innerHTML = '<i class="fas fa-star" style="color:#fbbf24"></i> ' + item.rating + (item.reviews ? ' (' + item.reviews + ')' : '');

  var priceHtml = (item.startingAt ? 'Starts at ' : '') + money(item.price);
  if (item.oldPrice) priceHtml += ' <s>' + money(item.oldPrice) + '</s>';
  if (item.duration) priceHtml += ' &nbsp;•&nbsp; ' + item.duration;
  document.getElementById('detailsPrice').innerHTML = priceHtml;

  var bullets = (item.bullets && item.bullets.length) ? item.bullets : [
    'Performed by trained & verified professionals',
    'Hygienic, branded products used',
    'Transparent pricing, no hidden charges'
  ];
  document.getElementById('detailsBullets').innerHTML = bullets.map(function(b) { return '<li>' + b + '</li>'; }).join('');

  var breakdown = [[5, 78], [4, 14], [3, 4], [2, 2], [1, 2]];
  document.getElementById('detailsBreakdown').innerHTML = breakdown.map(function(b) {
    return '<div class="rating-bar-row"><span>' + b[0] + '★</span><div class="rating-bar-track"><div class="rating-bar-fill" style="width:' + b[1] + '%"></div></div><span class="rating-bar-pct">' + b[1] + '%</span></div>';
  }).join('');

  document.getElementById('detailsReviews').innerHTML = sampleReviews.map(function(r) {
    var stars = '';
    for (var i = 0; i < 5; i++) stars += '<i class="fas fa-star" style="color:' + (i < r.rating ? '#fbbf24' : '#e5e7eb') + ';font-size:11px"></i>';
    return '<div class="review-card"><div class="review-top"><strong>' + r.name + '</strong><span class="review-stars">' + stars + '</span></div><div class="review-date">' + r.date + '</div><p>' + r.text + '</p></div>';
  }).join('');

  var addArea = document.getElementById('detailsAddArea');
  addArea.setAttribute('data-item', enc(item));
  addArea.innerHTML = buildAddAreaHtml(item);

  var extras = getCategoryDetails(item);
  var extrasEl = document.getElementById('detailsExtras');
  if (extras) {
    var html = '';
    if (extras.warranty) {
      html += '<div class="details-warranty-badge"><i class="fas fa-shield-alt"></i> ' + extras.warranty + '</div>';
    }
    if (extras.equipment && extras.equipment.length) {
      html += '<h4 class="details-reviews-title">Equipment &amp; products used</h4><ul class="details-extra-list">' +
        extras.equipment.map(function(e) { return '<li><i class="fas fa-toolbox"></i> ' + e + '</li>'; }).join('') + '</ul>';
    }
    if (extras.process && extras.process.length) {
      html += '<h4 class="details-reviews-title">How the service is done</h4><ol class="details-process-list">' +
        extras.process.map(function(p) { return '<li>' + p + '</li>'; }).join('') + '</ol>';
    }
    if (extras.tips && extras.tips.length) {
      html += '<h4 class="details-reviews-title">Tips &amp; things to keep ready</h4><ul class="details-extra-list tips">' +
        extras.tips.map(function(t) { return '<li><i class="fas fa-lightbulb"></i> ' + t + '</li>'; }).join('') + '</ul>';
    }
    if (extras.faqs && extras.faqs.length) {
      html += '<h4 class="details-reviews-title">Frequently asked questions</h4><div class="details-faq-list">' +
        extras.faqs.map(function(f) { return '<div class="details-faq-item"><div class="details-faq-q"><i class="fas fa-circle-question"></i> ' + f.q + '</div><div class="details-faq-a">' + f.a + '</div></div>'; }).join('') + '</div>';
    }
    extrasEl.innerHTML = html;
    extrasEl.style.display = html ? '' : 'none';
  } else {
    extrasEl.innerHTML = '';
    extrasEl.style.display = 'none';
  }

  document.getElementById('detailsModal').classList.add('open');
}
function closeDetailsModal() {
  document.getElementById('detailsModal').classList.remove('open');
}
function closeDetailsModalBg(event) {
  if (event.target === document.getElementById('detailsModal')) closeDetailsModal();
}

// ===========================
// RICH PRODUCT MODAL (Most Booked Services -> full experience:
// carousel, quantity/package variants, highlights, extra sections,
// promo banner + step-by-step process — matching the real Foam-jet AC page)
// ===========================
var richProductData = {
  foamJetAc: {
    title: 'Foam-jet AC service',
    rating: 4.76, reviews: '2.8M reviews',
    note: 'Add more & save up to 25%',
    carousel: [
      { img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=900&q=85', heading: 'Foam-jet AC service', sub: 'Deep cleans AC coils for better cooling' }
    ],
    variants: [
      { label: '1 AC', price: 599, cat: 'AC Repair' },
      { label: '2 ACs', price: 1098, oldPrice: 1198, perUnit: '₹549/AC', discount: '8% off', cat: 'AC Repair' },
      { label: '3 ACs', price: 1497, oldPrice: 1797, perUnit: '₹499/AC', discount: '17% off', cat: 'AC Repair' },
      { label: '4 ACs', price: 1896, oldPrice: 2396, perUnit: '₹474/AC', discount: '21% off', cat: 'AC Repair' }
    ],
    highlights: ['Applicable for both Split & Window ACs', 'FoamJet cleaning of indoor unit', 'Jet-spray wash of outdoor unit'],
    extraSections: [
      { title: 'Foam-jet cleaning', bullets: ['Deep cleans AC vents & filters', 'Better cooling', 'Less electricity consumption', 'Prolonged life'], img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=700&q=85' }
    ],
    promoBanner: { tag: 'FREE GAS CHECK', heading: 'Transparent AC diagnosis with Co-Pilot', sub: 'No gas refills without a reading', img: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=700&q=85' },
    process: [
      { title: 'Pre-service checks', desc: 'Pre-service inspection includes a free gas level check via the Co-Pilot machine.', img: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=700&q=80' },
      { title: 'Indoor unit cleaning', desc: 'Indoor unit cleaned via foam and jet spray — this includes coils and tray with spill protection.', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=700&q=80' },
      { title: 'Outdoor unit cleaning', desc: 'The outdoor unit is cleaned thoroughly using a jet spray to remove accumulated dirt.', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=700&q=80' }
    ]
  },
  acRepairQuick: {
    title: 'AC repair', rating: 4.73, reviews: '833K reviews',
    note: 'Free diagnosis with every visit',
    carousel: [{ img: 'https://loremflickr.com/900/500/airconditioner,technician', heading: 'AC repair', sub: 'Diagnosis & repair by trained technicians' }],
    single: { price: 299, cat: 'AC Repair' },
    highlights: ['Certified technicians for all major brands', 'Genuine spare parts used', 'Upto 30 days warranty on repairs'],
    extraSections: [],
    promoBanner: { tag: 'UC COVER', heading: 'Upto 30 days warranty on repairs', sub: 'Free re-visit if the issue recurs', img: 'https://loremflickr.com/700/500/airconditioner,technician' },
    process: [
      { title: 'Diagnosis', desc: 'Technician inspects the unit and identifies the exact issue.', img: 'https://loremflickr.com/700/500/airconditioner,repair' },
      { title: 'Repair', desc: 'Faulty parts are repaired or replaced using genuine components.', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=700&q=80' }
    ]
  },
  intenseCleaning2Bath: {
    title: 'Intense cleaning (2 bathrooms)', rating: 4.80, reviews: '6M reviews',
    note: 'Add more bathrooms & save',
    carousel: [{ img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=900&q=85', heading: 'Intense bathroom cleaning', sub: 'Machine-powered deep cleaning' }],
    variants: [
      { label: '2 bathrooms', price: 938, oldPrice: 998, cat: 'Cleaning' },
      { label: '3 bathrooms', price: 1347, oldPrice: 1497, perUnit: '', discount: '10% off', cat: 'Cleaning' },
      { label: '4 bathrooms', price: 1699, oldPrice: 1996, discount: '15% off', cat: 'Cleaning' }
    ],
    highlights: ['Machine scrubbing removes stubborn stains', 'Tile & grout deep cleaning included', 'Eco-friendly cleaning agents used'],
    extraSections: [
      { title: 'What we clean', bullets: ['Toilet bowl, seat & flush tank', 'Tiles, floor & wash basin', 'Mirrors, shelves & fittings'], img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=700&q=85' }
    ],
    promoBanner: { tag: 'HYGIENE FIRST', heading: 'Machine-powered, not just a mop', sub: 'Professional-grade scrubbers for every corner', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=700&q=85' },
    process: [
      { title: 'Pre-clean inspection', desc: 'Our professional checks the bathroom and prepares the right cleaning agents.', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=700&q=80' },
      { title: 'Deep scrub & rinse', desc: 'Machine scrubbing of tiles, floor & fittings followed by a thorough rinse.', img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=700&q=80' }
    ]
  },
  rollOnWaxingQuick: {
    title: 'Roll-on waxing (Full arms, legs & underarms)', rating: 4.86, reviews: '194K reviews',
    note: 'Hygienic, single-use roll-on cartridge',
    carousel: [{ img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=900&q=85', heading: 'Roll-on waxing', sub: 'No risk of burns, gentle on skin' }],
    variants: [
      { label: 'Full arms, legs & underarms', price: 899, cat: 'Salon for Women' },
      { label: '+ Full body', price: 1499, oldPrice: 1799, discount: '17% off', cat: 'Salon for Women' }
    ],
    highlights: ['Hygienic, single-use, no risk of burns', 'Gentle on sensitive skin', 'Smooth, long-lasting results'],
    extraSections: [],
    promoBanner: { tag: 'HYGIENE FIRST', heading: 'A fresh cartridge for every customer', sub: 'Zero cross-contamination, always', img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=700&q=85' },
    process: [
      { title: 'Skin prep', desc: 'Skin is cleaned and prepped before the waxing begins.', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=700&q=80' },
      { title: 'Roll-on waxing', desc: 'A fresh, single-use cartridge is used for smooth and hygienic hair removal.', img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=700&q=80' }
    ]
  },
  haircutMenQuick: {
    title: 'Haircut for men', rating: 4.86, reviews: '477K reviews',
    note: 'Free style consultation included',
    carousel: [{ img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&q=85', heading: 'Haircut for men', sub: 'Precision cut, styled to your look' }],
    variants: [
      { label: 'Haircut', price: 259, cat: 'Salon for Men' },
      { label: 'Haircut + Beard styling', price: 399, oldPrice: 458, discount: '13% off', cat: 'Salon for Men' }
    ],
    highlights: ['Precision cut by trained barbers', 'Free style consultation before we begin', 'Hygienic, sanitised tools'],
    extraSections: [],
    promoBanner: { tag: 'GROOMING', heading: 'Look sharp, without leaving home', sub: 'Trusted by 470K+ happy customers', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=700&q=85' },
    process: [
      { title: 'Consultation', desc: 'A quick chat to understand the style you want.', img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=700&q=80' },
      { title: 'Haircut & finish', desc: 'Precision cutting followed by a clean finish and styling.', img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=700&q=80' }
    ]
  },
  nativeM2Pro: {
    title: 'Native M2 Pro Water Purifier', rating: 4.71, reviews: '3.2K reviews',
    note: '2-year warranty included',
    carousel: [
      { img: 'https://loremflickr.com/900/700/waterpurifier,kitchen', heading: 'Native M2 Pro', sub: 'In-built battery. Touch dispensing. Smart app.' },
      { img: 'https://loremflickr.com/900/700/rofilter,water', heading: 'RO + UV + UF purification', sub: '7-stage advanced filtration' }
    ],
    variants: [
      { label: 'Purifier only', price: 13999, cat: 'Native Smart Products' },
      { label: 'Purifier + Annual Maintenance', price: 15998, oldPrice: 17998, discount: '11% off', cat: 'Native Smart Products' }
    ],
    highlights: ['In-built battery — works even during power cuts', 'Touch dispensing with smart app connectivity', 'RO + UV + UF, 7-stage purification', 'Real-time TDS & filter-life monitoring on app'],
    extraSections: [
      { title: 'Warranty & support', bullets: ['2-year comprehensive warranty', 'Free installation by certified technicians', '24×7 in-app expert support', 'Doorstep filter replacement reminders'] }
    ],
    promoBanner: { tag: 'NEW LAUNCH', heading: 'India’s smartest water purifier', sub: 'Watch how Native M2 Pro is installed & used', img: 'https://loremflickr.com/700/400/waterpurifier,smart' },
    process: [
      { title: 'Free site visit', desc: 'A technician visits to check water source & wall space before installation.', img: 'https://loremflickr.com/700/500/plumber,kitchen' },
      { title: 'Professional installation', desc: 'Mounted, plumbed & connected to the Native app — usually under 60 minutes.', img: 'https://loremflickr.com/700/500/waterpurifier,installation' },
      { title: 'App walkthrough', desc: 'We show you how to track TDS, filter life & order replacements from the app.', img: 'https://loremflickr.com/700/500/smartphone,app' }
    ]
  },
  nativeM1Pro: {
    title: 'Native M1 Pro Water Purifier', rating: 4.68, reviews: '2.1K reviews',
    note: '1-year warranty included',
    carousel: [{ img: 'https://loremflickr.com/900/700/waterpurifier,compact', heading: 'Native M1 Pro', sub: 'Everything essential. Smart app.' }],
    variants: [
      { label: 'Purifier only', price: 9999, cat: 'Native Smart Products' },
      { label: 'Purifier + Annual Maintenance', price: 11499, oldPrice: 12999, discount: '12% off', cat: 'Native Smart Products' }
    ],
    highlights: ['RO + UV purification for safe drinking water', 'Smart app for filter-life alerts', 'Compact design, fits any kitchen'],
    extraSections: [
      { title: 'Warranty & support', bullets: ['1-year comprehensive warranty', 'Free installation included', 'Doorstep service & support'] }
    ],
    promoBanner: { tag: 'BESTSELLER', heading: 'Everything essential, nothing extra', sub: 'See how easy it is to set up', img: 'https://loremflickr.com/700/400/waterpurifier,kitchen' },
    process: [
      { title: 'Free site visit', desc: 'Technician checks your water source and kitchen layout.', img: 'https://loremflickr.com/700/500/plumber,kitchen' },
      { title: 'Installation', desc: 'Quick, clean installation with minimal disruption.', img: 'https://loremflickr.com/700/500/waterpurifier,installation' }
    ]
  },
  nativeM1: {
    title: 'Native M1 Water Purifier', rating: 4.65, reviews: '1.4K reviews',
    note: '1-year warranty included',
    carousel: [{ img: 'https://loremflickr.com/900/700/waterpurifier,white', heading: 'Native M1', sub: 'All the essentials you need' }],
    single: { price: 7999, oldPrice: 8999, cat: 'Native Smart Products' },
    highlights: ['RO purification for clean, safe water', 'Reliable performance, low maintenance', 'Sleek, space-saving design'],
    extraSections: [
      { title: 'Warranty & support', bullets: ['1-year comprehensive warranty', 'Free installation included'] }
    ],
    promoBanner: { tag: 'VALUE PICK', heading: 'All the essentials you need', sub: 'Simple, reliable water purification', img: 'https://loremflickr.com/700/400/waterpurifier,simple' },
    process: [
      { title: 'Free site visit', desc: 'A quick check of your kitchen & water source.', img: 'https://loremflickr.com/700/500/plumber,kitchen' },
      { title: 'Installation', desc: 'Installed and ready to use within the hour.', img: 'https://loremflickr.com/700/500/waterpurifier,installation' }
    ]
  },
  nativeM0: {
    title: 'Native M0 Water Purifier', rating: 4.62, reviews: '980 reviews',
    note: 'Most value-added RO',
    carousel: [{ img: 'https://loremflickr.com/900/700/waterpurifier,budget', heading: 'Native M0', sub: 'Most value added RO' }],
    single: { price: 5999, cat: 'Native Smart Products' },
    highlights: ['RO purification at an affordable price', 'Compact & easy to maintain', 'Great for small households'],
    extraSections: [
      { title: 'Warranty & support', bullets: ['1-year warranty on parts', 'Free installation included'] }
    ],
    promoBanner: { tag: 'BUDGET PICK', heading: 'Most value-added RO purifier', sub: 'Clean water, without the premium price', img: 'https://loremflickr.com/700/400/waterpurifier,affordable' },
    process: [
      { title: 'Installation', desc: 'Simple wall-mounted installation, done same day.', img: 'https://loremflickr.com/700/500/waterpurifier,installation' }
    ]
  },
  nativeLockPro: {
    title: 'Native Lock Pro', rating: 4.69, reviews: '1.8K reviews',
    note: '1-year warranty included',
    carousel: [
      { img: 'https://loremflickr.com/900/700/smartlock,door', heading: 'Native Lock Pro', sub: 'Camera, doorbell, all-in-one.' },
      { img: 'https://loremflickr.com/900/700/doorlock,fingerprint', heading: "Unlock with fingerprint, PIN or app", sub: "Know who's at the door, from anywhere" }
    ],
    variants: [
      { label: 'Lock Pro only', price: 18999, cat: 'Native Smart Products' },
      { label: 'Lock Pro + Installation kit', price: 20499, oldPrice: 21999, discount: '7% off', cat: 'Native Smart Products' }
    ],
    highlights: ['Built-in camera & video doorbell', 'Unlock via fingerprint, PIN, card or app', 'Real-time visitor alerts on your phone', 'Battery backup for power-cut safety'],
    extraSections: [
      { title: 'Warranty & support', bullets: ['1-year comprehensive warranty', 'Free professional installation', '24×7 app & phone support'] }
    ],
    promoBanner: { tag: 'SMART HOME', heading: 'Your door, smarter', sub: 'Watch the Lock Pro installation demo', img: 'https://loremflickr.com/700/400/smartlock,door' },
    process: [
      { title: 'Door assessment', desc: 'Technician checks your door type & existing lock for compatibility.', img: 'https://loremflickr.com/700/500/frontdoor,wood' },
      { title: 'Installation & pairing', desc: 'Lock is fitted and paired to the Native app on your phone.', img: 'https://loremflickr.com/700/500/doorlock,installation' },
      { title: 'Walkthrough', desc: 'We show you how to add fingerprints, PINs & family members.', img: 'https://loremflickr.com/700/500/smartphone,app' }
    ]
  },
  ricaAloeWaxingLuxe: {
    title: 'Rica Aloe waxing (Luxe)', rating: 4.87, reviews: '61K reviews',
    note: 'Price drop — save ₹250 today',
    carousel: [{ img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=900&q=85', heading: 'Upgrade to Luxe', sub: 'Rica Aloe wax for silky smooth skin' }],
    variants: [
      { label: 'Full arms, legs & underarms', price: 1249, oldPrice: 1499, discount: '17% off', cat: 'Salon for Women' },
      { label: '+ Full body', price: 1899, oldPrice: 2299, discount: '17% off', cat: 'Salon for Women' }
    ],
    highlights: ['Premium Rica Aloe wax, gentle on skin', 'Suitable for sensitive skin types', 'Smooth results that last longer'],
    extraSections: [
      { title: 'Why upgrade to Luxe', bullets: ['Higher-grade imported wax', 'More experienced Luxe-trained professionals', 'Premium after-care products included'], img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=700&q=85' }
    ],
    promoBanner: { tag: 'PRICE DROP', heading: 'Luxe, for ₹249 more', sub: 'Limited-time price drop on Rica Aloe waxing', img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=700&q=85' },
    process: [
      { title: 'Skin prep', desc: 'Skin is cleaned and prepped with a soothing pre-wax lotion.', img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=700&q=80' },
      { title: 'Rica Aloe waxing', desc: 'Premium aloe-infused wax applied for a smooth, gentle hair removal.', img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=700&q=80' }
    ]
  }
};

function openProductModal(key) {
  var data = richProductData[key];
  if (!data) return;

  document.getElementById('productTitle').textContent = data.title;
  document.getElementById('productRatingRow').innerHTML = '<i class="fas fa-star"></i> ' + data.rating + ' (' + data.reviews + ')';

  var noteEl = document.getElementById('productNote');
  if (data.note) { noteEl.style.display = 'flex'; noteEl.innerHTML = '<i class="fas fa-tag"></i> ' + data.note; }
  else { noteEl.style.display = 'none'; }

  // Carousel
  var carouselHtml = '';
  if (data.carousel && data.carousel.length) {
    carouselHtml += '<div class="page-carousel product-carousel" id="productCarousel" data-slide="0"><div class="carousel-track">';
    data.carousel.forEach(function(slide, i) {
      carouselHtml += '<div class="carousel-slide" style="display:' + (i === 0 ? 'block' : 'none') + ';background:#f5f5f5">' +
        '<img src="' + slide.img + '" alt="" />' +
        '<div class="carousel-text dark-text"><h3>' + slide.heading + '</h3>' + (slide.sub ? '<p>' + slide.sub + '</p>' : '') + '</div>' +
      '</div>';
    });
    carouselHtml += '</div>';
    if (data.carousel.length > 1) {
      carouselHtml += '<div class="carousel-arrow left" onclick="moveProductCarousel(-1)"><i class="fas fa-chevron-left"></i></div>';
      carouselHtml += '<div class="carousel-arrow right" onclick="moveProductCarousel(1)"><i class="fas fa-chevron-right"></i></div>';
    }
    carouselHtml += '<div class="carousel-dots">' + data.carousel.map(function(_, i) { return '<div class="carousel-dot' + (i === 0 ? ' active' : '') + '"></div>'; }).join('') + '</div>';
    carouselHtml += '</div>';
  }
  document.getElementById('productCarouselWrap').innerHTML = carouselHtml;

  // Variants (quantity/package pricing) OR a single price row
  var variantsWrap = document.getElementById('productVariantsWrap');
  var singleWrap = document.getElementById('productSingleWrap');
  if (data.variants && data.variants.length) {
    singleWrap.innerHTML = '';
    var vHtml = '<div class="h-scroll-wrap"><div class="h-scroll variant-row" id="variantRow">';
    data.variants.forEach(function(v) {
      var item = { name: data.title + ' (' + v.label + ')', price: v.price, oldPrice: v.oldPrice || null, img: (data.carousel && data.carousel[0] ? data.carousel[0].img : ''), cat: v.cat || data.title, rating: data.rating, reviews: data.reviews };
      vHtml += '<div class="variant-card">' +
        '<div class="variant-label">' + v.label + '</div>' +
        '<div class="variant-price">' + money(v.price) + '</div>' +
        (v.oldPrice ? '<div class="variant-oldprice">' + money(v.oldPrice) + '</div>' : '') +
        (v.perUnit ? '<div class="variant-perunit">(' + v.perUnit + ')</div>' : '') +
        (v.discount ? '<div class="variant-discount">' + v.discount + '</div>' : '') +
        '<div class="add-area" data-item="' + enc(item) + '" style="margin-top:8px"></div>' +
      '</div>';
    });
    vHtml += '</div>' +
      '<div class="scroll-arrow scroll-arrow-left" style="display:none" onclick="scrollRow(\'variantRow\',-180)"><i class="fas fa-arrow-left" style="font-size:12px;color:#374151"></i></div>' +
      '<div class="scroll-arrow" onclick="scrollRow(\'variantRow\',180)"><i class="fas fa-arrow-right" style="font-size:12px;color:#374151"></i></div>' +
    '</div>';
    variantsWrap.innerHTML = vHtml;
  } else {
    variantsWrap.innerHTML = '';
    var s = data.single || { price: 0 };
    var singleItem = { name: data.title, price: s.price, oldPrice: s.oldPrice || null, img: (data.carousel && data.carousel[0] ? data.carousel[0].img : ''), cat: s.cat || data.title, rating: data.rating, reviews: data.reviews };
    singleWrap.innerHTML = '<div class="product-single-price-row">' +
      '<div class="product-single-price">' + money(s.price) + (s.oldPrice ? ' <s>' + money(s.oldPrice) + '</s>' : '') + '</div>' +
      '<div class="add-area" data-item="' + enc(singleItem) + '"></div>' +
    '</div>';
  }

  // Highlights
  var hlWrap = document.getElementById('productHighlightsWrap');
  if (data.highlights && data.highlights.length) {
    hlWrap.innerHTML = '<div class="highlights-title"><i class="fas fa-star"></i> HIGHLIGHTS</div>' +
      '<ul class="check-bullets">' + data.highlights.map(function(h) { return '<li><i class="fas fa-check"></i>' + h + '</li>'; }).join('') + '</ul>';
  } else {
    hlWrap.innerHTML = '';
  }

  // Extra sections
  var extraWrap = document.getElementById('productExtraSections');
  if (data.extraSections && data.extraSections.length) {
    extraWrap.innerHTML = data.extraSections.map(function(sec) {
      return '<div class="extra-section">' +
        '<h4>' + sec.title + '</h4>' +
        '<ul class="check-bullets">' + sec.bullets.map(function(b) { return '<li><i class="fas fa-check"></i>' + b + '</li>'; }).join('') + '</ul>' +
        (sec.img ? '<img src="' + sec.img + '" alt="" class="extra-section-img" />' : '') +
      '</div>';
    }).join('');
  } else {
    extraWrap.innerHTML = '';
  }

  // Promo banner
  var promoWrap = document.getElementById('productPromoBanner');
  if (data.promoBanner) {
    var pb = data.promoBanner;
    promoWrap.innerHTML = '<div class="product-promo-banner">' +
      '<div class="product-promo-text">' +
        '<div class="product-promo-tag">' + pb.tag + '</div>' +
        '<h3>' + pb.heading + '</h3><p>' + pb.sub + '</p>' +
        '<button class="promo-how-btn" onclick="scrollToProductSection(\'productProcess\')">How it works <i class="fas fa-chevron-right"></i></button>' +
      '</div>' +
      '<img src="' + pb.img + '" alt="" class="product-promo-img" />' +
    '</div>';
  } else {
    promoWrap.innerHTML = '';
  }

  // Our process
  var processWrap = document.getElementById('productProcess');
  if (data.process && data.process.length) {
    processWrap.innerHTML = '<h4 class="process-title">Our process</h4>' +
      '<div class="process-steps">' + data.process.map(function(step, i) {
        return '<div class="process-step">' +
          '<div class="process-step-head"><div class="process-step-num">' + (i + 1) + '</div><div><h5>' + step.title + '</h5><p>' + step.desc + '</p></div></div>' +
          '<img src="' + step.img + '" alt="" class="process-step-img" />' +
        '</div>';
      }).join('') + '</div>';
  } else {
    processWrap.innerHTML = '';
  }

  syncAddButtons();
  document.getElementById('productModal').classList.add('open');
  document.querySelector('#productModal .product-modal-scroll').scrollTop = 0;
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}
function closeProductModalBg(event) {
  if (event.target === document.getElementById('productModal')) closeProductModal();
}
function moveProductCarousel(dir) {
  var el = document.getElementById('productCarousel');
  if (!el) return;
  var slides = el.querySelectorAll('.carousel-slide');
  var dots = el.querySelectorAll('.carousel-dot');
  var cur = parseInt(el.getAttribute('data-slide'), 10) || 0;
  var next = (cur + dir + slides.length) % slides.length;
  slides[cur].style.display = 'none';
  slides[next].style.display = 'block';
  if (dots[cur]) dots[cur].classList.remove('active');
  if (dots[next]) dots[next].classList.add('active');
  el.setAttribute('data-slide', next);
}
function scrollToProductSection(id) {
  var el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===========================
// "SEE ALL" LIGHTWEIGHT LISTING PAGES (homepage horizontal-scroll sections)
// ===========================
var categoryData = {
  cleaning: {
    title: 'Cleaning Essentials',
    items: [
      { name: 'Intense cleaning (2 bathrooms)', price: 938, oldPrice: 998, img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=450&q=80', rating: 4.80 },
      { name: 'Intense cleaning (3 bathrooms)', price: 1347, oldPrice: 1497, img: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=450&q=80', rating: 4.80 },
      { name: 'Fridge cleaning', price: 399, img: 'https://loremflickr.com/450/450/refrigerator,kitchen', rating: 4.83 },
      { name: 'Bed bugs control', price: 1899, img: 'https://loremflickr.com/450/450/bedbug,mattress', rating: 4.77 },
      { name: 'Chimney cleaning', price: 399, img: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=450&q=80', rating: 4.84 },
      { name: 'Sofa cleaning (5 seater)', price: 799, img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=450&q=80', rating: 4.78 },
      { name: 'Full home deep cleaning', price: 3499, img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=450&q=80', rating: 4.81 }
    ]
  },
  appliance: {
    title: 'Appliance repair & service',
    items: [
      { name: 'TV check-up', price: 249, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=450&q=80', rating: 4.77 },
      { name: 'Automatic front load machine check-up', price: 199, img: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=450&q=80', rating: 4.75 },
      { name: 'Microwave check-up', price: 199, img: 'https://images.unsplash.com/photo-1585659722983-3a681d8e3548?w=450&q=80', rating: 4.82 },
      { name: 'Water Purifier / RO Service & Repair', price: 299, img: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=450&q=80', rating: 4.80 },
      { name: 'Gas refill & check-up', price: 2800, img: 'https://loremflickr.com/450/450/airconditioner,repair', rating: 4.78 },
      { name: 'AC uninstallation', price: 649, img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=450&q=80', rating: 4.80 },
      { name: 'Refrigerator repair', price: 499, img: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=450&q=80', rating: 4.71 }
    ]
  },
  homerepair: {
    title: 'Home repair & installation',
    items: [
      { name: 'Fan repair', price: 149, img: 'https://images.unsplash.com/photo-1587145717034-9c46b16c9eaa?w=450&q=80', rating: 4.80 },
      { name: 'Decor installation', price: 79, img: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=450&q=80', rating: 4.84 },
      { name: 'Electrician consultation', price: 49, img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=450&q=80', rating: 4.74 },
      { name: 'Door lock repair & installation', price: 129, img: 'https://images.unsplash.com/photo-1622372738946-62e02505feb3?w=450&q=80', rating: 4.79 },
      { name: 'Switchboard repair & replacement', price: 99, img: 'https://images.unsplash.com/photo-1558002038-1055907dfa19?w=450&q=80', rating: 4.83 },
      { name: 'Cupboard repair', price: 89, img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=450&q=80', rating: 4.79 },
      { name: 'Tubelight repair & installation', price: 99, img: 'https://images.unsplash.com/photo-1558002038-1055907dfa19?w=450&q=80', rating: 4.85 },
      { name: 'Flush tank repair', price: 149, img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=450&q=80', rating: 4.76 },
      { name: 'Pull out drawer repair/replacement', price: 129, img: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=450&q=80', rating: 4.76 },
      { name: 'Regular ceiling fan installation', price: 99, img: 'https://images.unsplash.com/photo-1587145717034-9c46b16c9eaa?w=450&q=80', rating: 4.85 }
    ]
  },
  massagemen: {
    title: 'Massage for Men',
    items: [
      { name: 'Foot massage', price: 569, img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=450&q=80', rating: 4.86 },
      { name: 'Quick comfort therapy', price: 999, oldPrice: 1199, img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=450&q=80', rating: 4.81 },
      { name: 'Head, neck & shoulder massage', price: 669, img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=450&q=80', rating: 4.86 },
      { name: 'Leg relief massage', price: 919, img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=450&q=80', rating: 4.85 },
      { name: 'Full body massage', price: 1299, img: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=450&q=80', rating: 4.88 },
      { name: 'Deep tissue massage', price: 1499, img: 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=450&q=80', rating: 4.83 }
    ]
  },
  salonwomen: {
    title: 'Salon for Women',
    items: [
      { name: 'Roll-on waxing (Full arms, legs & underarms)', price: 749, img: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=450&q=80', rating: 4.87 },
      { name: 'Spatula waxing (Full arms, legs & underarms)', price: 599, img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=450&q=80', rating: 4.86 },
      { name: 'Mani-pedi delight', price: 1168, img: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=450&q=80', rating: 4.82 },
      { name: 'Aroma Magic instant glow facial', price: 799, img: 'https://images.unsplash.com/photo-1570554886111-e80fcca6a029?w=450&q=80', rating: 4.85 },
      { name: 'Hair spa', price: 899, img: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=450&q=80', rating: 4.80 }
    ]
  },
  salonmenluxe: {
    title: 'Salon for Men — Luxe',
    items: [
      { name: 'Luxe Haircut for men', price: 449, img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=450&q=80', rating: 4.88 },
      { name: 'Luxe Beard styling', price: 349, img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=450&q=80', rating: 4.85 },
      { name: 'Luxe Head massage', price: 499, img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=450&q=80', rating: 4.87 }
    ]
  },
  salonmenprime: {
    title: 'Salon for Men — Prime',
    items: [
      { name: 'Prime Haircut for men', price: 259, img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=450&q=80', rating: 4.86 },
      { name: 'Prime Beard styling', price: 199, img: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=450&q=80', rating: 4.80 },
      { name: 'Prime Head massage', price: 129, img: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=450&q=80', rating: 4.81 }
    ]
  }
};

function openSeeAll(catKey) {
  var data = categoryData[catKey];
  if (!data) return;
  document.getElementById('catFullTitle').textContent = data.title;
  var html = data.items.map(function(item) {
    var priceHtml = item.oldPrice
      ? money(item.price) + ' <span class="old-price">' + money(item.oldPrice) + '</span>'
      : money(item.price);
    return '<div class="svc-card fade-up" onclick="addToCartFromPage(\'' + enc({ name: item.name, price: item.price, oldPrice: item.oldPrice || null, img: item.img, cat: data.title }) + '\')">' +
      '<div class="svc-card-img"><img src="' + item.img + '" alt="" onload="this.classList.add(\'loaded\')" /></div>' +
      '<div class="svc-card-name">' + item.name + '</div>' +
      '<div class="svc-card-meta"><span class="star"><i class="fas fa-star"></i></span> ' + item.rating + '</div>' +
      '<div class="svc-card-price">' + priceHtml + '</div>' +
    '</div>';
  }).join('');
  document.getElementById('catFullRow').innerHTML = html;
  document.getElementById('catFullPage').classList.add('open');
  document.body.style.overflow = 'hidden';
  window.scrollTo(0, 0);
}
function closeCatPage() {
  document.getElementById('catFullPage').classList.remove('open');
  document.body.style.overflow = '';
}

// ===========================
// INSTAHELP PAGE
// ===========================
var instaItems = {
  'insta-1': { name: 'Insta help', price: 79, oldPrice: 245, rating: 4.71, reviews: '8.4M reviews', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80', cat: 'InstaHelp', options: 6, bullets: ['Fastest response — a professional in under 14 mins', 'Ideal for urgent, small fixes'] },
  'insta-2': { name: 'Super saver pack', price: 79, oldPrice: 245, duration: '60 mins', rating: 4.71, reviews: '8.4M reviews', img: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300&q=80', cat: 'InstaHelp', bullets: ['Bundle of quick-fix services at one flat price'] },
  'insta-3': { name: 'Insta help (Later)', price: 79, oldPrice: 245, duration: '60 mins', rating: 4.71, reviews: '8.4M reviews', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80', cat: 'InstaHelp', bullets: ['Schedule for a later, more convenient time slot'] }
};

function openInstaPage() {
  document.getElementById('instaPage').classList.add('open');
  document.body.style.overflow = 'hidden';
  Object.keys(instaItems).forEach(function(key) {
    var item = instaItems[key];
    var addEl = document.getElementById('addarea-' + key);
    var vdEl = document.getElementById('viewdetails-' + key);
    if (addEl) { addEl.setAttribute('data-item', enc(item)); }
    if (vdEl) { vdEl.onclick = function() { openDetailsModal(enc(item)); }; }
  });
  syncAddButtons();
  renderFloatingCartWidgets();
}
function closeInstaPage() {
  document.getElementById('instaPage').classList.remove('open');
  document.body.style.overflow = '';
}

// ===========================
// SEARCH DROPDOWN (rich, functional — built from real pageData)
// ===========================
var topLevelSearchEntries = [
  { name: "Women's Salon & Spa", img: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=100&q=80', type: 'subcat', target: "Women's Salon & Spa" },
  { name: "Men's Salon & Massage", img: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=100&q=80', type: 'subcat', target: "Men's Salon & Massage" },
  { name: 'Cleaning & Pest Control', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=100&q=80', type: 'subcat', target: 'Cleaning & Pest Control' },
  { name: 'Electrician, Plumber & Carpenter', img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=100&q=80', type: 'subcat', target: 'Home repair & installation' },
  { name: 'AC & Appliance Repair', img: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=100&q=80', type: 'page', target: 'acRepair' },
  { name: 'Painting & Water-proofing', img: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=100&q=80', type: 'page', target: 'paintingWaterproofing' },
  { name: 'Wall Panels by Revamp', img: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=100&q=80', type: 'page', target: 'wallPanels' },
  { name: 'InstaHelp', img: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=100&q=80', type: 'insta' },
  { name: 'Native Water Purifier', img: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=100&q=80', type: 'product', target: 'nativeM1Pro' },
  { name: 'Native Smart Locks', img: 'https://images.unsplash.com/photo-1622372738946-62e02505feb3?w=100&q=80', type: 'product', target: 'nativeLockPro' }
];

// Build a flat, searchable index of every real service item across the site
function buildSearchIndex() {
  var idx = topLevelSearchEntries.slice();
  Object.keys(pageData).forEach(function(pageKey) {
    var data = pageData[pageKey];
    (data.sections || []).forEach(function(sec) {
      (sec.items || []).forEach(function(item) {
        idx.push({
          name: item.name, img: item.img, rating: item.rating, reviews: item.reviews,
          price: item.price, oldPrice: item.oldPrice, startingAt: item.startingAt,
          type: 'item', target: pageKey, sectionId: sec.id
        });
      });
    });
  });
  return idx;
}
var searchIndexCache = null;
function getSearchIndex() {
  if (!searchIndexCache) searchIndexCache = buildSearchIndex();
  return searchIndexCache;
}

function showSearchDrop() { filterSearch(document.getElementById('searchInput').value); document.getElementById('searchDropdown').classList.add('show'); }

var trendingSearches = ['Salon', 'Professional bathroom cleaning', 'Professional kitchen cleaning', 'Massage for men', 'Washing machine repair', 'Full home cleaning', 'AC repair', 'Electrician'];

function renderSearchResultRow(entry) {
  var priceHtml = '';
  if (entry.price) {
    priceHtml = (entry.startingAt ? 'Starts at ' : '') + money(entry.price) + (entry.oldPrice ? ' <s>' + money(entry.oldPrice) + '</s>' : '');
  }
  var metaHtml = entry.rating ? '<div class="search-result-meta"><i class="fas fa-star"></i> ' + entry.rating + (entry.reviews ? ' (' + entry.reviews + ')' : '') + '</div>' : '';
  return '<div class="search-result-row" onclick="goToSearchResult(\'' + enc(entry) + '\')">' +
    '<img src="' + entry.img + '" alt="" />' +
    '<div class="search-result-info"><div class="search-result-name">' + entry.name + '</div>' + metaHtml + '</div>' +
    (priceHtml ? '<div class="search-result-price">' + priceHtml + '</div>' : '') +
  '</div>';
}

function filterSearch(query) {
  var list = document.getElementById('trendingList');
  var titleEl = document.getElementById('searchDropTitle');
  if (!query) {
    if (titleEl) titleEl.textContent = 'Trending searches';
    list.innerHTML = trendingSearches
      .map(function(s) { return '<div class="trend-tag" onclick="selectSearch(\'' + s.replace(/'/g, "\\'") + '\')"><i class="fas fa-chart-line"></i>' + s + '</div>'; }).join('');
    document.getElementById('searchDropdown').classList.add('show');
    return;
  }
  if (titleEl) titleEl.textContent = 'Search results';
  var q = query.toLowerCase();
  var matches = getSearchIndex().filter(function(e) { return e.name.toLowerCase().includes(q); });
  if (matches.length === 0) {
    list.innerHTML = '<div class="trend-tag" style="color:#9ca3af;cursor:default"><i class="fas fa-search"></i>No results found</div>';
  } else {
    list.innerHTML = matches.slice(0, 8).map(renderSearchResultRow).join('');
  }
  document.getElementById('searchDropdown').classList.add('show');
}

function goToSearchResult(encodedEntry) {
  var entry;
  try { entry = JSON.parse(decodeURIComponent(encodedEntry)); } catch (e) { return; }
  document.getElementById('searchInput').value = entry.name;
  document.getElementById('searchDropdown').classList.remove('show');
  if (entry.type === 'subcat') { openSubcat(entry.target); }
  else if (entry.type === 'insta') { openInstaPage(); }
  else if (entry.type === 'product') { openProductModal(entry.target); }
  else if (entry.type === 'page' || entry.type === 'item') {
    openCategoryPage(entry.target);
    if (entry.sectionId) setTimeout(function() { scrollToCatSection(entry.sectionId); }, 350);
  }
}

function selectSearch(name) {
  filterSearch(name);
  document.getElementById('searchInput').value = name;
}

// Live-filter for the secondary (page-level) search boxes — filters visible
// service rows within whichever page the input lives on.
function filterPageServices(inputEl) {
  var query = inputEl.value.toLowerCase();
  var scope = inputEl.closest('.insta-page') || inputEl.closest('.full-page') || document;
  scope.querySelectorAll('.svc-row').forEach(function(row) {
    var title = row.querySelector('.svc-title');
    var text = title ? title.textContent.toLowerCase() : '';
    row.style.display = (!query || text.includes(query)) ? '' : 'none';
  });
}


document.addEventListener('click', function(e) {
  var searchBox = document.querySelector('.search-box');
  if (searchBox && !searchBox.contains(e.target)) {
    document.getElementById('searchDropdown').classList.remove('show');
  }
});

// ===========================
// HORIZONTAL SCROLL + ARROW VISIBILITY
// ===========================
function scrollRow(rowId, pixels) {
  var row = document.getElementById(rowId);
  if (row) row.scrollBy({ left: pixels, behavior: 'smooth' });
}

function setupScrollArrowVisibility() {
  document.querySelectorAll('.h-scroll').forEach(function(row) {
    var wrap = row.closest('.h-scroll-wrap');
    if (!wrap) return;
    var leftArrow = wrap.querySelector('.scroll-arrow-left');
    var rightArrow = wrap.querySelector('.scroll-arrow:not(.scroll-arrow-left)');
    function update() {
      if (leftArrow) leftArrow.style.display = row.scrollLeft > 10 ? 'flex' : 'none';
      if (rightArrow) {
        var atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 10;
        rightArrow.style.display = atEnd ? 'none' : 'flex';
      }
    }
    row.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    setTimeout(update, 300);
  });
}

// ===========================
// MOBILE MENU
// ===========================
function openMobileMenu() {
  $('#mobileDrawer').css('left', '0');
  $('#mobileOverlay').show();
  $('body').css('overflow', 'hidden');
}
function closeMobileMenu() {
  $('#mobileDrawer').css('left', '-280px');
  $('#mobileOverlay').hide();
  $('body').css('overflow', '');
}

// ===========================
// NAVBAR SHADOW + SCROLL TOP BTN
// ===========================
$(window).scroll(function() {
  if ($(this).scrollTop() > 20) $('.navbar').css('box-shadow', '0 2px 12px rgba(0,0,0,0.08)');
  else $('.navbar').css('box-shadow', '');
  if ($(this).scrollTop() > 350) $('#topBtn').fadeIn(150);
  else $('#topBtn').fadeOut(150);
});

// ===========================
// FADE-UP ON SCROLL
// ===========================
try {
  $('.fade-up').addClass('fade-up-init');
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        $(entry.target).removeClass('fade-up-init').addClass('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-up').forEach(function(el) { observer.observe(el); });
} catch (err) {
  console.log('Fade animation skipped:', err);
}

// ===========================
// INIT
// ===========================
$(document).ready(function() {
  updateCartCount();
  setupScrollArrowVisibility();
});
