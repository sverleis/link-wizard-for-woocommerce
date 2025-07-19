<?php
class LWWC_Admin {
    private $plugin_name;
    private $version;

    public function __construct( $plugin_name, $version ) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
    }

    public function add_hooks() {
        // Admin page and script hooks
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
        add_action( 'admin_menu', [ $this, 'add_plugin_admin_menu' ] );
        add_filter( 'plugin_row_meta', [ $this, 'add_plugin_row_meta' ], 10, 2 );
        add_filter( 'plugin_action_links_' . plugin_basename( LWWC_PLUGIN_FILE ), [ $this, 'add_plugin_action_links' ] );

        // AJAX hooks
        add_action( 'wp_ajax_lwwc_search_pages', [ $this, 'search_pages_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_save_link', [ $this, 'save_link_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_delete_link', [ $this, 'delete_link_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_delete_all_links', [ $this, 'delete_all_links_ajax_callback' ] );
        // AJAX for deleting only Add-to-Cart links
        add_action( 'wp_ajax_lwwc_delete_cart_links', [ $this, 'delete_cart_links_ajax_callback' ] );
        // AJAX for deleting only Checkout links
        add_action( 'wp_ajax_lwwc_delete_checkout_links', [ $this, 'delete_checkout_links_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_get_link_details', [ $this, 'get_link_details_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_get_product_name', [ $this, 'get_product_name_ajax_callback' ] );
        
        // AJAX for product configurator
        add_action( 'wp_ajax_lwwc_create_configured_product', [ $this, 'create_configured_product_ajax_callback' ] );

        // AJAX for product search and quick select
        add_action( 'wp_ajax_lwwc_search_products', [ $this, 'search_products_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_get_filtered_products', [ $this, 'get_filtered_products_ajax_callback' ] );
        // AJAX for coupon search and quick select
        add_action( 'wp_ajax_lwwc_search_coupons', [ $this, 'search_coupons_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_get_filtered_coupons', [ $this, 'get_filtered_coupons_ajax_callback' ] );
    }

    /**
     * AJAX callback for searching products (used by quick-select.js)
     */
    public function search_products_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $search_term = isset($_POST['search_term']) ? sanitize_text_field( wp_unslash( $_POST['search_term'] ) ) : '';
        $results = array();
        if ( ! empty( $search_term ) ) {
            $args = array(
                'post_type'      => 'product',
                'posts_per_page' => 20,
                's'              => $search_term,
                'post_status'    => 'publish',
            );
            $query = new WP_Query( $args );
            if ( $query->have_posts() ) {
                foreach ( $query->posts as $post ) {
                    $product = wc_get_product( $post->ID );
                    if ( $product ) {
                        $results[] = array(
                            'id'   => $product->get_id(),
                            'name' => $product->get_name(),
                            'type' => $product->get_type(),
                        );
                    }
                }
            }
        }
        wp_send_json_success( $results );
    }

    /**
     * AJAX callback for searching coupons (used by coupon-quick-select.js)
     */
    public function search_coupons_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $search_term = isset($_POST['search_term']) ? sanitize_text_field( wp_unslash( $_POST['search_term'] ) ) : '';
        $results = array();
        if ( ! empty( $search_term ) ) {
            $args = array(
                'post_type'      => 'shop_coupon',
                'posts_per_page' => 20,
                's'              => $search_term,
                'post_status'    => 'publish',
            );
            $query = new WP_Query( $args );
            if ( $query->have_posts() ) {
                foreach ( $query->posts as $post ) {
                    $coupon = new WC_Coupon( $post->ID );
                    if ( $coupon ) {
                        $results[] = array(
                            'id'   => $coupon->get_id(),
                            'code' => $coupon->get_code(),
                            'amount' => $coupon->get_amount(),
                            'type' => $coupon->get_discount_type(),
                        );
                    }
                }
            }
        }
        wp_send_json_success( $results );
    }

    /**
     * AJAX callback for getting filtered products (used by quick-select.js)
     */
    public function get_filtered_products_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $filter = isset($_POST['filter']) ? sanitize_text_field( wp_unslash( $_POST['filter'] ) ) : '';
        $results = array();
        $args = array(
            'post_type'      => 'product',
            'posts_per_page' => 20,
            'post_status'    => 'publish',
        );
        switch ( $filter ) {
            case 'featured':
                $args['tax_query'][] = array(
                    'taxonomy' => 'product_visibility',
                    'field'    => 'name',
                    'terms'    => 'featured',
                );
                break;
            case 'on-sale':
                $args['meta_query'][] = array(
                    'key'     => '_sale_price',
                    'value'   => 0,
                    'compare' => '>',
                    'type'    => 'NUMERIC',
                );
                break;
            case 'top-rated':
                $args['meta_key'] = 'average_rating';
                $args['orderby'] = 'meta_value_num';
                $args['order'] = 'DESC';
                break;
            case 'recent':
                $args['orderby'] = 'date';
                $args['order'] = 'DESC';
                break;
        }
        $query = new WP_Query( $args );
        if ( $query->have_posts() ) {
            foreach ( $query->posts as $post ) {
                $product = wc_get_product( $post->ID );
                if ( $product ) {
                    $results[] = array(
                        'id'   => $product->get_id(),
                        'name' => $product->get_name(),
                        'type' => $product->get_type(),
                    );
                }
            }
        }
        wp_send_json_success( $results );
    }

    /**
     * AJAX callback for getting filtered coupons (used by coupon-quick-select.js)
     */
    public function get_filtered_coupons_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $filter = isset($_POST['filter']) ? sanitize_text_field( wp_unslash( $_POST['filter'] ) ) : '';
        $results = array();
        $args = array(
            'post_type'      => 'shop_coupon',
            'posts_per_page' => 20,
            'post_status'    => 'publish',
        );
        switch ( $filter ) {
            case 'recent':
                $args['orderby'] = 'date';
                $args['order'] = 'DESC';
                break;
            case 'amount-high':
                $args['meta_key'] = 'coupon_amount';
                $args['orderby'] = 'meta_value_num';
                $args['order'] = 'DESC';
                break;
            case 'amount-low':
                $args['meta_key'] = 'coupon_amount';
                $args['orderby'] = 'meta_value_num';
                $args['order'] = 'ASC';
                break;
            case 'percent':
                $args['meta_query'][] = array(
                    'key' => 'discount_type',
                    'value' => 'percent',
                    'compare' => 'LIKE',
                );
                break;
            case 'fixed':
                $args['meta_query'][] = array(
                    'key' => 'discount_type',
                    'value' => 'fixed',
                    'compare' => 'LIKE',
                );
                break;
        }
        $query = new WP_Query( $args );
        if ( $query->have_posts() ) {
            foreach ( $query->posts as $post ) {
                $coupon = new WC_Coupon( $post->ID );
                if ( $coupon ) {
                    $results[] = array(
                        'id'   => $coupon->get_id(),
                        'code' => $coupon->get_code(),
                        'amount' => $coupon->get_amount(),
                        'type' => $coupon->get_discount_type(),
                    );
                }
            }
        }
        wp_send_json_success( $results );
    }

    /**
     * Get WordPress admin color scheme colors and inject them as CSS custom properties.
     * This version dynamically fetches colors instead of using a hard-coded array.
     *
     * @since 1.0.0
     */
    private function get_admin_color_scheme_css() {
    // Access the globally registered color schemes
    global $_wp_admin_css_colors;
    
    // Get current user's color scheme, defaulting to 'fresh' (the classic default)
    $current_color = get_user_option('admin_color') ?: 'fresh';
    
    // 1. DYNAMICALLY GET COLORS (Replaces the hard-coded array)
    //-----------------------------------------------------------------
    $fetched_colors = [];
    if ( isset( $_wp_admin_css_colors[ $current_color ] ) && is_array( $_wp_admin_css_colors[ $current_color ]->colors ) && count( $_wp_admin_css_colors[ $current_color ]->colors ) >= 4 ) {
        $fetched_colors = $_wp_admin_css_colors[ $current_color ]->colors;
    } else {
        // Fallback to the 'Default' scheme's actual colors if the selected one is invalid
        $fetched_colors = $_wp_admin_css_colors['fresh']->colors;
    }

    // 2. MAP FETCHED COLORS TO YOUR NAMING CONVENTION
    //-----------------------------------------------------------------
    // The fetched colors are in a numeric array. We map them to your desired keys.
    // This mapping is based on the typical order in WordPress schemes.
    $colors = [
        'primary'      => $fetched_colors[1], // Usually the main highlight color
        'ui'           => $fetched_colors[0], // Usually the base/darkest UI color
        'notification' => $fetched_colors[2], // Usually a secondary accent/notification
        'link'         => $fetched_colors[3], // Usually another accent or link color
    ];
    
    // 3. GENERATE CSS (Your original logic remains the same)
    //-----------------------------------------------------------------
    // This part assumes you have a helper function: $this->hex_to_rgb()
    $primary_rgb      = $this->hex_to_rgb($colors['primary']);
    $ui_rgb           = $this->hex_to_rgb($colors['ui']);
    $notification_rgb = $this->hex_to_rgb($colors['notification']);
    $link_rgb         = $this->hex_to_rgb($colors['link']);
    
    $css = "
    :root {
        --lwwc-theme-primary: {$colors['primary']};
        --lwwc-theme-primary-bg: rgba({$primary_rgb}, 0.1);
        --lwwc-theme-ui: {$colors['ui']};
        --lwwc-theme-ui-bg: rgba({$ui_rgb}, 0.1);
    }";
    return $css;
}

    /**
     * Converts a hex color code to an RGB string.
     *
     * @param  string $hex_color The hex color code (e.g., '#a46497').
     * @return string The color as a comma-separated RGB string (e.g., '164, 100, 151').
     */
    private function hex_to_rgb( $hex_color ) {
        // Remove the hash at the start if it's there
        $hex_color = ltrim( $hex_color, '#' );

        // If we have a 3-char shorthand, expand it
        if ( strlen( $hex_color ) === 3 ) {
            $hex_color = $hex_color[0] . $hex_color[0] . $hex_color[1] . $hex_color[1] . $hex_color[2] . $hex_color[2];
        }
        // Break the hex into R, G, B components
        $rgb_parts = sscanf( $hex_color, '%02x%02x%02x' );
        // Return as a comma-separated string
        if ( $rgb_parts ) {
            return implode( ', ', $rgb_parts );
        }
        // Return a default value on failure
        return '0, 0, 0';
    }

    /**
     * Registers the scripts and styles for the admin area.
     *
     * @since    1.0.0
     * @param string $hook_suffix The current admin page hook.
     */
    public function enqueue_scripts($hook_suffix) {
        // Only load assets on our plugin's page.
        if ( 'product_page_link-wizard-for-woocommerce' !== $hook_suffix ) {
            return;
        }

        // Enqueue WooCommerce admin scripts for product search
        wp_enqueue_script( 'wc-enhanced-select' );
        wp_enqueue_script( 'selectWoo' );
        wp_enqueue_style( 'woocommerce_admin_styles' );

        wp_enqueue_style( $this->plugin_name, LWWC_PLUGIN_URL . 'admin/css/admin.css', array(), $this->version . '-' . time(), 'all' );
        
        // Inject dynamic theme colors
        wp_add_inline_style( $this->plugin_name, $this->get_admin_color_scheme_css() );

        // Core modular scripts - load these first (required by coordinator)
        wp_enqueue_script( $this->plugin_name . '-notices', LWWC_PLUGIN_URL . 'admin/js/notices.js', array( 'jquery' ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-ui-manager', LWWC_PLUGIN_URL . 'admin/js/ui-manager.js', array( 'jquery' ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-modal-manager', LWWC_PLUGIN_URL . 'admin/js/modal-manager.js', array( 'jquery' ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-search-manager', LWWC_PLUGIN_URL . 'admin/js/search-manager.js', array( 'jquery' ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-link-generator', LWWC_PLUGIN_URL . 'admin/js/link-generator.js', array( 'jquery' ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-saved-links-manager', LWWC_PLUGIN_URL . 'admin/js/saved-links-manager.js', array( 'jquery' ), $this->version . '-' . time(), true );
        
        // New modular scripts for search and quick select
        wp_enqueue_script( $this->plugin_name . '-product-search', LWWC_PLUGIN_URL . 'admin/js/product-search.js', array( 'jquery' ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-coupon-search', LWWC_PLUGIN_URL . 'admin/js/coupon-search.js', array( 'jquery' ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-product-quick-select', LWWC_PLUGIN_URL . 'admin/js/product-quick-select.js', array( 'jquery' ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-coupon-quick-select', LWWC_PLUGIN_URL . 'admin/js/coupon-quick-select.js', array( 'jquery' ), $this->version . '-' . time(), true );
        
        // Optional modular scripts
        wp_enqueue_script( $this->plugin_name . '-variation-selection', LWWC_PLUGIN_URL . 'admin/js/variation-selection.js', array( 'jquery' ), $this->version . '-' . time(), true );
        
        // Main admin coordinator - load last with all core dependencies
        $core_dependencies = array( 
            'jquery', 
            'wc-enhanced-select', 
            $this->plugin_name . '-ui-manager',
            $this->plugin_name . '-modal-manager',
            $this->plugin_name . '-search-manager',
            $this->plugin_name . '-link-generator',
            $this->plugin_name . '-saved-links-manager'
        );
        wp_enqueue_script( $this->plugin_name, LWWC_PLUGIN_URL . 'admin/js/admin.js', $core_dependencies, $this->version . '-' . time(), true );
        
        // Feature-specific scripts (optional)
        wp_enqueue_script( $this->plugin_name . '-quick-select', LWWC_PLUGIN_URL . 'admin/js/quick-select.js', array( $this->plugin_name ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-add-to-cart', LWWC_PLUGIN_URL . 'admin/js/add-to-cart.js', array( $this->plugin_name ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-checkout-wizard', LWWC_PLUGIN_URL . 'admin/js/checkout-wizard.js', array( $this->plugin_name ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-checkout-url-handler', LWWC_PLUGIN_URL . 'admin/js/checkout-url-handler.js', array( $this->plugin_name . '-checkout-wizard' ), $this->version . '-' . time(), true );
        wp_enqueue_script( $this->plugin_name . '-coupon-manager', LWWC_PLUGIN_URL . 'admin/js/coupon-manager.js', array( $this->plugin_name ), $this->version . '-' . time(), true );
        
        // Load settings class if it exists
        if ( ! class_exists( 'LWWC_Settings' ) ) {
            require_once LWWC_PLUGIN_DIR . 'includes/class-lwwc-settings.php';
        }

        $i18n = array(
            'generateCart' => __( 'Generate Add to Cart Link', 'link-wizard-for-woocommerce' ),
            'generateCheckout' => __( 'Generate Checkout Link', 'link-wizard-for-woocommerce' ),
            'generateCartHeading' => __( '2. Generate Your Link', 'link-wizard-for-woocommerce' ),
            'generateCheckoutHeading' => __( '3. Generate Your Link', 'link-wizard-for-woocommerce' ),
            'noProducts'      => __( 'No products found.', 'link-wizard-for-woocommerce' ),
            'noCoupons'       => __( 'No coupons found.', 'link-wizard-for-woocommerce' ),
            'noPages'         => __( 'No pages found.', 'link-wizard-for-woocommerce' ),
            'noCartLinks'     => __( 'You have no saved "Add to Cart" links.', 'link-wizard-for-woocommerce' ),
            'noCheckoutLinks' => __( 'You have no saved "Checkout" links.', 'link-wizard-for-woocommerce' ),
            'confirmReset'    => __( 'Are you sure you want to reset the wizard? All unsaved changes will be lost.', 'link-wizard-for-woocommerce' ),
            'confirmDelete' => __('Are you sure you want to permanently delete this saved link?', 'link-wizard-for-woocommerce'),
            'confirmLoadLink' => __('Loading this saved link will replace your current wizard settings. Any unsaved changes will be lost. Continue?', 'link-wizard-for-woocommerce'),
            'confirmDeleteAll' => __( 'Are you sure you want to permanently delete all saved links? This action cannot be undone.', 'link-wizard-for-woocommerce' ),
            'confirmDeleteCartLinks'     => __( 'Are you sure you want to permanently delete all saved Add-to-Cart links? This action cannot be undone.', 'link-wizard-for-woocommerce' ),
            /* translators: %s: Number of Add-to-Cart links */
            'confirmDeleteCartLinksWithCount' => __( 'Are you sure you want to permanently delete %s saved Add-to-Cart links? This action cannot be undone.', 'link-wizard-for-woocommerce' ),
            'confirmDeleteCheckoutLinks' => __( 'Are you sure you want to permanently delete all saved Checkout links? This action cannot be undone.', 'link-wizard-for-woocommerce' ),
            'wizardReset'     => __( 'Wizard has been reset.', 'link-wizard-for-woocommerce' ),
            'linkCopied'      => __( 'Link copied to clipboard!', 'link-wizard-for-woocommerce' ),
            'noVariations' => __('No variations found for this product.', 'link-wizard-for-woocommerce'),
            'allOptions' => __('All', 'link-wizard-for-woocommerce'),
            'noProductsSelected' => __( 'No products selected', 'link-wizard-for-woocommerce' ),
            'noCouponsSelected' => __( 'No coupons selected', 'link-wizard-for-woocommerce' ),
            'noPageSelected' => __( 'No page selected', 'link-wizard-for-woocommerce' ),
            'onlyOneProduct' => __('Only one product allowed for this link type.', 'link-wizard-for-woocommerce'),
            'searchProducts' => __('Search for products to add...', 'link-wizard-for-woocommerce'),
            'searchReplaceProduct' => __('Search to replace current product...', 'link-wizard-for-woocommerce'),
            'searchPages' => __('Search for a page...', 'link-wizard-for-woocommerce'),
            'searchReplacePage' => __('Search to replace current page...', 'link-wizard-for-woocommerce'),
            'remove' => __( 'Remove', 'link-wizard-for-woocommerce' ),
            'load' => __( 'Load', 'link-wizard-for-woocommerce' ),
            'copy' => __( 'Copy', 'link-wizard-for-woocommerce' ),
            'open' => __( 'Open', 'link-wizard-for-woocommerce' ),
            'copied' => __( 'Copied!', 'link-wizard-for-woocommerce' ),
            'saved' => __('Saved!', 'link-wizard-for-woocommerce'),
            'noLinkToSave' => __('No link to save.', 'link-wizard-for-woocommerce'),
            'noLinkToCopy' => __('No link to copy.', 'link-wizard-for-woocommerce'),
            'noLinkToOpen' => __('No link to open.', 'link-wizard-for-woocommerce'),
            'errorLoading' => __('Error: Could not load all link details. Some products or coupons may no longer exist.', 'link-wizard-for-woocommerce'),
            'errorAjax' => __('An AJAX error occurred. Please try again.', 'link-wizard-for-woocommerce'),
            'errorDeleting' => __('Error deleting link.', 'link-wizard-for-woocommerce'),
            'allLinksDeleted' => __('All saved links have been deleted.', 'link-wizard-for-woocommerce'),
            'doneButtonLabel' => __('Done', 'link-wizard-for-woocommerce'),
            'nextButtonLabel'   => __('Next', 'link-wizard-for-woocommerce'),
            'hideSidebar' => __('> Hide', 'link-wizard-for-woocommerce'),
            'showSidebar' => __('< Show', 'link-wizard-for-woocommerce'),
            // New/expanded keys for JS i18n:
            /* translators: %s: The type of item (e.g., products, coupons, pages) */
            'noSelected' => __( 'No %s selected', 'link-wizard-for-woocommerce' ),
            'noProductsSelected' => __( 'No products selected', 'link-wizard-for-woocommerce' ),
            'noCouponsSelected' => __( 'No coupons selected', 'link-wizard-for-woocommerce' ),
            'noPageSelected' => __( 'No page selected', 'link-wizard-for-woocommerce' ),
            'incompleteVariationsTitle' => __( '⚠️ Incomplete Variations Detected', 'link-wizard-for-woocommerce' ),
            'incompleteVariationsMessage1' => __( 'This product has variations with incomplete attributes (marked as "Any"). These variations cannot be added to checkout links until they are properly configured.', 'link-wizard-for-woocommerce' ),
            'incompleteVariationsMessage2' => __( 'Please edit the product to complete the variation attributes.', 'link-wizard-for-woocommerce' ),
            'editProductInNewTab' => __( 'Edit Product in New Tab', 'link-wizard-for-woocommerce' ),
            'variationsCount' => __( 'Showing', 'link-wizard-for-woocommerce' ),
            'resetFilters' => __( 'Reset Filters', 'link-wizard-for-woocommerce' ),
            'variationName' => __( 'ID', 'link-wizard-for-woocommerce' ),
            'cannotAddIncomplete' => __( 'Cannot Add (Incomplete)', 'link-wizard-for-woocommerce' ),
            'addToLink' => __( 'Add to Link', 'link-wizard-for-woocommerce' ),
            'selectVariation' => __( 'Select Variation', 'link-wizard-for-woocommerce' ),
            'close' => __( 'Close', 'link-wizard-for-woocommerce' ),
            'filterVariations' => __( 'Filter Variations', 'link-wizard-for-woocommerce' ),
            'search' => __( 'Search', 'link-wizard-for-woocommerce' ),
            'searchByIDAttributesPrice' => __( 'Search by ID, attributes, price...', 'link-wizard-for-woocommerce' ),
            'all' => __( 'All', 'link-wizard-for-woocommerce' ),
            'clearAllFilters' => __( 'Clear All Filters', 'link-wizard-for-woocommerce' ),
            /* translators: 1: Old product name, 2: New product name */
            'productReplaceConfirm' => __( 'Replace <strong>"%1$s"</strong> with <strong>"%2$s"</strong>?', 'link-wizard-for-woocommerce' ),
            // Add any other new keys used in JS...
        );

        $saved_cart_links = get_option('lwwc_saved_cart_links', array());
        $saved_checkout_links = get_option('lwwc_saved_checkout_links', array());
        $product_names = array();
        
        // Helper function to get product name with variation details if applicable
        $get_product_display_name = function($product_id) {
            $product = wc_get_product($product_id);
            if (!$product) {
                return false;
            }
            
            $name = $product->get_name();
            
            // If this is a variation, add the formatted attributes
            if ($product->is_type('variation')) {
                $attributes = $product->get_variation_attributes();
                if (!empty($attributes)) {
                    $formatted_attributes = array();
                    foreach ($attributes as $attribute_name => $attribute_value) {
                        // Clean up attribute name (remove 'attribute_' prefix if present)
                        $clean_name = str_replace('attribute_', '', $attribute_name);
                        // Convert to title case
                        $clean_name = ucwords(str_replace(['pa_', '-', '_'], [' ', ' ', ' '], $clean_name));
                        $formatted_attributes[] = $clean_name . ': ' . ucwords($attribute_value);
                    }
                    if (!empty($formatted_attributes)) {
                        $name .= ' ( ' . implode(' | ', $formatted_attributes) . ' )';
                    }
                }
            }
            
            return $name;
        };
        
        // Process cart links (use 'add-to-cart' parameter)
        if (!empty($saved_cart_links)) {
            foreach ($saved_cart_links as $url) {
                // Extract product IDs from the URL
                $parts = wp_parse_url($url);
                if (!empty($parts['query'])) {
                    parse_str($parts['query'], $query_vars);
                    if (!empty($query_vars['add-to-cart'])) {
                        $ids = explode(',', $query_vars['add-to-cart']);
                        foreach ($ids as $id_part) {
                            $id = explode(':', $id_part)[0];
                            $id = absint($id);
                            if ($id && !isset($product_names[$id])) {
                                $display_name = $get_product_display_name($id);
                                if ($display_name) {
                                    $product_names[$id] = $display_name;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Process checkout links (use 'products' parameter)
        if (!empty($saved_checkout_links)) {
            foreach ($saved_checkout_links as $url) {
                // Extract product IDs from the URL
                $parts = wp_parse_url($url);
                if (!empty($parts['query'])) {
                    parse_str($parts['query'], $query_vars);
                    if (!empty($query_vars['products'])) {
                        $ids = explode(',', $query_vars['products']);
                        foreach ($ids as $id_part) {
                            $id = explode(':', $id_part)[0];
                            $id = absint($id);
                            if ($id && !isset($product_names[$id])) {
                                $display_name = $get_product_display_name($id);
                                if ($display_name) {
                                    $product_names[$id] = $display_name;
                                }
                            }
                        }
                    }
                }
            }
        }
        // Prepare page URL and title maps for custom redirects
        $page_urls   = array();
        $page_titles = array();
        $pages = get_pages();
        if ( ! empty( $pages ) ) {
            foreach ( $pages as $page ) {
                $page_id = absint( $page->ID );
                $permalink = get_permalink( $page_id );
                if ( $permalink ) {
                    $page_urls[ $page_id ]   = $permalink;
                    $page_titles[ $page_id ] = get_the_title( $page_id );
                }
            }
        }
        $params = array(
            'ajax_url'           => admin_url( 'admin-ajax.php' ),
            'admin_url'          => admin_url(),
            'search_nonce'       => wp_create_nonce( 'lwwc_search_nonce' ),
            'manage_links_nonce' => wp_create_nonce( 'lwwc_manage_links_nonce' ),
            'home_url'           => home_url( '/' ),
            'cart_url'           => wc_get_cart_url(),
            'checkout_url'       => wc_get_checkout_url(),
            'saved_cart_links'   => $saved_cart_links,
            'saved_checkout_links'=> $saved_checkout_links,
            'settings'           => class_exists( 'LWWC_Settings' ) && method_exists( 'LWWC_Settings', 'get_options' ) ? LWWC_Settings::get_options() : array(),
            'product_names'      => $product_names,
            'page_urls'          => $page_urls,
            'page_titles'        => $page_titles,
            // Nonces for delete actions
            'nonce_all_links'      => wp_create_nonce( 'lwwc_delete_all_links_nonce' ),
            'nonce_cart_links'     => wp_create_nonce( 'lwwc_delete_cart_links_nonce' ),
            'nonce_checkout_links' => wp_create_nonce( 'lwwc_delete_checkout_links_nonce' ),
            // Nonce for notice dismissal
            'nonce'               => wp_create_nonce( 'lwwc_ajax' ),
        );
        
        wp_localize_script( $this->plugin_name, 'lwwc_params', $params );
        wp_localize_script( $this->plugin_name, 'lwwc_admin_i18n', $i18n );
    }

    /**
     * Adds the admin menu page for the Link Wizard under the "Products" menu.
     * @since    1.0.0
     */
    public function add_plugin_admin_menu() {
        add_submenu_page(
            'edit.php?post_type=product',
            'Link Wizard',
            'Link Wizard',
            'manage_woocommerce', // Capability for both Admin and Shop Manager
            $this->plugin_name,
            array($this, 'display_plugin_setup_page')
        );
    }

    /**
     * Renders the content for the admin page.
     * @since    1.0.0
     */
    public function display_plugin_setup_page() {
        // Make the admin instance available to the included file
        $admin_instance = $this;
        require_once LWWC_PLUGIN_DIR . 'admin/partials/admin-display.php';
    }

    /**
     * Registers the AJAX handlers for the admin interface.
     * @since    1.0.0
     */
    public function register_ajax_handlers() {
        // AJAX hooks
        add_action( 'wp_ajax_lwwc_search_pages', [ $this, 'search_pages_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_save_link', [ $this, 'save_link_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_delete_link', [ $this, 'delete_link_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_delete_all_links', [ $this, 'delete_all_links_ajax_callback' ] );
        // AJAX for deleting only Add-to-Cart links
        add_action( 'wp_ajax_lwwc_delete_cart_links', [ $this, 'delete_cart_links_ajax_callback' ] );
        // AJAX for deleting only Checkout links
        add_action( 'wp_ajax_lwwc_delete_checkout_links', [ $this, 'delete_checkout_links_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_get_link_details', [ $this, 'get_link_details_ajax_callback' ] );
        add_action( 'wp_ajax_lwwc_get_product_name', [ $this, 'get_product_name_ajax_callback' ] );
    }

    /**
     * Adds links to the plugin's metadata row on the plugins page.
     * @since    3.2.8
     */
    public function add_plugin_row_meta( $links, $file ) {
        if ( plugin_basename( LWWC_PLUGIN_FILE ) !== $file ) return $links;
        
        $wizard_url = admin_url( 'edit.php?post_type=product&page=' . $this->plugin_name );
        $row_meta['wizard'] = '<a href="' . esc_url( $wizard_url ) . '">' . esc_html__( 'Wizards', 'link-wizard-for-woocommerce' ) . '</a>';

        return array_merge( $links, $row_meta );
    }

    /**
     * Adds action links to the plugin's row on the plugins page.
     * These appear before the "Deactivate" link.
     * @since    4.1.1
     */
    public function add_plugin_action_links( $links ) {
        // Only show the settings link to users who can manage options (admins).
        if ( current_user_can( 'manage_options' ) ) {
            $settings_url = admin_url( 'edit.php?post_type=product&page=' . $this->plugin_name . '#tab-settings' );
            $settings_link = '<a href="' . esc_url( $settings_url ) . '">' . esc_html__( 'Settings', 'link-wizard-for-woocommerce' ) . '</a>';
            
            // Add settings link at the beginning of the array
            array_unshift( $links, $settings_link );
        }
        
        return $links;
    }

    /**
     * AJAX handler for saving a generated link.
     */
    public function save_link_ajax_callback() {
        check_ajax_referer( 'lwwc_manage_links_nonce', 'nonce' );
        $link_url = isset($_POST['link_url']) ? esc_url_raw( wp_unslash( $_POST['link_url'] ) ) : '';
        if (empty($link_url)) {
            wp_send_json_error( ['message' => __('Link URL is empty.', 'link-wizard-for-woocommerce')] );
        }

        $link_type = isset($_POST['link_type']) && $_POST['link_type'] === 'checkout' ? 'checkout' : 'cart';
        $option_key = 'lwwc_saved_' . $link_type . '_links';

        $saved_links = get_option($option_key, array());
        
        // Check for duplicate URLs
        $duplicate_key = null;
        foreach ($saved_links as $key => $url) {
            if ($url === $link_url) {
                $duplicate_key = $key;
                break;
            }
        }
        
        if ($duplicate_key) {
            wp_send_json_error( [
                'message' => __('This link already exists in your saved links.', 'link-wizard-for-woocommerce'),
                'duplicate_key' => $duplicate_key,
                'is_duplicate' => true
            ] );
        }
        
        $link_key = 'lwwc_' . hash('crc32', $link_url . microtime());
        $saved_links[$link_key] = $link_url;
        
        update_option($option_key, $saved_links);
        wp_send_json_success( [ 'link_key' => $link_key, 'message' => __('Link saved.', 'link-wizard-for-woocommerce') ] );
    }

    /**
     * AJAX handler for deleting a saved link.
     */
    public function delete_link_ajax_callback() {
        check_ajax_referer( 'lwwc_manage_links_nonce', 'nonce' );
        $link_key = isset($_POST['link_key']) ? sanitize_text_field( wp_unslash( $_POST['link_key'] ) ) : '';
        $link_type = isset($_POST['link_type']) && $_POST['link_type'] === 'checkout' ? 'checkout' : 'cart';
        $option_key = 'lwwc_saved_' . $link_type . '_links';

        $saved_links = get_option($option_key, array());

        if (isset($saved_links[$link_key])) {
            unset($saved_links[$link_key]);
            update_option($option_key, $saved_links);
            wp_send_json_success(['message' => __('Link deleted.', 'link-wizard-for-woocommerce')]);
        } else {
            wp_send_json_error(['message' => __('Link not found.', 'link-wizard-for-woocommerce')]);
        }
    }

    /**
     * AJAX handler for deleting all saved links.
     */
    public function delete_all_links_ajax_callback() {
        check_ajax_referer( 'lwwc_delete_all_links_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( ['message' => __('Permission denied.', 'link-wizard-for-woocommerce')] );
        }
        // Count total links before deletion
        $cart_links = get_option( 'lwwc_saved_cart_links', [] );
        $checkout_links = get_option( 'lwwc_saved_checkout_links', [] );
        $total = count( $cart_links ) + count( $checkout_links );
        // Delete all
        delete_option( 'lwwc_saved_cart_links' );
        delete_option( 'lwwc_saved_checkout_links' );
        // Return success with count
        wp_send_json_success( [
            /* translators: %d: Number of saved links */
            'message' => sprintf( _n( '<strong>%d</strong> saved link has been deleted.', '<strong>%d</strong> saved links have been deleted.', $total, 'link-wizard-for-woocommerce' ), $total ),
            'count'   => $total,
        ] );
    }
    /**
     * AJAX handler for deleting all Add-to-Cart links.
     */
    public function delete_cart_links_ajax_callback() {
        check_ajax_referer( 'lwwc_delete_cart_links_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( ['message' => __( 'Permission denied.', 'link-wizard-for-woocommerce' )] );
        }
        // Count links before deletion
        $links = get_option( 'lwwc_saved_cart_links', [] );
        $count = count( $links );
        delete_option( 'lwwc_saved_cart_links' );
        wp_send_json_success( [
            /* translators: %d: Number of Add-to-Cart links */
            'message' => sprintf( _n( '<strong>%d</strong> saved Add-to-Cart link has been deleted.', '<strong>%d</strong> saved Add-to-Cart links have been deleted.', $count, 'link-wizard-for-woocommerce' ), $count ),
            'count'   => $count,
        ] );
    }
    /**
     * AJAX handler for deleting all Checkout links.
     */
    public function delete_checkout_links_ajax_callback() {
        check_ajax_referer( 'lwwc_delete_checkout_links_nonce', 'nonce' );
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( ['message' => __( 'Permission denied.', 'link-wizard-for-woocommerce' )] );
        }
        // Count links before deletion
        $links = get_option( 'lwwc_saved_checkout_links', [] );
        $count = count( $links );
        delete_option( 'lwwc_saved_checkout_links' );
        wp_send_json_success( [
            /* translators: %d: Number of Checkout links */
            'message' => sprintf( _n( '<strong>%d</strong> saved Checkout link has been deleted.', '<strong>%d</strong> saved Checkout links have been deleted.', $count, 'link-wizard-for-woocommerce' ), $count ),
            'count'   => $count,
        ] );
    }

    /**
     * AJAX handler to get link details for loading into the wizard.
     */
    public function get_link_details_ajax_callback() {
        check_ajax_referer( 'lwwc_manage_links_nonce', 'nonce' );

        $product_ids = isset($_POST['product_ids']) ? array_map('intval', $_POST['product_ids']) : [];
        $coupon_codes = isset($_POST['coupon_codes']) ? array_map('sanitize_text_field', wp_unslash( $_POST['coupon_codes'] ) ) : [];
        $redirect_url = isset($_POST['redirect_url']) ? esc_url_raw( wp_unslash( $_POST['redirect_url'] ) ) : null;

        $data = [
            'products' => [],
            'coupons' => [],
            'redirect_page' => null,
        ];

        if (!empty($product_ids)) {
            foreach ($product_ids as $product_id) {
                $product = wc_get_product($product_id);
                if ($product) {
                    $data['products'][] = LWWC_Product_Utils::get_product_data_for_js($product);
                }
            }
        }

        if (!empty($coupon_codes)) {
            foreach ($coupon_codes as $coupon_code) {
                $coupon_id = wc_get_coupon_id_by_code($coupon_code);
                if ($coupon_id) {
                    $data['coupons'][] = ['id' => $coupon_id, 'code' => $coupon_code];
                }
            }
        }

        if ($redirect_url) {
            // Normalize URL: remove query string and trailing slash
            $normalized_url = strtok($redirect_url, '?');
            $normalized_url = rtrim($normalized_url, '/');
            $page_id = url_to_postid($redirect_url);
            if (!$page_id) {
                // Try with normalized URL
                $page_id = url_to_postid($normalized_url);
            }
            if (!$page_id) {
                // Fallback: try to find by path
                $parsed = wp_parse_url($redirect_url);
                if (!empty($parsed['path'])) {
                    $path = trim($parsed['path'], '/');
                    $page = get_page_by_path($path);
                    if ($page) {
                        $page_id = $page->ID;
                    }
                }
            }
            if ($page_id) {
                $page = get_post($page_id);
                $data['redirect_page'] = ['id' => $page->ID, 'title' => $page->post_title, 'url' => get_permalink($page_id)];
            }
        }

        wp_send_json_success($data);
    }

    /**
     * Renders the cart links tab content.
     * @since 1.0.0
     */
    public function render_cart_links_tab($mode = 'cart') {
        if ($mode === 'checkout') {
            $this->render_link_generator_tab('checkout');
        } else {
            $this->render_link_generator_tab('cart');
        }
    }

    /**
     * Renders the settings tab content.
     * @since 1.0.0
     */
    public function render_settings_tab() {
        // Load settings class if it exists
        if ( ! class_exists( 'LWWC_Settings' ) ) {
            require_once LWWC_PLUGIN_DIR . 'includes/class-lwwc-settings.php';
        }
        $settings = new LWWC_Settings();
        $settings->render_settings_page();
    }

    /**
     * Renders the main link generator tab content.
     * @since 1.0.0
     */
    private function render_link_generator_tab($mode = 'cart') {
        $quick_select_mode = class_exists('LWWC_Settings') ? LWWC_Settings::get_option('quick_select_mode', 'auto') : 'auto';
        $default_filter = class_exists('LWWC_Settings') ? LWWC_Settings::get_option('quick_select_default_filter', 'recent') : 'recent';
        ?>
        <div id="lwwc-<?php echo esc_attr($mode); ?>-link-generator" class="lwwc-link-generator" style="display:none;">
            <div class="lwwc-generator-content">
                <div class="lwwc-info-section">
                    <?php if ($mode === 'checkout') : ?>
                        <p><?php echo esc_html__('This tool builds a custom link that adds products to the cart and immediately takes the customer to the checkout page. This functionality is based on an upcoming feature in', 'link-wizard-for-woocommerce'); ?> <a href="https://github.com/woocommerce/woocommerce/pull/58140" target="_blank"><?php echo esc_html__('WooCommerce 10+', 'link-wizard-for-woocommerce'); ?></a>.</p>
                    <?php else : ?>
                        <p><?php echo esc_html__('This tool builds a standard WooCommerce "add-to-cart" URL. For more details, see the', 'link-wizard-for-woocommerce'); ?> <a href="<?php echo esc_url('https://woocommerce.com/document/quick-guide-to-woocommerce-add-to-cart-urls/'); ?>" target="_blank"><?php echo esc_html__('official documentation', 'link-wizard-for-woocommerce'); ?></a>.</p>
                    <?php endif; ?>
                </div>
                <!-- Step 1: Select Products -->
                <div class="lwwc-step">
                    <div class="lwwc-step-content">
                        <div class="lwwc-search-section">
                            <h2><?php echo esc_html__('1. Select Products', 'link-wizard-for-woocommerce'); ?></h2>
                            <h3><?php echo esc_html__('Search for products:', 'link-wizard-for-woocommerce'); ?></h3>
                            <div class="lwwc-search-input-wrapper">
                                <input type="text" id="lwwc-product-search<?php echo $mode === 'checkout' ? '-checkout' : ''; ?>" placeholder="<?php echo esc_attr__('Type to search for products...', 'link-wizard-for-woocommerce'); ?>" />
                            </div>
                            <div id="lwwc-search-results<?php echo $mode === 'checkout' ? '-checkout' : ''; ?>" class="lwwc-search-results"></div>
                        </div>
                        <div class="lwwc-quick-select-card">
                            <div class="lwwc-quick-select-header">
                                <h3 style="display: flex; align-items: center; gap: 10px; margin: 0;">
                                    <?php echo esc_html__('Product Quick Select', 'link-wizard-for-woocommerce'); ?>
                                    <?php if ($quick_select_mode === 'manual') : ?>
                                        <button type="button" class="button button-primary lwwc-load-products-btn" style="margin-left: 10px; display: flex; align-items: center; gap: 6px;">
                                            <span class="dashicons dashicons-update"></span>
                                            <span><?php echo esc_html__('Load products', 'link-wizard-for-woocommerce'); ?></span>
                                        </button>
                                    <?php endif; ?>
                                </h3>
                                <?php if ($quick_select_mode !== 'disabled') : ?>
                                <div class="lwwc-filter-group">
                                    <select id="lwwc-product-filter<?php echo $mode === 'checkout' ? '-checkout' : ''; ?>">
                                        <option value="featured" <?php selected($default_filter, 'featured'); ?>><?php echo esc_html__('Featured Products', 'link-wizard-for-woocommerce'); ?></option>
                                        <option value="on-sale" <?php selected($default_filter, 'on-sale'); ?>><?php echo esc_html__('On Sale Products', 'link-wizard-for-woocommerce'); ?></option>
                                        <option value="top-rated" <?php selected($default_filter, 'top-rated'); ?>><?php echo esc_html__('Top Rated Products', 'link-wizard-for-woocommerce'); ?></option>
                                        <option value="recent" <?php selected($default_filter, 'recent'); ?>><?php echo esc_html__('Recent Products', 'link-wizard-for-woocommerce'); ?></option>
                                    </select>
                                </div>
                                <?php endif; ?>
                            </div>
                            <?php if ($quick_select_mode === 'disabled') : ?>
                                <div class="lwwc-quick-select-disabled-message" style="padding: 18px 0; text-align: center; color: #888; font-size: 1.05em;">
                                    <?php
                                    // Use a real admin URL for the settings tab
                                    $settings_url = admin_url('edit.php?post_type=product&page=' . $this->plugin_name . '#tab-settings');
                                    printf(
                                        /* translators: 1: strong tag, 2: closing strong tag, 3: opening a tag, 4: closing a tag */
                                        esc_html__('Quick Select is currently %1$sdisabled%2$s.<br>Enable it in the %3$splugin settings%4$s to quickly select products or coupons.', 'link-wizard-for-woocommerce'),
                                        '<strong>', '</strong>',
                                        '<a href="' . esc_url($settings_url) . '">', '</a>'
                                    );
                                    ?>
                                </div>
                            <?php elseif ($quick_select_mode === 'manual') : ?>
                                <div id="lwwc-quick-select-product-results<?php echo $mode === 'checkout' ? '-checkout' : ''; ?>" class="lwwc-quick-select-results"></div>
                            <?php else : ?>
                                <div id="lwwc-quick-select-product-results<?php echo $mode === 'checkout' ? '-checkout' : ''; ?>" class="lwwc-quick-select-results"></div>
                            <?php endif; ?>
                        </div>
                        <div id="lwwc-selected-products-cart<?php echo $mode === 'checkout' ? '-checkout' : ''; ?>" class="lwwc-selected-section">
                            <h3><?php echo esc_html__('Selected Products:', 'link-wizard-for-woocommerce'); ?></h3>
                            <div class="products-list">
                                <p class="placeholder"><?php echo esc_html__('No products selected yet.', 'link-wizard-for-woocommerce'); ?></p>
                            </div>
                        </div>
                    </div>
                </div>
                <?php if ($mode !== 'checkout') : ?>
                <!-- Step 2: Choose Redirect Behavior -->
                <div class="lwwc-step">
                    <h2><?php echo esc_html__('2. Choose Redirect Behavior', 'link-wizard-for-woocommerce'); ?></h2>
                    <div id="lwwc-cart-redirect-options" class="lwwc-redirect-options">
                        <fieldset>
                            <legend class="screen-reader-text"><?php echo esc_html__('After adding to cart:', 'link-wizard-for-woocommerce'); ?></legend>
                            <p><?php echo esc_html__('After adding to cart:', 'link-wizard-for-woocommerce'); ?></p>
                            <?php 
                            $default_redirect = LWWC_Settings::get_option('default_redirect_behavior', 'none');
                            ?>
                            <label>
                                <div class="lwwc-redirect-content">
                                    <input type="radio" name="lwwc-redirect" value="none" <?php checked($default_redirect, 'none'); ?>>
                                    <span><?php echo esc_html__('Stay on current page', 'link-wizard-for-woocommerce'); ?></span>
                                </div>
                                <span class="dashicons dashicons-admin-home lwwc-redirect-icon"></span>
                            </label>
                            <label>
                                <div class="lwwc-redirect-content">
                                    <input type="radio" name="lwwc-redirect" value="cart" <?php checked($default_redirect, 'cart'); ?>>
                                    <span><?php echo esc_html__('Redirect to cart page', 'link-wizard-for-woocommerce'); ?></span>
                                </div>
                                <span class="dashicons dashicons-cart lwwc-redirect-icon"></span>
                            </label>
                            <label>
                                <div class="lwwc-redirect-content">
                                    <input type="radio" name="lwwc-redirect" value="checkout" <?php checked($default_redirect, 'checkout'); ?>>
                                    <span><?php echo esc_html__('Redirect to checkout page', 'link-wizard-for-woocommerce'); ?></span>
                                </div>
                                <span class="dashicons dashicons-yes-alt lwwc-redirect-icon"></span>
                            </label>
                            <label>
                                <div class="lwwc-redirect-content">
                                    <input type="radio" name="lwwc-redirect" value="custom" <?php checked($default_redirect, 'custom'); ?>>
                                    <span><?php echo esc_html__('Redirect to custom page', 'link-wizard-for-woocommerce'); ?></span>
                                </div>
                                <span class="dashicons dashicons-external lwwc-redirect-icon"></span>
                            </label>
                        </fieldset>
                        <div id="lwwc-page-search-wrapper" class="disabled">
                            <div class="lwwc-page-search-inline">
                                <h3><?php echo esc_html__('Custom Page Selection', 'link-wizard-for-woocommerce'); ?></h3>
                                <div class="lwwc-page-input-wrapper">
                                    <input type="text" id="lwwc-page-search-input" placeholder="<?php echo esc_attr__('Type to search for pages...', 'link-wizard-for-woocommerce'); ?>" />
                                    <div id="lwwc-page-search-results" class="lwwc-search-results"></div>
                                </div>
                            </div>
                            <input type="hidden" id="lwwc-redirect-page-url" />
                        </div>
                        <div id="lwwc-selected-page" class="lwwc-selected-section">
                            <p class="placeholder"><?php echo esc_html__('No page selected.', 'link-wizard-for-woocommerce'); ?></p>
                        </div>
                    </div>
                </div>
                <?php endif; ?>
                <!-- Generate Your Link -->
                <div class="lwwc-step">
                    <h2>
                        <?php
                        if ($mode === 'checkout') {
                            echo esc_html__('3. Checkout Link Spell Conjured!', 'link-wizard-for-woocommerce');
                        } else {
                            echo esc_html__('3. Add-To-Cart Link Conjured!', 'link-wizard-for-woocommerce');
                        }
                        ?>
                    </h2>
                    <div class="lwwc-generator-output <?php echo $mode === 'checkout' ? 'checkout' : 'cart'; ?> lwwc-output-section">
                        <div class="lwwc-output-content">
                            <div class="lwwc-link-display">
                                <div class="lwwc-segmented-url">
                                    <?php if ($mode === 'checkout'): ?>
                                        <span class="url-base url-base-checkout"><?php echo esc_html(home_url('/')); ?></span>
                                        <span class="lwwc-url-insert lwwc-url-insert-checkout super-bold" style="font-weight:900;"></span>
                                        <span class="url-params" id="lwwc-url-params-preview-checkout">
                                            <span class="placeholder-text"><?php echo esc_html__('Select products to generate checkout link...', 'link-wizard-for-woocommerce'); ?></span>
                                        </span>
                                    <?php else: ?>
                                        <span class="url-base url-base-cart"><?php echo esc_html(home_url('/')); ?></span>
                                        <span class="lwwc-url-insert lwwc-url-insert-cart super-bold" style="font-weight:900;"></span>
                                        <span class="url-params" id="lwwc-url-params-preview-cart">
                                            <span class="placeholder-text"><?php echo esc_html__('Select a product to generate an add-to-cart link', 'link-wizard-for-woocommerce'); ?></span>
                                        </span>
                                    <?php endif; ?>
                                </div>
                            </div>
                            <input type="text" id="lwwc-generated-link" readonly class="large-text" style="display: none;" />
                            <div class="lwwc-action-buttons">
                                <button type="button" id="lwwc-save-button-<?php echo esc_attr($mode); ?>" class="button button-primary lwwc-save-button lwwc-button" disabled>
                                    <span class="dashicons dashicons-plus-alt"></span>
                                    <span class="button-text"><?php echo esc_html__('Save Link', 'link-wizard-for-woocommerce'); ?></span>
                                </button>
                                <button type="button" id="lwwc-copy-button-<?php echo esc_attr($mode); ?>" class="button lwwc-copy-button lwwc-button" disabled>
                                    <span class="dashicons dashicons-admin-page"></span>
                                    <span class="button-text"><?php echo esc_html__('Copy Link', 'link-wizard-for-woocommerce'); ?></span>
                                </button>
                                <button type="button" id="lwwc-open-button-<?php echo esc_attr($mode); ?>" class="button lwwc-open-button lwwc-button" disabled>
                                    <span class="dashicons dashicons-external"></span>
                                    <span class="button-text"><?php echo esc_html__('Open Link', 'link-wizard-for-woocommerce'); ?></span>
                                </button>
                                <button type="button" id="lwwc-reset-button-<?php echo esc_attr($mode); ?>" class="button is-destructive lwwc-reset-button lwwc-button">
                                    <span class="dashicons dashicons-trash"></span>
                                    <span class="button-text"><?php echo esc_html__('Reset Wizard', 'link-wizard-for-woocommerce'); ?></span>
                                </button>
                            </div>
        <script>
        // Set button style class on Add-to-Cart wizard action buttons
        jQuery(function($) {
            var style = (window.lwwc_params && window.lwwc_params.settings && window.lwwc_params.settings.button_style) ? window.lwwc_params.settings.button_style : 'both';
            var $actionBtns = $('#lwwc-<?php echo esc_attr($mode); ?>-link-generator .lwwc-action-buttons');
            $actionBtns.removeClass('lwwc-button-style-icons lwwc-button-style-text lwwc-button-style-both');
            $actionBtns.addClass('lwwc-button-style-' + style);
        });
        </script>
                        </div>
                    </div>
                </div>
                <!-- Saved Links Section -->
                <div class="lwwc-step">
                <h2>
                        <?php
                        if ($mode === 'checkout') {
                            echo esc_html__('Saved Checkout Link Spells', 'link-wizard-for-woocommerce');
                        } else {
                            echo esc_html__('Saved Add-To-Cart Link Potions', 'link-wizard-for-woocommerce');
                        }
                        ?>
                    </h2>
                    <?php
                    // Sort controls for saved links
                    $current_sort = class_exists('LWWC_Settings') ? LWWC_Settings::get_option('saved_links_sort_order', 'latest') : 'latest';
                    ?>
                    <div class="lwwc-saved-links-sort-wrap" style="text-align: right; margin-bottom: 10px;">
                        <label for="lwwc-saved-links-sort-select-<?php echo esc_attr($mode); ?>"><?php echo esc_html__('Sort by:', 'link-wizard-for-woocommerce'); ?></label>
                        <select id="lwwc-saved-links-sort-select-<?php echo esc_attr($mode); ?>">
                            <option value="latest" <?php selected($current_sort, 'latest'); ?>><?php echo esc_html__('Latest', 'link-wizard-for-woocommerce'); ?></option>
                            <option value="oldest" <?php selected($current_sort, 'oldest'); ?>><?php echo esc_html__('Oldest', 'link-wizard-for-woocommerce'); ?></option>
                        </select>
                    </div>
                    <div id="lwwc-saved-<?php echo esc_attr($mode === 'checkout' ? 'checkout' : 'cart'); ?>-links-list" class="lwwc-saved-links-list">
                        <?php
                        $saved_links_key = $mode === 'checkout' ? 'lwwc_saved_checkout_links' : 'lwwc_saved_cart_links';
                        $saved_links = get_option($saved_links_key, []);
                        if (empty($saved_links)) {
                            $placeholder_text = $mode === 'checkout' 
                                ? __('No saved checkout links yet.', 'link-wizard-for-woocommerce')
                                : __('No saved cart links yet.', 'link-wizard-for-woocommerce');
                            echo '<p class="placeholder">' . esc_html($placeholder_text) . '</p>';
                        }
                        ?>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }


    /**
     * AJAX callback to get a product name by ID for enhanced saved links display.
     *
     * @since 3.5.9
     */
    public function get_product_name_ajax_callback() {
        // Verify nonce
        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'lwwc_search_nonce' ) ) {
            wp_die( 'Nonce verification failed' );
        }

        $product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
        $product = wc_get_product( $product_id );

        if ( $product ) {
            wp_send_json_success( array( 'id' => $product_id, 'name' => $product->get_name() ) );
        } else {
            wp_send_json_error( array( 'message' => __( 'Product not found.', 'link-wizard-for-woocommerce' ) ) );
        }
    }

    /**
     * AJAX callback for creating a configured product.
     *
     * @since 4.0.0
     */
    /**
     * AJAX callback for creating configured products
     */
    public function create_configured_product_ajax_callback() {
        // Check if nonce exists in request
        if ( ! isset( $_POST['nonce'] ) ) {
            wp_die( 'Nonce missing from request' );
        }

        // Verify nonce
        if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['nonce'] ) ), 'lwwc_search_nonce' ) ) {
            wp_die( 'Nonce verification failed' );
        }

        $product_id = isset( $_POST['product_id'] ) ? absint( $_POST['product_id'] ) : 0;
        $selected_attributes = isset( $_POST['selected_attributes'] ) ? array_map( 'sanitize_text_field', wp_unslash( $_POST['selected_attributes'] ) ) : array();

        // Validate input
        if ( empty( $product_id ) || empty( $selected_attributes ) ) {
            wp_send_json_error( array( 'message' => __( 'Invalid product ID or attributes.', 'link-wizard-for-woocommerce' ) ) );
        }

        // Load the configurator
        require_once plugin_dir_path( __FILE__ ) . 'utils/class-lwwc-product-configurator.php';

        // Create configured product
        $configured_product = LWWC_Product_Configurator::create_configured_product( $product_id, $selected_attributes );

        if ( $configured_product ) {
            wp_send_json_success( $configured_product );
        } else {
            wp_send_json_error( array( 'message' => __( 'Could not create configured product.', 'link-wizard-for-woocommerce' ) ) );
        }
    }

    /**
     * AJAX callback for searching pages (used by page search in JS)
     */
    public function search_pages_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $search_term = isset($_POST['search_term']) ? sanitize_text_field( wp_unslash( $_POST['search_term'] ) ) : '';
        $results = array();
        if ( ! empty( $search_term ) ) {
            $args = array(
                'post_type'      => 'page',
                'posts_per_page' => 20,
                's'              => $search_term,
                'post_status'    => 'publish',
            );
            $query = new WP_Query( $args );
            if ( $query->have_posts() ) {
                foreach ( $query->posts as $post ) {
                    $results[] = array(
                        'id'    => $post->ID,
                        'title' => get_the_title( $post->ID ),
                        'url'   => get_permalink( $post->ID ),
                    );
                }
            }
        }
        wp_send_json_success( $results );
    }
}
