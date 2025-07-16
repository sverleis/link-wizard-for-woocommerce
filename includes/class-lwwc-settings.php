<?php
class LWWC_Settings {
    private $settings_option_group = 'lwwc_settings_group';
    private $settings_option_name = 'lwwc_settings';

    public function __construct() {
        add_action( 'admin_init', [ $this, 'register_settings' ] );
    }

    public function register_settings() {
        register_setting( $this->settings_option_group, $this->settings_option_name, [ $this, 'sanitize_settings' ] );

        // Interface Settings Section
        add_settings_section( 'lwwc_interface_section', __( 'Interface', 'link-wizard-for-woocommerce' ), null, 'lwwc-settings' );
        add_settings_field( 'button_style', __( 'Button Style', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_radio' ], 'lwwc-settings', 'lwwc_interface_section', [ 
            'id' => 'button_style', 
            'options' => [
                'icons' => __( 'Icons Only', 'link-wizard-for-woocommerce' ),
                'text' => __( 'Text Only', 'link-wizard-for-woocommerce' ),
                'both' => __( 'Text and Icons', 'link-wizard-for-woocommerce' )
            ],
            'default' => 'both',
            'description' => __( 'Choose how action buttons are displayed in saved links. "Text and Icons" is recommended for best accessibility and clarity.', 'link-wizard-for-woocommerce' )
        ] );

        // Feature Settings Section
        add_settings_section( 'lwwc_features_section', __( 'Feature Management', 'link-wizard-for-woocommerce' ), null, 'lwwc-settings' );
        add_settings_field( 'quick_select_mode', __( 'Quick Select', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_radio' ], 'lwwc-settings', 'lwwc_features_section', [
            'id' => 'quick_select_mode',
            'options' => [
                'disabled' => __( 'Disable Quick Select', 'link-wizard-for-woocommerce' ),
                'manual'   => __( 'Enable Quick Select (manual pageload)', 'link-wizard-for-woocommerce' ),
                'auto'     => __( 'Enable Quick Select (automatic pageload)', 'link-wizard-for-woocommerce' )
            ],
            'default' => 'auto',
            'description' => __( 'Choose how the Quick Select area loads for products and coupons.', 'link-wizard-for-woocommerce' )
        ] );
        add_settings_field( 'quick_select_default_filter', __( 'Product Quick Select Default Category', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_select' ], 'lwwc-settings', 'lwwc_features_section', [
            'id' => 'quick_select_default_filter',
            'options' => self::get_product_filter_options(),
            'default' => 'recent',
            'description' => __( 'Choose the default category/filter for Product Quick Select. This will be preselected when the wizard loads.', 'link-wizard-for-woocommerce' )
        ] );
        add_settings_field( 'quick_select_coupon_default_filter', __( 'Coupon Quick Select Default Category', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_select' ], 'lwwc-settings', 'lwwc_features_section', [
            'id' => 'quick_select_coupon_default_filter',
            'options' => self::get_coupon_filter_options(),
            'default' => 'all',
            'description' => __( 'Choose the default category/filter for Coupon Quick Select. This will be preselected when the checkout wizard loads.', 'link-wizard-for-woocommerce' )
        ] );
        // Get the filtered max limit for display in settings
        $max_limit = apply_filters( 'lwwc_quick_select_max_limit', 20 );
        $max_display = ( $max_limit > 20 ) ? sprintf( '%d (increased via filter)', $max_limit ) : $max_limit;
        
        add_settings_field( 'quick_select_limit', __( 'Quick Select Limit', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_number' ], 'lwwc-settings', 'lwwc_features_section', [ 'id' => 'quick_select_limit', 'label' => 'Number of items to show. Higher numbers may impact performance and user experience. Max: ' . $max_display . '.', 'max' => $max_limit, 'default' => 10 ] );

        // Default redirect behavior for Add-to-Cart links
        add_settings_field( 'default_redirect_behavior', __( 'Default Redirect Behavior', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_select' ], 'lwwc-settings', 'lwwc_features_section', [
            'id' => 'default_redirect_behavior',
            'options' => [
                'none' => __( 'Stay on current page', 'link-wizard-for-woocommerce' ),
                'cart' => __( 'Redirect to cart page', 'link-wizard-for-woocommerce' ),
                'checkout' => __( 'Redirect to checkout page', 'link-wizard-for-woocommerce' ),
                'custom' => __( 'Redirect to custom page', 'link-wizard-for-woocommerce' ),
            ],
            'default' => 'none',
            'description' => __( 'Choose the default redirect behavior for Add-to-Cart links. This option will be pre-selected when creating new links.', 'link-wizard-for-woocommerce' ),
        ] );

        // Saved Links toggle moved to Data Management section below

        // Data Management Section
        add_settings_section( 'lwwc_data_section', __( 'Data Management', 'link-wizard-for-woocommerce' ), null, 'lwwc-settings' );
        // Enable Saved Links
        add_settings_field( 'saved_links_enabled', __( 'Enable Saved Links', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_checkbox' ], 'lwwc-settings', 'lwwc_data_section', [
            'id' => 'saved_links_enabled',
            'label' => __( 'Allow saving and loading of generated links.', 'link-wizard-for-woocommerce' ),
            'description' => __( 'Existing saved links will remain visible. To remove them permanently, use the buttons below.', 'link-wizard-for-woocommerce' ),
        ] );
        // Saved Links Sort Order
        add_settings_field( 'saved_links_sort_order', __( 'Saved Links Sort Order', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_select' ], 'lwwc-settings', 'lwwc_data_section', [
            'id' => 'saved_links_sort_order',
            'options' => [
                'latest' => __( 'Latest', 'link-wizard-for-woocommerce' ),
                'oldest' => __( 'Oldest', 'link-wizard-for-woocommerce' ),
            ],
            'default' => 'latest',
            'description' => __( 'Choose how saved links are ordered in the list.', 'link-wizard-for-woocommerce' ),
        ] );
        // Saved Links Pagination Limit
        $pagination_max = apply_filters( 'lwwc_saved_links_pagination_max_limit', 10 );
        add_settings_field( 'saved_links_pagination_limit', __( 'Saved Links Pagination Limit', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_number' ], 'lwwc-settings', 'lwwc_data_section', [
            'id' => 'saved_links_pagination_limit',
            /* translators: %d: Maximum number of saved links per page */
            'label' => sprintf( __( 'Number of saved links to display per page. Higher numbers may impact performance. Max: %d.', 'link-wizard-for-woocommerce' ), $pagination_max ),
            'max' => $pagination_max,
            'default' => 5
        ] );
        // Clear only Add-to-Cart saved links
        add_settings_field( 'delete_cart_links', __( 'Clear Add-to-Cart Links', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_delete_cart_button' ], 'lwwc-settings', 'lwwc_data_section' );
        // Clear only Checkout saved links
        add_settings_field( 'delete_checkout_links', __( 'Clear Checkout Links', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_delete_checkout_button' ], 'lwwc-settings', 'lwwc_data_section' );
        // Clear all saved links
        add_settings_field( 'delete_all_links', __( 'Clear Saved Links', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_delete_button' ], 'lwwc-settings', 'lwwc_data_section' );
        add_settings_field( 'delete_on_uninstall', __( 'Delete Data on Uninstall', 'link-wizard-for-woocommerce' ), [ $this, 'render_field_checkbox' ], 'lwwc-settings', 'lwwc_data_section', [ 'id' => 'delete_on_uninstall', 'label' => 'Remove all plugin settings and saved links when the plugin is deleted.' ] );
    }

    /**
     * Renders a select dropdown field.
     */
    public function render_field_select( $args ) {
        $options = self::get_options();
        $value = isset( $options[ $args['id'] ] ) ? $options[ $args['id'] ] : $args['default'];
        echo '<select id="lwwc-product-filter-settings" name="' . esc_attr( $this->settings_option_name ) . '[' . esc_attr( $args['id'] ) . ']">';
        foreach ( $args['options'] as $option_value => $option_label ) {
            echo '<option value="' . esc_attr( $option_value ) . '"' . selected( $value, $option_value, false ) . '>' . esc_html( $option_label ) . '</option>';
        }
        echo '</select>';
        if ( ! empty( $args['description'] ) ) {
            echo '<p class="description">' . esc_html( $args['description'] ) . '</p>';
        }
    }

    /**
     * Returns available product filter options.
     */
    public static function get_product_filter_options() {
        return [
            'recent'    => __( 'Recent Products', 'link-wizard-for-woocommerce' ),
            'featured'  => __( 'Featured Products', 'link-wizard-for-woocommerce' ),
            'on-sale'   => __( 'On Sale Products', 'link-wizard-for-woocommerce' ),
            'top-rated' => __( 'Top Rated Products', 'link-wizard-for-woocommerce' ),
        ];
    }

    /**
     * Returns available coupon filter options.
     */
    public static function get_coupon_filter_options() {
        return [
            'all'           => __( 'Most recent', 'link-wizard-for-woocommerce' ),
            'percent'       => __( 'Percentage discount', 'link-wizard-for-woocommerce' ),
            'fixed_cart'    => __( 'Fixed cart discount', 'link-wizard-for-woocommerce' ),
            'fixed_product' => __( 'Fixed product discount', 'link-wizard-for-woocommerce' ),
        ];
    }

    /**
     * Returns available quick select filter options (legacy method for backward compatibility).
     * @deprecated Use get_product_filter_options() instead
     */
    public static function get_quick_select_filter_options() {
        return self::get_product_filter_options();
    }

    /**
     * Renders the settings page wrapper.
     */
    public function render_settings_page() {
        // Security check: ensure user has permissions.
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'link-wizard-for-woocommerce' ) );
        }
        ?>
        <div id="lwwc-settings" class="lwwc-link-generator" style="display:none;">
            <div class="lwwc-wizard-box">
                <form action="options.php" method="post">
                    <?php
                    settings_fields( $this->settings_option_group );
                    // Output each section with an <hr> between titles
                    global $wp_settings_sections, $wp_settings_fields;
                    $page = 'lwwc-settings';
                    if ( !empty($wp_settings_sections) && isset($wp_settings_sections[$page]) ) {
                        $first = true;
                        foreach ( $wp_settings_sections[$page] as $section ) {
                            if ( !$first ) echo '<hr />';
                            $first = false;
                            if ( $section['title'] ) echo '<h2>' . esc_html( $section['title'] ) . '</h2>';
                            if ( $section['callback'] ) call_user_func( $section['callback'], $section );
                            if ( !empty($wp_settings_fields[$page][$section['id']]) ) {
                                echo '<table class="form-table">';
                                foreach ( $wp_settings_fields[$page][$section['id']] as $field ) {
                                    if ( $field['callback'] ) {
                                        echo '<tr valign="top"><th scope="row">';
                                        if ( $field['title'] ) echo esc_html( $field['title'] );
                                        echo '</th><td>';
                                        call_user_func( $field['callback'], $field['args'] );
                                        echo '</td></tr>';
                                    }
                                }
                                echo '</table>';
                            }
                        }
                    }
                    submit_button();
                    ?>
                </form>
            </div>
        </div>
        <?php
    }

    /**
     * Renders a checkbox field.
     */
    public function render_field_checkbox( $args ) {
        $options = self::get_options();
        $value = isset( $options[ $args['id'] ] ) ? $options[ $args['id'] ] : 0;
        echo '<input type="checkbox" id="' . esc_attr( $args['id'] ) . '" name="' . esc_attr( $this->settings_option_name ) . '[' . esc_attr( $args['id'] ) . ']" value="1" ' . checked( 1, $value, false ) . ' />';
        echo '<label for="' . esc_attr( $args['id'] ) . '"> ' . esc_html( $args['label'] ) . '</label>';
        if ( ! empty( $args['description'] ) ) {
            echo '<p class="description">' . esc_html( $args['description'] ) . '</p>';
        }
    }

    /**
     * Renders a radio button field.
     */
    public function render_field_radio( $args ) {
        $options = self::get_options();
        $value = isset( $options[ $args['id'] ] ) ? $options[ $args['id'] ] : $args['default'];
        
        // Special layout for button style setting
        if ( $args['id'] === 'button_style' ) {
            // Description at the top
            if ( ! empty( $args['description'] ) ) {
                echo '<p class="description" style="margin-top: 8px; margin-bottom: 15px;">' . esc_html( $args['description'] ) . '</p>';
            }
            
            // Create 2-column grid layout
            echo '<div class="lwwc-button-style-container">';
            echo '<div class="lwwc-button-style-options">';
            
            // Render radio buttons in a compact layout for the left column
            echo '<div class="lwwc-button-style-radios">';
            foreach ( $args['options'] as $option_value => $option_label ) {
                $checked = checked( $value, $option_value, false );
                echo '<label style="display: block; margin-bottom: 8px; font-weight: 500;">';
                echo '<input type="radio" name="' . esc_attr( $this->settings_option_name ) . '[' . esc_attr( $args['id'] ) . ']" value="' . esc_attr( $option_value ) . '"' . esc_attr( $checked ) . ' />';
                echo ' ' . esc_html( $option_label ) . '</label>';
            }
            echo '</div>';
            
            echo '</div>'; // .lwwc-button-style-options
            
            // Preview on the right
            echo '<div class="lwwc-button-style-preview">';
            echo '<h4>' . esc_html( __('Preview:', 'link-wizard-for-woocommerce') ) . '</h4>';
            echo '<div class="lwwc-preview-buttons lwwc-button-style-' . esc_attr( $value ) . '">';
            echo '<div class="saved-link-actions-mini">';
            
            // Load button (primary)
            echo '<button type="button" class="button button-primary load-btn lwwc-button" disabled>';
            echo '<span class="dashicons dashicons-download"></span>';
            echo '<span class="button-text">' . esc_html( __('Load', 'link-wizard-for-woocommerce') ) . '</span>';
            echo '</button>';
            
            // Copy button (secondary)
            echo '<button type="button" class="button copy-btn lwwc-button" disabled>';
            echo '<span class="dashicons dashicons-admin-page"></span>';
            echo '<span class="button-text">' . esc_html( __('Copy', 'link-wizard-for-woocommerce') ) . '</span>';
            echo '</button>';
            
            // Open button (secondary)
            echo '<button type="button" class="button open-btn lwwc-button" disabled>';
            echo '<span class="dashicons dashicons-external"></span>';
            echo '<span class="button-text">' . esc_html( __('Open', 'link-wizard-for-woocommerce') ) . '</span>';
            echo '</button>';
            
            // Remove button (destructive)
            echo '<button type="button" class="button is-destructive remove-btn lwwc-button" disabled>';
            echo '<span class="dashicons dashicons-trash"></span>';
            echo '<span class="button-text">' . esc_html( __('Remove', 'link-wizard-for-woocommerce') ) . '</span>';
            echo '</button>';
            
            echo '</div>';
            echo '</div>';
            echo '</div>'; // .lwwc-button-style-preview
            
            echo '</div>'; // .lwwc-button-style-container
        } else {
            // Standard fieldset layout for other radio button fields
            echo '<fieldset>';
            foreach ( $args['options'] as $option_value => $option_label ) {
                echo '<label for="' . esc_attr( $args['id'] . '_' . $option_value ) . '">';
                echo '<input type="radio" id="' . esc_attr( $args['id'] . '_' . $option_value ) . '" name="' . esc_attr( $this->settings_option_name ) . '[' . esc_attr( $args['id'] ) . ']" value="' . esc_attr( $option_value ) . '" ' . checked( $option_value, $value, false ) . ' />';
                echo ' ' . esc_html( $option_label ) . '</label><br>';
            }
            echo '</fieldset>';
            
            // Standard description placement for other fields
            if ( ! empty( $args['description'] ) ) {
                echo '<p class="description">' . esc_html( $args['description'] ) . '</p>';
            }
        }
    }

    /**
     * Renders a number input field.
     */
    public function render_field_number( $args ) {
        $options = self::get_options();
        $value = isset( $options[ $args['id'] ] ) ? $options[ $args['id'] ] : $args['default'];
        echo '<input type="number" id="' . esc_attr( $args['id'] ) . '" name="' . esc_attr( $this->settings_option_name ) . '[' . esc_attr( $args['id'] ) . ']" value="' . esc_attr( $value ) . '" min="1" max="' . esc_attr( $args['max'] ) . '" />';
        echo '<p class="description">' . esc_html( $args['label'] ) . '</p>';
    }

    /**
     * Renders the delete all links button.
     */
    public function render_field_delete_button() {
        wp_nonce_field( 'lwwc_delete_all_links_nonce', 'lwwc_delete_all_links_nonce_field' );
        echo '<button type="button" id="lwwc-delete-all-links-btn" class="button is-destructive lwwc-button">' . esc_html__( 'Delete All Saved Links', 'link-wizard-for-woocommerce' ) . '</button>';
        echo '<p class="description">' . esc_html__( 'This action is irreversible and will permanently delete all saved "Add to Cart" and "Checkout" links.', 'link-wizard-for-woocommerce' ) . '</p>';
    }
    /**
     * Renders the delete Add-to-Cart links button.
     */
    public function render_field_delete_cart_button() {
        wp_nonce_field( 'lwwc_delete_cart_links_nonce', 'lwwc_delete_cart_links_nonce_field' );
        echo '<button type="button" id="lwwc-delete-cart-links-btn" class="button is-destructive lwwc-button">' . esc_html__( 'Delete All Add-to-Cart Links', 'link-wizard-for-woocommerce' ) . '</button>';
        echo '<p class="description">' . esc_html__( 'This action will permanently delete all saved "Add to Cart" links.', 'link-wizard-for-woocommerce' ) . '</p>';
    }
    /**
     * Renders the delete Checkout links button.
     */
    public function render_field_delete_checkout_button() {
        wp_nonce_field( 'lwwc_delete_checkout_links_nonce', 'lwwc_delete_checkout_links_nonce_field' );
        echo '<button type="button" id="lwwc-delete-checkout-links-btn" class="button is-destructive lwwc-button">' . esc_html__( 'Delete All Checkout Links', 'link-wizard-for-woocommerce' ) . '</button>';
        echo '<p class="description">' . esc_html__( 'This action will permanently delete all saved "Checkout" links.', 'link-wizard-for-woocommerce' ) . '</p>';
    }

    /**
     * Sanitizes settings before saving.
     */
    public function sanitize_settings( $input ) {
        $new_input = [];
        $defaults = self::get_defaults();

        // Interface settings
        $valid_button_styles = [ 'icons', 'text', 'both' ];
        $new_input['button_style'] = isset( $input['button_style'] ) && in_array( $input['button_style'], $valid_button_styles ) ? $input['button_style'] : $defaults['button_style'];

        // Feature settings
        $valid_qs_modes = [ 'disabled', 'manual', 'auto' ];
        $new_input['quick_select_mode'] = isset( $input['quick_select_mode'] ) && in_array( $input['quick_select_mode'], $valid_qs_modes ) ? $input['quick_select_mode'] : $defaults['quick_select_mode'];

        // Product filter validation
        $valid_product_filters = array_keys( self::get_product_filter_options() );
        $product_filter_input = isset( $input['quick_select_default_filter'] ) ? sanitize_text_field( $input['quick_select_default_filter'] ) : $defaults['quick_select_default_filter'];
        $new_input['quick_select_default_filter'] = in_array( $product_filter_input, $valid_product_filters ) ? $product_filter_input : $defaults['quick_select_default_filter'];

        // Coupon filter validation
        $valid_coupon_filters = array_keys( self::get_coupon_filter_options() );
        $coupon_filter_input = isset( $input['quick_select_coupon_default_filter'] ) ? sanitize_text_field( $input['quick_select_coupon_default_filter'] ) : $defaults['quick_select_coupon_default_filter'];
        $new_input['quick_select_coupon_default_filter'] = in_array( $coupon_filter_input, $valid_coupon_filters ) ? $coupon_filter_input : $defaults['quick_select_coupon_default_filter'];
        
        // Default redirect behavior validation
        $valid_redirect_behaviors = [ 'none', 'cart', 'checkout', 'custom' ];
        $new_input['default_redirect_behavior'] = ( isset( $input['default_redirect_behavior'] ) && in_array( $input['default_redirect_behavior'], $valid_redirect_behaviors, true ) )
            ? $input['default_redirect_behavior']
            : $defaults['default_redirect_behavior'];
        
        $new_input['saved_links_enabled'] = isset( $input['saved_links_enabled'] ) ? 1 : 0;
        $new_input['delete_on_uninstall'] = isset( $input['delete_on_uninstall'] ) ? 1 : 0;
        // Saved Links sort order
        $valid_sorts = [ 'latest', 'oldest' ];
        $new_input['saved_links_sort_order'] = ( isset( $input['saved_links_sort_order'] ) && in_array( $input['saved_links_sort_order'], $valid_sorts, true ) )
            ? $input['saved_links_sort_order']
            : self::get_defaults()['saved_links_sort_order'];

        if ( isset( $input['quick_select_limit'] ) ) {
            $limit = absint( $input['quick_select_limit'] );
            $new_input['quick_select_limit'] = ( $limit > 0 && $limit <= 50 ) ? $limit : $defaults['quick_select_limit'];
        }

        if ( isset( $input['saved_links_pagination_limit'] ) ) {
            $limit = absint( $input['saved_links_pagination_limit'] );
            $max_limit = apply_filters( 'lwwc_saved_links_pagination_max_limit', 10 );
            $new_input['saved_links_pagination_limit'] = ( $limit > 0 && $limit <= $max_limit ) ? $limit : $defaults['saved_links_pagination_limit'];
        }

        return $new_input;
    }

    /**
     * Gets all plugin options with defaults.
     */
    public static function get_options() {
        return wp_parse_args( get_option( 'lwwc_settings', [] ), self::get_defaults() );
    }

    /**
     * Gets a specific plugin option with default fallback.
     */
    public static function get_option( $key, $default = null ) {
        $options = self::get_options();
        return isset( $options[ $key ] ) ? $options[ $key ] : $default;
    }

    /**
     * Defines default values for all settings.
     */
    public static function get_defaults() {
        return [
            'button_style'                      => 'both',
            'quick_select_mode'                 => 'auto',
            'quick_select_limit'                => 5,
            'quick_select_default_filter'       => 'recent',
            'quick_select_coupon_default_filter'=> 'all',
            'default_redirect_behavior'         => 'none',
            'saved_links_enabled'               => 1,
            'saved_links_sort_order'            => 'latest',
            'delete_on_uninstall'               => 0,
            'saved_links_pagination_limit'      => 3,
        ];
    }
}