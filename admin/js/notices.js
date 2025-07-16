/**
 * WooCommerce Link Wizard - Notice Management
 * 
 * Handles all client-side notice and alert functionality
 */

(function($) {
    'use strict';

    /**
     * WCLW Notices class
     */
    class WCLWNotices {
        constructor() {
            this.alertArea = $('#lwwc-global-alert-area'); // Always use the global area
            this.init();
        }

        /**
         * Initialize the notices system
         */
        init() {
            this.bindEvents();
            this.handleDismissibleNotices();
        }

        /**
         * Bind event handlers
         */
        bindEvents() {
            // Dismiss button clicks
            $(document).on('click', '.lwwc-banner-notice__dismiss', (e) => {
                e.preventDefault();
                this.dismissNotice($(e.target));
            });

            // Action button clicks
            $(document).on('click', '.lwwc-banner-notice__action-btn', (e) => {
                e.preventDefault();
                const $alert = $(e.target).closest('.lwwc-banner-notice');
                const actionData = $alert.data('action-data');
                if (actionData && actionData.onClick) {
                    actionData.onClick();
                }
            });
        }

        /**
         * Handle dismissible admin notices
         */
        handleDismissibleNotices() {
            $('.lwwc-banner-notice-dismissible').each((index, element) => {
                const $notice = $(element);
                const noticeId = $notice.find('.lwwc-banner-notice__dismiss').data('notice-id');
                
                if (noticeId) {
                    // Add fade out animation
                    $notice.on('click', '.lwwc-banner-notice__dismiss', (e) => {
                        e.preventDefault();
                        this.dismissAdminNotice($notice, noticeId);
                    });
                }
            });
        }

        /**
         * Dismiss an admin notice
         */
        dismissAdminNotice($notice, noticeId) {
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: {
                    action: 'lwwc_dismiss_notice',
                    notice_id: noticeId,
                    nonce: lwwc_ajax.nonce
                },
                success: (response) => {
                    if (response.success) {
                        $notice.fadeOut(300, () => {
                            $notice.remove();
                        });
                    }
                },
                error: () => {
                    // Fallback: just hide the notice
                    $notice.fadeOut(300, () => {
                        $notice.remove();
                    });
                }
            });
        }

        /**
         * Dismiss a notice in the alert area
         */
        dismissNotice($button) {
            const $alert = $button.closest('.lwwc-banner-notice');
            $alert.fadeOut(300, () => {
                $alert.remove();
            });
        }

        /**
         * Show a notice in the global alert area
         */
        showAlert(type, message, options = {}) {
            const defaults = {
                title: '',
                icon: this.getIconForType(type),
                dismissible: true,
                autoHide: false,
                autoHideDelay: 12000, // 12 seconds default
                actionButton: null
            };

            const settings = $.extend({}, defaults, options);
            let alertArea = this.alertArea; // Always use global

            // Clear existing alerts if specified
            if (options.clearExisting) {
                alertArea.find('.lwwc-banner-notice').remove();
            }

            const alertHtml = this.createAlertHtml(type, message, settings);
            alertArea.append(alertHtml);

            const $newAlert = alertArea.find('.lwwc-banner-notice').last();
            
            // Store action data if provided
            if (settings.actionButton) {
                $newAlert.data('action-data', settings.actionButton);
            }
            
            // Auto-hide if enabled
            if (settings.autoHide) {
                setTimeout(() => {
                    this.hideAlert($newAlert);
                }, settings.autoHideDelay);
            }

            return $newAlert;
        }

        /**
         * Create alert HTML
         */
        createAlertHtml(type, message, settings) {
            const typeClass = `is-${type}`;
            const dismissibleClass = settings.dismissible ? 'lwwc-banner-notice-dismissible' : '';
            const dismissButton = settings.dismissible ? '<button type="button" class="lwwc-banner-notice__dismiss components-button has-icon lwwc-button" aria-label="Dismiss">×</button>' : '';
            
            let actionButton = '';
            if (settings.actionButton) {
                actionButton = `
                    <div class="lwwc-banner-notice__actions">
                        <button type="button" class="lwwc-banner-notice__action-btn button button-small lwwc-button">${settings.actionButton.text}</button>
                    </div>
                `;
            }

            return `
                <div class="lwwc-banner-notice ${typeClass} ${dismissibleClass}" role="${type === 'error' || type === 'warning' ? 'alert' : 'status'}">
                    <span class="lwwc-banner-notice__icon">${settings.icon}</span>
                    <div class="lwwc-banner-notice__content">
                        ${settings.title ? `<strong>${settings.title}</strong><br>` : ''}
                        ${message}
                        ${actionButton}
                    </div>
                    ${dismissButton}
                </div>
            `;
        }

        /**
         * Get icon for alert type
         */
        getIconForType(type) {
            const icons = {
                success: '✅',
                error: '❌',
                warning: '⚠️',
                info: 'ℹ️',
                duplicate: '🔄'
            };
            return icons[type] || icons.info;
        }

        /**
         * Show success alert
         */
        success(message, options = {}) {
            return this.showAlert('success', message, options);
        }

        /**
         * Show error alert
         */
        error(message, options = {}) {
            return this.showAlert('error', message, options);
        }

        /**
         * Show warning alert
         */
        warning(message, options = {}) {
            return this.showAlert('warning', message, options);
        }

        /**
         * Show info alert
         */
        info(message, options = {}) {
            return this.showAlert('info', message, options);
        }

        /**
         * Show duplicate alert
         */
        duplicate(message, options = {}) {
            return this.showAlert('duplicate', message, options);
        }

        /**
         * Hide a specific alert
         */
        hideAlert($alert) {
            $alert.fadeOut(300, () => {
                $alert.remove();
            });
        }

        /**
         * Clear all alerts
         */
        clearAlerts() {
            this.alertArea.find('.lwwc-banner-notice').fadeOut(300, function() {
                $(this).remove();
            });
        }

        /**
         * Show loading alert
         */
        showLoading(message = 'Loading...') {
            return this.showAlert('info', message, {
                icon: '⏳',
                dismissible: false,
                autoHide: false
            });
        }

        /**
         * Hide loading alert
         */
        hideLoading() {
            this.alertArea.find('.lwwc-banner-notice').each((index, element) => {
                const $alert = $(element);
                if ($alert.find('.lwwc-banner-notice__icon').text() === '⏳') {
                    this.hideAlert($alert);
                }
            });
        }

        /**
         * Show copy success message
         */
        showCopySuccess() {
            this.success('Link copied to clipboard!', {
                autoHide: true,
                autoHideDelay: 12000
            });
        }

        /**
         * Show copy error message
         */
        showCopyError() {
            this.error('Failed to copy link. Please try again.', {
                autoHide: true,
                autoHideDelay: 12000
            });
        }
    }

    // Initialize when document is ready
    $(document).ready(() => {
        window.wclwNotices = new WCLWNotices();
    });

    // Make it globally available
    window.WCLWNotices = WCLWNotices;

})(jQuery); 