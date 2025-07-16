// UI Manager - Handles UI elements, button states, and visual updates
(function($) {
    'use strict';

    window.WCLWUIManager = {
        
        // UI Element registry
        ui: {
            productSearch: $('#lwwc-product-search'),
            productResults: $('#lwwc-search-results'),
            selectedProducts: $('#lwwc-selected-products-cart .products-list'),
            productSearchDesc: $('#product-search-description'),
            productFilter: $('#lwwc-product-filter'),
            quickSelectProductResults: $('#lwwc-quick-select-product-results'),

            pageSearch: $('#lwwc-page-search-input'),
            pageResults: $('#lwwc-page-search-results'),
            pageSearchWrapper: $('#lwwc-page-search-wrapper'),
            selectedPage: $('#lwwc-selected-page'),
            redirectPageUrl: $('#lwwc-redirect-page-url'),

            outputAreaCart: $('.lwwc-generator-output.cart'),
            outputAreaCheckout: $('.lwwc-generator-output.checkout'),
            generatedLink: $('#lwwc-generated-link'),

            variationModal: $('#lwwc-variation-modal'),
            variationList: $('#lwwc-modal-variation-list'),
            variationTitle: $('#lwwc-modal-product-name'),

            confirmModal: $('#lwwc-confirm-modal'),
            confirmText: $('#lwwc-confirm-modal-text'),
            confirmBtn: $('#lwwc-confirm-modal-confirm'),
            confirmCancelBtn: $('#lwwc-confirm-modal-cancel'),

            cartRedirectOptions: $('#lwwc-cart-redirect-options'),
            savedCartLinksList: $('#lwwc-saved-cart-links-list'),
            savedCheckoutLinksList: $('#lwwc-saved-checkout-links-list'),

            // Buttons - use class selectors for multiple instances
            saveBtn: null, // Will be set dynamically based on active wizard
            copyBtn: null,
            openBtn: null,
            resetBtn: null,
        },

        // Get the currently active wizard buttons
        getActiveWizardButtons: function() {
            const isCheckoutActive = $('.nav-tab[href="#tab-checkout-links"]').hasClass('nav-tab-active');
            const mode = isCheckoutActive ? 'checkout' : 'cart';
            
            return {
                saveBtn: $(`#lwwc-save-button-${mode}`),
                copyBtn: $(`#lwwc-copy-button-${mode}`),
                openBtn: $(`#lwwc-open-button-${mode}`),
                resetBtn: $(`#lwwc-reset-button-${mode}`)
            };
        },

        // Get all wizard buttons (both cart and checkout)
        getAllWizardButtons: function() {
            return {
                saveBtn: $('.lwwc-save-button'),
                copyBtn: $('.lwwc-copy-button'),
                openBtn: $('.lwwc-open-button'),
                resetBtn: $('.lwwc-reset-button')
            };
        },

        // Initialize UI Manager
        init: function() {
            this.refreshUIElements();
            this.bindUIEvents();
            this.initializeButtonStates();
            
            // Auto-run initial state check after short delay for initialization
            setTimeout(() => {
                this.updateActionButtons();
            }, 1000);
            
        },

        // Refresh UI element selectors (useful after DOM changes)
        refreshUIElements: function() {
            // Refresh the specific UI elements we care about
            this.ui.confirmModal = $('#lwwc-confirm-modal');
            this.ui.confirmText = $('#lwwc-confirm-modal-text');
            this.ui.confirmBtn = $('#lwwc-confirm-modal-confirm');
            this.ui.confirmCancelBtn = $('#lwwc-confirm-modal-cancel');
            this.ui.generatedLink = $('#lwwc-generated-link');
        },

        // Bind UI-specific events
        bindUIEvents: function() {
            // Update buttons on link change
            this.ui.generatedLink.on('input change', () => {
                this.updateActionButtons();
            });
            
            // Also listen for the change event on a timer to catch programmatic changes
            let lastLinkValue = '';
            setInterval(() => {
                const currentValue = this.ui.generatedLink.val();
                if (currentValue !== lastLinkValue) {
                    lastLinkValue = currentValue;
                    this.updateActionButtons();
                }
            }, 500); // Check every 500ms

            // Handle page removal
            $(document).on('click', '.remove-page-btn', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.ui.selectedPage.empty().append('<p class="placeholder">' + 
                    (window.lwwc_admin_i18n?.noPageSelected || 'No page selected.') + '</p>');
                this.ui.redirectPageUrl.val('');
                this.ui.pageSearch.val('');
                this.updateUIState();
            });

            // Action button event handlers
            this.bindActionButtonEvents();

            // Handle settings-related UI updates
            this.handleSettingsUpdates();
        },

        // Initialize button states and UI visibility
        initializeButtonStates: function() {
            // Always show output area
            this.ui.outputAreaCart.show();
            this.ui.outputAreaCheckout.show();
            
            // Initial button state
            this.updateActionButtons();
            
            // Apply current button styles
            this.updateButtonStyleUI();
        },

        // Enable/disable action buttons based on link presence
        updateActionButtons: function() {
            const link = this.ui.generatedLink.val();
            const hasLink = link && link.length > 0;
            
            // Update action buttons (excluding reset) for all wizards
            $('.lwwc-save-button, .lwwc-copy-button, .lwwc-open-button').prop('disabled', !hasLink);
            
            // Update reset buttons with wizard-specific logic
            this.updateResetButtonStates();
        },

        // Update reset button states for each wizard individually
        updateResetButtonStates: function() {
            // Enable or disable reset buttons based on unsaved changes for each wizard individually
            const cartHasUnsavedChanges = this.hasWizardUnsavedChanges(false); // false = Add-to-Cart wizard
            const checkoutHasUnsavedChanges = this.hasWizardUnsavedChanges(true); // true = Checkout wizard
            
            // Update Add-to-Cart reset button
            const $cartResetBtn = $('#lwwc-reset-button-cart, .lwwc-reset-button').filter(function() {
                return $(this).closest('#lwwc-cart-link-generator').length > 0;
            });
            
            // Update Checkout reset button  
            const $checkoutResetBtn = $('#lwwc-reset-button-checkout, .lwwc-reset-button').filter(function() {
                return $(this).closest('#lwwc-checkout-link-generator').length > 0;
            });
            
            // Set button states individually
            $cartResetBtn.prop('disabled', !cartHasUnsavedChanges);
            $checkoutResetBtn.prop('disabled', !checkoutHasUnsavedChanges);
        },

        // Check if there are unsaved changes in any wizard
        hasUnsavedChanges: function() {
            // Check if there are selected products in Add-to-Cart or Checkout wizards
            const hasCartProducts = $('#lwwc-selected-products-cart .products-list .lwwc-selected-item').length > 0;
            const hasCheckoutProducts = $('#lwwc-selected-products-cart-checkout .products-list .lwwc-selected-item').length > 0;
            
            // Get the default redirect behavior from settings, fallback to 'none'
            const defaultRedirect = window.lwwc_params?.settings?.default_redirect_behavior || 'none';
            const currentRedirect = $('input[name="lwwc-redirect"]:checked').val();
            
            // Only consider it a custom redirect if it differs from the default
            const hasCustomRedirect = currentRedirect !== defaultRedirect;
            
            // For custom redirects, also check if a URL is actually entered
            let hasCustomRedirectUrl = false;
            if (currentRedirect === 'custom') {
                const customUrl = $('#lwwc-redirect-page-url').val();
                hasCustomRedirectUrl = customUrl && customUrl.trim() !== '';
            }
            
            // Only count as custom redirect if it differs from default AND (it's not 'custom' OR custom URL is entered)
            const hasValidCustomRedirect = hasCustomRedirect && (currentRedirect !== 'custom' || hasCustomRedirectUrl);
            
            // Check if checkout wizard has any state (products or coupons)
            let hasCheckoutState = false;
            if (window.WCLWCheckoutWizard) {
                if (typeof window.WCLWCheckoutWizard.hasUnsavedChanges === 'function') {
                    hasCheckoutState = window.WCLWCheckoutWizard.hasUnsavedChanges();
                } else {
                    // Fallback: check for checkout wizard DOM elements
                    const hasCheckoutCoupons = $('#lwwc-selected-coupons-list-checkout .lwwc-selected-coupon').length > 0;
                    hasCheckoutState = hasCheckoutCoupons;
                }
            }
            
            const result = hasCartProducts || hasCheckoutProducts || hasValidCustomRedirect || hasCheckoutState;
            
            return result;
        },

        // Check if a specific wizard has unsaved changes
        hasWizardUnsavedChanges: function(isCheckout) {
            if (isCheckout) {
                // Check checkout wizard
                const hasCheckoutProducts = $('#lwwc-selected-products-cart-checkout .products-list .lwwc-selected-item').length > 0;
                
                let hasCheckoutState = false;
                if (window.WCLWCheckoutWizard) {
                    if (typeof window.WCLWCheckoutWizard.hasUnsavedChanges === 'function') {
                        hasCheckoutState = window.WCLWCheckoutWizard.hasUnsavedChanges();
                    } else {
                        // Fallback: check for checkout wizard DOM elements
                        const hasCheckoutCoupons = $('#lwwc-selected-coupons-list-checkout .lwwc-selected-coupon').length > 0;
                        hasCheckoutState = hasCheckoutCoupons;
                    }
                }
                
                const result = hasCheckoutProducts || hasCheckoutState;
                return result;
            } else {
                // Check add-to-cart wizard
                const hasCartProducts = $('#lwwc-selected-products-cart .products-list .lwwc-selected-item').length > 0;
                
                // Get the default redirect behavior from settings, fallback to 'none'
                const defaultRedirect = window.lwwc_params?.settings?.default_redirect_behavior || 'none';
                const currentRedirect = $('input[name="lwwc-redirect"]:checked').val();
                
                // Only consider it a custom redirect if it differs from the default
                const hasCustomRedirect = currentRedirect !== defaultRedirect;
                
                // For custom redirects, also check if a URL is actually entered
                let hasCustomRedirectUrl = false;
                if (currentRedirect === 'custom') {
                    const customUrl = $('#lwwc-redirect-page-url').val();
                    hasCustomRedirectUrl = customUrl && customUrl.trim() !== '';
                }
                
                // Only count as unsaved changes if:
                // 1. Products are selected, OR
                // 2. Redirect differs from default AND (it's not 'custom' OR custom URL is entered)
                const result = hasCartProducts || (hasCustomRedirect && (currentRedirect !== 'custom' || hasCustomRedirectUrl));
                
                return result;
            }
        },

        // Utility to get the current button style class
        getButtonStyleClass: function() {
            const checked = $('input[name="lwwc_settings[button_style]"]:checked').val();
            if (!checked) return 'lwwc-button-style-both';
            return `lwwc-button-style-${checked}`;
        },

        // Update all saved-link-actions-footer and preview with current button style
        updateButtonStyleUI: function() {
            const styleClass = this.getButtonStyleClass();
            $('.saved-link-actions-footer').removeClass('lwwc-button-style-icons lwwc-button-style-text lwwc-button-style-both').addClass(styleClass);
            $('.lwwc-preview-buttons').removeClass('lwwc-button-style-icons lwwc-button-style-text lwwc-button-style-both').addClass(styleClass);
        },

        // Handle settings-related UI updates
        handleSettingsUpdates: function() {
            // Handle button style preview updates on settings page
            $(document).on('change', 'input[name="lwwc_settings[button_style]"]', (e) => {
                const selectedStyle = $(e.target).val();
                const previewContainer = $('.lwwc-preview-buttons');
                
                // Remove existing style classes
                previewContainer.removeClass('lwwc-button-style-icons lwwc-button-style-text lwwc-button-style-both');
                
                // Add the selected style class
                previewContainer.addClass(`lwwc-button-style-${selectedStyle}`);
            });

            // Check if we just saved settings (WordPress adds settings-updated=true to URL)
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('settings-updated') === 'true') {
                // Settings were just saved, apply button styles after a short delay
                setTimeout(() => {
                    this.updateButtonStyleUI();
                }, 100);
            }

            // Handle settings form hash preservation
            const settingsForm = $('#lwwc-settings-content form');
            if (settingsForm.length) {
                const refererInput = settingsForm.find('input[name="_wp_http_referer"]');
                if (refererInput.length) {
                    const currentUrl = refererInput.val();
                    if (currentUrl.indexOf('#') === -1) {
                        refererInput.val(currentUrl + '#tab-settings');
                    }
                }
            }
        },

        // Show temporary feedback on a button
        showTempFeedback: function(button, message, duration = 2000) {
            const $button = $(button);
            const originalText = $button.html();
            const originalDisabled = $button.prop('disabled');
            
            // Show feedback
            $button.html(message).prop('disabled', true);
            
            // Restore original state after duration
            setTimeout(() => {
                $button.html(originalText).prop('disabled', originalDisabled);
            }, duration);
        },

        // Show global feedback message
        showFeedback: function(message, type = 'success') {
            // Remove existing feedback messages
            $('.lwwc-wrap .notice').remove();

            // Use the new centralized notice system if available
            if (window.wclwNotices) {
                if (type === 'success') {
                    window.wclwNotices.success(message, {
                        dismissible: true,
                        autoHide: true,
                        autoHideDelay: 12000,
                        clearExisting: true,
                        scrollTo: true
                    });
                } else if (type === 'error') {
                    window.wclwNotices.error(message, {
                        dismissible: true,
                        autoHide: true,
                        autoHideDelay: 12000,
                        clearExisting: true,
                        scrollTo: true
                    });
                } else if (type === 'warning') {
                    window.wclwNotices.warning(message, {
                        dismissible: true,
                        autoHide: true,
                        autoHideDelay: 12000,
                        clearExisting: true,
                        scrollTo: true
                    });
                }
                return;
            }

            // Fallback to old notice if new system is not available
            // Map type to WP notice class
            let feedbackClass = 'notice-success';
            if (type === 'error') feedbackClass = 'notice-error';
            else if (type === 'warning') feedbackClass = 'notice-warning';

            const feedbackMessage = $(
                `<div class="notice ${feedbackClass} is-dismissible">
                    <p>${message}</p>
                    <button type="button" class="notice-dismiss">
                        <span class="screen-reader-text">Dismiss this notice.</span>
                    </button>
                </div>`
            );

            // Insert at the top of .wrap/.lwwc-wrap
            const $wrap = $('.lwwc-wrap').length ? $('.lwwc-wrap') : $('.wrap');
            $wrap.prepend(feedbackMessage);

            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                feedbackMessage.fadeOut(300, function() {
                    $(this).remove();
                });
            }, 5000);

            // Manual dismiss handler
            feedbackMessage.find('.notice-dismiss').on('click', function() {
                feedbackMessage.fadeOut(300, function() {
                    $(this).remove();
                });
            });
        },

        // Bind action button event handlers
        bindActionButtonEvents: function() {
            const self = this;

            // Use class-based selectors to bind to all wizard buttons
            const bindButtonEvents = () => {
                
                // Check if buttons exist before binding
                const saveBtn = $('.lwwc-save-button');
                const copyBtn = $('.lwwc-copy-button');
                const openBtn = $('.lwwc-open-button');
                const resetBtn = $('.lwwc-reset-button');
                
                if (saveBtn.length === 0) {
                    console.warn('⚠️ Save button not found for direct binding!');
                    return;
                }
                
                // Save button
                saveBtn.off('click.wclw').on('click.wclw', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return self.handleSaveButton($(this), e);
                });

                // Copy button
                copyBtn.off('click.wclw').on('click.wclw', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return self.handleCopyButton($(this), e);
                });

                // Open button
                openBtn.off('click.wclw').on('click.wclw', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return self.handleOpenButton($(this), e);
                });

                // Reset button
                resetBtn.off('click.wclw').on('click.wclw', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return self.handleResetButton($(this), e);
                });
                
                // Test the bindings
                if (saveBtn.length > 0) {
                    const saveEvents = $._data(saveBtn[0], 'events');
                }
            };
            
            // Bind events now
            bindButtonEvents();
            
            // Also use delegation as fallback for both old and new selectors
            $(document).off('click.lwwc-fallback', '.lwwc-save-button, .lwwc-copy-button, .lwwc-open-button, .lwwc-reset-button');
            $(document).on('click.lwwc-fallback', '.lwwc-save-button, .lwwc-copy-button, .lwwc-open-button, .lwwc-reset-button', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Route to appropriate handler based on button class
                const $button = $(this);
                
                if ($button.hasClass('lwwc-save-button')) {
                    self.handleSaveButton($button, e);
                } else if ($button.hasClass('lwwc-copy-button')) {
                    self.handleCopyButton($button, e);
                } else if ($button.hasClass('lwwc-open-button')) {
                    self.handleOpenButton($button, e);
                } else if ($button.hasClass('lwwc-reset-button')) {
                    self.handleResetButton($button, e);
                }
                
                return false;
            });
            
            // Rebind events when DOM changes (for dynamic content)
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // Check if action buttons were added
                        const addedButtons = $(mutation.addedNodes).find('.lwwc-save-button, .lwwc-copy-button, .lwwc-open-button, .lwwc-reset-button');
                        if (addedButtons.length > 0) {
                            bindButtonEvents();
                        }
                    }
                });
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
            
        },

        // Individual button handlers (can be called from direct binding or delegation)
        handleSaveButton: function($button, e) {
            
            if ($button.prop('disabled')) {
                if (window.wclwNotices) {
                    window.wclwNotices.error('Cannot save - no link generated yet. Please select products and generate a link first.');
                }
                return false;
            }
            
            const link = this.ui.generatedLink.val();
            if (!link) {
                console.warn('⚠️ No link to save');
                if (window.wclwNotices) {
                    window.wclwNotices.error('No link to save. Please generate a link first.');
                }
                return false;
            }

            // Determine which wizard is active to get the correct type
            const isCheckoutWizard = $('#lwwc-checkout-link-generator').is(':visible');
            const linkType = isCheckoutWizard ? 'checkout' : 'cart';

            // Collect current product information from the active wizard
            const productData = this.getCurrentProductData(isCheckoutWizard);

            const originalText = $button.html();
            
            $button.html('<span class="dashicons dashicons-update"></span><span class="button-text">Saving...</span>').prop('disabled', true);

            $.post(window.lwwc_params.ajax_url, {
                action: 'lwwc_save_link',
                nonce: window.lwwc_params.manage_links_nonce,
                link_url: link,
                link_type: linkType,
                product_data: JSON.stringify(productData) // Include product data
            }, response => {
                if (response.success) {
                    window.wclwNotices.success(response.data.message, {
                        dismissible: true,
                        autoHide: true,
                        autoHideDelay: 12000,
                        clearExisting: true,
                        scrollTo: true
                    });
                    // Add the saved link to the appropriate list with product data
                    if (window.WCLWSavedLinksManager) {
                        window.WCLWSavedLinksManager.addSavedLinkToList(response.data.link_key, link, linkType, productData);
                    }
                } else {
                    // Handle duplicate detection
                    if (response.data && response.data.is_duplicate) {
                        // Only show the duplicate alert, not a generic error
                        if (window.WCLWSavedLinksManager) {
                            window.WCLWSavedLinksManager.handleDuplicateDetection(response.data.duplicate_key, linkType);
                        }
                    } else {
                        window.wclwNotices.error(response.data.message, {
                            dismissible: true,
                            autoHide: true,
                            autoHideDelay: 12000,
                            clearExisting: true,
                            scrollTo: true
                        });
                    }
                }
            }).always(() => {
                $button.html(originalText).prop('disabled', false);
            });
            
            return false;
        },

        // Collect current product data from the active wizard
        getCurrentProductData: function(isCheckoutWizard) {
            const productData = [];
            
            if (isCheckoutWizard) {
                // Get products from checkout wizard
                const checkoutProducts = $('#lwwc-selected-products-cart-checkout .products-list .lwwc-selected-item');
                
                checkoutProducts.each(function() {
                    const $item = $(this);
                    const productId = $item.data('id');
                    const productName = $item.data('name') || $item.find('.item-name').text().replace(/\[ID:\d+\]\s*/, '') || 'Unknown Product';
                    const quantity = parseInt($item.find('.quantity-input').val()) || 1;
                    
                    
                    // Check if this is a variation by looking for variation ID or formatted attributes in name
                    let variationId = $item.data('variation-id') || null;
                    let variationData = $item.data('variation-data') || null;
                    let parentId = $item.data('parent-id') || null;
                    
                    // Try to extract variation details from the display name if not in data attributes
                    if (!variationData && productName.includes(' ( ') && productName.includes(' )')) {
                        const matches = productName.match(/^(.+?)\s+\(\s*(.+?)\s*\)$/);
                        if (matches) {
                            const parentName = matches[1];
                            const attributesText = matches[2];
                            
                            // Parse attributes like "Color: Red | Size: Large"
                            if (attributesText.includes(':')) {
                                variationData = {};
                                attributesText.split('|').forEach(attr => {
                                    const [key, value] = attr.split(':').map(s => s.trim());
                                    if (key && value) {
                                        variationData[key] = value;
                                    }
                                });
                                
                                // If we found variation data but no variation ID, this is a variation
                                if (Object.keys(variationData).length > 0 && !variationId) {
                                }
                            }
                        }
                    }
                    
                    productData.push({
                        id: productId,
                        name: productName,
                        quantity: quantity,
                        variationId: variationId,
                        variationData: variationData,
                        parentId: parentId
                    });
                });
                
                // Get coupons from checkout wizard
                const checkoutCoupons = $('#lwwc-selected-coupons-list-checkout .lwwc-selected-coupon');
                const coupons = [];
                checkoutCoupons.each(function() {
                    const $item = $(this);
                    coupons.push({
                        code: $item.data('code'),
                        id: $item.data('id')
                    });
                });
                
                return { products: productData, coupons: coupons };
            } else {
                // Get products from add-to-cart wizard
                const cartProducts = $('#lwwc-selected-products-cart .products-list .lwwc-selected-item');
                
                cartProducts.each(function() {
                    const $item = $(this);
                    const productId = $item.data('id');
                    const productName = $item.data('name') || $item.find('.item-name').text().replace(/\[ID:\d+\]\s*/, '') || 'Unknown Product';
                    const quantity = parseInt($item.find('.quantity-input').val()) || 1;
                    const variationId = $item.data('variation-id') || null;
                    const variationData = $item.data('variation-data') || null;
                    const parentId = $item.data('parent-id') || null;
                    
                    
                    productData.push({
                        id: productId,
                        name: productName,
                        quantity: quantity,
                        variationId: variationId,
                        variationData: variationData,
                        parentId: parentId
                    });
                });
                
                return { products: productData, coupons: [] };
            }
        },

        handleCopyButton: function($button, e) {
            
            if ($button.prop('disabled')) {
                if (window.wclwNotices) {
                    window.wclwNotices.error('Cannot copy - no link generated yet. Please select products and generate a link first.');
                }
                return false;
            }
            
            const link = this.ui.generatedLink.val();
            if (!link) {
                console.warn('⚠️ No link to copy');
                if (window.wclwNotices) {
                    window.wclwNotices.error('No link to copy. Please generate a link first.');
                }
                return false;
            }

            navigator.clipboard.writeText(link).then(() => {
                window.wclwNotices.success('<span class="dashicons dashicons-yes"></span><span class="button-text">Copied!</span>', {
                    dismissible: true,
                    autoHide: true,
                    autoHideDelay: 1500,
                    clearExisting: true,
                    scrollTo: true
                });
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = link;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                window.wclwNotices.success('<span class="dashicons dashicons-yes"></span><span class="button-text">Copied!</span>', {
                    dismissible: true,
                    autoHide: true,
                    autoHideDelay: 1500,
                    clearExisting: true,
                    scrollTo: true
                });
            });
            
            return false;
        },

        handleOpenButton: function($button, e) {
            
            if ($button.prop('disabled')) {
                alert('Cannot open - no link generated yet. Please select products and generate a link first.');
                return false;
            }
            const link = this.ui.generatedLink.val();
            if (!link) return false;
            window.open(link, '_blank');
            window.wclwNotices.success('<span class="dashicons dashicons-external"></span><span class="button-text">Opened!</span>', {
                dismissible: true,
                autoHide: true,
                autoHideDelay: 1000,
                clearExisting: true,
                scrollTo: true
            });
            
            return false;
        },

        handleResetButton: function($button, e) {
            
            // Determine which wizard is active based on the button that was clicked
            const isCheckoutActive = $('.nav-tab[href="#tab-checkout-links"]').hasClass('nav-tab-active');
            const wizardName = isCheckoutActive ? 'Checkout' : 'Add-to-Cart';
            
            
            // Check if the specific wizard being reset has unsaved changes
            if (this.hasWizardUnsavedChanges(isCheckoutActive)) {
                const confirmMessage = `Are you sure you want to clear all fields and reset the ${wizardName} wizard?`;
                
                if (this.ui.confirmModal.length > 0 && typeof this.showConfirmModal === 'function') {
                    this.showConfirmModal(confirmMessage, () => {
                        this.resetTargetWizard(isCheckoutActive);
                        window.wclwNotices.success(`${wizardName} wizard has been reset`, {
                            dismissible: true,
                            autoHide: true,
                            autoHideDelay: 12000,
                            clearExisting: true,
                            scrollTo: true
                        });
                    });
                } else {
                    if (confirm(confirmMessage)) {
                        this.resetTargetWizard(isCheckoutActive);
                        window.wclwNotices.success(`${wizardName} wizard has been reset`, {
                            dismissible: true,
                            autoHide: true,
                            autoHideDelay: 12000,
                            clearExisting: true,
                            scrollTo: true
                        });
                    }
                }
            } else {
                this.resetTargetWizard(isCheckoutActive);
                window.wclwNotices.success(`${wizardName} wizard has been reset`, {
                    dismissible: true,
                    autoHide: true,
                    autoHideDelay: 12000,
                    clearExisting: true,
                    scrollTo: true
                });
            }
            
            return false;
        },

        // Show confirmation modal
        showConfirmModal: function(message, onConfirm, onCancel = null) {
            
            // Refresh UI elements to ensure we have current references
            this.refreshUIElements();
            
            if (this.ui.confirmModal.length === 0) {
                console.error('❌ Confirm modal not found even after refresh, falling back to browser confirm');
                if (confirm(message)) {
                    if (onConfirm) onConfirm();
                } else {
                    if (onCancel) onCancel();
                }
                return;
            }
            
            // Clear any existing event handlers first to prevent stacking
            this.ui.confirmBtn.off('click.confirmModal');
            this.ui.confirmCancelBtn.off('click.confirmModal');
            this.ui.confirmModal.find('.lwwc-modal-close').off('click.confirmModal');
            
            this.ui.confirmText.text(message);
            this.ui.confirmModal.css('display', 'block');

            // Handle confirm button with namespaced event
            this.ui.confirmBtn.on('click.confirmModal', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.ui.confirmModal.css('display', 'none');
                // Clean up event handlers
                this.ui.confirmBtn.off('click.confirmModal');
                this.ui.confirmCancelBtn.off('click.confirmModal');
                this.ui.confirmModal.find('.lwwc-modal-close').off('click.confirmModal');
                this.ui.confirmModal.off('click.confirmModal');
                this.ui.confirmModal.off('keydown.confirmModal');
                if (onConfirm) onConfirm();
            });

            // Handle cancel button with namespaced event
            this.ui.confirmCancelBtn.on('click.confirmModal', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.ui.confirmModal.css('display', 'none');
                // Clean up event handlers
                this.ui.confirmBtn.off('click.confirmModal');
                this.ui.confirmCancelBtn.off('click.confirmModal');
                this.ui.confirmModal.find('.lwwc-modal-close').off('click.confirmModal');
                this.ui.confirmModal.off('click.confirmModal');
                this.ui.confirmModal.off('keydown.confirmModal');
                if (onCancel) onCancel();
            });
            
            // Handle close X button with namespaced event
            this.ui.confirmModal.find('.lwwc-modal-close').on('click.confirmModal', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.ui.confirmModal.css('display', 'none');
                // Clean up event handlers
                this.ui.confirmBtn.off('click.confirmModal');
                this.ui.confirmCancelBtn.off('click.confirmModal');
                this.ui.confirmModal.find('.lwwc-modal-close').off('click.confirmModal');
                this.ui.confirmModal.off('click.confirmModal');
                this.ui.confirmModal.off('keydown.confirmModal');
                if (onCancel) onCancel();
            });
            
            // Handle backdrop click to close modal
            this.ui.confirmModal.on('click.confirmModal', (e) => {
                if (e.target === this.ui.confirmModal[0]) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.ui.confirmModal.css('display', 'none');
                    // Clean up event handlers
                    this.ui.confirmBtn.off('click.confirmModal');
                    this.ui.confirmCancelBtn.off('click.confirmModal');
                    this.ui.confirmModal.find('.lwwc-modal-close').off('click.confirmModal');
                    this.ui.confirmModal.off('click.confirmModal');
                    this.ui.confirmModal.off('keydown.confirmModal');
                    if (onCancel) onCancel();
                }
            });
            
            // Handle ESC key to close modal
            this.ui.confirmModal.on('keydown.confirmModal', (e) => {
                if (e.key === 'Escape' || e.keyCode === 27) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.ui.confirmModal.css('display', 'none');
                    // Clean up event handlers
                    this.ui.confirmBtn.off('click.confirmModal');
                    this.ui.confirmCancelBtn.off('click.confirmModal');
                    this.ui.confirmModal.find('.lwwc-modal-close').off('click.confirmModal');
                    this.ui.confirmModal.off('click.confirmModal');
                    this.ui.confirmModal.off('keydown.confirmModal');
                    if (onCancel) onCancel();
                }
            });
        },

        // Reset wizard state
        resetWizardState: function() {
            // Reset UI
            this.resetWizardUI();
            
            // Reset search manager state
            if (window.WCLWSearchManager) {
                window.WCLWSearchManager.clearSelectedProducts();
            }
            
            // Reset saved links manager state
            if (window.WCLWSavedLinksManager) {
                window.WCLWSavedLinksManager.resetWizardState();
            }

            // Update UI state
            this.updateUIState();
        },

        // Reset target wizard state (specific wizard only)
        resetTargetWizard: function(isCheckoutActive) {
            
            // Reset UI for the specific wizard
            this.resetTargetWizardUI(isCheckoutActive);
            
            // Reset search manager state for specific wizard
            if (window.WCLWSearchManager && typeof window.WCLWSearchManager.clearTargetWizardProducts === 'function') {
                window.WCLWSearchManager.clearTargetWizardProducts(isCheckoutActive);
            }
            
            // Reset saved links manager state for specific wizard
            if (window.WCLWSavedLinksManager && typeof window.WCLWSavedLinksManager.resetTargetWizardState === 'function') {
                window.WCLWSavedLinksManager.resetTargetWizardState(isCheckoutActive);
            }

            // Update UI state
            this.updateUIState();
        },

        // Hide UI elements based on settings
        applySettingsVisibility: function() {
            if (window.lwwc_params && window.lwwc_params.settings) {
                // Hide quick select if disabled
                if (window.lwwc_params.settings.quick_select_enabled != 1) {
                    $('.lwwc-quick-select-area').hide();
                }

                // Handle saved links visibility
                const hasSavedLinks = Object.keys(window.lwwc_params.saved_cart_links || {}).length > 0 || 
                                   Object.keys(window.lwwc_params.saved_checkout_links || {}).length > 0;
                
                if (window.lwwc_params.settings.saved_links_enabled != 1) {
                    this.ui.saveBtn.hide();
                    if (!hasSavedLinks) {
                        $('#lwwc-saved-links-area').hide();
                    }
                }
            }
        },

        // Reset wizard UI state
        resetWizardUI: function() {
            // Clear selected products for Add-to-Cart wizard
            this.ui.selectedProducts.empty().append('<p class="placeholder">' + 
                (window.lwwc_admin_i18n?.noProductsSelected || 'No products selected yet.') + '</p>');

            // Clear selected page
            this.ui.selectedPage.empty().append('<p class="placeholder">' + 
                (window.lwwc_admin_i18n?.noPageSelected || 'No page selected.') + '</p>');
            this.ui.redirectPageUrl.val('');

            // Reset redirect options
            $('input[name="lwwc-redirect"]').prop('checked', false);
            $('input[name="lwwc-redirect"][value="none"]').prop('checked', true);
            this.ui.cartRedirectOptions.find('#lwwc-page-search-wrapper').addClass('disabled');

            // Clear the hidden input but keep output area visible
            this.ui.generatedLink.val('');

            // Clear search inputs
            this.ui.productSearch.val('');
            this.ui.pageSearch.val('');

            // Hide search results
            this.ui.productResults.hide().empty();
            this.ui.pageResults.hide().empty();
        },

        // Reset UI for specific wizard only
        resetTargetWizardUI: function(isCheckoutActive) {
            
            if (isCheckoutActive) {
                // Reset Checkout wizard UI only
                // Note: Checkout wizard UI clearing is handled by WCLWSavedLinksManager.resetTargetWizardState
                // and WCLWCheckoutWizard.reset() if available
            } else {
                // Reset Add-to-Cart wizard UI only
                this.ui.selectedProducts.empty().append('<p class="placeholder">' + 
                    (window.lwwc_admin_i18n?.noProductsSelected || 'No products selected yet.') + '</p>');

                // Clear selected page
                this.ui.selectedPage.empty().append('<p class="placeholder">' + 
                    (window.lwwc_admin_i18n?.noPageSelected || 'No page selected.') + '</p>');
                this.ui.redirectPageUrl.val('');

                // Reset redirect options
                $('input[name="lwwc-redirect"]').prop('checked', false);
                $('input[name="lwwc-redirect"][value="none"]').prop('checked', true);
                this.ui.cartRedirectOptions.find('#lwwc-page-search-wrapper').addClass('disabled');

                // Clear search inputs for add-to-cart
                this.ui.productSearch.val('');
                this.ui.pageSearch.val('');

                // Hide search results
                this.ui.productResults.hide().empty();
                this.ui.pageResults.hide().empty();
            }

            // Clear the generated link (shared between wizards)
            this.ui.generatedLink.val('');
        },

        // Update UI state - triggers link generation
        updateUIState: function() {
            // Call generateLink to update the output area
            if (window.WCLWLinkGenerator) {
                window.WCLWLinkGenerator.generateLink();
            }
        }
    };

    // Make updateActionButtons globally available for backward compatibility
    window.updateActionButtons = function() {
        if (window.WCLWUIManager) {
            window.WCLWUIManager.updateActionButtons();
        }
    };

})(jQuery);