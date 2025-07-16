// Admin Coordinator - Lightweight coordinator for WooCommerce Link Wizard
(function($) {
    'use strict';

    $(function() {

        // --- Module Initialization ---
        
        // Initialize UI Manager first (provides core UI utilities)
        if (window.WCLWUIManager && typeof window.WCLWUIManager.init === 'function') {
            window.WCLWUIManager.init();
        } else {
            console.error('❌ UI Manager not available');
        }

        // Initialize Modal Manager
        if (window.WCLWModalManager && typeof window.WCLWModalManager.init === 'function') {
            window.WCLWModalManager.init();
        } else {
            console.error('❌ Modal Manager not available');
        }

        // Initialize Search Manager
        if (window.WCLWSearchManager && typeof window.WCLWSearchManager.init === 'function') {
            window.WCLWSearchManager.init();
        } else {
            console.error('❌ Search Manager not available');
        }

        // Initialize Link Generator
        if (window.WCLWLinkGenerator && typeof window.WCLWLinkGenerator.init === 'function') {
            window.WCLWLinkGenerator.init();
        } else {
            console.error('❌ Link Generator not available');
        }

        // Initialize Saved Links Manager
        if (window.WCLWSavedLinksManager && typeof window.WCLWSavedLinksManager.init === 'function') {
            window.WCLWSavedLinksManager.init();
        } else {
            console.error('❌ Saved Links Manager not available');
        }

        // Initialize Add to Cart Manager (if available)
        if (window.WCLWAddToCartWizard && typeof window.WCLWAddToCartWizard.init === 'function') {
            window.WCLWAddToCartWizard.init();
        } else {
        }

        // Initialize Coupon Manager (if available)
        if (window.WCLWCouponManager && typeof window.WCLWCouponManager.init === 'function') {
            window.WCLWCouponManager.init();
        } else {
        }

        // Initialize Checkout URL Handler (if available)
        if (window.WCLWCheckoutURLHandler && typeof window.WCLWCheckoutURLHandler.init === 'function') {
            window.WCLWCheckoutURLHandler.init();
        } else {
        }

        // --- Global Event Coordination ---
        
        // Global product selection event (from Search Manager or other sources)
        $(document).on('wclw:product-selected', function(e, data) {
            
            // Check if this is a variable product that needs variation selection
            if (data.type === 'variable' || (data.variations && data.variations.length > 0)) {
                
                // The new variation selection system will automatically handle this
                // via the 'wclw:product-selected' event it listens for
                
            } else {
                // Regular product, add directly to list
                if (window.WCLWSearchManager && typeof window.WCLWSearchManager.addProductToList === 'function') {
                    window.WCLWSearchManager.addProductToList(data);
                }
            }
            
            // Update UI button states via UI Manager
            if (window.WCLWUIManager && typeof window.WCLWUIManager.updateActionButtons === 'function') {
                window.WCLWUIManager.updateActionButtons();
            }
        });

        // Global variation selection event (from Variation Sidebar or other sources)
        $(document).on('wclw:variation-selected', function(e, data) {
            
            // Add variation to list via Search Manager
            if (window.WCLWSearchManager && typeof window.WCLWSearchManager.addVariationToList === 'function') {
                window.WCLWSearchManager.addVariationToList(data);
            }
            
            // Update UI button states via UI Manager
            if (window.WCLWUIManager && typeof window.WCLWUIManager.updateActionButtons === 'function') {
                window.WCLWUIManager.updateActionButtons();
            }
        });

        // Global link generated event
        $(document).on('wclw:link-generated', function(e, data) {
            
            // Notify UI Manager to show feedback
            if (window.WCLWUIManager && typeof window.WCLWUIManager.showSuccess === 'function') {
                window.WCLWUIManager.showSuccess('Link generated successfully!');
            }
            
            // Notify Saved Links Manager if auto-save is enabled
            if (window.WCLWSavedLinksManager && typeof window.WCLWSavedLinksManager.onLinkGenerated === 'function') {
                window.WCLWSavedLinksManager.onLinkGenerated(data);
            }
        });

        // Global error event
        $(document).on('wclw:error', function(e, data) {
            
            // Notify UI Manager to show error
            if (window.WCLWUIManager && typeof window.WCLWUIManager.showError === 'function') {
                window.WCLWUIManager.showError(data.message || 'An error occurred');
            }
        });

        // Global product list update event  
        $(document).on('wclw:product-list-updated', function(e, data) {
            
            // Update UI button states
            if (window.WCLWUIManager && typeof window.WCLWUIManager.updateActionButtons === 'function') {
                window.WCLWUIManager.updateActionButtons();
            }
        });

        // --- Global Action Button Events ---
        
        // Generate Link button (legacy support)
        $(document).on('click', '#generate-link', function(e) {
            e.preventDefault();
            
            if (window.WCLWLinkGenerator && typeof window.WCLWLinkGenerator.generateLink === 'function') {
                window.WCLWLinkGenerator.generateLink();
            } else {
                console.error('❌ Link Generator not available for generate link action');
            }
        });

        // Delete All Saved Links button handler
        $(document).on('click', '#lwwc-delete-all-links-btn', function(e) {
            e.preventDefault();
            const nonceAll = window.lwwc_params && window.lwwc_params.nonce_all_links;
            const message = (window.lwwc_admin_i18n && window.lwwc_admin_i18n.confirmDeleteAll)
                ? window.lwwc_admin_i18n.confirmDeleteAll
                : 'Are you sure you want to delete all saved links? This action cannot be undone.';
        window.WCLWModalManager.showConfirmModal(message, function() {
            $.post(window.lwwc_params.ajax_url, {
                action: 'lwwc_delete_all_links',
                nonce: nonceAll
            }, function(response) {
                if (response.success) {
                    window.WCLWModalManager.showConfirmModal(
                        response.data.message,
                        function() { location.reload(); },
                        'is-destructive'
                    );
                    $('#lwwc-confirm-modal-confirm').hide();
                    $('#lwwc-confirm-modal-cancel')
                        .text('Close')
                        .off('click')
                        .on('click', function() { location.reload(); });
                } else {
                    window.WCLWModalManager.showConfirmModal(
                        response.data.message,
                        function() {},
                        ''
                    );
                    $('#lwwc-confirm-modal-confirm').hide();
                    $('#lwwc-confirm-modal-cancel')
                        .text('Close')
                        .off('click')
                        .on('click', function() { window.WCLWModalManager.closeAll(); });
                }
            });
        }, 'is-destructive');
        });

        // Delete only Add-to-Cart Links button handler
        $(document).on('click', '#lwwc-delete-cart-links-btn', function(e) {
            e.preventDefault();
            const nonceCart = window.lwwc_params && window.lwwc_params.nonce_cart_links;
            const message = (window.lwwc_admin_i18n && window.lwwc_admin_i18n.confirmDeleteCartLinks)
                ? window.lwwc_admin_i18n.confirmDeleteCartLinks
                : 'Are you sure you want to permanently delete saved Add-to-Cart links? This action cannot be undone.';
            window.WCLWModalManager.showConfirmModal(message, function() {
                $.post(window.lwwc_params.ajax_url, {
                    action: 'lwwc_delete_cart_links',
                    nonce: nonceCart
                }, function(response) {
                            if (response.success) {
                                window.WCLWModalManager.showConfirmModal(
                                    response.data.message,
                                    function() { location.reload(); },
                                    'is-destructive'
                                );
                                // Adjust modal buttons: hide confirm, rename cancel to Close, bind cancel to reload
                                $('#lwwc-confirm-modal-confirm').hide();
                                $('#lwwc-confirm-modal-cancel')
                                    .text('Close')
                                    .off('click')
                                    .on('click', function() { location.reload(); });
                            } else {
                                window.WCLWModalManager.showConfirmModal(
                                    response.data.message,
                                    function() {},
                                    ''
                                );
                                // Adjust modal buttons: hide confirm, rename cancel to Close, bind cancel to close
                                $('#lwwc-confirm-modal-confirm').hide();
                                $('#lwwc-confirm-modal-cancel')
                                    .text('Close')
                                    .off('click')
                                    .on('click', function() { window.WCLWModalManager.closeAll(); });
                            }                         });
                    }, 'is-destructive');
                });

        // Delete only Checkout Links button handler
        $(document).on('click', '#lwwc-delete-checkout-links-btn', function(e) {
            e.preventDefault();
            const nonceCheckout = window.lwwc_params && window.lwwc_params.nonce_checkout_links;
            const messageCheckout = (window.lwwc_admin_i18n && window.lwwc_admin_i18n.confirmDeleteCheckoutLinks)
                ? window.lwwc_admin_i18n.confirmDeleteCheckoutLinks
                : 'Are you sure you want to permanently delete saved Checkout links? This action cannot be undone.';
            window.WCLWModalManager.showConfirmModal(messageCheckout, function() {
                $.post(window.lwwc_params.ajax_url, {
                    action: 'lwwc_delete_checkout_links',
                    nonce: nonceCheckout
                }, function(response) {
                    if (response.success) {
                        window.WCLWModalManager.showConfirmModal(
                            response.data.message,
                            function() { location.reload(); },
                            'is-destructive'
                        );
                        // Hide confirm, rename cancel to Close, bind cancel to reload
                        $('#lwwc-confirm-modal-confirm').hide();
                        $('#lwwc-confirm-modal-cancel')
                            .text('Close')
                            .off('click')
                            .on('click', function() { location.reload(); });
                    } else {
                        window.WCLWModalManager.showConfirmModal(
                            response.data.message,
                            function() {},
                            ''
                        );
                        // Hide confirm, rename cancel to Close, bind cancel to close
                        $('#lwwc-confirm-modal-confirm').hide();
                        $('#lwwc-confirm-modal-cancel')
                            .text('Close')
                            .off('click')
                            .on('click', function() { window.WCLWModalManager.closeAll(); });
                    }
                });
            }, 'is-destructive');
        });

        // Note: Action buttons (#lwwc-save-button, #lwwc-copy-button, etc.) are now handled by UI Manager

        // --- Global Utility Functions ---
        
        // Make closeAllPopups globally available for backward compatibility
        const closeAllPopups = function() {
            
            // Close through Modal Manager if available
            if (window.WCLWModalManager && typeof window.WCLWModalManager.closeAll === 'function') {
                window.WCLWModalManager.closeAll();
            }
            
            // Close through UI Manager if available
            if (window.WCLWUIManager && typeof window.WCLWUIManager.closeAllPopups === 'function') {
                window.WCLWUIManager.closeAllPopups();
            }
            
            // Legacy support - close any elements with specific classes
            $('.lwwc-modal-visible').removeClass('lwwc-modal-visible').addClass('lwwc-modal-hidden');
            $('.popup-visible').removeClass('popup-visible');
        };

        // Expose globally for backward compatibility
        window.closeAllPopups = closeAllPopups;

        // --- Production Debug Utilities (Minimal) ---
        
        // Keep essential debug utilities for production troubleshooting
        if (typeof window.wclwDebugMode !== 'undefined' && window.wclwDebugMode) {
            // Global debug function to check wizard states
            window.WCLW_DEBUG_WIZARD_STATE = function() {
                
                // Check active tab
                const isCheckoutActive = $('.nav-tab[href="#tab-checkout-links"]').hasClass('nav-tab-active');
                const isCartActive = $('.nav-tab[href="#tab-add-to-cart"]').hasClass('nav-tab-active');
                
                // Check Add-to-Cart wizard content
                const cartProducts = $('#lwwc-selected-products').children('.lwwc-selected-item').length;
                const cartPages = $('#lwwc-selected-pages').children('.lwwc-selected-item').length;
                const cartRedirect = $('input[name="lwwc-redirect"]:checked').val();
                
                // Check Checkout wizard content
                const checkoutProducts = $('#lwwc-selected-products-cart-checkout .products-list').children(':not(.placeholder)').length;
                const checkoutCoupons1 = $('#lwwc-selected-coupons').children('.lwwc-selected-coupon').length;
                const checkoutCoupons2 = $('#lwwc-selected-coupons-list-checkout').children(':not(.placeholder)').length;
                
                // Check elements visibility
                const cartVisible = $('#lwwc-add-to-cart-generator').is(':visible');
                const checkoutVisible = $('#lwwc-checkout-link-generator').is(':visible');
                
            };
            
            // Global function to check modal trigger logic
            window.WCLW_CHECK_MODAL_LOGIC = function() {
                if (window.WCLWSavedLinksManager && typeof window.WCLWSavedLinksManager.hasWizardContent === 'function') {
                    const hasContent = window.WCLWSavedLinksManager.hasWizardContent();
                    window.WCLW_DEBUG_WIZARD_STATE();
                } else {
                    console.error('❌ Saved Links Manager not available');
                }
            };
        }
        
        // Always available reset function for troubleshooting
        window.WCLW_RESET_WIZARD = function(wizardType) {
            if (window.WCLWSavedLinksManager && typeof window.WCLWSavedLinksManager.resetTargetWizardState === 'function') {
                window.WCLWSavedLinksManager.resetTargetWizardState(wizardType === 'checkout');
            } else {
                console.error('❌ Saved Links Manager not available');
            }
        };


        // Live sort of Saved Links lists on dropdown change
        $(document).on('change', '.lwwc-saved-links-sort-wrap select', function() {
            const selectId = $(this).attr('id');
            const mode = selectId.includes('checkout') ? 'checkout' : 'cart';
            const list = $('#lwwc-saved-' + mode + '-links-list');
            const items = list.children('.saved-link-item').toArray();
            
            // Store original order if not already stored
            // Always store in "oldest first" order regardless of current setting
            if (!list.data('original-order')) {
                let originalOrder = items.slice();
                // If current setting is "latest", the DOM is already reversed, so reverse it back to get oldest-first
                const currentSetting = window.lwwc_params?.settings?.saved_links_sort_order || 'latest';
                if (currentSetting === 'latest') {
                    originalOrder = originalOrder.reverse();
                }
                list.data('original-order', originalOrder);
            }
            
            // Get the original order (oldest first)
            const originalOrder = list.data('original-order');
            let sortedItems;
            
            if ($(this).val() === 'latest') {
                // Latest at top - reverse the original order (don't mutate original)
                sortedItems = originalOrder.slice().reverse();
            } else {
                // Oldest at top - use original order
                sortedItems = originalOrder.slice();
            }
            
            // Clear and re-append in sorted order
            list.empty().append(sortedItems);
        });
    });

})(jQuery);
