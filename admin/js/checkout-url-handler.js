(function($) {
    'use strict';

    // Checkout URL Handler - handles all URL generation and preview logic for checkout wizard
    window.WCLWCheckoutURLHandler = {
        
        // Generate and update checkout URL preview
        generateAndUpdatePreview: function() {
            if (!window.WCLWCheckoutWizard || !window.WCLWCheckoutWizard.isActive()) {
                return false;
            }

            const checkoutUrl = window.WCLWCheckoutWizard.generateLink();
            
            const urlParamsPreview = $('#lwwc-url-params-preview-checkout');
            const urlInsert = $('.lwwc-url-insert-checkout');
            const generatedLinkInput = $('#lwwc-generated-link');
            
            // Show output area
            $('.lwwc-generator-output.checkout').show();
            
            if (!checkoutUrl) {
                generatedLinkInput.val('');
                urlParamsPreview.html('<span class="placeholder-text">' + 
                    (window.lwwc_admin_i18n?.searchProducts || 'Select products to generate link...') + '</span>');
                urlInsert.text('');
                this.updateActionButtons();
                return false;
            }

            // Parse checkout URL for display
            const urlObj = new URL(checkoutUrl);
            const urlBase = urlObj.origin + '/';
            
            // Always show /checkout-link in bold
            const pathSegment = 'checkout-link';
            
            // Parse params for pretty display
            const params = urlObj.searchParams;
            let paramHtml = '';
            
            // Products param (show each product:qty as a colored span)
            const products = params.get('products');
            if (products) {
                const productArr = products.split(',');
                paramHtml += `<span class="param-key">products</span>=`;
                paramHtml += productArr.map((prod, idx) => {
                    let [id, qty] = prod.split(':');
                    qty = qty || '1';
                    return `<span class="param-value param-product"><span class="param-product-id">${id}</span>:<span class="param-product-qty">${qty}</span></span>` + 
                        (idx < productArr.length - 1 ? '<span class="param-separator">,</span>' : '');
                }).join('');
            }
            
            // Coupon param (show each coupon as a colored span)
            const coupon = params.get('coupon');
            if (coupon) {
                if (paramHtml) paramHtml += '<span class="param-separator">&</span>';
                const couponArr = coupon.split(',');
                paramHtml += `<span class="param-key">coupon</span>=`;
                paramHtml += couponArr.map((c, idx) => 
                    `<span class="param-value param-coupon">${c}</span>${idx < couponArr.length - 1 ? '<span class="param-separator">,</span>' : ''}`
                ).join('');
            }
            
            paramHtml = paramHtml ? '?' + paramHtml : '';
            
            // Update UI elements
            $('.url-base-checkout').text(urlBase);
            urlInsert.html(`<span style="font-weight:bold;">${pathSegment}/</span>`);
            urlParamsPreview.html(paramHtml);
            
            // Set the generated link value for action buttons
            generatedLinkInput.val(checkoutUrl);
            
            // Update action buttons state
            this.updateActionButtons();
            
            return true;
        },

        // Update action buttons based on generated link presence
        updateActionButtons: function() {
            // Use the UI Manager's updateActionButtons method instead of directly manipulating buttons
            if (window.WCLWUIManager && typeof window.WCLWUIManager.updateActionButtons === 'function') {
                window.WCLWUIManager.updateActionButtons();
            } else {
                // Fallback: direct manipulation (legacy)
                const link = $('#lwwc-generated-link').val();
                const hasLink = link && link.length > 0;
                
                $('.lwwc-save-button').prop('disabled', !hasLink);
                $('#lwwc-copy-button').prop('disabled', !hasLink);
                $('#lwwc-open-button').prop('disabled', !hasLink);
            }
            
            // Also call the global updateActionButtons if available for backward compatibility
            if (window.updateActionButtons && typeof window.updateActionButtons === 'function') {
                window.updateActionButtons();
            }
        },

        // Handle checkout URL reset
        resetPreview: function() {
            const urlParamsPreview = $('#lwwc-url-params-preview-checkout');
            const urlInsert = $('.lwwc-url-insert-checkout');
            const generatedLinkInput = $('#lwwc-generated-link');
            
            generatedLinkInput.val('');
            urlParamsPreview.html('<span class="placeholder-text">' + 
                (window.lwwc_admin_i18n?.searchProducts || 'Select products to generate link...') + '</span>');
            urlInsert.text('');
            
            this.updateActionButtons();
        },

        // Initialize checkout URL handler
        init: function() {
            // Listen for checkout wizard updates
            $(document).on('wclw:updateURLPreview', () => {
                // Only update if we're in the checkout wizard
                if ($('.nav-tab[href="#tab-checkout"]').hasClass('nav-tab-active')) {
                    this.generateAndUpdatePreview();
                }
            });
            
            // Listen for checkout wizard reset
            $(document).on('wclw:resetURLPreview', () => {
                // Only reset if we're in the checkout wizard
                if ($('.nav-tab[href="#tab-checkout"]').hasClass('nav-tab-active')) {
                    this.resetPreview();
                }
            });
        }
    };

    // Initialize when document is ready
    $(document).ready(function() {
        window.WCLWCheckoutURLHandler.init();
    });

})(jQuery);
