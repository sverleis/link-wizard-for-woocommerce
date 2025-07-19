<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class LWWC_Coupon_Search {
    public function __construct() {
        add_action( 'wp_ajax_lwwc_search_coupons', [ $this, 'search_coupons_ajax_callback' ] );
    }

    /**
     * AJAX handler for searching coupons.
     */
    public function search_coupons_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $search_term = '';
        if ( isset( $_POST['term'] ) ) {
            $search_term = sanitize_text_field( wp_unslash( $_POST['term'] ) );
        }
        if ( isset( $_POST['search_term'] ) ) {
            $search_term = sanitize_text_field( wp_unslash( $_POST['search_term'] ) );
        }
        $coupons = get_posts( [ 's' => $search_term, 'post_type' => 'shop_coupon', 'post_status' => 'publish', 'posts_per_page' => 20 ] );
        $coupon_data = [];
        if ( ! empty( $coupons ) ) {
            foreach ( $coupons as $coupon ) {
                $coupon_data[] = [ 'id' => $coupon->ID, 'code' => $coupon->post_title ];
            }
        }
        wp_send_json_success( $coupon_data );
    }
} 