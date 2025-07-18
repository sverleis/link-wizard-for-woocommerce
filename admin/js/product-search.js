// Product search logic for Add-to-Cart and Checkout Link wizards
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
                            li.html(`
                                <span class="lwwc-product-name">${item.name || item.title || item.code}</span>
                                <span class="lwwc-variable-label">
                                    <span class="dashicons dashicons-admin-settings"></span>
                                    Variable
                                </span>
                            `);
                        } else {
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

    // Initialization for both wizards
    $(function() {
        if ($('#lwwc-product-search').length && $('#lwwc-search-results').length) {
            setupSearch($('#lwwc-product-search'), $('#lwwc-search-results'), 'lwwc_search_products', lwwc_admin_i18n.noProducts);
        }
        if ($('#lwwc-product-search-checkout').length && $('#lwwc-search-results-checkout').length) {
            setupSearch($('#lwwc-product-search-checkout'), $('#lwwc-search-results-checkout'), 'lwwc_search_products', lwwc_admin_i18n.noProducts);
        }
    });

    // Delegated event handlers for product search results
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

    // Keyboard navigation within product search results
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
    // Keyboard navigation from product search input to results
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
    // Hide product search results when clicking outside
    $(document).on('click', (e) => {
        const target = $(e.target);
        if (!target.closest('#lwwc-search-results, #lwwc-search-results-checkout, #lwwc-product-search, #lwwc-product-search-checkout').length) {
            $('#lwwc-search-results, #lwwc-search-results-checkout').hide();
        }
    });
})(jQuery); 