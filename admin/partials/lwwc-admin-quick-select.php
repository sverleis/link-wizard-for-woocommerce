<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>

<div class="lwwc-quick-select-area">
    <div class="lwwc-quick-select-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
        <h4 style="margin: 0;"><?php esc_html_e( 'Product Quick Select', 'link-wizard-for-woocommerce' ); ?></h4>
        <select id="lwwc-product-filter" name="lwwc_product_filter" style="margin-left: auto;">
            <option value="recent"><?php esc_html_e( 'Recent Products', 'link-wizard-for-woocommerce' ); ?></option>
            <option value="featured"><?php esc_html_e( 'Featured Products', 'link-wizard-for-woocommerce' ); ?></option>
        </select>
    </div>
    
    <div id="lwwc-quick-select-product-results" class="lwwc-quick-select-results" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
        <!-- Products will be loaded here via AJAX -->
    </div>
</div>

<div class="lwwc-product-search-section">
    <h4><?php esc_html_e( 'Or search for products:', 'link-wizard-for-woocommerce' ); ?></h4>
    <div class="lwwc-search-form">
        <input type="text" id="lwwc-product-search" placeholder="<?php esc_attr_e( 'Type to search for products...', 'link-wizard-for-woocommerce' ); ?>" style="width: 300px;" />
        <div id="lwwc-search-results" class="lwwc-search-results" style="display: none;">
            <!-- Search results will appear here -->
        </div>
    </div>
    <p class="description">
        <?php esc_html_e( 'Search for a product to add it to the list below.', 'link-wizard-for-woocommerce' ); ?>
    </p>
</div>
