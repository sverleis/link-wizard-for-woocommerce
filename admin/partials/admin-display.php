<?php
/**
 * Main admin display for the Woo Link Wizard.
 *
 * @package    Woo_Link_Wizard
 * @subpackage Woo_Link_Wizard/admin/partials
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// Get the active tab from the URL, default to 'cart_links'
$active_tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'cart_links';

// Verify nonce for form processing if needed
if ( isset( $_POST['lwwc_action'] ) ) {
    $lwwc_nonce = isset( $_POST['lwwc_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['lwwc_nonce'] ) ) : '';
    if ( empty( $lwwc_nonce ) || ! wp_verify_nonce( $lwwc_nonce, 'lwwc_admin_action' ) ) {
        wp_die( esc_html__( 'Security check failed.', 'link-wizard-for-woocommerce' ) );
    }
}
?>

<div id="lwwc-global-alert-area"></div>

<div class="wrap lwwc-wrap">
    <div class="lwwc-top-row">
        <div class="lwwc-top-main-col">
            <h1><?php esc_html_e( 'Link Wizard for WooCommerce', 'link-wizard-for-woocommerce' ); ?></h1>
            
            <nav class="nav-tab-wrapper">
                <a href="#tab-add-to-cart" class="nav-tab nav-tab-active" data-tab="cart_links"><?php esc_html_e( 'Add-To-Cart Wizard', 'link-wizard-for-woocommerce' ); ?></a>
                <a href="#tab-checkout-links" class="nav-tab" data-tab="checkout_links"><?php esc_html_e( 'Checkout Link Wizard', 'link-wizard-for-woocommerce' ); ?></a>
                <?php if ( current_user_can( 'manage_options' ) ) : ?>
                    <a href="#tab-settings" class="nav-tab" data-tab="settings"><?php esc_html_e( 'Settings', 'link-wizard-for-woocommerce' ); ?></a>
                <?php endif; ?>
            </nav>
        </div>
        <div class="lwwc-top-icon-col">
            <?php require_once __DIR__ . '/lwwc-icon.php'; ?>
        </div>
    </div>

    <?php 
    // Add nonce fields for AJAX requests
    wp_nonce_field( 'lwwc_search_nonce', 'lwwc_search_nonce' );
    wp_nonce_field( 'lwwc_manage_links_nonce', 'lwwc_manage_links_nonce' );
    ?>

    <!-- Variation Modal -->
    <div id="lwwc-variation-modal" class="lwwc-modal lwwc-modal-large lwwc-modal-hidden" style="display: none;">
        <div class="lwwc-modal-content">
            <div class="lwwc-modal-header">
                <h3 id="lwwc-modal-product-name"></h3>
                <button type="button" class="lwwc-modal-close" id="lwwc-modal-close-x" aria-label="<?php esc_attr_e( 'Close', 'link-wizard-for-woocommerce' ); ?>">&times;</button>
            </div>
            
            <!-- 2-Column Layout -->
            <div class="lwwc-variation-body">
                <!-- Left Column: Variations List -->
                <div class="lwwc-variation-left">
                    <div class="lwwc-variation-header">
                        <div class="lwwc-variation-header-content">
            <h4>
                <?php esc_html_e( 'Please select a variation:', 'link-wizard-for-woocommerce' ); ?>
                <span id="lwwc-variation-filter-status" class="lwwc-variation-filter-status"></span>
                <button type="button" id="lwwc-variation-reset-filters" class="button-link lwwc-variation-reset-filters" style="display:none;">
                    <?php esc_html_e( 'Reset Filters', 'link-wizard-for-woocommerce' ); ?>
                </button>
            </h4>
                        </div>
                        <button type="button" class="lwwc-filters-toggle-button filters-hidden" id="lwwc-filters-toggle-button-left" aria-label="<?php esc_attr_e( 'Show filters panel', 'link-wizard-for-woocommerce' ); ?>" title="<?php esc_attr_e( 'Show filters panel', 'link-wizard-for-woocommerce' ); ?>" style="display: none;">
                            <span class="lwwc-filters-toggle-icon">▶</span>
                            <span class="lwwc-filters-toggle-text"><?php esc_html_e( 'Show Filters', 'link-wizard-for-woocommerce' ); ?></span>
                        </button>
                    </div>
                    <div id="lwwc-modal-variation-list" class="lwwc-variation-list-wrapper"></div>
                </div>
                
                <!-- Right Column: Filters & Notes (Collapsible) -->
                <div class="lwwc-variation-right" id="lwwc-variation-right">
                    <div class="lwwc-variation-sidebar-header">
                        <h4>Filters</h4>
                        <button type="button" class="lwwc-filters-toggle-button filters-visible" id="lwwc-filters-toggle-button" aria-label="Toggle filters panel" title="Hide filters panel">
                            <span class="lwwc-filters-toggle-icon">▶</span>
                            <span class="lwwc-filters-toggle-text">Hide Filters</span>
                        </button>
                    </div>
                    
                    <div class="lwwc-variation-sidebar-content" id="lwwc-variation-sidebar-content">
                        <!-- Filters Section -->
                        <div class="lwwc-variation-filters-section" id="lwwc-variation-controls" style="display: none;">
                            <div class="lwwc-variation-filters" id="lwwc-variation-filters">
                                <!-- Attribute filters will be dynamically added here -->
                            </div>
                            <div class="lwwc-variation-actions">
                                <button type="button" class="button" id="lwwc-clear-variation-filters">
                                    <span class="dashicons dashicons-image-rotate"></span>
                                    <span class="button-text"><?php esc_html_e( 'Clear Filters', 'link-wizard-for-woocommerce' ); ?></span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- Notes/Help Section -->
                        <div class="lwwc-variation-notes">
                            <h5><?php esc_html_e( 'Tips', 'link-wizard-for-woocommerce' ); ?></h5>
                            <ul>
                                <li><?php esc_html_e( 'Use filters to narrow down variations', 'link-wizard-for-woocommerce' ); ?></li>
                                <li><?php esc_html_e( 'Click any variation to select it', 'link-wizard-for-woocommerce' ); ?></li>
                                <li><?php esc_html_e( 'Selected variation will be used for link generation', 'link-wizard-for-woocommerce' ); ?></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="lwwc-modal-footer">
                <button type="button" class="button button-primary lwwc-button" id="lwwc-modal-cancel"><?php esc_html_e( 'Cancel', 'link-wizard-for-woocommerce' ); ?></button>
            </div>
        </div>
    </div>

    <!-- Confirm Modal -->
    <div id="lwwc-confirm-modal" class="lwwc-modal" style="display: none;">
        <div class="lwwc-modal-content">
            <div class="lwwc-modal-header">
                <h3><?php esc_html_e( 'Confirm Action', 'link-wizard-for-woocommerce' ); ?></h3>
                <button type="button" class="lwwc-modal-close" id="lwwc-confirm-modal-close-x" aria-label="<?php esc_attr_e( 'Close', 'link-wizard-for-woocommerce' ); ?>">&times;</button>
            </div>
            <p id="lwwc-confirm-modal-text"></p>
            <div class="lwwc-modal-footer">
                <button type="button" class="button lwwc-button" id="lwwc-confirm-modal-cancel"><?php esc_html_e( 'Cancel', 'link-wizard-for-woocommerce' ); ?></button>
                <button type="button" class="button button-primary lwwc-button" id="lwwc-confirm-modal-confirm"><?php esc_html_e( 'Confirm', 'link-wizard-for-woocommerce' ); ?></button>
            </div>
        </div>
    </div>

    <div id="lwwc-main-content" class="tab-content">
        <?php
        // Only render Add to Cart Links, Checkout Links, and Settings
        if ( isset( $admin_instance ) ) {
            $admin_instance->render_cart_links_tab('cart');
            $admin_instance->render_cart_links_tab('checkout');
            if ( current_user_can( 'manage_options' ) ) {
                $admin_instance->render_settings_tab();
            }
        }
        ?>
    </div>

    <script>
    jQuery(document).ready(function($) {
        function showTab(tabId) {
            $('.lwwc-link-generator').hide();
            $('.nav-tab').removeClass('nav-tab-active');
            if (tabId === 'tab-settings') {
                $('#lwwc-settings').show();
                $('.nav-tab[href="#tab-settings"]').addClass('nav-tab-active');
            } else if (tabId === 'tab-checkout-links') {
                $('#lwwc-checkout-link-generator').show();
                $('.nav-tab[href="#tab-checkout-links"]').addClass('nav-tab-active');
            } else {
                $('#lwwc-cart-link-generator').show();
                $('.nav-tab[href="#tab-add-to-cart"]').addClass('nav-tab-active');
            }
        }

        // Handle tab clicks
        $('.nav-tab').on('click', function(e) {
            e.preventDefault();
            var href = $(this).attr('href');
            showTab(href.substring(1));
            window.location.hash = href;
        });

        // Always show correct tab on load and hashchange
        function handleTabFromHash() {
            var hash = window.location.hash;
            if (hash && hash.length > 1) {
                showTab(hash.substring(1));
            } else {
                showTab('tab-add-to-cart');
                window.location.hash = '#tab-add-to-cart';
            }
        }
        handleTabFromHash();
        $(window).on('hashchange', handleTabFromHash);

        // Initialize product filter if it exists
        if ($('#lwwc-product-filter').length) {
            setTimeout(function() {
                $('#lwwc-product-filter').trigger('change');
            }, 500);
        }
        // Disable WP admin loading overlay for plugin pages
        if ( window.wp && wp.util && wp.util.loadingOverlay ) {
            wp.util.loadingOverlay.show = function() {};
            wp.util.loadingOverlay.hide = function() {};
        }
        // Remove any beforeunload handler to stop loading dialog on navigation
        window.onbeforeunload = null;
    });
    </script>
</div>
