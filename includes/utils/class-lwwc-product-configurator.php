<?php
/**
 * Product Configurator for Variable Products
 * 
 * Clean, purpose-built system for handling variable product configuration
 * where users can select any combination of attributes.
 *
 * @package    Woo_Link_Wizard
 * @subpackage Woo_Link_Wizard/includes/utils
 */
class LWWC_Product_Configurator {

    /**
     * Get configuration data for a variable product
     *
     * @param WC_Product_Variable $product The variable product
     * @return array Configuration data for JavaScript
     */
    public static function get_configuration_data( $product ) {
        if ( ! $product instanceof WC_Product_Variable ) {
            return null;
        }

        // Get all attributes and their possible values
        $attributes = self::get_all_product_attributes( $product );
        
        if ( empty( $attributes ) ) {
            return null;
        }

        // Get available variations for mapping
        $available_variations = self::get_available_variations_for_mapping( $product );

        return [
            'product_id'          => $product->get_id(),
            'product_name'        => $product->get_name(),
            'base_price'          => $product->get_price(),
            'attributes'          => $attributes,
            'pricing_info'        => self::get_pricing_information( $product ),
            'available_variations' => $available_variations, // For ID mapping
        ];
    }

    /**
     * Get all attributes and their possible values for a product
     *
     * @param WC_Product_Variable $product
     * @return array Attributes with their options
     */
    private static function get_all_product_attributes( $product ) {
        $attributes = [];
        
        // Get variation attributes (these are the ones used for variations)
        $variation_attributes = $product->get_variation_attributes();
        
        foreach ( $variation_attributes as $attribute_name => $attribute_options ) {
            // Clean up the attribute name
            $clean_name = self::clean_attribute_name( $attribute_name );
            $label = self::get_attribute_label( $attribute_name, $product );
            
            // Get all possible values for this attribute
            $options = self::get_attribute_options( $attribute_name, $attribute_options, $product );
            
            if ( ! empty( $options ) ) {
                $attributes[ $clean_name ] = [
                    'label'    => $label,
                    'slug'     => $attribute_name,
                    'options'  => $options,
                    'required' => true, // All attributes are required for configuration
                ];
            }
        }

        return $attributes;
    }

    /**
     * Get human-readable label for an attribute
     *
     * @param string $attribute_name
     * @param WC_Product $product
     * @return string
     */
    private static function get_attribute_label( $attribute_name, $product ) {
        $taxonomy = str_replace( 'attribute_', '', $attribute_name );
        
        // Try to get proper label from WooCommerce
        $label = wc_attribute_label( $taxonomy, $product );
        
        // If that doesn't work, create a nice label from the slug
        if ( empty( $label ) || $label === $taxonomy ) {
            $label = ucwords( str_replace( [ 'attribute_', 'pa_', '-', '_' ], [ '', '', ' ', ' ' ], $attribute_name ) );
        }
        
        return $label;
    }

    /**
     * Get all possible options for an attribute
     *
     * @param string $attribute_name
     * @param array $default_options From get_variation_attributes()
     * @param WC_Product $product
     * @return array
     */
    private static function get_attribute_options( $attribute_name, $default_options, $product ) {
        $options = [];
        $taxonomy = str_replace( 'attribute_', '', $attribute_name );
        
        // Method 1: Use the options from get_variation_attributes if they exist
        if ( ! empty( $default_options ) ) {
            foreach ( $default_options as $option_slug ) {
                if ( ! empty( $option_slug ) ) {
                    // Try to get the display name
                    if ( taxonomy_exists( $taxonomy ) ) {
                        $term = get_term_by( 'slug', $option_slug, $taxonomy );
                        $display_name = $term ? $term->name : $option_slug;
                    } else {
                        $display_name = $option_slug;
                    }
                    
                    $options[] = [
                        'slug'  => $option_slug,
                        'label' => $display_name,
                    ];
                }
            }
        }
        
        // Method 2: If no options found, try getting from product attributes
        if ( empty( $options ) ) {
            $product_attribute = $product->get_attribute( $taxonomy );
            if ( ! empty( $product_attribute ) ) {
                $values = array_map( 'trim', explode( ',', $product_attribute ) );
                foreach ( $values as $value ) {
                    if ( ! empty( $value ) ) {
                        $options[] = [
                            'slug'  => sanitize_title( $value ),
                            'label' => $value,
                        ];
                    }
                }
            }
        }
        
        // Method 3: If still no options and it's a taxonomy, get all terms
        if ( empty( $options ) && taxonomy_exists( $taxonomy ) ) {
            $terms = get_terms( [
                'taxonomy'   => $taxonomy,
                'hide_empty' => false,
            ] );
            
            if ( ! is_wp_error( $terms ) ) {
                foreach ( $terms as $term ) {
                    $options[] = [
                        'slug'  => $term->slug,
                        'label' => $term->name,
                    ];
                }
            }
        }
        
        return $options;
    }

    /**
     * Get pricing information for different scenarios
     *
     * @param WC_Product_Variable $product
     * @return array
     */
    private static function get_pricing_information( $product ) {
        return [
            'base_price'     => $product->get_price(),
            'min_price'      => $product->get_variation_price( 'min' ),
            'max_price'      => $product->get_variation_price( 'max' ),
            'price_range'    => $product->get_price_html(),
            'currency'       => get_woocommerce_currency_symbol(),
        ];
    }

    /**
     * Clean attribute name for use as array key
     *
     * @param string $attribute_name
     * @return string
     */
    private static function clean_attribute_name( $attribute_name ) {
        return str_replace( 'attribute_', '', $attribute_name );
    }

    /**
     * Create a configured product from selected attributes
     *
     * @param int $product_id
     * @param array $selected_attributes
     * @return array|null Configured product data
     */
    /**
     * Create a configured product based on selected attributes
     *
     * @param int $product_id The variable product ID
     * @param array $selected_attributes The selected attribute values
     * @return array|null Product data for checkout
     */
    public static function create_configured_product( $product_id, $selected_attributes ) {
        $product = wc_get_product( $product_id );
        
        if ( ! $product instanceof WC_Product_Variable ) {
            return null;
        }

        // Always try to find a matching existing variation first
        $matching_variation = self::find_best_matching_variation( $product, $selected_attributes );
        
        if ( $matching_variation ) {
            // Use existing variation data
            return [
                'id'                  => $matching_variation->get_id(),
                'name'                => $matching_variation->get_name(),
                'type'                => 'variation',
                'parent_id'           => $product_id,
                'selected_attributes' => $selected_attributes,
                'price'               => $matching_variation->get_price(),
                'display_price'       => wc_price( $matching_variation->get_price() ),
                'stock_status'        => $matching_variation->get_stock_status(),
                'sku'                 => $matching_variation->get_sku(),
                'is_configured'       => true,
                'is_existing'         => true,
                'variation_id'        => $matching_variation->get_id(), // Explicit variation ID for cart
            ];
        } else {
            // Find the best fallback variation (one that's compatible)
            $fallback_variation = self::find_fallback_variation( $product, $selected_attributes );
            
            if ( $fallback_variation ) {
                return [
                    'id'                  => $fallback_variation->get_id(),
                    'name'                => self::build_configured_name( $product, $selected_attributes ),
                    'type'                => 'configured_variation',
                    'parent_id'           => $product_id,
                    'selected_attributes' => $selected_attributes,
                    'price'               => $fallback_variation->get_price(),
                    'display_price'       => wc_price( $fallback_variation->get_price() ),
                    'stock_status'        => $fallback_variation->get_stock_status(),
                    'sku'                 => $fallback_variation->get_sku(),
                    'is_configured'       => true,
                    'is_fallback'         => true,
                    'variation_id'        => $fallback_variation->get_id(), // Use fallback variation ID
                    'configured_attributes' => $selected_attributes, // Store selected config
                ];
            } else {
                return null;
            }
        }
    }

    /**
     * Find the best matching existing variation
     * Prioritizes exact matches, then variations with "Any" attributes
     *
     * @param WC_Product_Variable $product
     * @param array $selected_attributes
     * @return WC_Product_Variation|null
     */
    private static function find_best_matching_variation( $product, $selected_attributes ) {
        $available_variations = $product->get_available_variations();
        $best_match = null;
        $best_score = -1;
        
        foreach ( $available_variations as $variation_data ) {
            $variation = wc_get_product( $variation_data['variation_id'] );
            
            if ( ! $variation ) {
                continue;
            }
            
            $variation_attributes = $variation->get_attributes();
            $score = 0;
            $is_compatible = true;
            
            // Convert selected attributes to proper format for comparison
            foreach ( $selected_attributes as $attribute_key => $selected_value ) {
                // Handle both label-based keys (from frontend) and slug-based keys
                $attribute_slug = self::normalize_attribute_key( $attribute_key );
                $full_attribute_name = 'attribute_' . $attribute_slug;
                
                $variation_value = isset( $variation_attributes[ $full_attribute_name ] ) 
                    ? $variation_attributes[ $full_attribute_name ] 
                    : '';
                
                if ( empty( $variation_value ) ) {
                    // "Any" value - compatible and good for fallback
                    $score += 2;
                } elseif ( $variation_value === $selected_value || 
                          strtolower( $variation_value ) === strtolower( $selected_value ) ) {
                    // Exact match - highest score  
                    $score += 10;
                } else {
                    // Try to match by term name vs slug
                    $taxonomy = str_replace( 'attribute_', '', $full_attribute_name );
                    if ( taxonomy_exists( $taxonomy ) ) {
                        $term = get_term_by( 'name', $selected_value, $taxonomy );
                        if ( $term && $term->slug === $variation_value ) {
                            $score += 10; // Name to slug match
                            continue;
                        }
                        
                        $term = get_term_by( 'slug', $selected_value, $taxonomy );
                        if ( $term && $term->name === $variation_value ) {
                            $score += 10; // Slug to name match
                            continue;
                        }
                    }
                    
                    // Incompatible
                    $is_compatible = false;
                    break;
                }
            }
            
            if ( $is_compatible && $score > $best_score ) {
                $best_match = $variation;
                $best_score = $score;
            }
        }
        
        return $best_match;
    }

    /**
     * Normalize attribute key to slug format
     *
     * @param string $attribute_key
     * @return string
     */
    private static function normalize_attribute_key( $attribute_key ) {
        // If it's already a slug (contains pa_), use as is
        if ( strpos( $attribute_key, 'pa_' ) === 0 ) {
            return $attribute_key;
        }
        
        // If it starts with 'attribute_', remove that prefix
        if ( strpos( $attribute_key, 'attribute_' ) === 0 ) {
            return str_replace( 'attribute_', '', $attribute_key );
        }
        
        // Convert label to slug format
        $slug = sanitize_title( $attribute_key );
        
        // Check if it's a taxonomy attribute
        if ( taxonomy_exists( 'pa_' . $slug ) ) {
            return 'pa_' . $slug;
        }
        
        return $slug;
    }

    /**
     * Find a fallback variation that can be used with any configuration
     * Prioritizes variations that match defined attributes and have "Any" for others
     *
     * @param WC_Product_Variable $product
     * @param array $selected_attributes
     * @return WC_Product_Variation|null
     */
    private static function find_fallback_variation( $product, $selected_attributes ) {
        $available_variations = $product->get_available_variations();
        $best_fallback = null;
        $best_score = -1;
        
        foreach ( $available_variations as $variation_data ) {
            $variation = wc_get_product( $variation_data['variation_id'] );
            
            if ( ! $variation ) {
                continue;
            }
            
            $variation_attributes = $variation->get_attributes();
            $score = 0;
            $conflicts = 0;
            
            // Score variations based on compatibility with selected attributes
            foreach ( $selected_attributes as $attribute_key => $selected_value ) {
                $attribute_slug = self::normalize_attribute_key( $attribute_key );
                $full_attribute_name = 'attribute_' . $attribute_slug;
                
                $variation_value = isset( $variation_attributes[ $full_attribute_name ] ) 
                    ? $variation_attributes[ $full_attribute_name ] 
                    : '';
                
                if ( empty( $variation_value ) ) {
                    // "Any" value - good for configuration
                    $score += 5;
                } else {
                    // Has a specific value - check if it matches
                    if ( $variation_value === $selected_value || 
                         strtolower( $variation_value ) === strtolower( $selected_value ) ) {
                        $score += 10; // Perfect match
                    } else {
                        // Try taxonomy matching
                        $taxonomy = str_replace( 'attribute_', '', $full_attribute_name );
                        if ( taxonomy_exists( $taxonomy ) ) {
                            $term = get_term_by( 'name', $selected_value, $taxonomy );
                            if ( $term && $term->slug === $variation_value ) {
                                $score += 10;
                                continue;
                            }
                            
                            $term = get_term_by( 'slug', $selected_value, $taxonomy );
                            if ( $term && $term->name === $variation_value ) {
                                $score += 10;
                                continue;
                            }
                        }
                        
                        // Conflict - this variation has a different specific value
                        $conflicts++;
                    }
                }
            }
            
            // Only consider variations without conflicts, prefer higher scores
            if ( $conflicts === 0 && $score > $best_score ) {
                $best_fallback = $variation;
                $best_score = $score;
            }
        }
        
        // If no conflict-free variation found, just pick the first available one
        if ( ! $best_fallback && ! empty( $available_variations ) ) {
            $first_variation = wc_get_product( $available_variations[0]['variation_id'] );
            if ( $first_variation ) {
                $best_fallback = $first_variation;
            }
        }
        
        return $best_fallback;
    }

    /**
     * Build a readable name for the configured product
     *
     * @param WC_Product $product
     * @param array $selected_attributes
     * @return string
     */
    private static function build_configured_name( $product, $selected_attributes ) {
        $config_data = self::get_configuration_data( $product );
        $parts = [];
        
        foreach ( $selected_attributes as $attribute_slug => $selected_value ) {
            if ( isset( $config_data['attributes'][ $attribute_slug ] ) ) {
                $attribute = $config_data['attributes'][ $attribute_slug ];
                
                // Find the display label for the selected value
                $display_value = $selected_value;
                foreach ( $attribute['options'] as $option ) {
                    if ( $option['slug'] === $selected_value ) {
                        $display_value = $option['label'];
                        break;
                    }
                }
                
                $parts[] = $attribute['label'] . ': ' . $display_value;
            }
        }
        
        return $product->get_name() . ' (' . implode( ', ', $parts ) . ')';
    }

    /**
     * Get available variations for ID mapping
     *
     * @param WC_Product_Variable $product
     * @return array Simplified variation data for mapping
     */
    private static function get_available_variations_for_mapping( $product ) {
        $variations = [];
        $available_variations = $product->get_available_variations();
        
        foreach ( $available_variations as $variation_data ) {
            $variation = wc_get_product( $variation_data['variation_id'] );
            
            if ( ! $variation ) {
                continue;
            }
            
            // Get the variation's attributes in a clean format
            $attributes = [];
            foreach ( $variation_data['attributes'] as $attr_key => $attr_value ) {
                $clean_key = str_replace( 'attribute_', '', $attr_key );
                $attributes[ $clean_key ] = $attr_value;
            }
            
            $variations[] = [
                'id'         => $variation->get_id(),
                'attributes' => $attributes,
                'price'      => $variation->get_price(),
                'stock_status' => $variation->get_stock_status(),
                'sku'        => $variation->get_sku(),
            ];
        }
        
        return $variations;
    }
}
