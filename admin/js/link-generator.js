// Link Generator - Coordinates URL generation across all wizards
(function($) {
    'use strict';

    window.WCLWLinkGenerator = {
        
        // Initialize link generator
        init: function() {
            this.bindEvents();
            this.lastUpdateTime = 0;
            this.updateThrottle = 100; // 100ms throttle
        },

        // Bind link generation events
        bindEvents: function() {
            // Listen for events that should trigger link generation (with throttling)
            $(document).on('wclw:updateURLPreview', () => {
                const now = Date.now();
                if (now - this.lastUpdateTime > this.updateThrottle) {
                    this.generateLink();
                    this.lastUpdateTime = now;
                }
            });

            // Handle quantity changes
            $(document).on('change input', '.quantity-input', () => {
                this.generateLink();
            });

            // Handle redirect option changes  
            $(document).on('change', 'input[name="lwwc-redirect"]', (e) => {
                // Ensure only the clicked radio button is checked
                $('input[name="lwwc-redirect"]').prop('checked', false);
                $(e.target).prop('checked', true);
                
                const pageSearchWrapper = $('#lwwc-page-search-wrapper');
                const selectedPage = $('#lwwc-selected-page');
                const redirectPageUrl = $('#lwwc-redirect-page-url');
                const pageSearchInput = pageSearchWrapper.find('input[type="text"], input');
                
                if ($(e.target).val() === 'custom') {
                    // Enable page search when custom redirect is selected
                    pageSearchWrapper.removeClass('disabled');
                    pageSearchInput.prop('disabled', false).attr('tabindex', '0');
                } else {
                    // Disable and grey out page search for other redirect options
                    pageSearchWrapper.addClass('disabled');
                    pageSearchInput.prop('disabled', true).attr('tabindex', '-1');
                    // Restore placeholder when clearing selected page
                    selectedPage.html('<p class="placeholder">' + 
                        (window.lwwc_admin_i18n?.noPageSelected || 'No page selected.') + '</p>');
                    redirectPageUrl.val('');
                }
                this.generateLink();
            });
            
            // Handle reset button clicks
            $(document).on('click', '.lwwc-reset-button', this.resetState.bind(this));
        },

        // Main link generation coordinator
        generateLink: function() {
            // Check if we're in checkout wizard mode - delegate to checkout URL handler
            if (window.WCLWCheckoutWizard && window.WCLWCheckoutWizard.isActive()) {
                if (window.WCLWCheckoutURLHandler) {
                    window.WCLWCheckoutURLHandler.generateAndUpdatePreview();
                }
                return;
            }

            // For add-to-cart wizard, delegate to the AddToCartWizard
            if (window.WCLWAddToCartWizard && window.WCLWAddToCartWizard.isActive()) {
                window.WCLWAddToCartWizard.generateLink();
                return;
            }

            // Fallback: no active wizard detected (legacy warning removed)
        },

        // Update UI state after link generation
        updateUIState: function() {
            this.generateLink();
            
            // Update action buttons if UI manager is available
            if (window.WCLWUIManager) {
                window.WCLWUIManager.updateActionButtons();
            }
        },

        // Reset link generation state
        resetState: function() {
            const generatedLink = $('#lwwc-generated-link');
            generatedLink.val('');
            
            // Reset URL display
            $('#lwwc-url-params-preview').html('<span class="placeholder-text">' + 
                (window.lwwc_admin_i18n?.searchProducts || 'Select products to generate link...') + '</span>');
            
            // Reset checkout URL handler if available
            if (window.WCLWCheckoutURLHandler) {
                window.WCLWCheckoutURLHandler.resetPreview();
            }
            
            // Update UI state
            this.updateUIState();
        },

        // Validate URL parameters
        validateURLParameters: function(params) {
            const errors = [];
            
            // Check for required parameters based on wizard type
            if (!params.products && !params['add-to-cart']) {
                errors.push('At least one product must be selected');
            }
            
            // Validate product IDs
            const productParam = params.products || params['add-to-cart'];
            if (productParam) {
                const products = productParam.split(',');
                products.forEach(product => {
                    const [id] = product.split(':');
                    if (!id || isNaN(parseInt(id))) {
                        errors.push(`Invalid product ID: ${id}`);
                    }
                });
            }
            
            // Validate quantities
            if (params.quantity && isNaN(parseInt(params.quantity))) {
                errors.push(`Invalid quantity: ${params.quantity}`);
            }
            
            return errors;
        },

        // Parse URL to extract parameters
        parseURL: function(url) {
            try {
                const urlObj = new URL(url);
                const params = {};
                
                urlObj.searchParams.forEach((value, key) => {
                    params[key] = value;
                });
                
                return {
                    baseUrl: urlObj.origin + urlObj.pathname,
                    params: params,
                    isValid: true
                };
            } catch (e) {
                return {
                    baseUrl: '',
                    params: {},
                    isValid: false,
                    error: e.message
                };
            }
        },

        // Build URL from components
        buildURL: function(baseUrl, params) {
            try {
                const url = new URL(baseUrl);
                
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                        url.searchParams.set(key, value);
                    }
                });
                
                return url.toString();
            } catch (e) {
                console.error('Error building URL:', e);
                return '';
            }
        },

        // Get parameters for current wizard state
        getCurrentWizardParams: function() {
            const params = {};
            
            // Determine active wizard
            if (window.WCLWCheckoutWizard && window.WCLWCheckoutWizard.isActive()) {
                // Let checkout wizard handle its own parameters
                return null;
            }
            
            if (window.WCLWAddToCartWizard && window.WCLWAddToCartWizard.isActive()) {
                // Let add-to-cart wizard handle its own parameters
                return null;
            }
            
            return params;
        },

        // Format parameters for display
        formatParametersForDisplay: function(params) {
            const formatted = [];
            
            Object.entries(params).forEach(([key, value]) => {
                let displayValue = value;
                
                // Special formatting for specific parameters
                switch (key) {
                    case 'add-to-cart':
                    case 'products':
                        if (value.includes(',')) {
                            const products = value.split(',');
                            displayValue = `${products.length} products`;
                        } else {
                            displayValue = `Product ${value}`;
                        }
                        break;
                    case 'quantity':
                        displayValue = `Qty: ${value}`;
                        break;
                    case 'coupon':
                    case 'coupon-code':
                        if (value.includes(',')) {
                            const coupons = value.split(',');
                            displayValue = `${coupons.length} coupons`;
                        } else {
                            displayValue = `Coupon: ${value}`;
                        }
                        break;
                }
                
                formatted.push({
                    key: key,
                    value: value,
                    display: displayValue
                });
            });
            
            return formatted;
        }
    };

    // Make generateLink globally available for backward compatibility
    window.generateLink = function() {
        if (window.WCLWLinkGenerator) {
            window.WCLWLinkGenerator.generateLink();
        }
    };

})(jQuery);