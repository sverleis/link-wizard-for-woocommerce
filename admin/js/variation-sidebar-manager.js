/**
 * WooCommerce Link Wizard - Variation and Sidebar Manager
 * Handles variation modal positioning, sidebar toggle, and filters UI
 */

(function($) {
    'use strict';

    // Global namespace for variation and sidebar functionality
    window.WCLWVariationSidebarManager = {
        
        // Initialize variation sidebar manager
        init: function() {
            this.setupEventHandlers();
            this.setupVariationEventHandlers();
            this.initializeSidebarState();
        },
        
        /**
         * Position variation dropdown to prevent off-screen issues
         */
        positionVariationDropdown: function() {
            const dropdown = $('.lwwc-variation-controls-content');
            const trigger = $('.lwwc-variation-controls-header');
            
            if (!dropdown.length || !trigger.length) return;
            
            // Reset any previous positioning and classes
            dropdown.css({
                'top': '',
                'bottom': '',
                'left': '',
                'right': '',
                'max-height': ''
            }).removeClass('open-upward left-aligned');
            
            const triggerRect = trigger[0].getBoundingClientRect();
            const dropdownHeight = dropdown[0].scrollHeight;
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Calculate available space below and above
            const spaceBelow = viewportHeight - triggerRect.bottom - 10; // 10px margin
            const spaceAbove = triggerRect.top - 10; // 10px margin
            
            // Determine if dropdown should open upward or downward
            let maxHeight = Math.min(300, viewportHeight * 0.6); // Max 300px or 60% of viewport
            
            if (dropdownHeight > spaceBelow && spaceAbove > spaceBelow) {
                // Open upward
                dropdown.addClass('open-upward').css({
                    'top': 'auto',
                    'bottom': '100%',
                    'margin-top': '0',
                    'margin-bottom': '4px'
                });
                maxHeight = Math.min(spaceAbove, maxHeight);
            } else {
                // Open downward (default)
                maxHeight = Math.min(spaceBelow, maxHeight);
            }
            
            dropdown.css('max-height', maxHeight + 'px');
            
            // Handle horizontal positioning for small screens
            if (viewportWidth <= 600) {
                const triggerLeft = triggerRect.left;
                const dropdownWidth = dropdown.outerWidth();
                
                if (triggerLeft + dropdownWidth > viewportWidth - 20) {
                    // Position from right edge
                    dropdown.css({
                        'left': 'auto',
                        'right': '0'
                    });
                } else {
                    // Position from left edge
                    dropdown.addClass('left-aligned').css({
                        'left': '0',
                        'right': 'auto'
                    });
                }
            }
        },

        /**
         * Handle variation modal opening
         */
        openVariationModal: function(product, isCheckoutTab = false) {
            
            if (!product) {
                console.error('❌ No product provided to openVariationModal');
                if (window.wclwNotices) {
                    window.wclwNotices.error('Error: No product data provided.');
                }
                return;
            }
            
            if (product.type !== 'variable') {
                console.error('❌ Product is not a variable product:', product.type);
                if (window.wclwNotices) {
                    window.wclwNotices.error('This product is not a variable product.');
                }
                return;
            }
            
            if (!product.variations || product.variations.length === 0) {
                console.warn('⚠️ No variations found for product:', product);
                if (window.wclwNotices) {
                    window.wclwNotices.error('This product has no variations available.');
                }
                return;
            }

            const modal = $('#lwwc-variation-modal');
            if (!modal.length) {
                console.error('❌ Variation modal not found in DOM');
                if (window.wclwNotices) {
                    window.wclwNotices.error('Modal element not found. Please refresh the page.');
                }
                return;
            }


            // Store product data and checkout tab flag on modal
            modal.data('product', product);
            modal.data('isCheckoutTab', isCheckoutTab);

            // COMPLETELY clear and reset modal content first
            this.clearModalContent(modal);

            // Set product name in modal header
            modal.find('#lwwc-modal-product-name').text(product.name || 'Select Variation');

            // Build and set new variation content
            try {
                // Build variation list
                const variationList = this.buildVariationList(product.variations);
                const variationListContainer = modal.find('#lwwc-modal-variation-list');
                if (variationListContainer.length) {
                    variationListContainer.html(variationList);
                    // Bind variation objects to DOM elements for click handlers
                    this.bindVariationData(product.variations);
                } else {
                    console.error('Variation list container not found!');
                }
                
                // Build variation filters if needed
                const variationFilters = this.buildVariationFilters(product.variations);
                const variationFiltersContainer = modal.find('#lwwc-variation-filters');
                if (variationFiltersContainer.length) {
                    variationFiltersContainer.html(variationFilters);
                    
                    // Show the filters section if filters are available
                    if (variationFilters.length > 0) {
                        modal.find('#lwwc-variation-controls').show();
                        
                        // Add helper text for "Any" attributes
                        const hasAnyAttributes = product.variations.some(v => 
                            Object.values(v.formatted_attributes || {}).includes('Any')
                        );
                        if (hasAnyAttributes) {
                            const helperText = '<div class="lwwc-filter-helper">💡 Use filters to configure variations with "Any" attributes for checkout</div>';
                            variationFiltersContainer.prepend(helperText);
                        }
                    } else {
                        modal.find('#lwwc-variation-controls').hide();
                    }
                } else {
                    console.error('Variation filters container not found!');
                }
            } catch (error) {
                console.error('Error building variation content:', error);
                alert('Error loading variations. Please try again.');
                return;
            }
            
            // Store product data for later use and reset filters button
            modal.data('product', product);
            modal.data('isCheckoutTab', isCheckoutTab);
            // Hide reset filters until a filter is active
            modal.find('#lwwc-variation-reset-filters').hide();
            
            // Show modal with proper classes and CSS
            modal.removeClass('lwwc-modal-hidden').addClass('lwwc-modal-visible');
            modal.css({
                'display': 'block',
                'visibility': 'visible',
                'opacity': '1',
                'z-index': '99999'
            }).show();
            
            
            // Check if modal is actually visible in DOM
            const modalRect = modal[0].getBoundingClientRect();
            
            // Check for CSS conflicts
            const computedStyle = window.getComputedStyle(modal[0]);
            
            // Position dropdown if needed
            setTimeout(() => {
                this.positionVariationDropdown();
            }, 50);
        },

        /**
         * Clear all modal content completely
         */
        clearModalContent: function(modal) {
            // Clear product name
            modal.find('#lwwc-modal-product-name').text('');
            
            // Clear variation list container content (but keep the container)
            modal.find('#lwwc-modal-variation-list').empty();
            
            // Clear variation filters container content (but keep the container)
            modal.find('#lwwc-variation-filters').empty();
            
            // Clear any stored data
            modal.removeData('product').removeData('isCheckoutTab');
            
            // Clear filter status
            modal.find('#lwwc-variation-filter-status').text('');
            
        },

        /**
         * Bind variation objects to DOM elements via jQuery data
         */
        bindVariationData: function(variations) {
            const container = $('#lwwc-modal-variation-list');
            container.find('.variation-item').each(function(index) {
                if (variations[index]) {
                    $(this).data('variation', variations[index]);
                }
            });
        },
        /**
         * Build variation list HTML for modal
         */
        buildVariationList: function(variations) {
            
            if (!variations || variations.length === 0) {
                return '<p class="no-variations">No variations available.</p>';
            }

            let html = '<div class="lwwc-variation-items">';
            
            variations.forEach((variation, index) => {
                const variationId = variation.id || index;
                const variationName = this.getVariationDisplayName(variation);
                const stockStatus = variation.stock_status || 'instock';
                const inStock = stockStatus === 'instock';
                
                
                // Create clickable variation item (no separate select button) - use correct CSS class
                // Attach variation object as data attribute (JSON string)
                const isConfigured = variation.isConfigured ? ' configured' : '';
                html += `<div class="variation-item ${!inStock ? 'out-of-stock' : ''}${isConfigured}" data-variation-id="${variationId}" data-variation='${JSON.stringify(variation)}'>`;
                html += `<div class="variation-info">`;
                // Show variation attributes instead of parent title
                const attrs = variation.formatted_attributes || {};
                const attrEntries = Object.entries(attrs).map(([label, value]) => {
                    // Handle "Any" values more clearly, but for configured variations show the actual values
                    if (variation.isConfigured && value !== 'Any') {
                        return `${label}: ${value}`;
                    } else if (value === 'Any') {
                        return `${label}: Any ${label}`;
                    } else {
                        return `${label}: ${value}`;
                    }
                });
                if (attrEntries.length) {
                    html += `<div class="variation-attributes">${attrEntries.join(' | ')}</div>`;
                    if (variation.isConfigured) {
                        html += `<div class="variation-configured-note">✓ Configured for checkout</div>`;
                    }
                } else {
                    html += `<div class="variation-name">${variationName}</div>`;
                }
                
                if (!inStock) {
                    html += `<div class="variation-stock">Out of Stock</div>`;
                } else {
                    html += `<div class="variation-availability">Available</div>`;
                }
                
                html += `</div>`;
                html += `</div>`;
            });
            
            html += '</div>';
            return html;
        },

        /**
         * Build variation filters HTML
         */
        buildVariationFilters: function(variations) {
            
            if (!variations || variations.length === 0) {
                return '';
            }

            // Get the product data that contains attribute options
            const modal = $('#lwwc-variation-modal');
            const product = modal.data('product');
            

            // Check if we have virtual variations (generated combinations)
            const hasVirtualVariations = variations.some(v => v.is_virtual);
            const hasAnyAttributes = variations.some(v => 
                Object.values(v.formatted_attributes || {}).includes('Any')
            );


            if (!hasVirtualVariations && !hasAnyAttributes) {
                // Standard variation filtering for products with specific variations
                return this.buildStandardVariationFilters(variations, product);
            } else {
                // Combination selector for products with virtual variations or "Any" attributes
                return this.buildCombinationSelector(product);
            }
        },

        /**
         * Build standard variation filters (for existing variations)
         */
        buildStandardVariationFilters: function(variations, product) {
            const attributes = {};
            
            // Collect all attributes that exist in variations
            variations.forEach((variation, index) => {
                const variationAttrs = variation.formatted_attributes || variation.attributes || {};
                Object.keys(variationAttrs).forEach(attr => {
                    if (!attributes[attr]) {
                        attributes[attr] = new Set();
                    }
                });
            });

            // Collect specific values from variations
            variations.forEach(variation => {
                const variationAttrs = variation.formatted_attributes || variation.attributes || {};
                Object.entries(variationAttrs).forEach(([attr, value]) => {
                    if (attributes[attr] && value && value !== 'Any') {
                        attributes[attr].add(value);
                    }
                });
            });

            // Add values from product attribute options for attributes that only have "Any"
            if (product && product.attribute_options) {
                const labelToSlug = {};
                if (product.all_attributes) {
                    Object.entries(product.all_attributes).forEach(([slug, label]) => {
                        labelToSlug[label] = slug;
                    });
                }
                
                Object.keys(attributes).forEach(attrLabel => {
                    if (attributes[attrLabel].size === 0) {
                        const attrSlug = labelToSlug[attrLabel];
                        if (attrSlug && product.attribute_options[attrSlug]) {
                            product.attribute_options[attrSlug].forEach(value => {
                                attributes[attrLabel].add(value);
                            });
                        }
                    }
                });
            }

            return this.buildFilterHTML(attributes);
        },

        /**
         * Build combination selector (for products with all possible combinations)
         */
        buildCombinationSelector: function(product) {
            if (!product || !product.attribute_options) {
                return '';
            }


            const attributes = {};
            
            // Use all available attribute options
            if (product.all_attributes) {
                Object.entries(product.all_attributes).forEach(([slug, label]) => {
                    if (product.attribute_options[slug] && product.attribute_options[slug].length > 0) {
                        attributes[label] = new Set(product.attribute_options[slug]);
                    }
                });
            }


            let html = this.buildFilterHTML(attributes);
            
            if (html) {
                html = '<div class="lwwc-combination-note">🎛️ Select your preferred options to configure this product:</div>' + html;
            }

            return html;
        },

        /**
         * Build the actual filter HTML
         */
        buildFilterHTML: function(attributes) {
            if (Object.keys(attributes).length === 0) {
                return '';
            }

            let html = '<div class="lwwc-variation-filters-container">';
            
            Object.entries(attributes).forEach(([attr, values]) => {
                const displayAttr = attr.replace(/^attribute_/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                html += `<div class="lwwc-variation-filter-group">`;
                html += `<label for="filter-${attr}">${displayAttr}:</label>`;
                html += `<select id="filter-${attr}" class="lwwc-variation-filter" data-attribute="${attr}">`;
                html += `<option value="">Choose ${displayAttr}</option>`;
                
                Array.from(values).sort().forEach(value => {
                    const displayValue = value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    html += `<option value="${value}">${displayValue}</option>`;
                });
                
                html += `</select>`;
                html += `</div>`;
            });
            
            html += '</div>';
            return html;
        },

        /**
         * Get display name for a variation
         */
        getVariationDisplayName: function(variation) {
            
            if (variation.name) {
                return variation.name;
            }
            
            // Check for formatted_attributes first (from PHP backend)
            if (variation.formatted_attributes) {
                const attributes = Object.entries(variation.formatted_attributes)
                    .map(([attr, value]) => {
                        // Handle "Any" values more clearly
                        const displayValue = value === 'Any' ? 'Any ' + attr : value;
                        return `${attr}: ${displayValue}`;
                    })
                    .join(', ');
                const result = attributes || 'Variation';
                return result;
            }
            
            // Fallback to attributes (legacy format)
            if (variation.attributes) {
                const attributes = Object.entries(variation.attributes)
                    .map(([attr, value]) => {
                        const displayAttr = attr.replace(/^attribute_/, '').replace(/-/g, ' ');
                        const displayValue = value === 'Any' ? 'Any ' + displayAttr : value.replace(/-/g, ' ');
                        return `${displayAttr}: ${displayValue}`;
                    })
                    .join(', ');
                const result = attributes || 'Variation';
                return result;
            }
            
            const fallback = `Variation ${variation.id || ''}`;
            return fallback;
        },

        /**
         * Setup event handlers for variation modal
         */
        setupVariationEventHandlers: function() {
            // Variation selection - click on variation item directly
            // Bind click handler for variation items
            $(document).off('click', '#lwwc-modal-variation-list .variation-item');
            $(document).on('click', '#lwwc-modal-variation-list .variation-item', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Skip out-of-stock items
                if ($(this).hasClass('out-of-stock')) return;
                
                // Retrieve variation object bound via bindVariationData
                let variationData = $(this).data('variation');
                
                // Use fallback data from data-variation attribute if primary data is missing formatted_attributes
                if (!variationData || !variationData.formatted_attributes || Object.keys(variationData.formatted_attributes).length === 0) {
                    try {
                        variationData = JSON.parse($(this).attr('data-variation') || '{}');
                    } catch (e) {
                        console.error('❌ Error parsing variation data from attribute:', e);
                    }
                }
                
                if (!variationData) {
                    console.error('❌ Variation data missing on click element');
                    return;
                }
                
                // Validate required properties
                if (!variationData.id || !variationData.name) {
                    console.error('❌ Invalid variation data - missing id or name:', variationData);
                    return;
                }
                
                const modal = $('#lwwc-variation-modal');
                const product = modal.data('product');
                const isCheckoutTab = modal.data('isCheckoutTab');
                
                // Validate that we have product data
                if (!product || !product.id) {
                    console.error('❌ Product data missing from modal:', product);
                    return;
                }
                
                
                // Check if this variation has "Any" attributes that need configuration
                const hasAnyAttributes = Object.values(variationData.formatted_attributes || {}).includes('Any');
                
                if (hasAnyAttributes && !variationData.isConfigured) {
                    // Open configurator for this specific variation
                    
                    // Prepare configurator data with the selected variation context
                    const configuratorData = {
                        ...product.configurator_data,
                        name: product.name,
                        preselected_variation: variationData
                    };
                    
                    // Close the current modal first
                    modal.removeClass('lwwc-modal-visible').addClass('lwwc-modal-hidden');
                    
                    // Open the configurator
                    if (window.WCLWProductConfigurator) {
                        window.WCLWProductConfigurator.init(configuratorData);
                    } else {
                        console.error('❌ Product configurator not available');
                    }
                    return;
                }
                
                
                // For configured variations, we need to build the proper checkout URL with attributes
                let itemForWizard;
                
                if (variationData.isConfigured) {
                    // This is a configured variation - we need to build a checkout URL with attributes
                    
                    // Create item that includes the configured attribute values for URL building
                    itemForWizard = {
                        id: variationData.id,
                        name: variationData.name,
                        type: 'variation',
                        parent_id: product.id,
                        parent_name: product.name,
                        formatted_attributes: variationData.formatted_attributes,
                        configured_attributes: variationData.configuredFilters, // Add the filter selections
                        price: variationData.price,
                        display_price: variationData.display_price,
                        stock_status: variationData.stock_status,
                        sku: variationData.sku,
                        isConfigured: true
                    };
                } else {
                    // Regular variation
                    itemForWizard = {
                        id: variationData.id,
                        name: variationData.name,
                        type: 'variation',
                        parent_id: product.id,
                        parent_name: product.name,
                        formatted_attributes: variationData.formatted_attributes || {},
                        price: variationData.price,
                        display_price: variationData.display_price,
                        stock_status: variationData.stock_status,
                        sku: variationData.sku
                    };
                }
                
                
                // Add the selected variation to the appropriate wizard
                if (window.WCLWAddToCartWizard && !isCheckoutTab) {
                    window.WCLWAddToCartWizard.addProduct(itemForWizard, 1);
                } else if (window.WCLWCheckoutWizard && isCheckoutTab) {
                    window.WCLWCheckoutWizard.addProduct(itemForWizard, 1);
                } else {
                    console.error('No appropriate wizard found or active');
                }
                
                // Close modal
                WCLWVariationSidebarManager.closeVariationModal();
                if (window.WCLWModalManager) {
                    window.WCLWModalManager.closeVariationModal();
                }
            });
            
            // Variation filters
            $(document).on('change', '.lwwc-variation-filter', function() {
                WCLWVariationSidebarManager.applyVariationFilters();
            });
            
            // Clear filters button in sidebar
            $(document).on('click', '#lwwc-clear-variation-filters', function() {
                $('.lwwc-variation-filter').val('');
                WCLWVariationSidebarManager.applyVariationFilters();
            });
            // Reset filters button in modal header
            $(document).on('click', '#lwwc-variation-reset-filters', function() {
                $('.lwwc-variation-filter').val('');
                WCLWVariationSidebarManager.applyVariationFilters();
            });
        },

        /**
         * Setup general event handlers
         */
        setupEventHandlers: function() {
            // Add any general event handlers here
        },

        /**
         * Initialize sidebar state
         */
        initializeSidebarState: function() {
            // Initialize any sidebar state here
        },

        /**
         * Apply variation filters to show/hide variations or create combinations
         */
        applyVariationFilters: function() {
            const modal = $('#lwwc-variation-modal');
            const product = modal.data('product');
            
            if (!product || !product.variations) {
                console.warn('No product data for filtering');
                return;
            }
            
            // Get active filter values
            const activeFilters = {};
            $('.lwwc-variation-filter').each(function() {
                const attr = $(this).data('attribute');
                const value = $(this).val();
                if (value) {
                    activeFilters[attr] = value;
                }
            });
            
            
            // Check if we have virtual variations (generated combinations)
            const hasVirtualVariations = product.variations.some(v => v.is_virtual);
            
            if (hasVirtualVariations) {
                this.handleCombinationSelection(activeFilters, product, modal);
            } else {
                this.handleStandardFiltering(activeFilters, product, modal);
            }
        },

        /**
         * Handle combination selection for products with virtual variations
         */
        handleCombinationSelection: function(activeFilters, product, modal) {
            const filterCount = Object.keys(activeFilters).length;
            const totalAttributes = Object.keys(product.all_attributes || {}).length;
            
            
            if (filterCount === 0) {
                // No selection made - show instruction
                const instructionHtml = `
                    <div class="lwwc-combination-instruction">
                        <h4>🎯 Configure Your Product</h4>
                        <p>Please select options from the filters above to configure your product combination.</p>
                        <p>You need to select all attributes to proceed to checkout.</p>
                    </div>
                `;
                
                modal.find('#lwwc-modal-variation-list').html(instructionHtml);
                modal.find('#lwwc-variation-filter-status').text('Select options above to configure');
                modal.find('#lwwc-variation-reset-filters').hide();
                
            } else if (filterCount === totalAttributes) {
                // All attributes selected - create configured variation
                const configuredVariation = this.createConfiguredVariation(activeFilters, product);
                
                const variationList = this.buildVariationList([configuredVariation]);
                modal.find('#lwwc-modal-variation-list').html(variationList);
                this.bindVariationData([configuredVariation]);
                
                modal.find('#lwwc-variation-filter-status').text('✅ Product configured - ready for checkout');
                modal.find('#lwwc-variation-reset-filters').show();
                
            } else {
                // Partial selection - show progress
                const progressHtml = `
                    <div class="lwwc-combination-progress">
                        <h4>🔧 Configuration in Progress</h4>
                        <p>You have selected ${filterCount} of ${totalAttributes} required attributes.</p>
                        <p>Please complete your selection to configure the product for checkout.</p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(filterCount / totalAttributes) * 100}%"></div>
                        </div>
                    </div>
                `;
                
                modal.find('#lwwc-modal-variation-list').html(progressHtml);
                modal.find('#lwwc-variation-filter-status').text(`${filterCount}/${totalAttributes} attributes selected`);
                modal.find('#lwwc-variation-reset-filters').show();
            }
        },

        /**
         * Handle standard filtering for products with existing variations
         */
        handleStandardFiltering: function(activeFilters, product, modal) {
            // This is the original filtering logic
            let filteredVariations = product.variations;
            let hasAnyConfigurableAttributes = false;
            
            if (Object.keys(activeFilters).length > 0) {
                filteredVariations = product.variations.filter(variation => {
                    const variationAttrs = variation.formatted_attributes || variation.attributes || {};
                    
                    return Object.entries(activeFilters).every(([filterAttr, filterValue]) => {
                        const variationValue = variationAttrs[filterAttr];
                        const matches = variationValue === 'Any' || variationValue === filterValue;
                        
                        if (variationValue === 'Any' && filterValue) {
                            hasAnyConfigurableAttributes = true;
                        }
                        
                        return matches;
                    });
                });
            }
            
            // If we have configurable "Any" attributes, create configured variation
            if (hasAnyConfigurableAttributes && filteredVariations.length > 0) {
                const baseVariation = filteredVariations[0];
                const configuredVariation = this.createConfiguredVariation(activeFilters, product, baseVariation);
                filteredVariations = [configuredVariation];
            }
            
            // Update the variation list
            const variationList = this.buildVariationList(filteredVariations);
            modal.find('#lwwc-modal-variation-list').html(variationList);
            this.bindVariationData(filteredVariations);
            
            // Update filter status
            const statusElement = modal.find('#lwwc-variation-filter-status');
            if (Object.keys(activeFilters).length > 0) {
                if (hasAnyConfigurableAttributes) {
                    statusElement.text(`✅ Configured variation ready for checkout`);
                } else {
                    statusElement.text(`(${filteredVariations.length} of ${product.variations.length} shown)`);
                }
            } else {
                statusElement.text('');
            }
            
            // Toggle Reset Filters button
            const resetBtn = modal.find('#lwwc-variation-reset-filters');
            if (Object.keys(activeFilters).length > 0) {
                resetBtn.show();
            } else {
                resetBtn.hide();
            }
        },

        /**
         * Create a configured variation from selected filters
         */
        createConfiguredVariation: function(activeFilters, product, baseVariation = null) {
            // Use base variation if provided, otherwise create a virtual one
            let configuredVariation;
            
            if (baseVariation) {
                configuredVariation = JSON.parse(JSON.stringify(baseVariation)); // Deep clone
            } else {
                // Create virtual variation
                configuredVariation = {
                    id: 'configured_' + Date.now(),
                    name: product.name,
                    formatted_attributes: {},
                    price: product.price || '0',
                    regular_price: product.regular_price || '0',
                    sale_price: product.sale_price || '',
                    stock_status: 'instock',
                    stock_quantity: null,
                    sku: '',
                    display_price: product.display_price || '$0',
                    is_virtual: true
                };
            }
            
            // Apply the configured values
            Object.entries(activeFilters).forEach(([filterAttr, filterValue]) => {
                configuredVariation.formatted_attributes[filterAttr] = filterValue;
            });
            
            // Update the variation name to reflect the configuration
            const attrString = Object.entries(configuredVariation.formatted_attributes)
                .map(([attr, value]) => `${attr}: ${value}`)
                .join(', ');
            configuredVariation.name = `${product.name} - ${attrString}`;
            
            // Mark as configured
            configuredVariation.isConfigured = true;
            configuredVariation.configuredFilters = activeFilters;
            
            return configuredVariation;
        },

        /**
         * Close variation modal
         */
        closeVariationModal: function() {
            const modal = $('#lwwc-variation-modal');
            if (modal.length) {
                // Hide modal first
                modal.removeClass('lwwc-modal-visible').addClass('lwwc-modal-hidden').hide();
                
                // Clear content after hiding
                this.clearModalContent(modal);
                
            }
        }
    };

    // Initialize when DOM is ready
    $(function() {
        if (typeof lwwc_params !== 'undefined') {
            WCLWVariationSidebarManager.init();
        }
    });

})(jQuery);
