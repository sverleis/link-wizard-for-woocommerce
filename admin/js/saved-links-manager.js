/**
 * Saved Links Manager - Handles all saved link CRUD operations and display
 */
(function($) {
    'use strict';

    window.WCLWSavedLinksManager = {
        
        // Debug mode flag - set to false for production
        debugMode: false,
        
        // Debug logging helper
        debugLog: function(message, data) {
            // Debug logging removed for performance
        },
        
        // Initialize saved links manager
        init: function() {
            this.bindEvents();
            this.loadSavedLinks();
        },

        // Bind saved links related events
        bindEvents: function() {
            this.bindSavedLinkActions();
            this.bindWindowResize();
        },

        // Bind saved link action events
        bindSavedLinkActions: function() {
            // Handle Load button for saved links
            $(document).on('click', '.saved-link-item .load-btn', (e) => {
                e.preventDefault();
                const $item = $(e.target).closest('.saved-link-item');
                const url = $item.data('url');
                const type = $item.data('type');
                if (!url) return;

                // Check only the target wizard for existing content
                let hasContent;
                if (type === 'checkout') {
                    hasContent = this.hasCheckoutWizardContent();
                } else {
                    hasContent = this.hasCartWizardContent(url);
                }
                // If content is identical, just load (no modal)
                if (type !== 'checkout' && hasContent === false) {
                    this.loadSavedLink(url);
                    return;
                }
                if (hasContent) {
                    // Show confirmation modal before restoring saved wizard
                    this.showLoadConfirmation(url);
                } else {
                    // No content in target wizard, just load
                    this.loadSavedLink(url);
                }
            });

            // Handle Copy button for saved links
            $(document).on('click', '.saved-link-item .copy-btn', (e) => {
                e.preventDefault();
                const $item = $(e.target).closest('.saved-link-item');
                const url = $item.data('url');
                if (url) {
                    this.copySavedLink(url, $(e.target));
                }
            });

            // Handle Open button for saved links
            $(document).on('click', '.saved-link-item .open-btn', (e) => {
                e.preventDefault();
                const $item = $(e.target).closest('.saved-link-item');
                const url = $item.data('url');
                if (url) {
                    this.openSavedLink(url, $(e.target));
                }
            });

            // Handle Remove button for saved links
            $(document).on('click', '.saved-link-item .remove-btn', (e) => {
                e.preventDefault();
                const $item = $(e.target).closest('.saved-link-item');
                const linkKey = $item.data('key');
                const linkType = $item.data('type');
                this.deleteSavedLink($item, linkKey, linkType);
            });

            // Handle URL toggle button for saved links
            $(document).on('click', '.saved-link-item .saved-link-url-toggle', (e) => {
                e.preventDefault();
                this.toggleSavedLinkURL($(e.target).closest('.saved-link-item'), $(e.target));
            });

            // Additional delegated event handlers for saved link actions
            $(document).on('click', '.saved-link-actions-footer .copy-btn', (e) => {
                const url = $(e.target).closest('.saved-link-item').data('url');
                if (url) {
                    this.copyToClipboard(url);
                }
            });

            $(document).on('click', '.saved-link-actions-footer .open-btn', (e) => {
                const url = $(e.target).closest('.saved-link-item').data('url');
                if (url) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            });

            $(document).on('click', '.saved-link-actions-footer .saved-link-url-toggle', (e) => {
                const $item = $(e.target).closest('.saved-link-item');
                const $urlContent = $item.find('.saved-link-url-content');
                const expanded = $(e.target).attr('aria-expanded') === 'true';
                $(e.target).attr('aria-expanded', !expanded);
                $urlContent.toggle();
            });

        },

        // Handle window resize to re-check coupon layout overflow
        bindWindowResize: function() {
            let resizeTimeout;
            $(window).on('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    // First clean up any incorrect classes
                    this.cleanupDesktopStackClasses();
                    
                    // Then check each item's layout
                    $('.saved-link-content-vertical').each((i, el) => {
                        const $item = $(el).closest('.saved-link-item');
                        if ($item.length) {
                            this.checkCouponLayoutOverflow($item);
                        }
                    });
                }, 250);
            });
        },

        // Load saved links from global params
        loadSavedLinks: function() {
            if (window.lwwc_params) {
                // Load cart links
                if (window.lwwc_params.saved_cart_links) {
                    var cartEntries = Object.entries(window.lwwc_params.saved_cart_links);
                    // Sort by date order from settings: latest reverses array (assuming insertion order oldest first)
                    if (window.lwwc_params.settings.saved_links_sort_order === 'latest') {
                        cartEntries = cartEntries.reverse();
                    }
                    this.pagination.cart.entries = cartEntries;
                    this.pagination.cart.page = 1;
                    this.renderPaginatedList('cart');
                }
                
                // Load checkout links
                if (window.lwwc_params.saved_checkout_links) {
                    var checkoutEntries = Object.entries(window.lwwc_params.saved_checkout_links);
                    if (window.lwwc_params.settings.saved_links_sort_order === 'latest') {
                        checkoutEntries = checkoutEntries.reverse();
                    }
                    this.pagination.checkout.entries = checkoutEntries;
                    this.pagination.checkout.page = 1;
                    this.renderPaginatedList('checkout');
                }
                
                // After all saved links are loaded, enhance any product names that need it
                setTimeout(() => {
                    this.enhanceAllProductNames();
                    // Clean up any incorrectly applied stack classes on desktop
                    this.cleanupDesktopStackClasses();
                }, 100);
            }
        },

        // Enhance product names for all saved links that need it
        enhanceAllProductNames: function() {
            this.debugLog('🔧 Enhancing all product names for saved links...');
            const $allProducts = $('.saved-link-item .saved-link-product');
            this.enhanceSavedLinkProductNames($allProducts);
        },

        // Clean up incorrectly applied stack classes on desktop
        cleanupDesktopStackClasses: function() {
            const viewportWidth = window.innerWidth;
            if (viewportWidth > 768) {
                this.debugLog('🔧 Desktop detected, cleaning up stack-vertical classes...');
                $('.saved-link-content-vertical.stack-vertical').each(function() {
                    const $el = $(this);
                    const style = window.getComputedStyle(this);
                    // If CSS isn't forcing column layout, remove the stack class
                    if (style.flexDirection !== 'column') {
                        this.debugLog('🔧 Removing incorrect stack-vertical class on desktop');
                        $el.removeClass('stack-vertical');
                    }
                }.bind(this));
            }
        },

        // Debug function to check layout state
        debugLayoutState: function() {
            this.debugLog('🔧 Debugging layout state for all saved links...');
            $('.saved-link-content-vertical').each((i, el) => {
                const $el = $(el);
                const style = window.getComputedStyle(el);
                const $item = $el.closest('.saved-link-item');
                this.debugLog(`Layout ${i + 1}:`, {
                    flexDirection: style.flexDirection,
                    width: el.clientWidth,
                    hasStackClass: $el.hasClass('stack-vertical'),
                    linkKey: $item.data('key')
                });
            });
        },

        // Force layout refresh for all saved links
        refreshAllLayouts: function() {
            this.debugLog('🔧 Refreshing layout for all saved links...');
            $('.saved-link-item').each((i, el) => {
                this.checkCouponLayoutOverflow($(el));
            });
        },

        // Add a saved link to the appropriate list
        addSavedLinkToList: function(key, url, type, productData = null) {
            const pag = this.pagination[type];
            // Add to entries (at end or start depending on sort order)
            if (window.lwwc_params.settings.saved_links_sort_order === 'latest') {
                pag.entries.unshift([key, url]);
            } else {
                pag.entries.push([key, url]);
            }
            // If adding would push us over the last page, go to last page
            pag.totalPages = Math.max(1, Math.ceil(pag.entries.length / this.getPaginationLimit()));
            pag.page = pag.totalPages;
            this.renderPaginatedList(type);
        },

        // Parse link URL to extract human-readable information
        parseLinkForDisplay: function(url, type, productData = null) {
            this.debugLog('🔍 Parsing link for display:', { url, type, productData });
            
            const urlObject = new URL(url);
            const productsParam = urlObject.searchParams.get(type === 'checkout' ? 'products' : 'add-to-cart');
            const couponsParam = urlObject.searchParams.get(type === 'checkout' ? 'coupon' : 'coupon-code');
            const baseUrl = urlObject.origin + urlObject.pathname;
            
            let productsHtml = '';
            let couponsHtml = '';
            let redirectHtml = '';
            
            // Parse products
            if (productsParam) {
                const products = productsParam.split(',');
                let quantityParam = urlObject.searchParams.get('quantity');
                const productItems = products.map((p, idx) => {
                    let id, qty;
                    if (p.includes(':')) {
                        const parts = p.split(':');
                        id = parts[0];
                        qty = parts[1] || 1;
                    } else {
                        id = p;
                        qty = (products.length === 1 && quantityParam) ? quantityParam : 1;
                    }
                    
                    let productName = '';
                    let isVariation = false;
                    let displayId = id; // The ID to show in the UI
                    
                    // First, try to use productData if available
                    if (productData && productData.products) {
                        this.debugLog('🔍 Looking for product data for ID:', id, 'in:', productData.products);
                        
                        // Try to find by exact ID match first
                        let productInfo = productData.products.find(p => p.id == id);
                        
                        // If not found, try to find by variation ID
                        if (!productInfo) {
                            productInfo = productData.products.find(p => p.variationId == id);
                        }
                        
                        if (productInfo) {
                            this.debugLog('✅ Found product info:', productInfo);
                            productName = productInfo.name;
                            
                            // If this product has variation data, it's a variation
                            if (productInfo.variationData && Object.keys(productInfo.variationData).length > 0) {
                                isVariation = true;
                                displayId = productInfo.variationId || id; // Show variation ID if available
                                
                                // If the product name doesn't already include variation details, add them
                                if (!productName.includes(' ( ') || !productName.includes(' )')) {
                                    const variationDetails = Object.entries(productInfo.variationData)
                                        .map(([key, value]) => `${key}: ${value}`)
                                        .join(', ');
                                    if (variationDetails) {
                                        // Extract base name if it includes variation formatting
                                        let baseName = productName;
                                        if (productName.includes(' ( ')) {
                                            baseName = productName.split(' ( ')[0];
                                        }
                                        productName = `${baseName} ( ${variationDetails} )`;
                                    }
                                }
                            }
                        }
                    }
                    
                    // Fallback to global product names
                    if (!productName && window.lwwc_params?.product_names?.[id]) {
                        productName = window.lwwc_params.product_names[id];
                    }
                    
                    // Final fallback
                    if (!productName) {
                        productName = '<span style="font-style: italic; color: #999;">Loading...</span>';
                    }
                    
                    return `
                        <div class="saved-link-product" data-id="${id}" ${isVariation ? 'data-variation="true"' : ''}>
                            <span class="product-id superbold">[ID:${displayId}]</span> 
                            <span class="product-name">${productName}</span> 
                            <span class="product-quantity superbold">×${qty}</span>
                        </div>
                    `;
                }).join('');
                
                productsHtml = `
                    <div class="saved-link-products">
                        ${productItems}
                    </div>
                `;
            }
            
            // Parse coupons - always show a coupon area for checkout links
            if (couponsParam) {
                const coupons = couponsParam.split(',');
                const couponItems = coupons.map(code => `
                    <div class="saved-link-coupon">
                        <span class="dashicons dashicons-tickets-alt"></span>
                        <span class="coupon-code">${code}</span>
                    </div>
                `).join('');
                
                couponsHtml = `
                    <div class="saved-link-coupons">
                        ${couponItems}
                    </div>
                `;
            } else if (type === 'checkout') {
                couponsHtml = `
                    <div class="saved-link-coupons">
                        <div class="saved-link-coupon saved-link-coupon-empty">
                            <span class="dashicons dashicons-minus"></span>
                            <span class="coupon-code">${window.lwwc_admin_i18n?.noCouponsSelected || 'No coupons selected.'}</span>
                        </div>
                    </div>
                `;
            }
            
            // Parse redirect behavior
            let redirectText = 'Link to site home';
            let redirectIcon = 'admin-home';
            let redirectUrl = window.location.origin;
            
            if (type === 'checkout' || baseUrl.includes('/checkout')) {
                redirectText = 'Redirect to Checkout';
                redirectIcon = 'yes-alt';
                redirectUrl = window.lwwc_params?.checkout_url;
            } else if (baseUrl.includes('/cart')) {
                redirectText = 'Redirect to Cart';
                redirectIcon = 'cart';
                redirectUrl = window.lwwc_params?.cart_url;
            } else if (baseUrl !== window.location.origin && baseUrl !== window.location.origin + '/') {
                redirectUrl = baseUrl;
                redirectIcon = 'external';
                
                const pageId = this.extractPageIdFromUrl(baseUrl);
                if (pageId) {
                    const pageTitle = this.getPageTitleById(pageId);
                    if (pageTitle) {
                        redirectText = `Redirect to: ${pageTitle}`;
                    } else {
                        try {
                            const urlObj = new URL(baseUrl);
                            redirectText = `Redirect to: ${urlObj.hostname}${urlObj.pathname}`;
                            this.fetchPageTitle(pageId, baseUrl).then(title => {
                                if (title) {
                                    const $redirectText = $(`.saved-link-redirect .redirect-text:contains("${redirectText}")`);
                                    if ($redirectText.length) {
                                        $redirectText.text(`Redirect to: ${title}`);
                                    }
                                }
                            });
                        } catch (e) {
                            redirectText = 'Custom redirect';
                        }
                    }
                } else {
                    try {
                        const urlObj = new URL(baseUrl);
                        redirectText = `Redirect to: ${urlObj.hostname}${urlObj.pathname}`;
                    } catch (e) {
                        redirectText = 'Custom redirect';
                    }
                }
            }
            
            const iconHtml = redirectUrl 
                ? `<a href="${redirectUrl}" target="_blank" class="redirect-icon-link" title="Open ${redirectText}" aria-label="Open ${redirectText}" role="button"><span class="dashicons dashicons-${redirectIcon}"></span></a>`
                : `<span class="dashicons dashicons-${redirectIcon}" aria-label="Link to site home" role="button"></span>`;
            
            redirectHtml = `
                <div class="saved-link-redirect">
                    ${iconHtml}
                    <span class="redirect-text">${redirectText}</span>
                </div>
            `;
            
            return { productsHtml, couponsHtml, redirectHtml };
        },

        // Enhance saved link product names with real product names
        enhanceSavedLinkProductNames: function($products) {
            $products.each((i, el) => {
                const $prod = $(el);
                const $nameSpan = $prod.find('.product-name');
                const productId = $prod.data('id');
                const currentText = $nameSpan.text().trim();
                
                // Apply styling
                $prod.find('.product-id, .product-quantity').addClass('superbold');
                
                // Check if product name needs to be fetched
                const needsFetch = !currentText || 
                                 currentText === 'Loading...' || 
                                 currentText.includes('Loading...') ||
                                 currentText === '';
                
                if (needsFetch && productId) {
                    
                    // First try to use cached product names
                    if (window.lwwc_params?.product_names?.[productId]) {
                        const cachedName = window.lwwc_params.product_names[productId];
                        $nameSpan.text(cachedName);
                        
                        const $item = $prod.closest('.saved-link-item');
                        if ($item.length) {
                            setTimeout(() => this.checkCouponLayoutOverflow($item), 50);
                        }
                        return;
                    }
                    
                    // If not cached, fetch via AJAX
                    $.ajax({
                        url: window.lwwc_params?.ajax_url,
                        type: 'POST',
                        data: {
                            action: 'lwwc_get_product_name',
                            product_id: productId,
                            nonce: window.lwwc_params?.search_nonce
                        },
                        success: (response) => {
                            if (response.success && response.data.name) {
                                $nameSpan.text(response.data.name);
                                
                                // Cache the name for future use
                                if (!window.lwwc_params.product_names) {
                                    window.lwwc_params.product_names = {};
                                }
                                window.lwwc_params.product_names[productId] = response.data.name;
                            } else {
                                $nameSpan.text('(Product not found)').css({'font-style': 'italic', 'color': '#999'});
                            }
                            
                            const $item = $prod.closest('.saved-link-item');
                            if ($item.length) {
                                setTimeout(() => this.checkCouponLayoutOverflow($item), 50);
                            }
                        },
                        error: () => {
                            $nameSpan.text('(Name unavailable)').css({'font-style': 'italic', 'color': '#999'});
                            
                            const $item = $prod.closest('.saved-link-item');
                            if ($item.length) {
                                setTimeout(() => this.checkCouponLayoutOverflow($item), 50);
                            }
                        }
                    });
                }
            });
        },

        // Function to detect when coupons would overlap with products and switch to vertical layout
        checkCouponLayoutOverflow: function($item) {
            const $verticalContent = $item.find('.saved-link-content-vertical');
            if (!$verticalContent.length) return;
            
            // Use a longer timeout to ensure CSS and fonts are fully loaded
            setTimeout(() => {
                const $products = $verticalContent.find('.saved-link-products');
                const $coupons = $verticalContent.find('.saved-link-coupons');
                
                if (!$products.length || !$coupons.length) return;
                
                // Get the computed styles to ensure we're measuring after CSS is applied
                const containerStyle = window.getComputedStyle($verticalContent[0]);
                const containerWidth = $verticalContent[0].clientWidth;
                const containerDirection = containerStyle.flexDirection;
                const viewportWidth = window.innerWidth;
                
                // If CSS has already switched to column layout via media queries, don't interfere
                if (containerDirection === 'column') {
                    $verticalContent.removeClass('stack-vertical');
                    return;
                }
                
                // Only apply stack-vertical on mobile/tablet screens (768px and below)
                // On desktop, let CSS container queries handle the responsive behavior
                if (viewportWidth > 768) {
                    $verticalContent.removeClass('stack-vertical');
                    return;
                }
                
                // On mobile/tablet, only measure if we're in row layout and container is reasonably wide
                if (containerWidth > 100) {
                    const productsWidth = $products[0].scrollWidth;
                    const couponsWidth = $coupons[0].scrollWidth;
                    const gap = 15;
                    const totalNeeded = productsWidth + couponsWidth + gap;
                    const threshold = containerWidth * 0.90; // Use 90% for mobile
                    
                    if (totalNeeded > threshold) {
                        if (!$verticalContent.hasClass('stack-vertical')) {
                            $verticalContent.addClass('stack-vertical');
                        }
                    } else {
                        if ($verticalContent.hasClass('stack-vertical')) {
                            $verticalContent.removeClass('stack-vertical');
                        }
                    }
                } else {
                    // On very small containers, remove the class and let CSS handle it
                    $verticalContent.removeClass('stack-vertical');
                }
            }, 200);
        },

        // Load a saved link into the wizard
        loadSavedLink: function(url) {
            // This method is now just a direct call to performLoadSavedLink
            // The confirmation logic is handled in the click handler (showLoadConfirmation)
            this.performLoadSavedLink(url);
        },

        // Actually perform the saved link loading
        performLoadSavedLink: function(url) {
            const urlObject = new URL(url);
            let isCheckoutLink = false;
            
            // Detect wizard type by URL or params
            if (url.includes('/checkout-link') || urlObject.searchParams.has('products') || urlObject.searchParams.has('coupon')) {
                isCheckoutLink = true;
            }
            
            // Switch to correct wizard FIRST, before doing anything else
            let tabSwitchNeeded = false;
            if (isCheckoutLink) {
                tabSwitchNeeded = this.switchToCheckoutWizard();
            } else {
                tabSwitchNeeded = this.switchToCartWizard();
            }
            
            // Wait for tab switch to complete before proceeding (longer delay if tab switch was needed)
            const delay = tabSwitchNeeded ? 250 : 50;
            setTimeout(() => {
                this.continueLoadingAfterTabSwitch(url, isCheckoutLink, urlObject);
            }, delay);
        },
        
        // Continue loading after tab switch is complete
        continueLoadingAfterTabSwitch: function(url, isCheckoutLink, urlObject) {
            // Parse products and quantities
            const productsParam = urlObject.searchParams.get(isCheckoutLink ? 'products' : 'add-to-cart');
            const couponsParam = urlObject.searchParams.get(isCheckoutLink ? 'coupon' : 'coupon-code');
            const productIds = productsParam ? productsParam.split(',').map(p => p.split(':')[0]) : [];
            const productQtys = {};
            
            if (productsParam) {
                const products = productsParam.split(',');
                products.forEach(p => {
                    const parts = p.split(':');
                    productQtys[parts[0]] = parts[1] || 1;
                });
                
                // Handle single product with &quantity param (add-to-cart only)
                if (!isCheckoutLink && products.length === 1 && !products[0].includes(':')) {
                    const quantityParam = urlObject.searchParams.get('quantity');
                    if (quantityParam) {
                        productQtys[products[0]] = quantityParam;
                    }
                }
            }
            
            const couponCodes = couponsParam ? couponsParam.split(',') : [];
            const baseUrl = urlObject.origin + urlObject.pathname;
            const ajaxData = {
                action: 'lwwc_get_link_details',
                nonce: window.lwwc_params?.manage_links_nonce,
                product_ids: productIds,
                coupon_codes: couponCodes,
            };

            // Check for custom redirect
            const knownUrls = [
                window.lwwc_params?.checkout_url, 
                window.lwwc_params?.cart_url, 
                window.lwwc_params?.home_url, 
                window.lwwc_params?.home_url?.slice(0, -1)
            ].filter(Boolean);
            
            const isCustomRedirect = !knownUrls.includes(baseUrl);
            if (isCustomRedirect) {
                ajaxData.redirect_url = urlObject.href;
            }


            $.ajax({
                url: window.lwwc_params?.ajax_url,
                type: 'POST',
                data: ajaxData,
                success: (response) => {
                    // Reset only the target wizard's state
                    this.resetTargetWizardState(isCheckoutLink);
                    
                    if (response.success) {
                        // Load products with quantities
                        if (response.data.products && response.data.products.length) {
                            response.data.products.forEach(product => {
                                const quantity = productQtys[product.id] || 1;
                                this.addProductWithQuantity(product, quantity, isCheckoutLink);
                            });
                        }
                        
                        // Handle checkout-specific features
                        if (isCheckoutLink) {
                            // Load coupons
                            if (response.data.coupons && response.data.coupons.length) {
                                response.data.coupons.forEach(coupon => {
                                    this.addCouponToList(coupon);
                                });
                            }
                        } else {
                            // Set redirect options for cart wizard
                            this.setRedirectOptions(baseUrl, isCustomRedirect, response.data.redirect_page);
                        }
                        
                        // Generate the link automatically like the old version
                        if (window.WCLWLinkGenerator && typeof window.WCLWLinkGenerator.generateLink === 'function') {
                            window.WCLWLinkGenerator.generateLink();
                        }
                        
                        // Scroll to top
                        $('html, body').animate({ scrollTop: 0 }, 'slow');
                        // Show global success notice for any loaded link
                        if (window.wclwNotices) {
                            window.wclwNotices.success(window.lwwc_admin_i18n?.savedLinkLoadedSuccess || 'Saved link loaded successfully!', {
                                dismissible: true,
                                autoHide: true,
                                autoHideDelay: 12000,
                                clearExisting: false,
                                scrollTo: true
                            });
                        }
                    } else {
                        console.error('❌ Failed to load link details:', response.data?.message);
                        if (window.WCLWUIManager && typeof window.WCLWUIManager.showError === 'function') {
                            window.WCLWUIManager.showError(response.data?.message || window.lwwc_admin_i18n?.failedToLoadSavedLink || 'Failed to load saved link');
                        }
                    }
                },
                error: (xhr, status, error) => {
                    console.error('❌ AJAX error loading saved link:', error);
                    if (window.WCLWUIManager && typeof window.WCLWUIManager.showError === 'function') {
                        window.WCLWUIManager.showError(window.lwwc_admin_i18n?.errorLoadingSavedLink || 'Error loading saved link. Please try again.');
                    }
                }
            });
        },

        // Show confirmation modal before loading a saved link
        showLoadConfirmation: function(url) {
            // Use UI Manager's confirm modal if available
            // Detect link type by URL to confirm only when target wizard has content
            const urlObj = new URL(url, window.location.origin);
            const isCheckoutLink = url.includes('/checkout-link') || urlObj.searchParams.has('products') || urlObj.searchParams.has('coupon');
            // If target wizard is empty, bypass confirmation
            if ((isCheckoutLink && !this.hasCheckoutWizardContent()) || (!isCheckoutLink && !this.hasCartWizardContent(url))) {
                this.performLoadSavedLink(url);
                return;
            }
            const message = window.lwwc_admin_i18n?.confirmRestore || 'Restoring this saved wizard will overwrite your current configuration. Continue?';
            if (window.WCLWUIManager && typeof window.WCLWUIManager.showConfirmModal === 'function') {
                window.WCLWUIManager.showConfirmModal(message, () => {
                    this.performLoadSavedLink(url);
                });
            } else if (window.WCLWModalManager && typeof window.WCLWModalManager.showConfirmModal === 'function') {
                window.WCLWModalManager.showConfirmModal(message, () => {
                    this.performLoadSavedLink(url);
                });
            } else {
                // Fallback: browser confirm dialog
                if (confirm(message)) {
                    this.performLoadSavedLink(url);
                }
            }
        },

        // Helper methods for loading saved links
        resetWizardState: function() {
            
            // Clear selected products for both wizards and show placeholder
            const $selectedProducts = $('#lwwc-selected-products');
            $selectedProducts.empty().append('<p class="placeholder">' + (window.lwwc_admin_i18n?.noProductsSelected || 'No products selected yet.') + '</p>');
            
            // Clear add-to-cart wizard products specifically
            const $cartProductsList = $('#lwwc-selected-products-cart .products-list');
            if ($cartProductsList.length) {
                $cartProductsList.empty();
            }
            
            // Clear checkout wizard products specifically  
            const $checkoutProductsList = $('#lwwc-selected-products-cart-checkout .products-list');
            if ($checkoutProductsList.length) {
                $checkoutProductsList.empty();
            }
            
            // Clear selected coupons and show placeholder if it's checkout wizard
            const $selectedCoupons = $('#lwwc-selected-coupons');
            if ($selectedCoupons.length) {
                $selectedCoupons.empty().append('<p class="placeholder">' + (window.lwwc_admin_i18n?.noCouponsSelected || 'No coupons selected.') + '</p>');
            }
            
            // Clear checkout wizard if available
            if (window.WCLWCheckoutWizard && typeof window.WCLWCheckoutWizard.reset === 'function') {
                window.WCLWCheckoutWizard.reset();
            }
            
            // Clear selected page and show placeholder
            const $selectedPage = $('#lwwc-selected-pages');
            if ($selectedPage.length) {
                $selectedPage.empty().append('<p class="placeholder">' + (window.lwwc_admin_i18n?.noPageSelected || 'No page selected.') + '</p>');
            }
            
            // Clear custom redirect URL input
            $('#lwwc-redirect-page-url').val('');
            
            // Reset redirect radio buttons
            $('input[name="lwwc-redirect"]').prop('checked', false);
            $('input[name="lwwc-redirect"][value="none"]').prop('checked', true).trigger('change');
            
            // Hide page search wrapper
            $('#lwwc-page-search-wrapper').addClass('disabled');
            
            // Clear generated link
            $('#lwwc-generated-link').val('');
            
            // Update UI
            if (window.WCLWUIManager && typeof window.WCLWUIManager.updateActionButtons === 'function') {
                window.WCLWUIManager.updateActionButtons();
            }
        },

        // Add product with quantity to the correct wizard
        addProductWithQuantity: function(product, quantity, isCheckoutLink) {
            
            if (window.WCLWSearchManager && typeof window.WCLWSearchManager.addProductToList === 'function') {
                const productData = {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    url: product.url,
                    type: product.type,
                    quantity: quantity,
                    targetWizard: isCheckoutLink ? 'checkout' : 'add-to-cart',
                    // Include variation attribute data for display
                    formatted_attributes: product.formatted_attributes || {},
                    display_attributes: product.display_attributes || null,
                    parent_name: product.parent_name || null
                };
                window.WCLWSearchManager.addProductToList(productData);
            }
        },

        // Switch to checkout wizard tab
        switchToCheckoutWizard: function() {
            const $checkoutTab = $('.nav-tab[href="#tab-checkout-links"]');
            if ($checkoutTab.length && !$checkoutTab.hasClass('nav-tab-active')) {
                $checkoutTab.click();
                return true; // Tab switch was needed
            }
            return false; // Already on correct tab
        },

        // Switch to add-to-cart wizard tab  
        switchToCartWizard: function() {
            const $cartTab = $('.nav-tab[href="#tab-add-to-cart"]');
            if ($cartTab.length && !$cartTab.hasClass('nav-tab-active')) {
                $cartTab.click();
                return true; // Tab switch was needed
            }
            return false; // Already on correct tab
        },

        // Add coupon to coupon list
        addCouponToList: function(coupon) {
            // Check if we're in checkout wizard mode
            const isCheckoutWizard = $('#lwwc-checkout-link-generator').is(':visible') || 
                                   $('.nav-tab[href="#tab-checkout-links"]').hasClass('nav-tab-active');
            
            if (isCheckoutWizard && window.WCLWCheckoutWizard && typeof window.WCLWCheckoutWizard.addCoupon === 'function') {
                window.WCLWCheckoutWizard.addCoupon(coupon);
            } else if (window.WCLWCouponManager && typeof window.WCLWCouponManager.addCouponToList === 'function') {
                window.WCLWCouponManager.addCouponToList(coupon);
            } else {
                // Fallback: add manually to the appropriate list based on wizard type
                const $couponsList = isCheckoutWizard ? 
                    $('#lwwc-selected-coupons-list-checkout') : 
                    $('#lwwc-selected-coupons');
                    
                if ($couponsList.length) {
                    const $couponItem = $(`
                        <div class="lwwc-selected-coupon" data-id="${coupon.id}" data-code="${coupon.code}">
                            <div class="coupon-name">
                                <span class="dashicons dashicons-tickets-alt"></span>
                                <span class="coupon-code">${coupon.code}</span>
                                ${coupon.description ? `<span class="coupon-description">${coupon.description}</span>` : ''}
                            </div>
                            <div class="coupon-remove">
                                <button class="button lwwc-button is-destructive" title="Remove" aria-label="Remove" role="button">
                                    <span class="dashicons dashicons-trash"></span>
                                    <span class="button-text">Remove</span>
                                </button>
                            </div>
                        </div>
                    `);
                    $couponsList.append($couponItem);
                } else {
                    console.error('🎫 Coupon list element not found!', { 
                        isCheckoutWizard, 
                        checkoutListExists: $('#lwwc-selected-coupons-list-checkout').length,
                        regularListExists: $('#lwwc-selected-coupons').length 
                    });
                }
            }
        },

        // Set redirect options for add-to-cart wizard
        setRedirectOptions: function(baseUrl, isCustomRedirect, redirectPage) {
            // First uncheck all radio buttons
            $('input[name="lwwc-redirect"]').prop('checked', false);
            
            if (baseUrl === window.lwwc_params?.checkout_url) {
                $('input[name="lwwc-redirect"][value="checkout"]').prop('checked', true).trigger('change');
            } else if (baseUrl === window.lwwc_params?.cart_url) {
                $('input[name="lwwc-redirect"][value="cart"]').prop('checked', true).trigger('change');
            } else if (isCustomRedirect) {
                $('input[name="lwwc-redirect"][value="custom"]').prop('checked', true).trigger('change');
                if (redirectPage) {
                    this.addPageToList(redirectPage);
                }
            } else {
                $('input[name="lwwc-redirect"][value="none"]').prop('checked', true).trigger('change');
            }
        },

        // Add page to custom redirect list
        addPageToList: function(page) {
            
            // Use the search manager's addPageToList method for consistency
            if (window.WCLWSearchManager && window.WCLWSearchManager.addPageToList) {
                window.WCLWSearchManager.addPageToList(page);
            } else {
                console.error('📄 Search manager not available for page addition');
            }
        },

        // Copy saved link to clipboard
        copySavedLink: function(url, $button) {
            this.copyToClipboard(url);
            if (window.WCLWUIManager) {
                window.WCLWUIManager.showTempFeedback($button, 
                    '<span class="dashicons dashicons-yes"></span><span class="button-text">Copied!</span>', 
                    1500);
            }
        },

        // Open saved link in new tab
        openSavedLink: function(url, $button) {
            window.open(url, '_blank');
            if (window.WCLWUIManager) {
                window.WCLWUIManager.showTempFeedback($button, 
                    '<span class="dashicons dashicons-external"></span><span class="button-text">Opened!</span>', 
                    1000);
            }
        },

        // Delete a saved link
        deleteSavedLink: function(itemElement, linkKey, type) {
            if (window.WCLWModalManager && typeof window.WCLWModalManager.showConfirmModal === 'function') {
                window.WCLWModalManager.showConfirmModal(
                    window.lwwc_admin_i18n?.confirmDeleteSavedLink || 'Are you sure you want to delete this saved link?',
                    () => this.performDeleteSavedLink(itemElement, linkKey, type)
                );
            } else {
                if (confirm(window.lwwc_admin_i18n?.confirmDeleteSavedLink || 'Are you sure you want to delete this saved link?')) {
                    this.performDeleteSavedLink(itemElement, linkKey, type);
                }
            }
        },

        // Actually perform the delete operation
        performDeleteSavedLink: function(itemElement, linkKey, type) {
            $.post(window.lwwc_params?.ajax_url, {
                action: 'lwwc_delete_link',
                nonce: window.lwwc_params?.manage_links_nonce,
                link_key: linkKey,
                link_type: type
            }, (response) => {
                if (response.success) {
                    const pag = this.pagination[type];
                    // Remove from entries
                    pag.entries = pag.entries.filter(([k, _]) => k !== linkKey);
                    // Adjust page if needed
                    pag.totalPages = Math.max(1, Math.ceil(pag.entries.length / this.getPaginationLimit()));
                    if (pag.page > pag.totalPages) pag.page = pag.totalPages;
                    this.renderPaginatedList(type);
                    // Show a global success alert instead of below the card
                    if (window.wclwNotices) {
                        window.wclwNotices.success(window.lwwc_admin_i18n?.linkDeleted || 'Link deleted.', {
                            dismissible: true,
                            autoHide: true,
                            autoHideDelay: 3000,
                            clearExisting: false
                        });
                    }
                    itemElement.remove(); // for a11y, but list is re-rendered
                    if (pag.entries.length === 0) {
                        const list = type === 'cart' ? $('#lwwc-saved-cart-links-list') : $('#lwwc-saved-checkout-links-list');
                        const placeholderText = type === 'cart' ? (window.lwwc_admin_i18n?.noCartLinks || 'No saved cart links yet.') : (window.lwwc_admin_i18n?.noCheckoutLinks || 'No saved checkout links yet.');
                        list.html(`<p class="placeholder">${placeholderText}</p>`);
                    }
                } else {
                    if (window.WCLWUIManager) {
                        window.WCLWUIManager.showFeedback(response.data.message, 'error');
                    }
                }
            });
        },

        // Toggle saved link URL display
        toggleSavedLinkURL: function($item, $button) {
            const url = $item.data('url');
            let $urlDisplay = $item.find('.saved-link-url');
            
            if ($urlDisplay.length) {
                $urlDisplay.slideUp(200, function() {
                    $(this).remove();
                });
                $button.attr('aria-expanded', 'false');
            } else {
                $urlDisplay = $('<div class="saved-link-url"><input type="text" readonly value="' + url + '" class="large-text" /></div>');
                $item.append($urlDisplay);
                $urlDisplay.hide().slideDown(200);
                $button.attr('aria-expanded', 'true');
                
                $urlDisplay.find('input').focus().select();
            }
        },

        // Helper: Copy text to clipboard
        copyToClipboard: function(text) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
            } else {
                const tempInput = $('<input>');
                $('body').append(tempInput);
                tempInput.val(text).select();
                document.execCommand('copy');
                tempInput.remove();
            }
        },

        // Helper: Get current button style class
        getButtonStyleClass: function() {
            if (window.WCLWUIManager) {
                return window.WCLWUIManager.getButtonStyleClass();
            }
            const checked = $('input[name="lwwc_settings[button_style]"]:checked').val();
            return checked ? `lwwc-button-style-${checked}` : 'lwwc-button-style-both';
        },

        // Helper: Extract page ID from URL
        extractPageIdFromUrl: function(url) {
            try {
                const urlObj = new URL(url);
                if (urlObj.hostname === window.location.hostname) {
                    const path = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '');
                    
                    if (window.lwwc_params?.page_urls) {
                        for (const [pageId, pageUrl] of Object.entries(window.lwwc_params.page_urls)) {
                            const pageUrlObj = new URL(pageUrl);
                            const pagePath = pageUrlObj.pathname.replace(/^\//, '').replace(/\/$/, '');
                            if (path === pagePath) {
                                return parseInt(pageId);
                            }
                        }
                    }
                }
            } catch (e) {
                // Invalid URL
            }
            return null;
        },

        // Helper: Get page title by ID from cached data
        getPageTitleById: function(pageId) {
            if (window.lwwc_params?.page_titles?.[pageId]) {
                return window.lwwc_params.page_titles[pageId];
            }
            return null;
        },

        // Helper: Fetch page title asynchronously
        fetchPageTitle: function(pageId, pageUrl) {
            return new Promise((resolve) => {
                if (!pageId && !pageUrl) {
                    resolve(null);
                    return;
                }
                
                $.ajax({
                    url: window.lwwc_params?.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'lwwc_get_page_title',
                        nonce: window.lwwc_params?.nonce,
                        page_id: pageId,
                        page_url: pageUrl
                    },
                    success: (response) => {
                        if (response.success && response.data && response.data.title) {
                            resolve(response.data.title);
                        } else {
                            resolve(null);
                        }
                    },
                    error: () => resolve(null)
                });
            });
        },

        // Check if any wizard has content that would be overwritten
        hasWizardContent: function() {
            // Check Add-to-Cart wizard content
            const hasCartProducts = $('#lwwc-selected-products').children('.lwwc-selected-item').length > 0;
            // Only count custom redirect if a URL is actually entered
            const redirectVal = $('input[name="lwwc-redirect"]:checked').val();
            const redirectUrl = $('#lwwc-redirect-page-url').val() || '';
            const hasCartCustomRedirect = redirectVal !== 'none' && redirectUrl.trim() !== '';
            const hasCartPages = $('#lwwc-selected-pages').children('.lwwc-selected-item').length > 0;
            
            // Check Checkout wizard content (exclude placeholder elements)
            const hasCheckoutProducts = $('#lwwc-selected-products-cart-checkout .products-list').children(':not(.placeholder)').length > 0;
            const hasCheckoutCoupons = $('#lwwc-selected-coupons').children('.lwwc-selected-coupon').length > 0 ||
                                     $('#lwwc-selected-coupons-list-checkout').children(':not(.placeholder)').length > 0;
            
            return hasCartProducts || hasCartCustomRedirect || hasCartPages || hasCheckoutProducts || hasCheckoutCoupons;
        },
        
        // Check only the Add-to-Cart wizard for existing content
        hasCartWizardContent: function(urlToLoad = null) {
            // Check for selected products in Add-to-cart wizard
            const $currentItems = $('#lwwc-selected-products-cart .products-list .lwwc-selected-item');
            if ($currentItems.length > 0) {
                if (urlToLoad) {
                    // Compare current products to products in urlToLoad
                    try {
                        const urlObj = new URL(urlToLoad, window.location.origin);
                        const productsParam = urlObj.searchParams.get('add-to-cart');
                        if (productsParam) {
                            const loadedIds = productsParam.split(',').map(p => p.split(':')[0]);
                            const currentIds = $currentItems.map((i, el) => $(el).data('id').toString()).get();
                            // If the sets differ, return true (content would be replaced)
                            if (loadedIds.length !== currentIds.length || !loadedIds.every((id, i) => id == currentIds[i])) {
                                return true;
                            }
                            // If the sets are the same, do not show modal
                            return false;
                        }
                    } catch (e) {}
                }
                // If no urlToLoad, fallback to previous logic
                return true;
            }
            // Check for selected products in Checkout wizard (legacy or other flows)
            if ($(
                '#lwwc-selected-products .products-list .lwwc-selected-item'
            ).length > 0) {
                return true;
            }
            // Check for selected pages
            if ($('#lwwc-selected-pages .lwwc-selected-page-item').length > 0) {
                return true;
            }
            // Check for custom redirect
            if ($('.lwwc-custom-redirect-checkbox:checked').length > 0) {
                return true;
            }
            return false;
        },
        
        // Check only the Checkout wizard for existing content
        hasCheckoutWizardContent: function() {
            // True if any products or coupons have been explicitly selected
            // True if any products or coupons have been explicitly selected in Checkout wizard
            const hasCheckoutProducts = $('#lwwc-selected-products-cart-checkout .products-list').children('.lwwc-selected-item').length > 0;
            const hasCheckoutCoupons = $('#lwwc-selected-coupons-list-checkout .lwwc-selected-coupon').length > 0;
            return hasCheckoutProducts || hasCheckoutCoupons;
        },

        // Reset only the target wizard's state to prevent cross-contamination
        resetTargetWizardState: function(isCheckoutLink) {
            
            if (isCheckoutLink) {
                // Reset Checkout Wizard only
                
                // Clear checkout products
                const $checkoutProductsList = $('#lwwc-selected-products-cart-checkout .products-list');
                if ($checkoutProductsList.length) {
                    $checkoutProductsList.empty().append('<p class="placeholder">' + (window.lwwc_admin_i18n?.noProductsSelected || 'No products selected yet.') + '</p>');
                }
                
                // Clear checkout coupons (both possible locations)
                const $selectedCoupons = $('#lwwc-selected-coupons');
                if ($selectedCoupons.length) {
                    $selectedCoupons.empty().append('<p class="placeholder">' + (window.lwwc_admin_i18n?.noCouponsSelected || 'No coupons selected.') + '</p>');
                }
                
                const $checkoutCouponsList = $('#lwwc-selected-coupons-list-checkout');
                if ($checkoutCouponsList.length) {
                    $checkoutCouponsList.empty().append('<p class="placeholder">' + (window.lwwc_admin_i18n?.noCouponsSelected || 'No coupons selected.') + '</p>');
                }
                
                // Reset checkout wizard if available
                if (window.WCLWCheckoutWizard && typeof window.WCLWCheckoutWizard.reset === 'function') {
                    window.WCLWCheckoutWizard.reset();
                }
            } else {
                // Reset Add-to-Cart Wizard only
                
                // Clear add-to-cart products
                const $selectedProducts = $('#lwwc-selected-products');
                if ($selectedProducts.length) {
                    $selectedProducts.empty().append('<p class="placeholder">' + (window.lwwc_admin_i18n?.noProductsSelected || 'No products selected yet.') + '</p>');
                }
                
                const $cartProductsList = $('#lwwc-selected-products-cart .products-list');
                if ($cartProductsList.length) {
                    $cartProductsList.empty().append('<p class="placeholder">' + (window.lwwc_admin_i18n?.noProductsSelected || 'No products selected yet.') + '</p>');
                }
                
                // Clear selected pages
                const $selectedPage = $('#lwwc-selected-pages');
                if ($selectedPage.length) {
                    $selectedPage.empty().append('<p class="placeholder">' + (window.lwwc_admin_i18n?.noPageSelected || 'No page selected.') + '</p>');
                }
                
                // Clear custom redirect URL input
                $('#lwwc-redirect-page-url').val('');
                
                // Reset redirect radio buttons to default from settings
                const defaultRedirect = window.lwwc_params?.settings?.default_redirect_behavior || 'none';
                $('input[name="lwwc-redirect"]').prop('checked', false);
                $(`input[name="lwwc-redirect"][value="${defaultRedirect}"]`).prop('checked', true).trigger('change');
                
                // Hide page search wrapper
                $('#lwwc-page-search-wrapper').addClass('disabled');
            }
            
            // Clear generated link for both wizards
            $('#lwwc-generated-link').val('');
            
            // Update UI
            if (window.WCLWUIManager && typeof window.WCLWUIManager.updateActionButtons === 'function') {
                window.WCLWUIManager.updateActionButtons();
            }
        },

        // Duplicate Detection and Highlighting
        handleDuplicateDetection: function(duplicateKey, linkType) {
            // Find the duplicate saved link item
            const $duplicateItem = $(`.saved-link-item[data-key="${duplicateKey}"]`);
            if ($duplicateItem.length) {
                this.highlightDuplicateItem($duplicateItem);
                this.showDuplicateAlert(duplicateKey, linkType);
                this.scrollToDuplicateItem($duplicateItem);
            }
        },

        highlightDuplicateItem: function($item) {
            $('.saved-link-item').removeClass('lwwc-duplicate-highlight');
            $item.addClass('lwwc-duplicate-highlight');
            setTimeout(() => {
                $item.removeClass('lwwc-duplicate-highlight');
            }, 4000);
        },

        showDuplicateAlert: function(duplicateKey, linkType) {
            const linkTypeText = linkType === 'checkout' ? 'checkout' : 'add-to-cart';
            const message = `This link already exists in your saved ${linkTypeText} links.`;
            if (window.wclwNotices) {
                window.wclwNotices.duplicate(message, {
                    autoHide: true,
                    autoHideDelay: 8000,
                    scrollTo: true
                });
            }
        },

        scrollToDuplicateItem: function($item) {
            if ($item.length) {
                $('html, body').animate({
                    scrollTop: $item.offset().top - 100
                }, 800);
            }
        },

        copyDuplicateLink: function(duplicateKey) {
            const $duplicateItem = $(`.saved-link-item[data-key="${duplicateKey}"]`);
            if ($duplicateItem.length) {
                const url = $duplicateItem.data('url');
                if (url) {
                    navigator.clipboard.writeText(url).then(() => {
                        if (window.wclwNotices) {
                            window.wclwNotices.showCopySuccess();
                        }
                    }).catch(() => {
                        const textArea = document.createElement('textarea');
                        textArea.value = url;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        if (window.wclwNotices) {
                            window.wclwNotices.showCopySuccess();
                        }
                    });
                }
            }
        },

        // Pagination state
        pagination: {
            cart: { page: 1, totalPages: 1, entries: [] },
            checkout: { page: 1, totalPages: 1, entries: [] }
        },
        getPaginationLimit: function() {
            const lim = parseInt(window.lwwc_params?.settings?.saved_links_pagination_limit, 10);
            if (isNaN(lim) || lim < 1) return 5;
            return Math.min(lim, 10);
        },
        // Render paginated list for cart or checkout
        renderPaginatedList: function(type) {
            const list = type === 'cart' ? $('#lwwc-saved-cart-links-list') : $('#lwwc-saved-checkout-links-list');
            const pag = this.pagination[type];
            const limit = this.getPaginationLimit();
            const total = pag.entries.length;
            pag.totalPages = Math.max(1, Math.ceil(total / limit));
            if (pag.page > pag.totalPages) pag.page = pag.totalPages;
            if (pag.page < 1) pag.page = 1;
            // Remove old headers and paginations
            list.prev('.lwwc-saved-links-header').remove();
            list.next('.lwwc-pagination-controls').remove();
            // --- Sort filter fix: CLONE filter into header, always keep original in parent, but hide original ---
            let $sortWrap = list.parent().find('.lwwc-saved-links-sort-wrap');
            let $sortClone = null;
            if ($sortWrap.length) {
                $sortWrap.addClass('lwwc-sort-original-hidden').attr('aria-hidden', 'true').css('display', 'none');
                $sortClone = $sortWrap.clone(true, true);
                $sortClone.removeClass('lwwc-sort-original-hidden').removeAttr('aria-hidden').css('display', '');
                $sortClone.addClass('lwwc-saved-links-sort-clone');
            }
            // Render header row (count, sort, pagination)
            const countText = `${total} ${window.lwwc_admin_i18n?.savedLinksCount || 'saved links'}`;
            // Build header row
            const $header = $(`
                <div class="lwwc-saved-links-header" style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; gap: 12px;">
                    <div class="lwwc-saved-links-sort-placeholder"></div>
                    <div class="lwwc-saved-links-count" style="font-size:13px; color:#50575e; text-align:center; flex:1 1 auto;">${countText}</div>
                    <div class="lwwc-pagination-controls-top"></div>
                </div>
            `);
            // Insert cloned sort filter into header if present
            if ($sortClone) {
                $header.find('.lwwc-saved-links-sort-placeholder').replaceWith($sortClone);
            } else {
                $header.find('.lwwc-saved-links-sort-placeholder').remove();
            }
            // Insert header above list
            list.before($header);
            // Render top pagination controls
            this.renderPaginationControls(type, '.lwwc-pagination-controls-top', $header);
            // Render list
            list.empty();
            if (total === 0) {
                const placeholderText = type === 'cart' ? (window.lwwc_admin_i18n?.noCartLinks || 'No saved cart links yet.') : (window.lwwc_admin_i18n?.noCheckoutLinks || 'No saved checkout links yet.');
                list.html(`<p class="placeholder">${placeholderText}</p>`);
                this.renderPaginationControls(type, null, list); // still render controls for consistency
                return;
            }
            const start = (pag.page - 1) * limit;
            const end = Math.min(start + limit, total);
            for (let i = start; i < end; i++) {
                const [key, url] = pag.entries[i];
                this._renderSingleSavedLink(list, key, url, type);
            }
            // Render bottom pagination controls
            this.renderPaginationControls(type, null, list);
        },
        // Helper to render a single saved link (replaces addSavedLinkToList for paginated rendering)
        _renderSingleSavedLink: function(list, key, url, type, productData = null) {
            const linkDetails = this.parseLinkForDisplay(url, type, productData);
            const styleClass = this.getButtonStyleClass();
            const contentHtml = type === 'cart'
                ? `<div class="saved-link-content-inline saved-link-cart-inline">${linkDetails.productsHtml}<div class="inline-separator"></div>${linkDetails.redirectHtml}</div>`
                : `<div class="saved-link-content-inline saved-link-checkout-inline">${linkDetails.productsHtml}<div class="inline-separator"></div>${linkDetails.couponsHtml}</div>`;
            list.append(`
                <div class="saved-link-item" data-key="${key}" data-url="${url}" data-type="${type}">
                    ${contentHtml}
                    <div class="saved-link-actions-footer ${styleClass}">
                        <button type="button" class="button button-primary load-btn lwwc-button" title="${window.lwwc_admin_i18n?.load || 'Load'}" aria-label="${window.lwwc_admin_i18n?.load || 'Load'}" role="button">
                            <span class="dashicons dashicons-download"></span>
                            <span class="button-text">${window.lwwc_admin_i18n?.load || 'Load'}</span>
                        </button>
                        <button type="button" class="button copy-btn lwwc-button" title="${window.lwwc_admin_i18n?.copy || 'Copy'}" aria-label="${window.lwwc_admin_i18n?.copy || 'Copy'}" role="button">
                            <span class="dashicons dashicons-admin-page"></span>
                            <span class="button-text">${window.lwwc_admin_i18n?.copy || 'Copy'}</span>
                        </button>
                        <button type="button" class="button open-btn lwwc-button" title="${window.lwwc_admin_i18n?.open || 'Open'}" aria-label="${window.lwwc_admin_i18n?.open || 'Open'}" role="button">
                            <span class="dashicons dashicons-external"></span>
                            <span class="button-text">${window.lwwc_admin_i18n?.open || 'Open'}</span>
                        </button>
                        <button type="button" class="button saved-link-url-toggle lwwc-button" title="${window.lwwc_admin_i18n?.url || 'URL'}" aria-label="${window.lwwc_admin_i18n?.url || 'URL'}" aria-expanded="false" role="button">
                            <span class="dashicons dashicons-admin-links"></span>
                            <span class="button-text">URL</span>
                        </button>
                        <button type="button" class="button is-destructive remove-btn lwwc-button" title="${window.lwwc_admin_i18n?.remove || 'Remove'}" aria-label="${window.lwwc_admin_i18n?.remove || 'Remove'}" role="button">
                            <span class="dashicons dashicons-trash"></span>
                            <span class="button-text">${window.lwwc_admin_i18n?.remove || 'Remove'}</span>
                        </button>
                    </div>
                </div>`);
            this.enhanceSavedLinkProductNames(list.find('.saved-link-item[data-key="' + key + '"] .saved-link-product'));
            this.checkCouponLayoutOverflow(list.find('.saved-link-item[data-key="' + key + '"]'));
        },
        // Render pagination controls for cart or checkout
        // If targetSelector is provided, render inside that element; else, render after $listOrHeader
        renderPaginationControls: function(type, targetSelector = null, $listOrHeader = null) {
            const pag = this.pagination[type];
            const nav = $(`<nav class="lwwc-pagination-controls" aria-label="${type === 'cart' ? 'Cart' : 'Checkout'} ${window.lwwc_admin_i18n?.pagination || 'Pagination'}" data-type="${type}">
                <button type="button" class="wp-core-ui lwwc-button lwwc-pagination-first" ${pag.page === 1 ? 'disabled' : ''} aria-label="${window.lwwc_admin_i18n?.firstPage || 'First'}" tabindex="0" title="${window.lwwc_admin_i18n?.firstPage || 'First'}"><span aria-hidden="true">&#x00AB;</span></button>
                <button type="button" class="wp-core-ui lwwc-button lwwc-pagination-prev" ${pag.page === 1 ? 'disabled' : ''} aria-label="${window.lwwc_admin_i18n?.prevPage || 'Previous'}" tabindex="0" title="${window.lwwc_admin_i18n?.prevPage || 'Previous'}"><span aria-hidden="true">&#x2039;</span></button>
                <span class="lwwc-pagination-info">${window.lwwc_admin_i18n?.page || 'Page'} <input type="text" class="lwwc-pagination-current" value="${pag.page}" size="1" aria-label="${window.lwwc_admin_i18n?.currentPage || 'Current Page'}" /> / <span class="lwwc-pagination-total">${pag.totalPages}</span></span>
                <button type="button" class="wp-core-ui lwwc-button lwwc-pagination-next" ${pag.page === pag.totalPages ? 'disabled' : ''} aria-label="${window.lwwc_admin_i18n?.nextPage || 'Next'}" tabindex="0" title="${window.lwwc_admin_i18n?.nextPage || 'Next'}"><span aria-hidden="true">&#x203A;</span></button>
                <button type="button" class="wp-core-ui lwwc-button lwwc-pagination-last" ${pag.page === pag.totalPages ? 'disabled' : ''} aria-label="${window.lwwc_admin_i18n?.lastPage || 'Last'}" tabindex="0" title="${window.lwwc_admin_i18n?.lastPage || 'Last'}"><span aria-hidden="true">&#x00BB;</span></button>
            </nav>`);
            if (pag.totalPages <= 1) return; // Only show if more than 1 page
            if (targetSelector && $listOrHeader) {
                $listOrHeader.find(targetSelector).empty().append(nav);
            } else if ($listOrHeader) {
                $listOrHeader.after(nav);
            }
        },

    };

    window.WCLW_DEBUG_LAYOUT = function() {
        if (window.WCLWSavedLinksManager && window.WCLWSavedLinksManager.debugLayoutState) {
            window.WCLWSavedLinksManager.debugLayoutState();
        }
    };

    window.WCLW_REFRESH_LAYOUTS = function() {
        if (window.WCLWSavedLinksManager && window.WCLWSavedLinksManager.refreshAllLayouts) {
            window.WCLWSavedLinksManager.refreshAllLayouts();
        }
    };

    window.WCLW_CLEANUP_STACK_CLASSES = function() {
        if (window.WCLWSavedLinksManager && window.WCLWSavedLinksManager.cleanupDesktopStackClasses) {
            window.WCLWSavedLinksManager.cleanupDesktopStackClasses();
        }
    };

    window.WCLW_ENABLE_DEBUG = function() {
        if (window.WCLWSavedLinksManager) {
            window.WCLWSavedLinksManager.debugMode = true;
        }
    };

    window.WCLW_DISABLE_DEBUG = function() {
        if (window.WCLWSavedLinksManager) {
            window.WCLWSavedLinksManager.debugMode = false;
        }
    };

})(jQuery);

// Robust event delegation for all pagination controls
jQuery(function($) {
    // First page
    $(document).on('click', '.lwwc-pagination-first', function(e) {
        const $btn = $(this);
        if ($btn.is('[disabled]')) return;
        const $nav = $btn.closest('.lwwc-pagination-controls');
        const type = $nav.data('type');
        const mgr = window.WCLWSavedLinksManager;
        if (!type || !mgr.pagination[type]) return;
        if (mgr.pagination[type].page > 1) {
            mgr.pagination[type].page = 1;
            mgr.renderPaginatedList(type);
        }
    });
    // Last page
    $(document).on('click', '.lwwc-pagination-last', function(e) {
        const $btn = $(this);
        if ($btn.is('[disabled]')) return;
        const $nav = $btn.closest('.lwwc-pagination-controls');
        const type = $nav.data('type');
        const mgr = window.WCLWSavedLinksManager;
        if (!type || !mgr.pagination[type]) return;
        if (mgr.pagination[type].page < mgr.pagination[type].totalPages) {
            mgr.pagination[type].page = mgr.pagination[type].totalPages;
            mgr.renderPaginatedList(type);
        }
    });
    // Previous page
    $(document).on('click', '.lwwc-pagination-prev', function(e) {
        const $btn = $(this);
        if ($btn.is('[disabled]')) return;
        const $nav = $btn.closest('.lwwc-pagination-controls');
        const type = $nav.data('type');
        const mgr = window.WCLWSavedLinksManager;
        if (!type || !mgr.pagination[type]) return;
        if (mgr.pagination[type].page > 1) {
            mgr.pagination[type].page--;
            mgr.renderPaginatedList(type);
        }
    });
    // Next page
    $(document).on('click', '.lwwc-pagination-next', function(e) {
        const $btn = $(this);
        if ($btn.is('[disabled]')) return;
        const $nav = $btn.closest('.lwwc-pagination-controls');
        const type = $nav.data('type');
        const mgr = window.WCLWSavedLinksManager;
        if (!type || !mgr.pagination[type]) return;
        if (mgr.pagination[type].page < mgr.pagination[type].totalPages) {
            mgr.pagination[type].page++;
            mgr.renderPaginatedList(type);
        }
    });
    // Page input (change/blur)
    $(document).on('change blur', '.lwwc-pagination-current', function(e) {
        // Accept both change and blur for better UX
        const $input = $(this);
        const $nav = $input.closest('.lwwc-pagination-controls');
        const type = $nav.data('type');
        const mgr = window.WCLWSavedLinksManager;
        if (!type || !mgr.pagination[type]) return;
        let val = parseInt($input.val(), 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > mgr.pagination[type].totalPages) val = mgr.pagination[type].totalPages;
        if (mgr.pagination[type].page !== val) {
            mgr.pagination[type].page = val;
            mgr.renderPaginatedList(type);
        } else {
            // Always update input to reflect valid value
            $input.val(mgr.pagination[type].page);
        }
    });
    // Page input (Enter key)
    $(document).on('keydown', '.lwwc-pagination-current', function(e) {
        if (e.key === 'Enter') {
            $(this).trigger('change');
        }
    });
});