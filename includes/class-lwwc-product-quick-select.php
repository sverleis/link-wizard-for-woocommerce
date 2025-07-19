<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class LWWC_Product_Quick_Select {
    public function __construct() {
        add_action( 'wp_ajax_lwwc_get_filtered_products', [ $this, 'get_filtered_products_ajax_callback' ] );
    }

    public function get_filtered_products_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $filter = isset( $_POST['filter'] ) ? sanitize_text_field( wp_unslash( $_POST['filter'] ) ) : 'recent';
        $limit = LWWC_Settings::get_option( 'quick_select_limit', 10 );
        $max_limit = apply_filters( 'lwwc_quick_select_max_limit', 20 );
        $limit = min( $limit, absint( $max_limit ) );
        $args = [ 
            'post_type' => 'product', 
            'post_status' => 'publish', 
            'posts_per_page' => $limit 
        ];
        switch ( $filter ) {
            case 'featured':
                $args['tax_query'] = [ [ 'taxonomy' => 'product_visibility', 'field' => 'name', 'terms' => 'featured' ] ];
                $args['orderby'] = 'date';
                $args['order'] = 'DESC';
                break;
            case 'on-sale':
                $args['meta_query'] = [ 
                    'relation' => 'OR',
                    [ 'key' => '_sale_price', 'value' => '', 'compare' => '!=' ],
                    [ 'key' => '_sale_price', 'value' => 0, 'compare' => '>' ]
                ];
                $args['orderby'] = 'date';
                $args['order'] = 'DESC';
                break;
            case 'top-rated':
                $args['meta_key'] = '_wc_average_rating';
                $args['orderby'] = 'meta_value_num';
                $args['order'] = 'DESC';
                break;
            case 'recent':
            default:
                $args['orderby'] = 'date';
                $args['order'] = 'DESC';
                break;
        }
        $products = wc_get_products( $args );
        $product_data = [];
        if ( ! empty( $products ) ) {
            foreach ( $products as $product ) {
                $product_data[] = LWWC_Product_Utils::get_product_data_for_js( $product );
            }
        }
        wp_send_json_success( $product_data );
    }
} 