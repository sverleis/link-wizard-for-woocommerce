(function($) {
    'use strict';

    /**
     * Add-to-Cart Wizard Module
     * Handles all functionality specific to the Add-to-Cart Wizard
     */
    const AddToCartWizard = {
        
        // Initialize the add-to-cart wizard
        init: function() {
            this.bindEvents();
            
            // Initialize on DOM ready
            $(document).ready(() => {
                // Initialize redirect options based on settings
                this.initializeRedirectOptions();
                
                setTimeout(() => {
                    if (this.isActive()) {
                        this.updateURLPreview();
                    }
                }, 100);
            });
        },

        // Bind add-to-cart specific events
        bindEvents: function() {
            // Handle tab activation for add-to-cart wizard
            $(document).on('click', '.nav-tab[href="#tab-add-to-cart"]', () => {
                setTimeout(() => {
                    this.updateURLPreview();
                }, 300);
            });

            // Handle hashchange for add-to-cart tab
            $(window).on('hashchange', () => {
                if (window.location.hash === '#tab-add-to-cart') {
                    setTimeout(() => {
                        this.updateURLPreview();
                    }, 300);
                }
            });

            // Handle product removal in add-to-cart wizard
            $(document).on('click', '#lwwc-cart-link-generator .remove-item-btn', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const $productItem = $(e.target).closest('.lwwc-selected-item');
                $productItem.remove();
                
                // Show placeholder if no products left
                const productsList = this.getProductsList();
                if (productsList.children('.lwwc-selected-item').length === 0) {
                    productsList.append('<p class="placeholder">' + window.lwwc_admin_i18n.noProductsSelected + '</p>');
                }
                
                // Trigger URL preview update
                this.updateURLPreview();
            });

            // Handle quantity changes in add-to-cart wizard
            $(document).on('input change', '#lwwc-cart-link-generator .quantity-input', () => {
                // Trigger URL preview update with slight delay
                setTimeout(() => {
                    this.updateURLPreview();
                }, 100);
            });

            // Handle redirect option changes
            $(document).on('change', 'input[name="lwwc-redirect"]', () => {
                setTimeout(() => {
                    this.updateURLPreview();
                }, 100);
            });
        },

        // Get the add-to-cart wizard products list element
        getProductsList: function() {
            const productsList = $('#lwwc-selected-products-cart .products-list');
            return productsList;
        },

        // Check if add-to-cart wizard is currently active/visible
        isActive: function() {
            // Check if the add-to-cart tab is active or if the cart link generator is visible
            return $('#lwwc-cart-link-generator').is(':visible') || 
                   $('.nav-tab[href="#tab-add-to-cart"]').hasClass('nav-tab-active');
        },

        // Add product specifically to add-to-cart wizard
        addProduct: function(item, quantity = 1) {
            const productsList = this.getProductsList();
            
            // Check if a product already exists (add-to-cart wizard allows only one product)
            const existingProducts = productsList.children('.lwwc-selected-item');
            if (existingProducts.length > 0) {
                const existingProduct = existingProducts.first();
                const existingProductId = existingProduct.data('id');
                const existingProductName = existingProduct.data('name') || 'existing product';
                
                // Format the new product display name
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
                
                // If the product is identical (ID and display name), do nothing
                if (existingProductId == item.id && existingProductName == displayName) {
                    return false;
                }
                
                const confirmMessage = window.lwwc_admin_i18n.productReplaceConfirm.replace('%1$s', existingProductName).replace('%2$s', displayName);
                
                // Use the Modal Manager for confirmation if available
                if (window.WCLWModalManager && typeof window.WCLWModalManager.showConfirmModal === 'function') {
                    window.WCLWModalManager.showConfirmModal(confirmMessage, () => {
                        // Clear existing products and add new one
                        productsList.empty();
                        AddToCartWizard.addProductToList(item, quantity, displayName);
                    });
                } else if (typeof window.showConfirmModal === 'function') {
                    window.showConfirmModal(confirmMessage, () => {
                        // Clear existing products and add new one
                        productsList.empty();
                        AddToCartWizard.addProductToList(item, quantity, displayName);
                    });
                } else {
                    // Fallback to browser confirm (remove HTML tags for plain text)
                    const plainMessage = confirmMessage.replace(/<[^>]*>/g, '');
                    if (confirm(plainMessage)) {
                        productsList.empty();
                        AddToCartWizard.addProductToList(item, quantity, displayName);
                    }
                }
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

            this.addProductToList(item, quantity, displayName);
            return true;
        },

        // Helper method to add product to the list
        addProductToList: function(item, quantity, displayName) {
            const productsList = this.getProductsList();

            // Remove placeholder if it exists
            productsList.find('.placeholder').remove();

            // Add the product
            productsList.append(`
                <div class="lwwc-selected-item" data-id="${item.id}" data-name="${displayName}" tabindex="-1">
                    <div class="item-name">
                        <span class="product-id">[ID:${item.id}]</span> ${displayName}
                    </div>
                    <div class="item-quantity">
                        <input type="number" class="quantity-input" value="${quantity}" min="1"/>
                    </div>
                    <div class="item-remove">
                        <button class="button is-destructive remove-item-btn lwwc-button" aria-label="${lwwc_admin_i18n.remove || 'Remove'}" role="button">
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
                    const $searchInput = $('#lwwc-product-search');
                    if ($searchInput.length) {
                        e.preventDefault();
                        $searchInput.focus();
                    }
                }
            });

            // Trigger URL preview update
            this.updateURLPreview();
        },

        // Generate add-to-cart link URL and update preview
        generateLink: function() {
            const products = this.getProductsList().children('.lwwc-selected-item');
            
            const urlParamsPreview = $('#lwwc-url-params-preview-cart');
            const urlInsert = $('.lwwc-url-insert-cart');
            const ui = {
                generatedLink: $('#lwwc-generated-link'),
                outputArea: $('.lwwc-generator-output.cart'),
                redirectPageUrl: $('#lwwc-redirect-page-url')
            };
            
            
            // Always show output area but disable buttons if no products
            ui.outputArea.show();
            
            if (!products.length) { 
                ui.generatedLink.val('');
                urlParamsPreview.html('<span class="placeholder-text">' + window.lwwc_admin_i18n.noProductsSelected + '</span>');
                urlInsert.text('');
                this.updateButtonStates(false);
                return; 
            }

            let finalUrl = '';
            let paramsHtml = '';
            
            // Only support Add to Cart Links (cart)
            const item = products.first();
            const quantity = parseInt(item.find('.quantity-input').val()) || 1;
            const redirect = $('input[name="lwwc-redirect"]:checked').val() || 'none';
            const productId = item.data('id');
            let baseUrl = lwwc_params.home_url;
            
            if (redirect === 'checkout') {
                baseUrl = lwwc_params.checkout_url;
            } else if (redirect === 'cart') {
                baseUrl = lwwc_params.cart_url;
            } else if (redirect === 'custom' && ui.redirectPageUrl.val()) {
                const customUrl = ui.redirectPageUrl.val();
                baseUrl = customUrl.split('?')[0];
            }
            
            let params = [];
            
            if (redirect === 'checkout') {
                baseUrl = lwwc_params.checkout_url;
                finalUrl = lwwc_params.checkout_url + `?add-to-cart=${item.data('id')}`;
                params.push(`<span class="param-key param-key-add-to-cart">add-to-cart</span>=<span class="param-value param-value-add-to-cart">${item.data('id')}</span>`);
                if (quantity > 1) {
                    finalUrl += `&quantity=${quantity}`;
                    params.push(`<span class="param-key param-key-quantity">quantity</span>=<span class="param-value param-value-quantity">${quantity}</span>`);
                }
            } else if (redirect === 'cart') {
                baseUrl = lwwc_params.cart_url;
                finalUrl = lwwc_params.cart_url + `?add-to-cart=${item.data('id')}`;
                params.push(`<span class="param-key param-key-add-to-cart">add-to-cart</span>=<span class="param-value param-value-add-to-cart">${item.data('id')}</span>`);
                if (quantity > 1) {
                    finalUrl += `&quantity=${quantity}`;
                    params.push(`<span class="param-key param-key-quantity">quantity</span>=<span class="param-value param-value-quantity">${quantity}</span>`);
                }
            } else if (redirect === 'custom' && ui.redirectPageUrl.val()) {
                const customUrl = ui.redirectPageUrl.val();
                baseUrl = customUrl.split('?')[0];
                finalUrl = baseUrl + `?add-to-cart=${item.data('id')}`;
                params.push(`<span class="param-key param-key-add-to-cart">add-to-cart</span>=<span class="param-value param-value-add-to-cart">${item.data('id')}</span>`);
                if (quantity > 1) {
                    finalUrl += `&quantity=${quantity}`;
                    params.push(`<span class="param-key param-key-quantity">quantity</span>=<span class="param-value param-value-quantity">${quantity}</span>`);
                }
            } else {
                // Default: shop page with add-to-cart
                finalUrl = lwwc_params.home_url + `?add-to-cart=${item.data('id')}`;
                params.push(`<span class="param-key param-key-add-to-cart">add-to-cart</span>=<span class="param-value param-value-add-to-cart">${item.data('id')}</span>`);
                if (quantity > 1) {
                    finalUrl += `&quantity=${quantity}`;
                    params.push(`<span class="param-key param-key-quantity">quantity</span>=<span class="param-value">${quantity}</span>`);
                }
            }
            
            paramsHtml = params.length ? '?' + params.join('<span class="param-separator">&</span>') : '';
            
            // Update preview - use the same approach as checkout wizard
            const urlObj = new URL(finalUrl);
            const urlBase = urlObj.origin + '/';
            const pathSegment = baseUrl.replace(lwwc_params.home_url, '').replace(/^\//, '').replace(/\/$/, '');
            
            $('.url-base-cart').text(urlBase);
            urlInsert.html(pathSegment ? `<span>${pathSegment}/</span>` : '');
            urlParamsPreview.html(paramsHtml);
            ui.generatedLink.val(finalUrl);
            this.updateButtonStates(true);
        },

        // Update the URL preview display
        updateURLPreview: function() {
            // Only trigger if we're in the add-to-cart wizard
            if (this.isActive()) {
                // Generate the link and update the preview
                this.generateLink();
                
                // Also trigger the global event to keep things synchronized
                $(document).trigger('wclw:updateURLPreview');
            }
        },

        // Update button states (delegate to admin.js if available)
        updateButtonStates: function(enabled) {
            // Set the generated link field to reflect the enabled state
            if (!enabled) {
                $('#lwwc-generated-link').val('');
            }
            
            // Update action buttons state
            if (window.WCLWUIManager && typeof window.WCLWUIManager.updateActionButtons === 'function') {
                window.WCLWUIManager.updateActionButtons();
            } else if (typeof window.updateActionButtons === 'function') {
                window.updateActionButtons();
            } else {
                // Fallback to direct button state update
                $('.lwwc-save-button, .lwwc-copy-button, .lwwc-open-button').prop('disabled', !enabled);
            }
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

        // Initialize redirect options based on settings
        initializeRedirectOptions: function() {
            const defaultRedirect = window.lwwc_params?.settings?.default_redirect_behavior || 'none';
            $('input[name="lwwc-redirect"]').prop('checked', false);
            $(`input[name="lwwc-redirect"][value="${defaultRedirect}"]`).prop('checked', true).trigger('change');
        },

        // Clear all add-to-cart wizard data
        reset: function() {
            // Clear products
            const productsList = this.getProductsList();
            if (productsList.length) {
                productsList.empty().append('<p class="placeholder">' + window.lwwc_admin_i18n.noProductsSelected + '</p>');
            }

            // Reset redirect options to default
            this.initializeRedirectOptions();

            // Clear URL preview
            $('#lwwc-url-params-preview-cart').html('<span class="placeholder-text">' + window.lwwc_admin_i18n.noProductsSelected + '</span>');
            $('.lwwc-url-insert-cart').text('');
            $('#lwwc-generated-link').val('');
            this.updateButtonStates(false);
        }
    };

    // Make AddToCartWizard available globally
    window.WCLWAddToCartWizard = AddToCartWizard;

    // Alias for backward compatibility
    window.WCLWAddToCart = AddToCartWizard;

    // Auto-initialize when DOM is ready
    $(document).ready(function() {
        AddToCartWizard.init();
    });

})(jQuery);
