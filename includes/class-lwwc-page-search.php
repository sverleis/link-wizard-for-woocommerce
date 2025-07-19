<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class LWWC_Page_Search {
    public function __construct() {
        add_action( 'wp_ajax_lwwc_search_pages', [ $this, 'search_pages_ajax_callback' ] );
    }

    /**
     * AJAX handler for searching pages.
     */
    public function search_pages_ajax_callback() {
        check_ajax_referer( 'lwwc_search_nonce', 'nonce' );
        $search_term = '';
        if ( isset( $_POST['term'] ) ) {
            $search_term = sanitize_text_field( wp_unslash( $_POST['term'] ) );
        }
        if ( isset( $_POST['search_term'] ) ) {
            $search_term = sanitize_text_field( wp_unslash( $_POST['search_term'] ) );
        }
        $pages = get_posts( [ 's' => $search_term, 'post_type' => 'page', 'post_status' => 'publish', 'posts_per_page' => 20 ] );
        $page_data = [];
        if ( ! empty( $pages ) ) {
            foreach ( $pages as $page ) {
                $page_data[] = [ 
                    'id' => $page->ID, 
                    'title' => $page->post_title, 
                    'url' => get_permalink( $page->ID ),
                    'slug' => $page->post_name
                ];
            }
        }
        wp_send_json_success( $page_data );
    }
} 