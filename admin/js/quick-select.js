// Handles product search and quick select for both Add-to-Cart and Checkout Link wizards
(function($) {
    'use strict';

    // Helper: Setup search for a given input/results/action
    function setupSearch(input, results, action, noResultsMessage) {
        let searchTimeout;
        input.on('keyup', function() {
            const term = $(this).val();
            clearTimeout(searchTimeout);
            if (term.length < 2) { results.hide().empty(); return; }
            searchTimeout = setTimeout(() => $.post(lwwc_params.ajax_url, { action, nonce: lwwc_params.search_nonce, search_term: term }, response => {
                results.empty().show();
                if (response.success && response.data.length) {
                    const ul = $('<ul></ul>');
                    response.data.forEach(item => {
                        const li = $('<li tabindex="0"></li>').data('item', item);
                        
                        if (item.type === 'variable') {
                            li.addClass('is-variable');
                            // Create structured HTML for variable products
                            li.html(`
                                <span class="lwwc-product-name">${item.name || item.title || item.code}</span>
                                <span class="lwwc-variable-label">
                                    <span class="dashicons dashicons-admin-settings"></span>
                                    Variable
                                </span>
                            `);
                        } else {
                            // Regular products just get the text
                            li.html(`<span class="lwwc-product-name">${item.name || item.title || item.code}</span>`);
                        }
                        
                        ul.append(li);
                    });
                    results.html(ul);
                } else {
                    results.html('<div class="no-results">' + noResultsMessage + '</div>');
                }
            }), 500);
        });
    }

    // Helper: Setup quick select for a given filter and results area
    function loadFilteredProducts(filter, resultsArea) {
        // If no filter selected, clear results and do not load
        if (!filter) {
            resultsArea.empty();
            return;
        }
        resultsArea.html('<span class="spinner is-active"></span>');
        $.post(lwwc_params.ajax_url, {
            action: 'lwwc_get_filtered_products',
            nonce: lwwc_params.search_nonce,
            filter: filter
        }, response => {
            resultsArea.empty();
            if (response.success && response.data.length) {
                response.data.forEach(product => {
                    const productTag = $('<button type="button" class="button button-secondary"></button>')
                        .text(product.name)
                        .data('item', product);
                    resultsArea.append(productTag);
                });
            } else {
                resultsArea.html('<p class="no-results">' + (lwwc_admin_i18n.noProducts || 'No products found.') + '</p>');
            }
        });
    }

    // Initialization for both wizards
    $(function() {
        // Add-to-Cart Wizard
        var isManual = false;
        if (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_mode === 'manual') {
            isManual = true;
        } else {
        }

        // Add-to-Cart
        if ($('#lwwc-product-search').length && $('#lwwc-search-results').length) {
            setupSearch($('#lwwc-product-search'), $('#lwwc-search-results'), 'lwwc_search_products', lwwc_admin_i18n.noProducts);
        }
        if ($('#lwwc-product-filter').length && $('#lwwc-quick-select-product-results').length) {
            var $filter = $('#lwwc-product-filter');
            var $results = $('#lwwc-quick-select-product-results');
            // Shared session flag for both tabs
            var quickSelectLoaded = false;
            var defaultFilter = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_default_filter) ? window.lwwc_params.settings.quick_select_default_filter : '';
            if (!isManual) {
                $filter.on('change', function() {
                    loadFilteredProducts($filter.val(), $results);
                });
                // Set default filter if nothing is selected
                if (!$filter.val() && defaultFilter) {
                    $filter.val(defaultFilter);
                }
                if ($filter.val()) {
                    $filter.trigger('change');
                } else {
                    $results.empty();
                }
            } else {
                // Manual mode: set up filter but don't auto-load
                $filter.on('change', function() {
                    // Only load if manual load has been triggered
                    if (window.__wclwQuickSelectLoaded) {
                        loadFilteredProducts($filter.val(), $results);
                    }
                });
                
                // Manual mode: load on button click ONCE, then enable filter for both tabs
                function handleManualLoad() {
                    if (window.__wclwQuickSelectLoaded) {
                        return;
                    }
                    
                    // Determine which tab is active and use appropriate elements
                    var isCheckoutTab = $('.nav-tab[href="#tab-checkout"]').hasClass('nav-tab-active') || 
                                       $('#tab-checkout').is(':visible') || 
                                       $('#lwwc-checkout-link-generator').is(':visible') ||
                                       $('#lwwc-product-filter-checkout').is(':visible');
                    
                    var $activeFilter, $activeResults;
                    if (isCheckoutTab) {
                        $activeFilter = $('#lwwc-product-filter-checkout');
                        $activeResults = $('#lwwc-quick-select-product-results-checkout');
                    } else {
                        $activeFilter = $filter;
                        $activeResults = $results;
                    }
                    
                    // Ensure the active filter and results exist
                    if (!$activeFilter.length || !$activeResults.length) {
                        $activeFilter = $filter;
                        $activeResults = $results;
                    }
                    
                    // Ensure a filter value is selected
                    var filterValue = $activeFilter.val();
                    if (!filterValue) {
                        const defaultFilter = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_default_filter) 
                            ? window.lwwc_params.settings.quick_select_default_filter 
                            : 'recent';
                        $activeFilter.val(defaultFilter);
                        filterValue = defaultFilter;
                    }
                    
                    loadFilteredProducts(filterValue, $activeResults);
                    window.__wclwQuickSelectLoaded = true;
                    // Remove all load buttons in both tabs
                    $('.lwwc-load-products-btn').remove();
                    
                    // Enable both filter dropdowns for future changes
                    $filter.on('change.wclwManual', function() {
                        loadFilteredProducts($filter.val(), $results);
                    });
                    
                    if ($('#lwwc-product-filter-checkout').length) {
                        var $filterCheckout = $('#lwwc-product-filter-checkout');
                        var $resultsCheckout = $('#lwwc-quick-select-product-results-checkout');
                        $filterCheckout.on('change.wclwManual', function() {
                            loadFilteredProducts($filterCheckout.val(), $resultsCheckout);
                        });
                    }
                }
                // Only allow one click for any load button in session
                $(document).on('click.wclwManualLoad', '.lwwc-load-products-btn', function() {
                    if (window.__wclwQuickSelectLoaded) {
                        return;
                    }
                    handleManualLoad();
                });
                // On tab switch, if already loaded, remove button
                $(document).on('click', '.nav-tab', function() {
                    setTimeout(function() {
                        if (window.__wclwQuickSelectLoaded) {
                            $('.lwwc-load-products-btn').remove();
                        }
                    }, 100);
                });
                // On page load, if already loaded (e.g. switching tabs), remove button
                if (window.__wclwQuickSelectLoaded) {
                    $('.lwwc-load-products-btn').remove();
                }
            }
        }

        // Checkout Link Wizard (IDs must be unique per tab)
        if ($('#lwwc-product-search-checkout').length && $('#lwwc-search-results-checkout').length) {
            setupSearch($('#lwwc-product-search-checkout'), $('#lwwc-search-results-checkout'), 'lwwc_search_products', lwwc_admin_i18n.noProducts);
        }
        if ($('#lwwc-product-filter-checkout').length && $('#lwwc-quick-select-product-results-checkout').length) {
            var $filterCheckout = $('#lwwc-product-filter-checkout');
            var $resultsCheckout = $('#lwwc-quick-select-product-results-checkout');
            var defaultFilterCheckout = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_default_filter) ? window.lwwc_params.settings.quick_select_default_filter : '';
            if (!isManual) {
                $filterCheckout.on('change', function() {
                    loadFilteredProducts($filterCheckout.val(), $resultsCheckout);
                });
                if (!$filterCheckout.val() && defaultFilterCheckout) {
                    $filterCheckout.val(defaultFilterCheckout);
                }
                if ($filterCheckout.val()) {
                    $filterCheckout.trigger('change');
                } else {
                    $resultsCheckout.empty();
                }
            } else {
                // Manual mode: set up filter but don't auto-load for checkout tab
                $filterCheckout.on('change', function() {
                    // Only load if manual load has been triggered
                    if (window.__wclwQuickSelectLoaded) {
                        loadFilteredProducts($filterCheckout.val(), $resultsCheckout);
                    }
                });
                
                // The manual load button click handler is already set up globally above
                // but we need to ensure it works for checkout tab elements too
                
                // On page load, if already loaded (e.g. switching tabs), remove button
                if (window.__wclwQuickSelectLoaded) {
                    $('.lwwc-load-products-btn').remove();
                }
            }
        }

        // Also trigger quick select load on tab switch (only in auto mode, or manual if already loaded)
        $(document).on('click', '.nav-tab', function() {
            setTimeout(function() {
                if ($('#lwwc-product-filter-checkout').is(':visible')) {
                    if (!isManual) {
                        // Auto mode: trigger change
                        $('#lwwc-product-filter-checkout').trigger('change');
                    } else if (window.__wclwQuickSelectLoaded) {
                        // Manual mode but already loaded: load products for checkout tab
                        var $filterCheckout = $('#lwwc-product-filter-checkout');
                        var $resultsCheckout = $('#lwwc-quick-select-product-results-checkout');
                        var filterValue = $filterCheckout.val();
                        if (!filterValue) {
                            const defaultFilter = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_default_filter) 
                                ? window.lwwc_params.settings.quick_select_default_filter 
                                : 'recent';
                            $filterCheckout.val(defaultFilter);
                            filterValue = defaultFilter;
                        }
                        loadFilteredProducts(filterValue, $resultsCheckout);
                    }
                } else if ($('#lwwc-product-filter').is(':visible')) {
                    if (!isManual) {
                        // Auto mode: trigger change
                        $('#lwwc-product-filter').trigger('change');
                    } else if (window.__wclwQuickSelectLoaded) {
                        // Manual mode but already loaded: load products for add-to-cart tab
                        var $filterCart = $('#lwwc-product-filter');
                        var $resultsCart = $('#lwwc-quick-select-product-results');
                        var filterValue = $filterCart.val();
                        if (!filterValue) {
                            const defaultFilter = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_default_filter) 
                                ? window.lwwc_params.settings.quick_select_default_filter 
                                : 'recent';
                            $filterCart.val(defaultFilter);
                            filterValue = defaultFilter;
                        }
                        loadFilteredProducts(filterValue, $resultsCart);
                    }
                }
            }, 200);
        });
    });

    // Delegated event handlers for both wizards
    $(document).on('click', '#lwwc-search-results li, #lwwc-search-results-checkout li', function() {
        const product = $(this).data('item');
        if (product) {
            $(this).trigger('wclw:product-selected', [product]);
        } else {
            console.warn('⚠️ No product data found on clicked search result');
        }
        // Hide results and blur input
        const $input = $(this).closest('.lwwc-search-results').prev('input');
        $(this).closest('.lwwc-search-results').hide();
        if ($input.length) $input.blur();
    });
    $(document).on('click', '#lwwc-quick-select-product-results .button, #lwwc-quick-select-product-results-checkout .button', function() {
        const product = $(this).data('item');
        if (product) {
            $(this).trigger('wclw:product-selected', [product]);
        } else {
            console.warn('⚠️ No product data found on clicked quick select button');
        }
    });

    // Keyboard navigation for quick select product results
    $(document).on('keydown', '#lwwc-quick-select-product-results .button, #lwwc-quick-select-product-results-checkout .button', function(e) {
        const $buttons = $(this).parent().find('.button');
        const idx = $buttons.index(this);
        if (
            e.key === 'ArrowDown' || e.keyCode === 40 ||
            e.key === 'ArrowRight' || e.keyCode === 39
        ) {
            e.preventDefault();
            const next = $buttons.get(idx + 1) || $buttons.get(0);
            if (next) $(next).focus();
        } else if (
            e.key === 'ArrowUp' || e.keyCode === 38 ||
            e.key === 'ArrowLeft' || e.keyCode === 37
        ) {
            e.preventDefault();
            const prev = $buttons.get(idx - 1) || $buttons.get($buttons.length - 1);
            if (prev) $(prev).focus();
        } else if (e.key === 'Enter' || e.keyCode === 13 || e.key === ' ' || e.keyCode === 32) {
            // Enter or Space triggers click
            e.preventDefault();
            $(this).click();
        }
    });

    // Keyboard navigation within product search results (add-to-cart and checkout)
    $(document).on('keydown', '#lwwc-search-results li, #lwwc-search-results-checkout li', function(e) {
        const $results = $(this).parent().find('li:visible');
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
        } else if (e.key === 'Escape' || e.keyCode === 27) {
            // Hide results and return focus to search input
            const $resultsContainer = $(this).closest('.lwwc-search-results');
            $resultsContainer.hide();
            // Focus the associated search input
            if ($resultsContainer.attr('id') === 'lwwc-search-results-checkout') {
                $('#lwwc-product-search-checkout').focus();
            } else {
                $('#lwwc-product-search').focus();
            }
        }
    });
    // Keyboard navigation from product search input to results (including checkout)
    $(document).on('keydown', '#lwwc-product-search, #lwwc-product-search-checkout', function(e) {
        const resultsId = $(this).attr('id') === 'lwwc-product-search-checkout' ? '#lwwc-search-results-checkout' : '#lwwc-search-results';
        const $results = $(resultsId + ' li:visible');
        if (!$results.length) return;
        if ((e.key === 'ArrowDown' || e.keyCode === 40) || (e.key === 'Tab' && !e.shiftKey)) {
            e.preventDefault();
            $results.first().focus();
        } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
            e.preventDefault();
            $results.last().focus();
        }
    });
    // Make search results focusable
    $(document).on('mouseenter', '#lwwc-search-results li, #lwwc-search-results-checkout li', function() {
        $(this).attr('tabindex', '0');
    });
    $(document).on('mouseleave', '#lwwc-search-results li, #lwwc-search-results-checkout li', function() {
        $(this).removeAttr('tabindex');
    });
    // Keyboard navigation for page search input/results
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
    $(document).on('mouseenter', '#lwwc-page-search-results li', function() {
        $(this).attr('tabindex', '0');
    });
    $(document).on('mouseleave', '#lwwc-page-search-results li', function() {
        $(this).removeAttr('tabindex');
    });

    // Hide product search results when clicking outside
    $(document).on('click', (e) => {
        const target = $(e.target);
        if (!target.closest('#lwwc-search-results, #lwwc-search-results-checkout, #lwwc-product-search, #lwwc-product-search-checkout').length) {
            $('#lwwc-search-results, #lwwc-search-results-checkout').hide();
        }
    });

    // Keyboard navigation within coupon search results (add-to-cart and checkout)
    $(document).on('keydown', '#lwwc-coupon-search-results li, #lwwc-coupon-search-results-checkout li', function(e) {
        const $results = $(this).parent().find('li:visible');
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
    // Always render coupon search results li with tabindex=0
    // (Assume similar setupSearch function for coupons as for products/pages)
    // If not, this should be added to the coupon search rendering logic.

    // Universal Escape key handler for all search result lists
    $(document).on('keydown', '#lwwc-search-results li, #lwwc-search-results-checkout li, #lwwc-page-search-results li, #lwwc-coupon-search-results-checkout li', function(e) {
        const $results = $(this).parent().find('li:visible');
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
        } else if (e.key === 'Escape' || e.keyCode === 27) {
            // Hide results and return focus to search input
            const $resultsContainer = $(this).closest('.lwwc-search-results, #lwwc-page-search-results, #lwwc-coupon-search-results-checkout');
            $resultsContainer.hide();
            // Focus the associated search input
            const id = $resultsContainer.attr('id');
            if (id === 'lwwc-search-results-checkout') {
                $('#lwwc-product-search-checkout').focus();
            } else if (id === 'lwwc-search-results') {
                $('#lwwc-product-search').focus();
            } else if (id === 'lwwc-page-search-results') {
                $('#lwwc-page-search-input').focus();
            } else if (id === 'lwwc-coupon-search-results-checkout') {
                $('#lwwc-coupon-search-checkout').focus();
            }
        }
    });

    // For all quick select and search result elements:
    // - Add role="button" and aria-label to all quick select buttons
    // - Add role="listbox" to results containers, role="option" to each li
    // - Add aria-selected to selected li
    // - Add aria-expanded, aria-controls, aria-haspopup to dropdown triggers
    // - Ensure all interactive elements are tabbable
    $(document).on('click', '.lwwc-load-products-btn', function() {
        $(this).attr('role', 'button').attr('aria-label', 'Load products');
    });
    $(document).on('click', '#lwwc-product-filter, #lwwc-product-filter-checkout', function() {
        $(this).attr('role', 'button').attr('aria-label', 'Filter products').attr('aria-expanded', 'false').attr('aria-haspopup', 'true').attr('aria-controls', 'lwwc-quick-select-product-results');
    });
    $(document).on('click', '#lwwc-quick-select-product-results, #lwwc-quick-select-product-results-checkout', function() {
        $(this).attr('role', 'listbox').attr('aria-label', 'Product results');
    });
    $(document).on('click', '#lwwc-product-search, #lwwc-product-search-checkout', function() {
        $(this).attr('role', 'search').attr('aria-label', 'Search products');
    });
    $(document).on('click', '#lwwc-page-search-input', function() {
        $(this).attr('role', 'search').attr('aria-label', 'Search pages');
    });
    $(document).on('click', '#lwwc-coupon-search-checkout', function() {
        $(this).attr('role', 'button').attr('aria-label', 'Filter coupons').attr('aria-expanded', 'false').attr('aria-haspopup', 'true').attr('aria-controls', 'lwwc-coupon-search-results');
    });
    $(document).on('click', '#lwwc-coupon-search-results', function() {
        $(this).attr('role', 'listbox').attr('aria-label', 'Coupon results');
    });

})(jQuery);
