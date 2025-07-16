<?php
class LWWC_Frontend {
	private $plugin_name;
	private $version;
	private $option_key = 'lwwc_saved_links';
	private $cart_option_key = 'lwwc_saved_cart_links';
	private $checkout_option_key = 'lwwc_saved_checkout_links';

	public function __construct( $plugin_name, $version ) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
    }

    public function add_hooks() {
        add_action( 'template_redirect', array( $this, 'handle_checkout_link' ) );
    }

    public function handle_checkout_link() {
        // Only run when the 'add-to-cart' param is present.
        if ( empty( $_GET['add-to-cart'] ) ) {
            return;
        }

        // Verify nonce if present
        if ( isset( $_GET['lwwc_nonce'] ) && ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['lwwc_nonce'] ) ), 'lwwc_frontend_action' ) ) {
            return;
        }

        // Only process plugin-generated URLs with comma-separated format or coupon codes
        // Skip WooCommerce's standard single product add-to-cart URLs
        $products_str = sanitize_text_field( wp_unslash( $_GET['add-to-cart'] ) );
        $has_plugin_format = strpos( $products_str, ',' ) !== false || strpos( $products_str, ':' ) !== false;
        $has_coupon_codes = ! empty( $_GET['coupon-code'] );
        
        // If this looks like a standard WooCommerce add-to-cart URL (single product ID without colon/comma)
        // and no plugin-specific parameters, let WooCommerce handle it
        if ( ! $has_plugin_format && ! $has_coupon_codes ) {
            return;
        }

        // Ensure WooCommerce and cart are available.
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return;
        }
        
        // A flag to ensure we only process this once per request.
        if ( did_action( 'lwwc_link_handled' ) ) {
            return;
        }

        // Add products to the cart - handle plugin format with product:quantity pairs
        $product_pairs = explode( ',', $products_str );

        foreach ( $product_pairs as $pair ) {
            $parts = explode( ':', $pair );
            $product_id = isset( $parts[0] ) ? absint( $parts[0] ) : 0;
            $quantity = isset( $parts[1] ) ? absint( $parts[1] ) : 1;

            // For single product without colon separator, use the whole string as product ID
            if ( count( $parts ) === 1 && count( $product_pairs ) === 1 ) {
                $product_id = absint( $products_str );
                // Check for separate quantity parameter
                if ( ! empty( $_GET['quantity'] ) ) {
                    $quantity = absint( wp_unslash( $_GET['quantity'] ) );
                }
            }

            if ( $product_id > 0 && $quantity > 0 ) {
                WC()->cart->add_to_cart( $product_id, $quantity );
            }
        }
        
        // Apply coupons if they exist.
        if ( ! empty( $_GET['coupon-code'] ) ) {
            $coupon_codes_str = sanitize_text_field( wp_unslash( $_GET['coupon-code'] ) );
            $coupon_codes = explode( ',', $coupon_codes_str );
            foreach( $coupon_codes as $coupon_code ) {
                WC()->cart->apply_coupon( $coupon_code );
            }
        }
        
        // Mark as handled to prevent re-adding on refresh.
        do_action( 'lwwc_link_handled' );
        
        // Determine redirect URL
        $protocol = ( isset( $_SERVER['HTTPS'] ) && $_SERVER['HTTPS'] === 'on' ) ? 'https' : 'http';
        $host = isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) : '';
        $request_uri = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
        $current_url = esc_url( $protocol . '://' . $host . $request_uri );
        $home_url = home_url('/');
        
        // Remove the add-to-cart parameter and any other lwwc parameters from the current URL
        $redirect_url = remove_query_arg( array( 'add-to-cart', 'coupon-code' ), $current_url );
        
        // Normalize URLs for comparison (remove trailing slashes)
        $normalized_redirect = rtrim($redirect_url, '/');
        $normalized_home = rtrim($home_url, '/');
        
        // If the cleaned URL is the same as home URL, redirect to checkout
        // Otherwise, redirect back to the custom page
        if ( $normalized_redirect === $normalized_home ) {
            wp_safe_redirect( wc_get_checkout_url() );
        } else {
            wp_safe_redirect( $redirect_url );
        }
        
        exit();
    }
}
