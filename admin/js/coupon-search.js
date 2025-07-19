// Coupon search logic for Checkout Link wizard
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

    // Initialization for coupon search
    $(function() {
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
    });

    // Delegated event handler for coupon selection
    $(document).on('click', '#lwwc-coupon-search-results-checkout li', function() {
        const coupon = $(this).data('coupon');
        if (coupon) {
            $(document).trigger('wclw:couponSelected', [coupon]);
            $('#lwwc-coupon-search-results-checkout').hide();
            $('#lwwc-coupon-search-checkout').val('');
        }
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

    // Hide coupon search results when clicking outside
    $(document).on('click', function(e) {
        const target = $(e.target);
        if (!target.closest('#lwwc-coupon-search-results-checkout, #lwwc-coupon-search-checkout').length) {
            $('#lwwc-coupon-search-results-checkout').hide();
        }
    });
})(jQuery); 