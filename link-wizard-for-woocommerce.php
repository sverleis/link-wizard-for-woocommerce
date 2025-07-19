<?php
/**
 * Plugin Name:       Link Wizard for WooCommerce
 * Plugin URI:        https://magsindustries.wordpress.com/2025/06/24/woocommerce-checkout-link-generator/
 * Description:       Create and manage custom links that add products and a coupon to the cart, then redirect to checkout. Checkout Link Wizard support for WooCommerce 10+.
 * Version:           1.0.0
 * Author:            Mags Industries
 * Author URI:        https://magsindustries.wordpress.com/2025/06/24/woocommerce-checkout-link-generator/
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       link-wizard-for-woocommerce
 * WC requires at least: 10.0.0
 * WC tested up to:      10.0.0
 */

defined( 'ABSPATH' ) || exit;

function lwwc_init() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', 'lwwc_missing_woocommerce_notice' );
        add_action( 'admin_init', 'lwwc_deactivate_plugin' );
        add_filter( 'plugin_row_meta', 'lwwc_plugin_row_meta', 10, 2 );
        return;
    }
    lwwc_initialize_plugin();
}
add_action( 'plugins_loaded', 'lwwc_init' );

function lwwc_missing_woocommerce_notice() {
    ?>
    <div class="notice notice-error is-dismissible">
        <p>
            <?php
            printf(
                /* translators: %s: Plugin name */
                esc_html__( '"%s" requires WooCommerce to be installed and active. The plugin has been deactivated.', 'link-wizard-for-woocommerce' ),
                '<strong>' . esc_html__( 'Link Wizard for WooCommerce', 'link-wizard-for-woocommerce' ) . '</strong>'
            );
            ?>
        </p>
    </div>
    <?php
}

function lwwc_deactivate_plugin() {
    deactivate_plugins( plugin_basename( __FILE__ ) );
    if ( isset( $_GET['activate'] ) && wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['activate'] ) ), 'activate-plugin_' . plugin_basename( __FILE__ ) ) ) {
        unset( $_GET['activate'] );
    }
}

function lwwc_plugin_row_meta( $plugin_meta, $plugin_file ) {
    if ( plugin_basename( __FILE__ ) === $plugin_file ) {
        $woocommerce_url = admin_url( 'plugin-install.php?tab=plugin-information&plugin=woocommerce&TB_iframe=true&width=600&height=550' );
        
        // Return only the requirement notice, replacing all other meta
        return [ '<div class="requires"><p><strong>' . esc_html__( 'Requires:', 'link-wizard-for-woocommerce' ) . '</strong> <a href="' . esc_url( $woocommerce_url ) . '" class="thickbox open-plugin-details-modal" aria-label="' . esc_attr__( 'More information about WooCommerce', 'link-wizard-for-woocommerce' ) . '" data-title="WooCommerce">WooCommerce</a></p><div class="notice notice-error inline notice-alt"><p>' . esc_html__( 'This plugin cannot be activated because required plugins are missing or inactive.', 'link-wizard-for-woocommerce' ) . '</p></div></div>' ];
    }
    return $plugin_meta;
}

function lwwc_initialize_plugin() {
    define( 'LWWC_VERSION', '1.0.0' );
    define( 'LWWC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
    define( 'LWWC_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
    define( 'LWWC_PLUGIN_FILE', __FILE__ );
    register_uninstall_hook( __FILE__, 'lwwc_uninstall' );
    add_action( 'before_woocommerce_init', function() {
        if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
            \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
        }
    } );
    
    // Migration routine
    lwwc_migrate_options();
    
    require plugin_dir_path( __FILE__ ) . 'includes/class-lwwc-link-wizard.php';
    require plugin_dir_path( __FILE__ ) . 'includes/class-lwwc-settings.php';
    require plugin_dir_path( __FILE__ ) . 'includes/utils/class-lwwc-product-utils.php';
    require plugin_dir_path( __FILE__ ) . 'includes/class-lwwc-coupon-manager.php';
    require plugin_dir_path( __FILE__ ) . 'includes/class-lwwc-product-search.php';
    require plugin_dir_path( __FILE__ ) . 'includes/class-lwwc-coupon-search.php';
    new LWWC_Link_Wizard();
    new LWWC_Settings();
    new LWWC_Coupon_Manager();
    new LWWC_Product_Search();
    new LWWC_Coupon_Search();
}

function lwwc_migrate_options() {
    // Migrate options from lwwc_ to lwwc_
    $old_options = [
        'lwwc_settings' => 'lwwc_settings',
        'lwwc_saved_cart_links' => 'lwwc_saved_cart_links',
        'lwwc_saved_checkout_links' => 'lwwc_saved_checkout_links',
    ];
    foreach ( $old_options as $old => $new ) {
        $val = get_option( $old, null );
        if ( $val !== null && get_option( $new, null ) === null ) {
            update_option( $new, $val );
            delete_option( $old );
        }
    }
}

function lwwc_uninstall() {
    require_once plugin_dir_path( __FILE__ ) . 'uninstall.php';
}
