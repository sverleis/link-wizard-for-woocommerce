(function($) {
    'use strict';

    /**
     * Checkout Link Wizard Module
     * Handles all functionality specific to the Checkout Link Wizard
     */
    const CheckoutWizard = {
        
        // Initialize the checkout wizard
        init: function() {
            this.bindEvents();
            this.insertCouponsPlaceholder();
        },

        // Bind checkout-specific events
        bindEvents: function() {
            // Insert coupons placeholder on tab switch to Checkout Link Wizard
            $(document).on('click', '.nav-tab[href="#tab-checkout"], .nav-tab[href="#tab-checkout-links"]', () => {
                setTimeout(() => {
                    this.insertCouponsPlaceholder();
                }, 300);
            });

            // Insert coupons placeholder on hashchange for Checkout Link Wizard
            $(window).on('hashchange', () => {
                if (window.location.hash === '#tab-checkout' || window.location.hash === '#tab-checkout-links') {
                    setTimeout(() => {
                        this.insertCouponsPlaceholder();
                    }, 300);
                }
            });

            // Insert on DOM ready
            $(document).ready(() => {
                setTimeout(() => {
                    this.insertCouponsPlaceholder();
                }, 100);
            });

            // Listen for coupon selection
            $(document).on('wclw:couponSelected', (e, coupon) => {
                this.addCoupon(coupon);
            });

            // Handle coupon removal
            $(document).on('click', '.coupon-remove .lwwc-button.is-destructive', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const $couponItem = $(e.target).closest('.lwwc-selected-coupon');
                const couponCode = $couponItem.data('code');
                this.removeCoupon(couponCode);
            });

            // Handle product removal in checkout wizard
            $(document).on('click', '#lwwc-checkout-link-generator .remove-item-btn', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const $productItem = $(e.target).closest('.lwwc-selected-item');
                $productItem.remove();
                
                // Show placeholder if no products left
                const productsList = this.getProductsList();
                if (productsList.children('.lwwc-selected-item').length === 0) {
                    productsList.append('<p class="placeholder">No products selected yet.</p>');
                }
                
                // Trigger URL preview update
                this.updateURLPreview();
            });

            // Handle quantity changes in checkout wizard
            $(document).on('input change', '#lwwc-checkout-link-generator .quantity-input', () => {
                // Trigger URL preview update with slight delay
                setTimeout(() => {
                    this.updateURLPreview();
                }, 100);
            });
        },

        // Get the checkout wizard products list element
        getProductsList: function() {
            const productsList = $('#lwwc-selected-products-cart-checkout .products-list');
            return productsList;
        },

        // Get the checkout wizard coupons list element
        getCouponsList: function() {
            return $('#lwwc-selected-coupons-list-checkout');
        },

        // Check if checkout wizard is currently active/visible
        isActive: function() {
            return $('#lwwc-checkout-link-generator').is(':visible');
        },

        // Add product specifically to checkout wizard
        addProduct: function(item, quantity = 1) {
            const productsList = this.getProductsList();
            
            
            // Check if product already exists (checkout wizard allows multiple products)
            if (productsList.find(`[data-id="${item.id}"]`).length) {
                return false;
            }

            // Format the product display name
            let displayName = item.name;
            
            // First check for our new display_attributes property
            if (item.display_attributes) {
                displayName = `${item.parent_name || item.name.split(' - ')[0]} ( ${item.display_attributes} )`;
            } else if (item.formatted_attributes && Object.keys(item.formatted_attributes).length > 0) {
                const attributesText = Object.entries(item.formatted_attributes)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' | ');
                displayName = `${item.parent_name || item.name.split(' - ')[0]} ( ${attributesText} )`;
            } else if (item.parent_name && item.name.includes(' - ')) {
                const attributePart = item.name.replace(item.parent_name + ' - ', '');
                displayName = `${item.parent_name} ( ${attributePart} )`;
            }

            // Remove placeholder if it exists
            productsList.find('.placeholder').remove();

            // Store user selections for variation URL generation
            let userAttributesData = '';
            if (item.user_selected_attributes) {
                userAttributesData = ` data-user-attributes='${JSON.stringify(item.user_selected_attributes)}'`;
            }

            // Add the product
            productsList.append(`
                <div class="lwwc-selected-item" data-id="${item.id}" data-name="${displayName}"${userAttributesData} tabindex="-1">
                    <div class="item-name">
                        <span class="product-id">[ID:${item.id}]</span> ${displayName}
                    </div>
                    <div class="item-quantity">
                        <input type="number" class="quantity-input" value="${quantity}" min="1"/>
                    </div>
                    <div class="item-remove">
                        <button class="button is-destructive remove-item-btn lwwc-button" aria-label="${lwwc_admin_i18n.remove || 'Remove'}">
                            <span class="dashicons dashicons-trash"></span>
                            <span class="button-text">${lwwc_admin_i18n.remove || 'Remove'}</span>
                        </button>
                    </div>
                </div>
            `);

            // Focus the newly added product for accessibility
            const newItem = productsList.children('.lwwc-selected-item').last();
            newItem.focus();
            // Handle Shift+Tab to move focus back to product search input
            newItem.off('keydown.wclw').on('keydown.wclw', function(e) {
                if (e.key === 'Tab' && e.shiftKey) {
                    const $searchInput = $('#lwwc-product-search-checkout');
                    if ($searchInput.length) {
                        e.preventDefault();
                        $searchInput.focus();
                    }
                }
            });

            // Trigger URL preview update
            this.updateURLPreview();

            return true;
        },

        // Add coupon to checkout wizard (single coupon only)
        addCoupon: function(coupon) {
            const couponsList = this.getCouponsList();
            
            // Check if coupon already exists
            if (couponsList.find(`[data-code="${coupon.code}"]`).length) {
                return false;
            }

            // Check if there's already a coupon selected (single coupon mode)
            const existingCoupons = couponsList.find('.lwwc-selected-coupon');
            
            if (existingCoupons.length > 0) {
                // Get the existing coupon code for the confirmation message
                const existingCode = existingCoupons.first().data('code');
                
                // Show confirmation modal to replace existing coupon
                const message = `You already have coupon "${existingCode}" selected. Replace it with "${coupon.code}"?`;
                
                // Use the modal manager to show confirmation
                if (window.WCLWModalManager && typeof window.WCLWModalManager.showConfirmModal === 'function') {
                    window.WCLWModalManager.showConfirmModal(message, () => {
                        // User confirmed - replace the existing coupon
                        this.replaceCoupon(coupon);
                    }, 'is-destructive');
                } else {
                    // Fallback if modal manager not available
                    if (confirm(message)) {
                        this.replaceCoupon(coupon);
                    }
                }
                return false;
            }

            // No existing coupon - add this one
            this.insertCoupon(coupon);
            return true;
        },

        // Replace existing coupon with new one
        replaceCoupon: function(newCoupon) {
            const couponsList = this.getCouponsList();
            
            // Remove all existing coupons
            couponsList.find('.lwwc-selected-coupon').remove();
            
            // Add the new coupon
            this.insertCoupon(newCoupon);
        },

        // Insert coupon into the list (helper method)
        insertCoupon: function(coupon) {
            const couponsList = this.getCouponsList();
            
            // Remove placeholder if it exists
            couponsList.find('.placeholder').remove();

            // Add the coupon
            couponsList.append(`
                <div class="lwwc-selected-coupon" data-code="${coupon.code}" data-id="${coupon.id}" tabindex="-1">
                    <div class="coupon-name">
                        <span class="dashicons dashicons-tickets-alt"></span>
                        <span class="coupon-code">${coupon.code}</span>
                    </div>
                    <div class="coupon-remove">
                        <button class="button lwwc-button is-destructive" aria-label="${lwwc_admin_i18n.remove || 'Remove'}">
                            <span class="dashicons dashicons-trash"></span>
                            <span class="button-text">${lwwc_admin_i18n.remove || 'Remove'}</span>
                        </button>
                    </div>
                </div>
            `);

            // Focus the newly added coupon for accessibility
            const newCoupon = couponsList.children('.lwwc-selected-coupon').last();
            newCoupon.focus();
            // Handle Shift+Tab to move focus back to coupon search input
            newCoupon.off('keydown.wclw').on('keydown.wclw', function(e) {
                if (e.key === 'Tab' && e.shiftKey) {
                    const $searchInput = $('#lwwc-coupon-search-checkout');
                    if ($searchInput.length) {
                        e.preventDefault();
                        $searchInput.focus();
                    }
                }
            });

            // Trigger URL preview update
            this.updateURLPreview();
        },

        // Remove coupon from checkout wizard
        removeCoupon: function(couponCode) {
            const couponsList = this.getCouponsList();
            couponsList.find(`[data-code="${couponCode}"]`).remove();
            
            // Show placeholder if no coupons left
            if (couponsList.children('.lwwc-selected-coupon').length === 0) {
                couponsList.append('<p class="placeholder">No coupon selected yet.</p>');
            }

            // Trigger URL preview update
            this.updateURLPreview();
        },

        // Generate checkout link URL
        generateLink: function() {
            const productsList = this.getProductsList();
            const products = productsList.children('.lwwc-selected-item');
            
            
            if (!products.length) {
                return null;
            }

            // Build products parameter - use parent ID for variable products
            const productParams = [];
            const variationData = [];
            
            products.each(function() {
                const $item = $(this);
                const productId = $item.data('id');
                const quantity = parseInt($item.find('.quantity-input').val()) || 1;
                const userAttributes = $item.data('user-attributes');
                
                
                // For now, use the variation ID directly
                // TODO: We might need to use parent ID + variation attributes for complex cases
                productParams.push(`${productId}:${quantity}`);
                
                // Store variation data for potential future use
                if (userAttributes && Object.keys(userAttributes).length > 0) {
                    variationData.push({
                        id: productId,
                        attributes: userAttributes
                    });
                }
            });

            // Build URL with products
            let url = '/checkout-link/?products=' + productParams.join(',');
            
            // Add coupon parameter if coupons are selected
            const coupons = this.getSelectedCoupons();
            if (coupons.length > 0) {
                const couponCodes = coupons.map(coupon => coupon.code);
                url += '&coupon=' + couponCodes.join(',');
            }

            const finalUrl = lwwc_params.home_url.replace(/\/$/, '') + url;
            return finalUrl;
        },

        // Insert the coupons placeholder section
        insertCouponsPlaceholder: function() {
            const $checkout = $('#lwwc-checkout-link-generator');
            if ($checkout.length && !$checkout.find('#lwwc-coupons-checkout').length) {
                
                // Try to insert after the first step (Select Products)
                const $firstStep = $checkout.find('.lwwc-step').first();
                
                // Get quick select mode from settings
                const quickSelectMode = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_mode) 
                    ? window.lwwc_params.settings.quick_select_mode 
                    : 'auto';
                
                // Generate coupon quick select content based on mode
                let couponQuickSelectContent = '';
                if (quickSelectMode === 'disabled') {
                    const settingsUrl = window.lwwc_params && window.lwwc_params.admin_url ? 
                        `${window.lwwc_params.admin_url}edit.php?post_type=product&page=woo-link-wizard#tab-settings` :
                        '#tab-settings';
                    couponQuickSelectContent = `
                        <div class="lwwc-quick-select-disabled-message" style="padding: 18px 0; text-align: center; color: #888; font-size: 1.05em;">
                            ${lwwc_admin_i18n.quickSelectDisabled.replace('%s', settingsUrl)}
                        </div>`;
                } else {
                    // Get the default coupon filter from settings
                    const defaultCouponFilter = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_coupon_default_filter) 
                        ? window.lwwc_params.settings.quick_select_coupon_default_filter 
                        : 'all';
                    
                    // Check if manual mode is enabled
                    const isManual = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_mode === 'manual');
                    
                    couponQuickSelectContent = `
                        <div class="lwwc-coupon-quick-select-header">
                            <h3 style="display: flex; align-items: center; gap: 10px; margin: 0;">
                                Coupon Quick Select
                                ${isManual ? `
                                    <button type="button" class="button button-primary lwwc-load-coupons-btn" style="margin-left: 10px; display: flex; align-items: center; gap: 6px;">
                                        <span class="dashicons dashicons-update"></span>
                                        <span>Load coupons</span>
                                    </button>
                                ` : ''}
                            </h3>
                            <div class="lwwc-filter-group">
                                <select id="lwwc-coupon-filter-checkout">
                                    <option value="all" ${defaultCouponFilter === 'all' ? 'selected' : ''}>Most recent</option>
                                    <option value="percent" ${defaultCouponFilter === 'percent' ? 'selected' : ''}>Percentage discount</option>
                                    <option value="fixed_cart" ${defaultCouponFilter === 'fixed_cart' ? 'selected' : ''}>Fixed cart discount</option>
                                    <option value="fixed_product" ${defaultCouponFilter === 'fixed_product' ? 'selected' : ''}>Fixed product discount</option>
                                </select>
                            </div>
                        </div>
                        <div id="lwwc-coupon-quick-select-results-checkout" class="lwwc-quick-select-results"></div>`;
                }
                
                if ($firstStep.length) {
                    $firstStep.after(`
                        <div id="lwwc-coupons-checkout" class="lwwc-step">
                            <h2>2. Add Coupon <span style="font-weight: normal; font-size: 0.9em; color: #666;">(Optional - Single Coupon Only)</span></h2>
                            <div class="lwwc-coupons-checkout-content">
                                <div class="lwwc-coupon-search-wrapper">
                                    <h3>Search for coupon:</h3>
                                    <div class="lwwc-search-input-wrapper">
                                        <input type="text" id="lwwc-coupon-search-checkout" class="lwwc-search-input" placeholder="Type to search coupons..." />
                                    </div>
                                    <div id="lwwc-coupon-search-results-checkout" class="lwwc-search-results" style="display: none;"></div>
                                </div>
                                <div class="lwwc-coupon-quick-select-card">
                                    ${couponQuickSelectContent}
                                </div>
                                <div class="lwwc-selected-coupons-checkout">
                                    <h3>Selected Coupon:</h3>
                                    <div id="lwwc-selected-coupons-list-checkout">
                                        <p class="placeholder">No coupon selected yet.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `);
                } else {
                    // Fallback: insert at the end of the checkout generator
                    $checkout.append(`
                        <div id="lwwc-coupons-checkout" class="lwwc-step">
                            <h2>2. Add Coupon <span style="font-weight: normal; font-size: 0.9em; color: #666;">(Optional - Single Coupon Only)</span></h2>
                            <div class="lwwc-coupons-checkout-content">
                                <div class="lwwc-coupon-search-wrapper">
                                    <h3>Search for coupon:</h3>
                                    <div class="lwwc-search-input-wrapper">
                                        <input type="text" id="lwwc-coupon-search-checkout" class="lwwc-search-input" placeholder="Type to search coupons..." />
                                    </div>
                                    <div id="lwwc-coupon-search-results-checkout" class="lwwc-search-results" style="display: none;"></div>
                                </div>
                                <div class="lwwc-coupon-quick-select-card">
                                    ${couponQuickSelectContent}
                                </div>
                                <div class="lwwc-selected-coupons-checkout">
                                    <h3>Selected Coupon:</h3>
                                    <div id="lwwc-selected-coupons-list-checkout">
                                        <p class="placeholder">No coupon selected yet.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `);
                }
            } else if (!$checkout.length) {
            } else {
            }
        },

        // Clear checkout wizard state
        reset: function() {
            const productsList = this.getProductsList();
            if (productsList.length) {
                productsList.empty().append('<p class="placeholder">' + (lwwc_admin_i18n.noProductsSelected || 'No products selected yet.') + '</p>');
            }
            
            // Clear coupons
            const couponsList = $('#lwwc-selected-coupons-list-checkout');
            if (couponsList.length) {
                couponsList.html('<p class="placeholder">No coupons selected yet.</p>');
            }
            
            // Trigger URL preview reset
            $(document).trigger('wclw:resetURLPreview');
        },

        // Get selected products data
        getSelectedProducts: function() {
            const products = [];
            const productsList = this.getProductsList();
            
            productsList.children('.lwwc-selected-item').each(function() {
                const $item = $(this);
                products.push({
                    id: $item.data('id'),
                    name: $item.data('name'),
                    quantity: parseInt($item.find('.quantity-input').val()) || 1
                });
            });
            
            return products;
        },

        // Get all selected coupons
        getSelectedCoupons: function() {
            const coupons = [];
            this.getCouponsList().find('.lwwc-selected-coupon').each(function() {
                coupons.push({
                    code: $(this).data('code'),
                    id: $(this).data('id')
                });
            });
            return coupons;
        },

        // Update the URL preview display
        updateURLPreview: function() {
            // Only trigger if we're in the checkout wizard
            if (this.isActive()) {
                // Trigger a custom event that admin.js can listen to
                $(document).trigger('wclw:updateURLPreview');
            }
        }
    };

    // Make CheckoutWizard available globally
    window.WCLWCheckoutWizard = CheckoutWizard;

    // Auto-initialize when DOM is ready
    $(document).ready(function() {
        CheckoutWizard.init();
    });

})(jQuery);

/*
 * PRESERVED CODE: Multiple Coupon Support
 * 
 * This code is preserved for future use when multiple coupon support is needed.
 * The current implementation only allows single coupon selection with replacement confirmation.
 * 
 * To restore multiple coupon support, replace the addCoupon method with this version:
 * 
 * addCoupon: function(coupon) {
 *     const couponsList = this.getCouponsList();
 *     
 *     // Check if coupon already exists
 *     if (couponsList.find(`[data-code="${coupon.code}"]`).length) {
 *         return false;
 *     }
 *
 *     // Remove placeholder if it exists
 *     couponsList.find('.placeholder').remove();
 *
 *     // Add the coupon
 *     couponsList.append(`
 *         <div class="lwwc-selected-coupon" data-code="${coupon.code}" data-id="${coupon.id}">
 *             <div class="coupon-name">
 *                 <span class="dashicons dashicons-tickets-alt"></span>
 *                 <span class="coupon-code">${coupon.code}</span>
 *             </div>
 *             <div class="coupon-remove">
 *                 <button class="button is-destructive remove-coupon-btn">
 *                     <span class="dashicons dashicons-trash"></span>
 *                     <span class="button-text">${lwwc_admin_i18n.remove || 'Remove'}</span>
 *                 </button>
 *             </div>
 *         </div>
 *     `);
 *
 *     // Trigger URL preview update
 *     this.updateURLPreview();
 *
 *     return true;
 * },
 * 
 * Also remove the replaceCoupon and insertCoupon methods as they are only needed for single coupon mode.
 * 
 * Note: You'll also need to update all UI text from singular "coupon" back to plural "coupons"
 * and change placeholder text back to "No coupons selected yet."
 */
