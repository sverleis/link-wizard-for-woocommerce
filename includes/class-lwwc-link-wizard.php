<?php
class LWWC_Link_Wizard {
	protected $plugin_name;
	protected $version;

	public function __construct() {
		if ( defined( 'LWWC_VERSION' ) ) {
			$this->version = LWWC_VERSION;
		} else {
			$this->version = '1.0.0';
		}
		$this->plugin_name = 'link-wizard-for-woocommerce';
		$this->load_dependencies();
		$this->define_hooks();
	}

	private function load_dependencies() {
        require_once LWWC_PLUGIN_DIR . 'includes/class-lwwc-admin.php';
        require_once LWWC_PLUGIN_DIR . 'includes/class-lwwc-frontend.php';
        require_once LWWC_PLUGIN_DIR . 'includes/class-lwwc-settings.php';
        require_once LWWC_PLUGIN_DIR . 'includes/utils/class-lwwc-product-utils.php';
    }

    private function define_hooks() {
        $plugin_admin = new LWWC_Admin( $this->get_plugin_name(), $this->get_version() );
        $plugin_admin->add_hooks();
        $plugin_public = new LWWC_Frontend( $this->get_plugin_name(), $this->get_version() );
        $plugin_public->add_hooks();
    }

	public function get_plugin_name() {
		return $this->plugin_name;
	}

	public function get_version() {
		return $this->version;
	}
}
