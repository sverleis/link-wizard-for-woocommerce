<?php
// If uninstall not called from WordPress, then exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

// Load the settings to check if we should delete data.
$options = get_option( 'lwwc_settings' );

// If the 'delete_on_uninstall' flag is set, or if settings were never saved, clean up.
if ( empty( $options ) || ! empty( $options['delete_on_uninstall'] ) ) {
    delete_option( 'lwwc_settings' );
    delete_option( 'lwwc_saved_cart_links' );
    delete_option( 'lwwc_saved_checkout_links' );
} 