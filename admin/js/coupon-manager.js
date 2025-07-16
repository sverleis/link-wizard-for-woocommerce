// Handles coupon search and selection for the Checkout Link wizard
(function($) {
    'use strict';

    // Helper: Setup coupon search for a given input/results/action
    function setupCouponSearch(input, results, action, noResultsMessage) {
        let searchTimeout;
        input.on('keyup', function() {
            const term = $(this).val();
            clearTimeout(searchTimeout);
            if (term.length < 2) { 
                results.hide().empty(); 
                return; 
            }
            searchTimeout = setTimeout(() => {
                $.post(lwwc_params.ajax_url, { 
                    action: action, 
                    nonce: lwwc_params.search_nonce, 
                    search_term: term 
                }, response => {
                    results.empty().show();
                    if (response.success && response.data.length) {
                        const ul = $('<ul></ul>');
                        response.data.forEach(coupon => {
                            const displayText = coupon.code;
                            // Always render li with tabindex=0 for accessibility
                            const li = $('<li tabindex="0"></li>')
                                .html(`<span class="coupon-code">${coupon.code}</span>`)
                                .data('coupon', coupon);
                            ul.append(li);
                        });
                        results.html(ul);
                    } else {
                        results.html('<div class="no-results">' + noResultsMessage + '</div>');
                    }
                });
            }, 500);
        });
    }

    // Helper: Setup quick select for coupons (if needed for filtered coupon selection)
    function loadFilteredCoupons(filter, resultsArea) {
        if (!filter) {
            resultsArea.empty();
            return;
        }
        
        resultsArea.html('<span class="spinner is-active"></span>');
        $.post(lwwc_params.ajax_url, {
            action: 'lwwc_get_filtered_coupons',
            nonce: lwwc_params.search_nonce,
            filter: filter
        }, response => {
            resultsArea.empty();
            if (response.success && response.data.length) {
                response.data.forEach(coupon => {
                    // Create button with coupon code and type
                    const buttonText = coupon.type_label ? `${coupon.code} (${coupon.type_label})` : coupon.code;
                    const couponTag = $('<button type="button" class="button button-secondary coupon-quick-select"></button>')
                        .text(buttonText)
                        .data('coupon', coupon)
                        .attr('title', `${coupon.code} - ${coupon.type_label || 'Coupon'}`);
                    resultsArea.append(couponTag);
                });
            } else {
                resultsArea.html('<p class="no-results">' + (lwwc_admin_i18n.noCoupons || 'No coupons found.') + '</p>');
            }
        }).fail(function() {
            resultsArea.html('<p class="no-results">Error loading coupons. Please try again.</p>');
        });
    }
    
    // Initialize coupon functionality
    $(function() {
        // Initialize coupon search when the checkout tab is loaded
        function initializeCouponSearch() {
            const $couponSearch = $('#lwwc-coupon-search-checkout');
            const $couponResults = $('#lwwc-coupon-search-results-checkout');
            
            if ($couponSearch.length && $couponResults.length && !$couponSearch.data('initialized')) {
                setupCouponSearch(
                    $couponSearch, 
                    $couponResults, 
                    'lwwc_search_coupons', 
                    lwwc_admin_i18n.noCoupons || 'No coupons found.'
                );
                $couponSearch.data('initialized', true);
            }
        }
        
        // Initialize coupon quick select when the checkout tab is loaded  
        function initializeCouponQuickSelect() {
            const $couponFilter = $('#lwwc-coupon-filter-checkout');
            const $couponQuickResults = $('#lwwc-coupon-quick-select-results-checkout');
            
            if ($couponFilter.length && $couponQuickResults.length && !$couponFilter.data('initialized')) {
                // Check if manual mode is enabled
                const isManual = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_mode === 'manual');
                
                $couponFilter.on('change', function() {
                    if (!isManual) {
                        loadFilteredCoupons($couponFilter.val(), $couponQuickResults);
                    }
                });
                
                $couponFilter.data('initialized', true);
                
                if (!isManual) {
                    // Auto-load coupons with the selected default
                    if ($couponFilter.val()) {
                        $couponFilter.trigger('change');
                    } else {
                        // Fallback: use the default from settings or 'all'
                        const defaultCouponFilter = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_coupon_default_filter) 
                            ? window.lwwc_params.settings.quick_select_coupon_default_filter 
                            : 'all';
                        $couponFilter.val(defaultCouponFilter).trigger('change');
                    }
                }
            }
        }
        
        // Handle manual load for coupons
        function handleManualCouponLoad() {
            if (window.__wclwCouponQuickSelectLoaded) return;
            const $couponFilter = $('#lwwc-coupon-filter-checkout');
            const $couponQuickResults = $('#lwwc-coupon-quick-select-results-checkout');
            
            if ($couponFilter.length && $couponQuickResults.length) {
                loadFilteredCoupons($couponFilter.val(), $couponQuickResults);
                window.__wclwCouponQuickSelectLoaded = true;
                
                // Remove all load buttons for coupons
                $('.lwwc-load-coupons-btn').remove();
                
                // Enable filter to work normally after manual load
                $couponFilter.off('change.wclwCouponManual').on('change.wclwCouponManual', function() {
                    loadFilteredCoupons($couponFilter.val(), $couponQuickResults);
                });
            }
        }
        
        // Handle coupon load button clicks
        $(document).on('click.wclwCouponManualLoad', '.lwwc-load-coupons-btn', function() {
            if (window.__wclwCouponQuickSelectLoaded) return;
            handleManualCouponLoad();
        });
        
        // Try to initialize immediately
        initializeCouponSearch();
        initializeCouponQuickSelect();
        
        // Also try after a delay for dynamic content
        setTimeout(function() {
            initializeCouponSearch();
            initializeCouponQuickSelect();
        }, 1000);
    });

    // Delegated event handlers for coupon selection
    $(document).on('click', '#lwwc-coupon-search-results-checkout li', function() {
        const coupon = $(this).data('coupon');
        if (coupon) {
            $(document).trigger('wclw:couponSelected', [coupon]);
            $('#lwwc-coupon-search-results-checkout').hide();
            $('#lwwc-coupon-search-checkout').val('');
        }
    });

    // Quick select coupon buttons
    $(document).on('click', '.coupon-quick-select', function() {
        const coupon = $(this).data('coupon');
        if (coupon) {
            $(document).trigger('wclw:couponSelected', [coupon]);
        }
    });

    // Hide coupon search results when clicking outside
    $(document).on('click', function(e) {
        const target = $(e.target);
        if (!target.closest('#lwwc-coupon-search-results-checkout, #lwwc-coupon-search-checkout').length) {
            $('#lwwc-coupon-search-results-checkout').hide();
        }
    });

    // Handle tab switching to ensure coupon quick select is initialized
    $(document).on('click', '.nav-tab', function() {
        setTimeout(function() {
            // Re-initialize coupon functionality when switching to checkout tab
            function initializeCouponSearch() {
                const $couponSearch = $('#lwwc-coupon-search-checkout');
                const $couponResults = $('#lwwc-coupon-search-results-checkout');
                
                if ($couponSearch.length && $couponResults.length && !$couponSearch.data('initialized')) {
                    setupCouponSearch(
                        $couponSearch, 
                        $couponResults, 
                        'lwwc_search_coupons', 
                        lwwc_admin_i18n.noCoupons || 'No coupons found.'
                    );
                    $couponSearch.data('initialized', true);
                }
            }
            
            function initializeCouponQuickSelect() {
                const $couponFilter = $('#lwwc-coupon-filter-checkout');
                const $couponQuickResults = $('#lwwc-coupon-quick-select-results-checkout');
                
                if ($couponFilter.length && $couponQuickResults.length && !$couponFilter.data('initialized')) {
                    // Check if manual mode is enabled
                    const isManual = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_mode === 'manual');
                    
                    $couponFilter.on('change', function() {
                        if (!isManual) {
                            loadFilteredCoupons($couponFilter.val(), $couponQuickResults);
                        }
                    });
                    
                    $couponFilter.data('initialized', true);
                    
                    if (!isManual) {
                        // Auto-load coupons with the selected default
                        if ($couponFilter.val()) {
                            $couponFilter.trigger('change');
                        } else {
                            // Fallback: use the default from settings or 'all'
                            const defaultCouponFilter = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.quick_select_coupon_default_filter) 
                                ? window.lwwc_params.settings.quick_select_coupon_default_filter 
                                : 'all';
                            $couponFilter.val(defaultCouponFilter).trigger('change');
                        }
                    }
                }
            }
            
            initializeCouponSearch();
            initializeCouponQuickSelect();
        }, 300);
    });

    // Keyboard navigation within coupon search results (checkout)
    $(document).on('keydown', '#lwwc-coupon-search-results-checkout li', function(e) {
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

    // Keyboard navigation from coupon search input to results (checkout)
    $(document).on('keydown', '#lwwc-coupon-search-checkout', function(e) {
        const $results = $('#lwwc-coupon-search-results-checkout li:visible');
        if (!$results.length) return;
        if ((e.key === 'ArrowDown' || e.keyCode === 40) || (e.key === 'Tab' && !e.shiftKey)) {
            e.preventDefault();
            $results.first().focus();
        } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
            e.preventDefault();
            $results.last().focus();
        }
    });

})(jQuery);
