<?php
defined( 'ABSPATH' ) || exit;

class LWWC_Coupon_Manager {
    public function __construct() {
        $this->init_hooks();
    }

    private function init_hooks() {
        // AJAX actions are already registered in class-lwwc-admin.php
        // This class provides additional coupon utility methods
    }

    public static function get_coupon_data_for_js( $coupon ) {
        if ( ! $coupon || ! is_a( $coupon, 'WC_Coupon' ) ) {
            return array();
        }

        $coupon_data = array(
            'id'          => $coupon->get_id(),
            'code'        => $coupon->get_code(),
            'amount'      => $coupon->get_amount(),
            'type'        => $coupon->get_discount_type(),
            'description' => $coupon->get_description(),
            'usage_count' => $coupon->get_usage_count(),
            'usage_limit' => $coupon->get_usage_limit(),
            'expiry_date' => $coupon->get_date_expires() ? $coupon->get_date_expires()->format( 'Y-m-d' ) : '',
        );

        return $coupon_data;
    }

    public static function get_coupon_display_text( $coupon ) {
        if ( ! $coupon || ! is_a( $coupon, 'WC_Coupon' ) ) {
            return '';
        }

        $text = $coupon->get_code();
        $amount = $coupon->get_amount();
        $type = $coupon->get_discount_type();

        if ( $amount > 0 ) {
            switch ( $type ) {
                case 'percent':
                    $text .= sprintf( ' (%s%%)', $amount );
                    break;
                case 'fixed_cart':
                case 'fixed_product':
                    $text .= sprintf( ' (%s)', wc_price( $amount ) );
                    break;
            }
        }

        return $text;
    }

    public static function validate_coupon( $coupon_code ) {
        $coupon = new WC_Coupon( $coupon_code );

        if ( ! $coupon->is_valid() ) {
            return array(
                'success' => false,
                'message' => __( 'Invalid coupon code.', 'link-wizard-for-woocommerce' )
            );
        }

        if ( $coupon->get_date_expires() && $coupon->get_date_expires() < new DateTime() ) {
            return array(
                'success' => false,
                'message' => __( 'This coupon has expired.', 'link-wizard-for-woocommerce' )
            );
        }

        return array(
            'success' => true,
            'message' => __( 'Coupon is valid.', 'link-wizard-for-woocommerce' ),
            'coupon'  => self::get_coupon_data_for_js( $coupon )
        );
    }
}
