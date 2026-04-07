/**
 * Zariya Theme - Shopify JavaScript
 */

(function() {
  'use strict';

  // ===== CART FUNCTIONALITY =====
  const Cart = {
    async add(variantId, quantity = 1) {
      try {
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity })
        });
        const data = await response.json();
        await this.refresh();
        this.openDrawer();
        return data;
      } catch (error) {
        console.error('Error adding to cart:', error);
      }
    },

    async update(line, quantity) {
      try {
        const response = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line, quantity })
        });
        const data = await response.json();
        await this.refresh();
        return data;
      } catch (error) {
        console.error('Error updating cart:', error);
      }
    },

    async refresh() {
      try {
        const response = await fetch('/cart.js');
        const cart = await response.json();
        this.updateCount(cart.item_count);
        this.updateDrawer(cart);
        return cart;
      } catch (error) {
        console.error('Error refreshing cart:', error);
      }
    },

    updateCount(count) {
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = count;
      });
    },

    updateDrawer(cart) {
      const itemsContainer = document.getElementById('cart-drawer-items');
      const subtotal = document.getElementById('cart-subtotal');
      
      if (!itemsContainer) return;

      if (cart.item_count === 0) {
        itemsContainer.innerHTML = `
          <div class="cart-empty">
            <p>Your cart is empty</p>
            <a href="/collections/all" class="button button-solid">Shop Now</a>
          </div>
        `;
        const footer = document.querySelector('.cart-drawer-footer');
        if (footer) footer.style.display = 'none';
      } else {
        let html = '';
        cart.items.forEach((item, index) => {
          html += `
            <div class="cart-item" data-line="${index + 1}">
              <div class="cart-item-image">
                ${item.image ? `<img src="${item.image.replace(/(\.[^.]+)$/, '_120x$1')}" alt="${item.title}">` : ''}
              </div>
              <div class="cart-item-details">
                <h4>${item.product_title}</h4>
                ${item.variant_title && item.variant_title !== 'Default Title' ? `<p class="cart-item-variant">${item.variant_title}</p>` : ''}
                <p class="cart-item-price">${this.formatMoney(item.final_line_price)}</p>
                <div class="cart-item-quantity">
                  <button type="button" data-action="decrease-qty" data-line="${index + 1}">-</button>
                  <span>${item.quantity}</span>
                  <button type="button" data-action="increase-qty" data-line="${index + 1}">+</button>
                </div>
              </div>
              <button type="button" class="cart-item-remove" data-action="remove-item" data-line="${index + 1}">&times;</button>
            </div>
          `;
        });
        itemsContainer.innerHTML = html;
        
        if (subtotal) {
          subtotal.textContent = this.formatMoney(cart.total_price);
        }
        
        const footer = document.querySelector('.cart-drawer-footer');
        if (footer) footer.style.display = 'block';
      }
    },

    formatMoney(cents) {
      return '₹' + (cents / 100).toFixed(2).replace(/\.00$/, '');
    },

    openDrawer() {
      const drawer = document.getElementById('cart-drawer');
      if (drawer) {
        drawer.classList.add('is-open');
        document.body.classList.add('modal-open');
      }
    },

    closeDrawer() {
      const drawer = document.getElementById('cart-drawer');
      if (drawer) {
        drawer.classList.remove('is-open');
        document.body.classList.remove('modal-open');
      }
    }
  };

  // ===== MOBILE MENU =====
  const MobileMenu = {
    open() {
      const drawer = document.getElementById('mobile-menu-drawer');
      if (drawer) {
        drawer.classList.add('is-open');
        document.body.classList.add('menu-open');
      }
    },
    close() {
      const drawer = document.getElementById('mobile-menu-drawer');
      if (drawer) {
        drawer.classList.remove('is-open');
        document.body.classList.remove('menu-open');
      }
    }
  };

  // ===== SEARCH =====
  const Search = {
    open() {
      const drawer = document.getElementById('search-drawer');
      if (drawer) {
        drawer.classList.add('is-open');
        document.body.classList.add('modal-open');
        const input = drawer.querySelector('input');
        if (input) input.focus();
      }
    },
    close() {
      const drawer = document.getElementById('search-drawer');
      if (drawer) {
        drawer.classList.remove('is-open');
        document.body.classList.remove('modal-open');
      }
    }
  };

  // ===== SLIDER FUNCTIONALITY =====
  function initSliders() {
    const arrows = document.querySelectorAll('.slider-arrow');
    if (!arrows.length) return;

    function updateArrowVisibility(slider) {
      const leftArrow = document.querySelector(`[data-slider="${slider.id}"][data-dir="left"]`);
      const rightArrow = document.querySelector(`[data-slider="${slider.id}"][data-dir="right"]`);
      if (!leftArrow || !rightArrow) return;

      const scrollLeft = slider.scrollLeft;
      const maxScroll = slider.scrollWidth - slider.clientWidth;

      leftArrow.classList.toggle('is-hidden', scrollLeft <= 10);
      rightArrow.classList.toggle('is-hidden', scrollLeft >= maxScroll - 10);
    }

    arrows.forEach(arrow => {
      const sliderId = arrow.dataset.slider;
      const direction = arrow.dataset.dir;
      const slider = document.getElementById(sliderId);
      if (!slider) return;

      setTimeout(() => updateArrowVisibility(slider), 500);
      slider.addEventListener('scroll', () => updateArrowVisibility(slider), { passive: true });

      arrow.addEventListener('click', () => {
        const cardWidth = slider.querySelector('.product-card')?.offsetWidth || 280;
        const scrollAmount = cardWidth + 20;
        const newPosition = direction === 'left' 
          ? slider.scrollLeft - scrollAmount 
          : slider.scrollLeft + scrollAmount;
        
        slider.scrollTo({ left: newPosition, behavior: 'smooth' });
      });
    });

    window.addEventListener('resize', () => {
      document.querySelectorAll('.product-grid').forEach(slider => {
        if (slider.id) updateArrowVisibility(slider);
      });
    }, { passive: true });
  }

  // ===== REVEAL ANIMATIONS =====
  function initRevealAnimations() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach(el => observer.observe(el));
  }

  // ===== EVENT HANDLERS =====
  function initEventHandlers() {
    document.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      switch (action) {
        case 'cart':
          e.preventDefault();
          Cart.openDrawer();
          break;

        case 'close-cart':
          Cart.closeDrawer();
          break;

        case 'menu':
          e.preventDefault();
          MobileMenu.open();
          break;

        case 'close-menu':
          MobileMenu.close();
          break;

        case 'search':
          e.preventDefault();
          Search.open();
          break;

        case 'close-search':
          Search.close();
          break;

        case 'quick-add':
          e.preventDefault();
          const productId = e.target.closest('[data-product-id]')?.dataset.productId;
          if (productId) {
            await Cart.add(productId);
          }
          break;

        case 'increase-qty':
        case 'decrease-qty':
          const line = parseInt(e.target.dataset.line);
          const currentQty = parseInt(e.target.closest('.cart-item-quantity, .cart-line-quantity')?.querySelector('span, input')?.textContent || e.target.closest('.cart-item-quantity, .cart-line-quantity')?.querySelector('input')?.value || 1);
          const newQty = action === 'increase-qty' ? currentQty + 1 : currentQty - 1;
          await Cart.update(line, Math.max(0, newQty));
          break;

        case 'remove-item':
          const removeLine = parseInt(e.target.dataset.line);
          await Cart.update(removeLine, 0);
          break;

        case 'quantity-minus':
          const qtyInput = document.getElementById('quantity-input') || document.getElementById('quantity-value');
          if (qtyInput) {
            const val = parseInt(qtyInput.value || qtyInput.textContent);
            if (val > 1) {
              if (qtyInput.tagName === 'INPUT') qtyInput.value = val - 1;
              else qtyInput.textContent = val - 1;
            }
          }
          break;

        case 'quantity-plus':
          const qtyInputPlus = document.getElementById('quantity-input') || document.getElementById('quantity-value');
          if (qtyInputPlus) {
            const val = parseInt(qtyInputPlus.value || qtyInputPlus.textContent);
            if (qtyInputPlus.tagName === 'INPUT') qtyInputPlus.value = val + 1;
            else qtyInputPlus.textContent = val + 1;
          }
          break;

        case 'buy-now':
          e.preventDefault();
          const form = document.querySelector('form[action*="/cart/add"]');
          if (form) {
            form.action = '/cart/add';
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'return_to';
            input.value = '/checkout';
            form.appendChild(input);
            form.submit();
          }
          break;

        case 'toggle-dropdown':
          e.preventDefault();
          const dropdown = e.target.closest('.mobile-nav-dropdown');
          if (dropdown) {
            dropdown.classList.toggle('is-open');
          }
          break;
      }
    });

    // Close drawers on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        Cart.closeDrawer();
        MobileMenu.close();
        Search.close();
      }
    });
  }

  // ===== INITIALIZE =====
  document.addEventListener('DOMContentLoaded', () => {
    initEventHandlers();
    initSliders();
    initRevealAnimations();
    Cart.refresh();
  });

})();
