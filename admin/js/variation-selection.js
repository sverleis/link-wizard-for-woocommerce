/**
 * Simple Variation Selection Modal
 * Displays all variations and prevents adding incomplete ones
 */
(function($) {
    'use strict';

    window.WCLWVariationSelection = {

        currentProduct: null,
        variations: [],

        /**
         * Initialize the variation selection system
         */
        init: function() {
            
            // Listen for product selection events
            $(document).on('wclw:product-selected', this.handleProductSelected.bind(this));
            
            // Handle modal interactions
            $(document).on('click', '.lwwc-modal-close, .lwwc-variation-modal-overlay', this.closeModal.bind(this));
            $(document).on('click', '.lwwc-select-variation', this.handleVariationSelect.bind(this));
            $(document).on('change', '.lwwc-variation-filter', this.handleFilterChange.bind(this));
            $(document).on('click', '.lwwc-clear-filters, .lwwc-reset-filters-header', this.clearFilters.bind(this));
            $(document).on('input', '.lwwc-search-variations', this.handleSearchInput.bind(this));
            
            // Handle keyboard shortcuts
            $(document).on('keydown', this.handleKeyboardShortcuts.bind(this));
            
            // Modal keyboard accessibility: Escape closes, Enter triggers default
            $(document).on('keydown', '.lwwc-modal-content', function(e) {
                // Only act if event target is not a button/input/textarea/select
                if ($(e.target).is('button, input, textarea, select')) return;
                if (e.key === 'Escape' || e.keyCode === 27) {
                    e.preventDefault();
                    $('.lwwc-modal-close').first().click();
                } else if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    // Trigger the first enabled .lwwc-select-variation button
                    const $primary = $(this).find('.lwwc-select-variation:not(:disabled)').first();
                    if ($primary.length) $primary[0].click();
                }
            });
        },

        /**
         * Handle product selection event
         */
        handleProductSelected: function(event, productData) {
            
            // Only handle variable products
            if (productData.type !== 'variable') {
                return;
            }

            this.openModal(productData);
        },

        /**
         * Open the variation selection modal
         */
        openModal: function(productData) {
            
            // Store product data
            this.currentProduct = productData;
            this.variations = productData.variations || [];
            
            
            // Check for incomplete variations
            const incompleteVariations = this.checkForIncompleteVariations(this.variations);
            
            // Create modal HTML
            const modalHtml = this.createVariationModalHtml(productData, incompleteVariations);
            
            
            // Remove any existing modal
            $('.lwwc-variation-modal').remove();
            
            // Add modal to page
            $('body').append(modalHtml);
            
            // Show modal with animation
            setTimeout(() => {
                const modal = $('.lwwc-variation-modal');
                modal.removeClass('lwwc-modal-hidden').addClass('lwwc-modal-visible');
                
                // Initialize reset button state (should be disabled initially)
                this.updateResetButtonState();

                // Move focus to the first focusable element in the modal
                const firstFocusable = modal.find('button, input, select, textarea, a, .lwwc-variation-item').first();
                if (firstFocusable.length) {
                    firstFocusable.focus();
                }

                // Arrow key navigation for .lwwc-variation-item
                modal.find('.lwwc-variations-list').off('keydown.wclw').on('keydown.wclw', '.lwwc-variation-item', function(e) {
                    const $items = modal.find('.lwwc-variation-item:visible');
                    const idx = $items.index(this);
                    if (e.key === 'ArrowDown' || e.keyCode === 40) {
                        e.preventDefault();
                        const next = $items.get(idx + 1) || $items.get(0);
                        if (next) $(next).focus();
                    } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
                        e.preventDefault();
                        const prev = $items.get(idx - 1) || $items.get($items.length - 1);
                        if (prev) $(prev).focus();
                    } else if (e.key === 'Enter' || e.keyCode === 13 || e.key === ' ' || e.keyCode === 32) {
                        // Enter or Space triggers add
                        e.preventDefault();
                        const $button = $(this).find('.lwwc-select-variation:not(:disabled)');
                        if ($button.length) {
                            $button[0].click();
                        }
                    }
                });
            }, 10);
        },

        /**
         * Check for variations with incomplete attributes (Any values)
         */
        checkForIncompleteVariations: function(variations) {
            const incomplete = [];
            
            variations.forEach((variation, index) => {
                const hasIncompleteAttributes = Object.values(variation.formatted_attributes || {}).some(value => value === 'Any');
                if (hasIncompleteAttributes) {
                    incomplete.push({
                        ...variation,
                        index: index
                    });
                }
            });
            
            return incomplete;
        },

        /**
         * Create modal HTML for variation selection
         */
        createVariationModalHtml: function(productData, incompleteVariations = []) {
            const hasIncompleteVariations = incompleteVariations.length > 0;
            
            // Create the warning section if needed
            let warningHtml = '';
            if (hasIncompleteVariations) {
                warningHtml = `
                    <div class="lwwc-variation-warning">
                        <h4>${lwwc_admin_i18n.incompleteVariationsTitle}</h4>
                        <p>${lwwc_admin_i18n.incompleteVariationsMessage1}</p>
                        <p><strong>${lwwc_admin_i18n.incompleteVariationsMessage2}</strong></p>
                        <a href="${lwwc_params.admin_url}post.php?post=${productData.id}&action=edit" class="button button-primary" target="_blank">
                            ${lwwc_admin_i18n.editProductInNewTab}
                        </a>
                    </div>
                `;
            }
            
            // Create filters HTML for left column
            const filtersHtml = this.createFiltersHtml(productData);
            
            // Create variations count and list for right column
            const variationsCountHtml = `
                <div class="lwwc-variations-count">
                    <span class="count-text">${lwwc_admin_i18n.variationsCount} <strong class="filtered-count">${productData.variations.length}</strong> ${lwwc_admin_i18n.variationsCount} <strong class="total-count">${productData.variations.length}</strong> ${lwwc_admin_i18n.variationsCount}</span>
                    <button type="button" class="button lwwc-reset-filters-header">${lwwc_admin_i18n.resetFilters}</button>
                </div>
            `;
            
            // Create variations list
            let variationsListHtml = '<div class="lwwc-variations-list" role="listbox">';
            productData.variations.forEach((variation, index) => {
                const isIncomplete = incompleteVariations.some(iv => iv.index === index);
                const attributesText = Object.entries(variation.formatted_attributes)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(' | ');
                
                const statusClass = isIncomplete ? 'incomplete' : 'complete';
                const statusIcon = isIncomplete ? '⚠️' : '✅';
                const disabledAttr = isIncomplete ? 'disabled' : '';
                
                // Create data attributes for filtering
                const dataAttributes = Object.entries(variation.formatted_attributes)
                    .map(([key, value]) => `data-${key.toLowerCase().replace(/\s+/g, '-')}="${value.toLowerCase()}"`)
                    .join(' ');
                
                variationsListHtml += `
                    <div class="lwwc-variation-item ${statusClass}" 
                         data-variation-id="${variation.id}" 
                         ${dataAttributes}
                         role="option"
                         tabindex="0">
                        <div class="variation-info">
                            <span class="variation-status">${statusIcon}</span>
                            <span class="variation-name">${lwwc_admin_i18n.variationName}: ${variation.id} - ${variation.name}</span>
                            <span class="variation-attributes">(${attributesText})</span>
                            <span class="variation-price">${variation.display_price}</span>
                        </div>
                        <button type="button" 
                                class="button button-primary lwwc-select-variation lwwc-button" 
                                data-variation='${JSON.stringify(variation)}' 
                                ${disabledAttr}>
                            ${isIncomplete ? lwwc_admin_i18n.cannotAddIncomplete : lwwc_admin_i18n.addToLink}
                        </button>
                    </div>
                `;
            });
            variationsListHtml += '</div>';

            return `
                <div class="lwwc-variation-modal lwwc-modal-hidden" role="dialog" aria-modal="true" aria-labelledby="lwwc-variation-modal-title" aria-describedby="lwwc-variation-modal-body">
                    <div class="lwwc-variation-modal-overlay"></div>
                    <div class="lwwc-variation-modal-content">
                        <div class="lwwc-modal-header">
                            <h3 id="lwwc-variation-modal-title">${lwwc_admin_i18n.selectVariation}: ${productData.name}</h3>
                            <button type="button" class="lwwc-modal-close lwwc-close-destructive" aria-label="${lwwc_admin_i18n.close}">${lwwc_admin_i18n.close}</button>
                        </div>
                        <div class="lwwc-modal-body" id="lwwc-variation-modal-body">
                            <div class="lwwc-filters-column">
                                ${filtersHtml}
                            </div>
                            <div class="lwwc-variations-section">
                                <div class="lwwc-variations-section-header">
                                    ${warningHtml}
                                    ${variationsCountHtml}
                                </div>
                                <div class="lwwc-variations-section-body">
                                    ${variationsListHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Create filters HTML
         */
        createFiltersHtml: function(productData) {
            // Get all unique attribute keys and values
            const attributes = {};
            
            productData.variations.forEach(variation => {
                Object.entries(variation.formatted_attributes).forEach(([key, value]) => {
                    if (!attributes[key]) {
                        attributes[key] = new Set();
                    }
                    attributes[key].add(value);
                });
            });
            
            let filtersHtml = '<div class="lwwc-variation-filters">';
            filtersHtml += `<h4>${lwwc_admin_i18n.filterVariations}</h4>`;
            filtersHtml += '<div class="filter-controls">';
            
            // Add search input first
            filtersHtml += `
                <div class="filter-group">
                    <label for="search-variations">${lwwc_admin_i18n.search}:</label>
                    <input type="text" class="lwwc-search-variations" id="search-variations" placeholder="${lwwc_admin_i18n.searchByIDAttributesPrice}" />
                </div>
            `;
            
            // Create a dropdown for each attribute
            Object.entries(attributes).forEach(([attributeName, valuesSet]) => {
                const values = Array.from(valuesSet).sort();
                const filterKey = attributeName.toLowerCase().replace(/\s+/g, '-');
                
                filtersHtml += `
                    <div class="filter-group">
                        <label for="filter-${filterKey}">${attributeName}:</label>
                        <select class="lwwc-variation-filter" data-attribute="${filterKey}" id="filter-${filterKey}">
                            <option value="">${lwwc_admin_i18n.all} ${attributeName}</option>
                            ${values.map(value => `<option value="${value.toLowerCase()}">${value}</option>`).join('')}
                        </select>
                    </div>
                `;
            });
            
            filtersHtml += `
                    <div class="filter-group">
                        <button type="button" class="button lwwc-clear-filters">${lwwc_admin_i18n.clearAllFilters}</button>
                    </div>
                </div>
            `;
            filtersHtml += '</div>';
            
            return filtersHtml;
        },

        /**
         * Update the reset button state based on active filters
         */
        updateResetButtonState: function() {
            const modal = $('.lwwc-variation-modal');
            if (!modal.length) return;
            
            const hasActiveFilters = this.hasActiveFilters(modal);
            const resetButton = modal.find('.lwwc-reset-filters-header');
            
            if (hasActiveFilters) {
                resetButton.removeClass('lwwc-reset-disabled').addClass('lwwc-reset-enabled');
            } else {
                resetButton.removeClass('lwwc-reset-enabled').addClass('lwwc-reset-disabled');
            }
        },

        /**
         * Check if there are any active filters
         */
        hasActiveFilters: function(modal) {
            const searchTerm = modal.find('.lwwc-search-variations').val().trim();
            if (searchTerm) return true;
            
            let hasFilters = false;
            modal.find('.lwwc-variation-filter').each(function() {
                if ($(this).val()) {
                    hasFilters = true;
                    return false; // break
                }
            });
            
            return hasFilters;
        },

        /**
         * Handle filter changes
         */
        handleFilterChange: function(event) {
            this.applyFilters();
            this.updateResetButtonState();
        },

        /**
         * Apply all active filters
         */
        applyFilters: function() {
            const modal = $('.lwwc-variation-modal');
            if (!modal.length) return;
            
            const filters = {};
            const searchTerm = modal.find('.lwwc-search-variations').val().toLowerCase().trim();
            
            // Collect all active filters
            modal.find('.lwwc-variation-filter').each(function() {
                const $filter = $(this);
                const attribute = $filter.data('attribute');
                const value = $filter.val();
                
                if (value) {
                    filters[attribute] = value.toLowerCase();
                }
            });
            
            
            let visibleCount = 0;
            
            // Show/hide variations based on filters
            modal.find('.lwwc-variation-item').each(function() {
                const $item = $(this);
                let shouldShow = true;
                
                // Check attribute filters
                Object.entries(filters).forEach(([attribute, filterValue]) => {
                    const itemValue = $item.data(attribute);
                    if (itemValue && itemValue.toString().toLowerCase() !== filterValue) {
                        shouldShow = false;
                    }
                });
                
                // Check search term
                if (shouldShow && searchTerm) {
                    const itemText = $item.text().toLowerCase();
                    const variationId = $item.data('variation-id').toString();
                    
                    if (!itemText.includes(searchTerm) && !variationId.includes(searchTerm)) {
                        shouldShow = false;
                    }
                }
                
                if (shouldShow) {
                    $item.removeClass('lwwc-filtered-hidden');
                    visibleCount++;
                } else {
                    $item.addClass('lwwc-filtered-hidden');
                }
            });
            
            // Update count display
            modal.find('.filtered-count').text(visibleCount);
            
        },

        /**
         * Handle search input
         */
        handleSearchInput: function(event) {
            this.applyFilters();
            this.updateResetButtonState();
        },

        /**
         * Handle keyboard shortcuts
         */
        handleKeyboardShortcuts: function(event) {
            const modal = $('.lwwc-variation-modal');
            if (!modal.length || !modal.hasClass('lwwc-modal-visible')) {
                return;
            }

            // ESC to close modal
            if (event.keyCode === 27) {
                event.preventDefault();
                this.closeModal();
            }
            
            // Ctrl+F or Cmd+F to focus search
            if ((event.ctrlKey || event.metaKey) && event.keyCode === 70) {
                event.preventDefault();
                modal.find('.lwwc-search-variations').focus();
            }
        },

        /**
         * Clear all filters
         */
        clearFilters: function(event) {
            event.preventDefault();

            // Use currentTarget to reference the clicked button
            const button = $(event.currentTarget);
            // Exit if reset is disabled
            if (button.hasClass('lwwc-reset-disabled')) {
                return;
            }


            const modal = $('.lwwc-variation-modal');
            if (!modal.length) return;

            // Reset filter dropdowns and search input
            modal.find('.lwwc-variation-filter').val('');
            modal.find('.lwwc-search-variations').val('');

            // Show all variation items and remove filtered-hidden class
            const items = modal.find('.lwwc-variation-item');
            items.removeClass('lwwc-filtered-hidden').show();

            // Update counts
            modal.find('.filtered-count').text(items.length);

            // Update reset button state
            this.updateResetButtonState();
        },

        /**
         * Handle variation selection
         */
        handleVariationSelect: function(event) {
            event.preventDefault();
            
            const button = $(event.target);
            const variationData = button.data('variation');
            
            if (!variationData) {
                console.error('❌ No variation data found');
                return;
            }
            
            
            // Trigger event for other components to handle
            $(document).trigger('wclw:variation-selected', [variationData, this.currentProduct]);
            
            // Close modal
            this.closeModal();
        },

        /**
         * Close the modal
         */
        closeModal: function(event) {
            if (event) {
                event.preventDefault();
            }
            
            
            const modal = $('.lwwc-variation-modal');
            if (modal.length) {
                modal.removeClass('lwwc-modal-visible').addClass('lwwc-modal-hidden');
                
                // Remove modal after animation
                setTimeout(() => {
                    modal.remove();
                }, 300);
            }
        }
    };

    // Initialize when document is ready
    $(document).ready(function() {
        window.WCLWVariationSelection.init();
    });

})(jQuery);
