<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class LWWC_Coupon_Quick_Select {
    public function __construct() {
        add_action( 'wp_ajax_lwwc_get_filtered_coupons', [ $this, 'get_filtered_coupons_ajax_callback' ] );
    }

    public function get_filtered_coupons_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $filter = isset( $_POST['filter'] ) ? sanitize_text_field( wp_unslash( $_POST['filter'] ) ) : 'all';
        $limit = LWWC_Settings::get_option( 'quick_select_limit', 10 );
        $max_limit = apply_filters( 'lwwc_quick_select_max_limit', 20 );
        $limit = min( $limit, absint( $max_limit ) );
        $args = [ 
            'posts_per_page' => $limit, 
            'post_type' => 'shop_coupon', 
            'post_status' => 'publish', 
            'orderby' => 'date', 
            'order' => 'DESC' 
        ];
        if ( $filter !== 'all' && $filter !== '' ) {
            $args['meta_query'] = [ 
                [ 
                    'key' => 'discount_type', 
                    'value' => $filter, 
                    'compare' => '=' 
                ] 
            ];
        }
        $coupons = get_posts( $args );
        $coupon_data = [];
        if ( ! empty( $coupons ) ) {
            foreach ( $coupons as $coupon ) {
                $discount_type = get_post_meta( $coupon->ID, 'discount_type', true );
                $type_label = '';
                switch ( $discount_type ) {
                    case 'percent':
                        $type_label = __( 'Percentage', 'link-wizard-for-woocommerce' );
                        break;
                    case 'fixed_cart':
                        $type_label = __( 'Fixed Cart', 'link-wizard-for-woocommerce' );
                        break;
                    case 'fixed_product':
                        $type_label = __( 'Fixed Product', 'link-wizard-for-woocommerce' );
                        break;
                    default:
                        $type_label = ucfirst( str_replace( '_', ' ', $discount_type ) );
                        break;
                }
                $coupon_data[] = [ 
                    'id' => $coupon->ID, 
                    'code' => $coupon->post_title,
                    'type' => $discount_type,
                    'type_label' => $type_label
                ];
            }
        }
        wp_send_json_success( $coupon_data );
    }
} 