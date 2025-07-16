# WooCommerce Link Wizard - Code Snippets

## Quick Select Limit Override

The plugin limits Quick Select to a maximum of 20 items by default for optimal performance. However, advanced users can override this limit using the `wclw_quick_select_max_limit` filter.

### Filter Hook

```php
/**
 * Override the maximum Quick Select limit
 * 
 * @param int $max_limit Default maximum limit (20)
 * @return int New maximum limit
 */
apply_filters( 'wclw_quick_select_max_limit', $max_limit );
```

### Usage Examples

#### Increase limit to 50 items

Add this to your theme's `functions.php` file or a custom plugin:

```php
/**
 * Increase Quick Select maximum limit to 50 items
 */
function my_site_increase_quick_select_limit( $max_limit ) {
    return 50;
}
add_filter( 'wclw_quick_select_max_limit', 'my_site_increase_quick_select_limit' );
```

#### Conditional limit based on user capability

```php
/**
 * Allow administrators to see more Quick Select items
 */
function my_site_conditional_quick_select_limit( $max_limit ) {
    if ( current_user_can( 'manage_options' ) ) {
        return 100; // Admins get 100 items
    }
    return $max_limit; // Others keep default limit
}
add_filter( 'wclw_quick_select_max_limit', 'my_site_conditional_quick_select_limit' );
```

#### Dynamic limit based on product count

```php
/**
 * Set Quick Select limit based on total product count
 */
function my_site_dynamic_quick_select_limit( $max_limit ) {
    $product_count = wp_count_posts( 'product' )->publish;
    
    if ( $product_count > 1000 ) {
        return 30; // Large stores get 30 items
    } elseif ( $product_count > 500 ) {
        return 25; // Medium stores get 25 items
    }
    
    return $max_limit; // Small stores keep default
}
add_filter( 'wclw_quick_select_max_limit', 'my_site_dynamic_quick_select_limit' );
```

### Performance Considerations

⚠️ **Important**: Higher limits will impact performance:

- **Database Load**: More products to query and process
- **Network Transfer**: Larger AJAX responses
- **Browser Performance**: More DOM elements to render
- **User Experience**: Cognitive overload with too many choices

**Recommended limits by store size:**
- Small stores (< 100 products): 10-15 items
- Medium stores (100-500 products): 15-25 items  
- Large stores (500+ products): 20-30 items
- Enterprise stores: 30-50 items (test thoroughly)

### Testing

After implementing a custom limit, monitor:
1. Page load times in the admin area
2. AJAX response times when switching Quick Select filters
3. Browser memory usage with developer tools
4. User feedback on interface responsiveness

### Advanced Usage

You can also make the limit contextual:

```php
/**
 * Different limits for products vs coupons
 */
function my_site_contextual_quick_select_limit( $max_limit ) {
    // Check if we're loading coupons or products
    if ( isset( $_POST['action'] ) ) {
        if ( $_POST['action'] === 'wclw_get_filtered_coupons' ) {
            return 15; // Fewer coupons
        } elseif ( $_POST['action'] === 'wclw_get_filtered_products' ) {
            return 35; // More products
        }
    }
    return $max_limit;
}
add_filter( 'wclw_quick_select_max_limit', 'my_site_contextual_quick_select_limit' );
```

---

## Saved Links Pagination Limit Override

The plugin limits the number of saved links shown per page for performance and usability. By default, the limit is 5, with a maximum of 10. Advanced users can override this maximum using the `wclw_saved_links_pagination_max_limit` filter.

### Filter Hook

```php
/**
 * Override the maximum Saved Links Pagination limit
 *
 * @param int $max_limit Default maximum limit (10)
 * @return int New maximum limit
 */
apply_filters( 'wclw_saved_links_pagination_max_limit', $max_limit );
```

### Usage Example

#### Increase limit to 20 items

Add this to your theme's `functions.php` file or a custom plugin:

```php
/**
 * Increase Saved Links Pagination maximum limit to 20 items
 */
function my_site_increase_saved_links_pagination_limit( $max_limit ) {
    return 20;
}
add_filter( 'wclw_saved_links_pagination_max_limit', 'my_site_increase_saved_links_pagination_limit' );
```

### Performance Considerations

- Higher limits may impact admin page load and responsiveness.
- For best performance, keep the limit as low as practical for your workflow.

---

## Support

For questions about these code snippets or other customizations, please refer to the plugin documentation or contact support.