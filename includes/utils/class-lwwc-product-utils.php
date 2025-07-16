<?php
/**
 * Product utility functions for the Woo Link Wizard plugin.
 *
 * This class centralizes the logic for fetching and formatting product data,
 * ensuring consistency across different parts of the plugin like search,
 * quick select, and loading saved links.
 *
 * @package    Woo_Link_Wizard
 * @subpackage Woo_Link_Wizard/includes/utils
 */
class LWWC_Product_Utils {

    /**
     * Gathers essential product data and formats it for use in JavaScript.
     *
     * This function retrieves a product's ID, name, and type. If the product
     * is a variable product, it also fetches all its variations and their
     * attributes, making them available to the frontend.
     *
     * @param WC_Product $product The WooCommerce product object.
     * @return array|null An array of product data, or null if the input is invalid.
     */
    public static function get_product_data_for_js( $product ) {
        if ( ! $product instanceof WC_Product ) {
            return null;
        }

        $product_data = [
            'id'   => $product->get_id(),
            'name' => $product->get_name(),
            'type' => $product->get_type(),
        ];

        if ( $product->is_type( 'variable' ) ) {
            // Always include existing variations for display and selection
            $product_data['variations'] = self::get_existing_variations_data( $product );
            
            // Include complete attribute options from parent product
            $product_data['attribute_options'] = self::get_attribute_options( $product );
            
            // Check if any variations have configurable ("Any") attributes
            $has_configurable_attributes = self::has_configurable_attributes( $product_data['variations'] );
            $product_data['has_configurable_attributes'] = $has_configurable_attributes;
            
            // Also try to use the Product Configurator for additional data if available
            if ( file_exists( plugin_dir_path( __FILE__ ) . 'class-lwwc-product-configurator.php' ) ) {
                require_once plugin_dir_path( __FILE__ ) . 'class-lwwc-product-configurator.php';
                
                if ( class_exists( 'LWWC_Product_Configurator' ) ) {
                    $configurator_data = LWWC_Product_Configurator::get_configuration_data( $product );
                    if ( $configurator_data ) {
                        $product_data['configurator_data'] = $configurator_data;
                    }
                }
            }
        }
        // If this is a variation, include its specific attributes and parent info
        if ( $product->is_type( 'variation' ) ) {
            $parent_id = method_exists( $product, 'get_parent_id' ) ? $product->get_parent_id() : $product->get_parent();
            $parent = wc_get_product( $parent_id );
            $variation_attributes = $product->get_variation_attributes();
            $formatted_attributes = array();
            foreach ( $variation_attributes as $attr_slug => $value_slug ) {
                $taxonomy = str_replace( 'attribute_', '', $attr_slug );
                $label = wc_attribute_label( $taxonomy, $parent );
                if ( empty( $label ) || $label === $taxonomy ) {
                    $label = ucwords( str_replace( array( 'attribute_', 'pa_', '-', '_' ), array( '', '', ' ', ' ' ), $attr_slug ) );
                }
                if ( taxonomy_exists( $taxonomy ) ) {
                    $term = get_term_by( 'slug', $value_slug, $taxonomy );
                    $value = $term ? $term->name : $value_slug;
                } else {
                    $value = $value_slug;
                }
                $formatted_attributes[ $label ] = $value;
            }
            // Build display string
            $display_parts = array();
            foreach ( $formatted_attributes as $key => $val ) {
                $display_parts[] = $key . ': ' . $val;
            }
            $product_data['formatted_attributes'] = $formatted_attributes;
            $product_data['display_attributes']   = implode( ' | ', $display_parts );
            $product_data['parent_name']         = $parent ? $parent->get_name() : '';
            $product_data['parent_id']           = $parent_id;
        }
        return $product_data;
    }

    /**
     * Get existing variations data formatted for JavaScript
     *
     * @param WC_Product_Variable $product
     * @return array
     */
    private static function get_existing_variations_data( $product ) {
        $variations = [];
        $available_variations = $product->get_available_variations();
        
        foreach ( $available_variations as $variation_data ) {
            $variation_product = wc_get_product( $variation_data['variation_id'] );
            if ( ! $variation_product ) {
                continue;
            }

            // Format attributes properly using the variation's actual attributes
            $formatted_attributes = [];
            $variation_specific_attributes = $variation_product->get_variation_attributes();
            
            // Get the parent product's available attributes for reference
            $parent_variation_attributes = $product->get_variation_attributes();
            
            foreach ( $parent_variation_attributes as $attribute_slug => $attribute_options ) {
                $taxonomy = str_replace( 'attribute_', '', $attribute_slug );
                $label = wc_attribute_label( $taxonomy, $product );
                
                // Create nice label if needed
                if ( empty( $label ) || $label === $taxonomy ) {
                    $label = ucwords( str_replace( [ 'attribute_', 'pa_', '-', '_' ], [ '', '', ' ', ' ' ], $attribute_slug ) );
                }
                
                // Get the actual value for this specific variation
                // Look for the attribute in variation attributes (which may have different casing/format)
                $value_slug = '';
                
                // Try different possible keys for this attribute
                $possible_keys = [
                    $attribute_slug,                    // e.g., "Logo"
                    strtolower( $attribute_slug ),      // e.g., "logo" 
                    'attribute_' . $attribute_slug,     // e.g., "attribute_Logo"
                    'attribute_' . strtolower( $attribute_slug ), // e.g., "attribute_logo"
                ];
                
                foreach ( $possible_keys as $key ) {
                    if ( isset( $variation_specific_attributes[ $key ] ) && $variation_specific_attributes[ $key ] !== '' ) {
                        $value_slug = $variation_specific_attributes[ $key ];
                        break;
                    }
                }
                
                if ( empty( $value_slug ) ) {
                    // "Any" value - this variation accepts any value for this attribute
                    $formatted_attributes[ $label ] = 'Any';
                } else {
                    // Specific value - get the display name
                    if ( taxonomy_exists( $taxonomy ) ) {
                        $term = get_term_by( 'slug', $value_slug, $taxonomy );
                        $value = $term ? $term->name : $value_slug;
                    } else {
                        $value = $value_slug;
                    }
                    $formatted_attributes[ $label ] = $value;
                }
            }

            $variations[] = [
                'id'                   => $variation_product->get_id(),
                'parent_id'            => $product->get_id(), // Add parent product ID
                'name'                 => $variation_product->get_name(),
                'formatted_attributes' => $formatted_attributes,
                'price'                => $variation_product->get_price(),
                'regular_price'        => $variation_product->get_regular_price(),
                'sale_price'          => $variation_product->get_sale_price(),
                'stock_status'         => $variation_product->get_stock_status(),
                'stock_quantity'       => $variation_product->get_stock_quantity(),
                'sku'                  => $variation_product->get_sku(),
                'display_price'        => wc_price( $variation_product->get_price() ),
                'is_existing'          => true,
            ];
        }
        
        return $variations;
    }

    /**
     * Get complete attribute options from parent product
     *
     * @param WC_Product_Variable $product
     * @return array
     */
    private static function get_attribute_options( $product ) {
        $attribute_options = [];
        $parent_variation_attributes = $product->get_variation_attributes();
        
        foreach ( $parent_variation_attributes as $attribute_slug => $attribute_values ) {
            $taxonomy = str_replace( 'attribute_', '', $attribute_slug );
            $label = wc_attribute_label( $taxonomy, $product );
            
            // Create nice label if needed
            if ( empty( $label ) || $label === $taxonomy ) {
                $label = ucwords( str_replace( [ 'attribute_', 'pa_', '-', '_' ], [ '', '', ' ', ' ' ], $attribute_slug ) );
            }
            
            $formatted_options = [];
            
            // Get all available options for this attribute
            if ( is_array( $attribute_values ) && ! empty( $attribute_values ) ) {
                foreach ( $attribute_values as $value_slug ) {
                    if ( empty( $value_slug ) ) {
                        continue;
                    }
                    
                    // Get display name for the value
                    if ( taxonomy_exists( $taxonomy ) ) {
                        $term = get_term_by( 'slug', $value_slug, $taxonomy );
                        $display_value = $term ? $term->name : $value_slug;
                    } else {
                        $display_value = $value_slug;
                    }
                    
                    $formatted_options[] = $display_value;
                }
            }
            
            // Sort the options alphabetically
            sort( $formatted_options );
            
            $attribute_options[ $label ] = $formatted_options;
        }
        
        return $attribute_options;
    }

    /**
     * Check if variations have configurable ("Any") attributes
     *
     * @param array $variations
     * @return bool
     */
    private static function has_configurable_attributes( $variations ) {
        foreach ( $variations as $variation ) {
            $attributes = $variation['formatted_attributes'] ?? [];
            foreach ( $attributes as $value ) {
                if ( $value === 'Any' ) {
                    return true;
                }
            }
        }
        return false;
    }
}