<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class LWWC_Product_Search {
    public function __construct() {
        add_action( 'wp_ajax_lwwc_search_products', [ $this, 'search_products_ajax_callback' ] );
    }

    /**
     * AJAX handler for searching products.
     */
    public function search_products_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $search_term = '';
        if ( isset( $_POST['term'] ) ) {
            $search_term = sanitize_text_field( wp_unslash( $_POST['term'] ) );
        }
        if ( isset( $_POST['search_term'] ) ) {
            $search_term = sanitize_text_field( wp_unslash( $_POST['search_term'] ) );
        }
        $products = wc_get_products( [ 's' => $search_term, 'limit' => 20 ] );
        $product_data = [];
        if ( ! empty( $products ) ) {
            foreach ( $products as $product ) {
                $product_data[] = LWWC_Product_Utils::get_product_data_for_js( $product );
            }
        }
        wp_send_json_success( $product_data );
    }
} 