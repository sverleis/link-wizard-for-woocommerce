// Search Manager - Handles page search functionality
(function($) {
    'use strict';

    window.WCLWSearchManager = {
        
        // Initialize search manager
        init: function() {
            this.bindEvents();
            this.setupPageSearch();
        },

        // Bind search-related events
        bindEvents: function() {
            // Handle page search results
            $(document).on('click', '#lwwc-page-search-results li', (e) => {
                const page = $(e.target).data('item');
                if (page) {
                    this.addPageToList(page);
                    $('#lwwc-page-search-results').hide();
                    $('#lwwc-page-search-input').val('');
                }
            });

            // Handle remove button for pages
            $(document).on('click', '.remove-page-btn', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removePage();
            });

            // Hide search results when clicking outside
            $(document).on('click', (e) => {
                const target = $(e.target);
                if (!target.closest('#lwwc-page-search-results, #lwwc-page-search-input').length) {
                    $('#lwwc-page-search-results').hide();
                }
            });

            // Make page search results focusable and keyboard navigable
            $(document).on('keydown', '#lwwc-page-search-input', function(e) {
                const $results = $('#lwwc-page-search-results li:visible');
                if (!$results.length) return;
                if ((e.key === 'ArrowDown' || e.keyCode === 40) || (e.key === 'Tab' && !e.shiftKey)) {
                    e.preventDefault();
                    $results.first().focus();
                } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
                    e.preventDefault();
                    $results.last().focus();
                }
            });
            // Make li focusable
            $(document).on('mouseenter', '#lwwc-page-search-results li', function() {
                $(this).attr('tabindex', '0');
            });
            $(document).on('mouseleave', '#lwwc-page-search-results li', function() {
                $(this).removeAttr('tabindex');
            });
            // Keyboard navigation within results
            $(document).on('keydown', '#lwwc-page-search-results li', function(e) {
                const $results = $('#lwwc-page-search-results li:visible');
                const idx = $results.index(this);
                if (e.key === 'ArrowDown' || e.keyCode === 40) {
                    e.preventDefault();
                    const next = $results.get(idx + 1) || $results.get(0);
                    if (next) $(next).focus();
                } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
                    e.preventDefault();
                    const prev = $results.get(idx - 1) || $results.get($results.length - 1);
                    if (prev) $(prev).focus();
                } else if (e.key === 'Enter' || e.keyCode === 13 || e.key === ' ' || e.keyCode === 32) {
                    e.preventDefault();
                    $(this).click();
                }
            });
        },

        // Setup page search functionality
        setupPageSearch: function() {
            const input = $('#lwwc-page-search-input');
            const results = $('#lwwc-page-search-results');
            const action = 'lwwc_search_pages';
            const noResultsMessage = window.lwwc_admin_i18n?.noPages || 'No pages found.';
            
            this.setupSearch(input, results, action, noResultsMessage);
        },

        // Generic search setup function
        setupSearch: function(input, results, action, noResultsMessage) {
            let searchTimeout;
            
            input.on('keyup', (e) => {
                const term = $(e.target).val();
                clearTimeout(searchTimeout);
                
                if (term.length < 2) { 
                    results.hide().empty(); 
                    return; 
                }
                
                searchTimeout = setTimeout(() => {
                    $.post(window.lwwc_params?.ajax_url, { 
                        action: action, 
                        nonce: window.lwwc_params?.search_nonce, 
                        search_term: term 
                    }, (response) => {
                        results.empty().show();
                        
                        if (response.success && response.data.length) {
                            const ul = $('<ul></ul>');
                            response.data.forEach(item => {
                                const displayText = item.name || item.title || item.code;
                                // Always render li with tabindex=0 for keyboard accessibility
                                const li = $('<li tabindex="0"></li>').data('item', item);
                                if (item.type === 'variable') {
                                    li.addClass('is-variable');
                                    // Create structured HTML for variable products
                                    li.html(`
                                        <span class="lwwc-product-name">${displayText}</span>
                                        <span class="lwwc-variable-label">
                                            <span class="dashicons dashicons-admin-settings"></span>
                                            Variable
                                        </span>
                                    `);
                                } else {
                                    // Regular products just get the text
                                    li.html(`<span class="lwwc-product-name">${displayText}</span>`);
                                }
                                ul.append(li);
                            });
                            results.html(ul);
                        } else {
                            results.html('<div class="no-results">' + noResultsMessage + '</div>');
                        }
                    });
                }, 500);
            });
        },

        // Add page to the selected page list
        addPageToList: function(item) {
            const selectedPage = $('#lwwc-selected-page');
            const redirectPageUrl = $('#lwwc-redirect-page-url');
            
            // Check if a page is already selected
            const existingPage = selectedPage.find('.lwwc-selected-page-item');
            if (existingPage.length > 0) {
                // Ask user to replace existing page
                const existingPageName = existingPage.find('.item-name').text() || 'existing page';
                const confirmMessage = `Replace <strong>"${existingPageName}"</strong> with <strong>"${item.title}"</strong>?`;
                
                if (window.WCLWModalManager && typeof window.WCLWModalManager.showConfirmModal === 'function') {
                    window.WCLWModalManager.showConfirmModal(confirmMessage, () => {
                        this.replaceSelectedPage(item);
                    });
                } else {
                    if (confirm(confirmMessage.replace(/<\/?strong>/g, '"'))) {
                        this.replaceSelectedPage(item);
                    }
                }
                return;
            }
            
            // Add the page normally
            this.replaceSelectedPage(item);
        },

        // Replace the currently selected page
        replaceSelectedPage: function(item) {
            const selectedPage = $('#lwwc-selected-page');
            const redirectPageUrl = $('#lwwc-redirect-page-url');
            
            selectedPage.html(`
                <div class="lwwc-selected-page-item" tabindex="-1">
                    <div class="item-name">${item.title}</div>
                    <div class="item-remove">
                        <button class="button is-destructive remove-page-btn lwwc-button" title="${window.lwwc_admin_i18n?.remove || 'Remove'}" aria-label="${window.lwwc_admin_i18n?.remove || 'Remove'}">
                            <span class="dashicons dashicons-trash"></span>
                            <span class="button-text">${window.lwwc_admin_i18n?.remove || 'Remove'}</span>
                        </button>
                    </div>
                </div>
            `);
            
            // Focus the newly added page item for accessibility
            const newPageItem = selectedPage.children('.lwwc-selected-page-item').last();
            newPageItem.focus();
            // Handle Tab key to move to output section
            newPageItem.off('keydown.wclw').on('keydown.wclw', function(e) {
                if (e.key === 'Tab' && !e.shiftKey) {
                    const $firstOutput = $('.lwwc-generator-output.cart .lwwc-output-section').find('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').filter(':visible').first();
                    if ($firstOutput.length) {
                        e.preventDefault();
                        $firstOutput.focus();
                    }
                }
            });
            
            redirectPageUrl.val(item.url);
            
            // Update UI state and generate link
            if (window.WCLWLinkGenerator) {
                window.WCLWLinkGenerator.generateLink();
            }
        },

        // Remove the selected page
        removePage: function() {
            const selectedPage = $('#lwwc-selected-page');
            const redirectPageUrl = $('#lwwc-redirect-page-url');
            const pageSearch = $('#lwwc-page-search-input');
            
            // Restore the placeholder instead of completely emptying
            selectedPage.html('<p class="placeholder">No page selected.</p>');
            redirectPageUrl.val('');
            pageSearch.val('');
            
            // Update UI state and generate link
            if (window.WCLWLinkGenerator) {
                window.WCLWLinkGenerator.generateLink();
            }
        },

        // Clear all search inputs and results
        clearSearches: function() {
            // Clear page search
            $('#lwwc-page-search-input').val('');
            $('#lwwc-page-search-results').hide().empty();
            
            // Clear selected page
            this.removePage();
        },

        // Get search results for a given term and action
        searchFor: function(term, action, callback) {
            if (!term || term.length < 2) {
                callback([]);
                return;
            }
            
            $.post(window.lwwc_params?.ajax_url, {
                action: action,
                nonce: window.lwwc_params?.search_nonce,
                search_term: term
            }, (response) => {
                if (response.success && response.data) {
                    callback(response.data);
                } else {
                    callback([]);
                }
            }).fail(() => {
                callback([]);
            });
        },

        // Search for pages specifically
        searchPages: function(term, callback) {
            this.searchFor(term, 'lwwc_search_pages', callback);
        },

        // Get page details by ID
        getPageById: function(pageId, callback) {
            $.post(window.lwwc_params?.ajax_url, {
                action: 'lwwc_get_page_details',
                nonce: window.lwwc_params?.search_nonce,
                page_id: pageId
            }, (response) => {
                if (response.success && response.data) {
                    callback(response.data);
                } else {
                    callback(null);
                }
            }).fail(() => {
                callback(null);
            });
        },
        
        // Handle product selection from events
        addProductToList: function(product) {
            
            // Detect which wizard we're in by checking which tab is active
            const checkoutTab = $('.nav-tab[href="#tab-checkout-links"]');
            const cartTab = $('.nav-tab[href="#tab-add-to-cart"]');
            const isCheckoutTab = checkoutTab.hasClass('nav-tab-active');
            const isCartTab = cartTab.hasClass('nav-tab-active');
            
            
            if (isCheckoutTab && window.WCLWCheckoutWizard && typeof window.WCLWCheckoutWizard.addProduct === 'function') {
                const success = window.WCLWCheckoutWizard.addProduct(product, product.quantity || 1);
                if (success) {
                    $(document).trigger('wclw:product-list-updated');
                }
                return;
            }
            
            if (isCartTab && window.WCLWAddToCartWizard && typeof window.WCLWAddToCartWizard.addProduct === 'function') {
                const success = window.WCLWAddToCartWizard.addProduct(product, product.quantity || 1);
                if (success) {
                    $(document).trigger('wclw:product-list-updated');
                }
                return;
            }
            
            // Fallback to direct addition (for backward compatibility)
            this.addProductDirectly(product);
        },

        // Fallback method for direct product addition (backward compatibility)
        addProductDirectly: function(product) {
            // Detect which wizard we're in by checking which products container exists and is visible
            let productsList;
            const checkoutProductsList = $('#lwwc-selected-products-cart-checkout .products-list');
            const cartProductsList = $('#lwwc-selected-products-cart .products-list');
            
            if (checkoutProductsList.length > 0 && checkoutProductsList.is(':visible')) {
                productsList = checkoutProductsList;
            } else if (cartProductsList.length > 0 && cartProductsList.is(':visible')) {
                productsList = cartProductsList;
                
                // For cart wizard, enforce single product rule
                const existingProducts = productsList.find('.product-item');
                if (existingProducts.length > 0) {
                    const existingProductName = existingProducts.first().find('.product-name').text() || 'existing product';
                    const confirmMessage = window.lwwc_admin_i18n?.productReplaceConfirm.replace('%1$s', existingProductName).replace('%2$s', product.name || 'Unknown Product');
                    
                    if (window.WCLWModalManager && typeof window.WCLWModalManager.showConfirmModal === 'function') {
                        window.WCLWModalManager.showConfirmModal(confirmMessage, () => {
                            existingProducts.remove();
                            // Add the new product after removal
                            setTimeout(() => {
                                window.WCLWSearchManager.addProductDirectly(product);
                            }, 10);
                        });
                    } else {
                        if (confirm(confirmMessage)) {
                            existingProducts.remove();
                            window.WCLWSearchManager.addProductDirectly(product);
                        } else {
                            return;
                        }
                    }
                }
            } else {
                console.warn('⚠️ No visible products list found');
                return;
            }
            
            // Check if product already exists (for checkout wizard)
            if (productsList.find(`[data-product-id="${product.id}"]`).length > 0) {
                return;
            }
            
            // Hide the placeholder if it exists
            const placeholder = productsList.find('.placeholder');
            if (placeholder.length > 0) {
                placeholder.hide();
            }
            
            // Create product list item with proper structure
            const productName = product.name || 'Unknown Product';
            const displayAttributes = product.display_attributes || '';
            const productType = product.type || '';
            
            // For variations, show the selected attributes instead of just the type
            let productTypeDisplay = '';
            if (displayAttributes) {
                productTypeDisplay = `<span class="product-variations">(${displayAttributes})</span>`;
            } else if (productType) {
                productTypeDisplay = `<span class="product-type">(${productType})</span>`;
            }
            
            const productItem = $(`
                <div class="product-item" data-product-id="${product.id}">
                    <div class="product-info">
                        <span class="product-name">${productName}</span>
                        ${productTypeDisplay}
                    </div>
                    <button type="button" class="button button-small remove-product">Remove</button>
                </div>
            `);
            
            // Add remove functionality
            productItem.find('.remove-product').on('click', function() {
                $(this).closest('.product-item').remove();
                
                // Show placeholder if no products left
                const remainingProducts = productsList.find('.product-item');
                if (remainingProducts.length === 0) {
                    productsList.find('.placeholder').show();
                }
                
                // Trigger update event
                $(document).trigger('wclw:product-list-updated');
            });
            
            // Add to list (after placeholder)
            productsList.append(productItem);
            
            // Trigger update event
            $(document).trigger('wclw:product-list-updated');
        },
        
        // Handle variation selection
        addVariationToList: function(variation) {
            this.addProductToList(variation);
        },

        // Clear all selected products from both wizards
        clearSelectedProducts: function() {
            
            // Clear products from both cart and checkout lists
            const cartProductsList = $('#lwwc-selected-products-cart .products-list');
            const checkoutProductsList = $('#lwwc-selected-products-cart-checkout .products-list');
            
            // Remove all product items
            cartProductsList.find('.product-item').remove();
            checkoutProductsList.find('.product-item').remove();
            
            // Show placeholders
            cartProductsList.find('.placeholder').show();
            checkoutProductsList.find('.placeholder').show();
            
            
            // Trigger update event
            $(document).trigger('wclw:product-list-updated');
        },

    };

    // Make addPageToList globally available for backward compatibility
    window.addPageToList = function(item) {
        if (window.WCLWSearchManager && window.WCLWSearchManager.addPageToList) {
            window.WCLWSearchManager.addPageToList(item);
        }
    };

})(jQuery);