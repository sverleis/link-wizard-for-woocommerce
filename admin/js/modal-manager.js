(function($) {
    'use strict';

    /**
     * Modal Manager - Handles all modal dialogs and popups
     */
    window.WCLWModalManager = {
        
        confirmCallback: null,

        // Store the last trigger element for focus return
        lastTrigger: null,
        
        // Focus trap handler
        focusTrapHandler: null,

        // Initialize modal manager
        init: function() {
            this.bindEvents();
        },

        // Bind modal events
        bindEvents: function() {
            const self = this;
            
            // Confirm modal buttons
            $(document).on('click', '#lwwc-confirm-modal-confirm', function() {
                if (typeof self.confirmCallback === 'function') {
                    self.confirmCallback();
                    self.confirmCallback = null;
                }
                self.hideConfirmModal();
            });

            $(document).on('click', '#lwwc-confirm-modal-cancel, #lwwc-confirm-modal-close-x', function() {
                self.confirmCallback = null;
                self.hideConfirmModal();
            });

            // Variation modal close buttons
            $(document).on('click', '#lwwc-modal-cancel, #lwwc-modal-close-x', function() {
                self.closeVariationModal();
            });

            // Modal backdrop clicks to close modals
            $(document).on('click', '.lwwc-modal', function(e) {
                if (e.target === e.currentTarget) {
                    const $modal = $(e.target);
                    if ($modal.attr('id') === 'lwwc-variation-modal') {
                        self.closeVariationModal();
                    } else if ($modal.attr('id') === 'lwwc-confirm-modal') {
                        self.hideConfirmModal();
                        self.confirmCallback = null;
                    } else {
                        $modal.hide();
                    }
                }
            });

            // ESC key to close modals
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape') {
                    self.closeVariationModal();
                    self.hideConfirmModal();
                    self.confirmCallback = null;
                }
            });

            // ESC/Enter key for confirm modal
            $(document).on('keydown', '#lwwc-confirm-modal', function(e) {
                // Only act if event target is not a button/input/textarea/select
                if ($(e.target).is('button, input, textarea, select')) return;
                if (e.key === 'Escape' || e.keyCode === 27) {
                    e.preventDefault();
                    window.WCLWModalManager.hideConfirmModal();
                    window.WCLWModalManager.confirmCallback = null;
                } else if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    $('#lwwc-confirm-modal-confirm').trigger('click');
                }
            });
        },

        // Show confirmation modal
        showConfirmModal: function(message, onConfirm, btnClass = '') {
            const ui = window.WCLWUIManager ? window.WCLWUIManager.ui : {
                confirmModal: $('#lwwc-confirm-modal'),
                confirmText: $('#lwwc-confirm-modal-text'),
                confirmBtn: $('#lwwc-confirm-modal-confirm'),
                confirmCancelBtn: $('#lwwc-confirm-modal-cancel')
            };

            // Save the last focused element (trigger)
            this.lastTrigger = document.activeElement;

            if (!ui.confirmModal.length) {
                // Fallback to browser confirm (remove HTML tags)
                const plainMessage = message.replace(/<[^>]*>/g, '');
                if (confirm(plainMessage)) {
                    onConfirm();
                }
                return;
            }
            ui.confirmText.html(message);
            ui.confirmBtn.removeClass().addClass('button button-primary ' + btnClass);
            this.confirmCallback = onConfirm;
            ui.confirmModal.removeClass('lwwc-modal-hidden').addClass('lwwc-modal-visible');
            ui.confirmModal.css({
                'display': 'block',
                'visibility': 'visible',
                'opacity': '1',
                'z-index': '99999'
            }).show();
            ui.confirmModal[0].offsetHeight;
            setTimeout(function() {
                ui.confirmBtn.focus();
            }, 10);

            // Setup focus trap
            this.setupFocusTrap(ui.confirmModal);
        },

        // Hide confirmation modal
        hideConfirmModal: function() {
            const ui = window.WCLWUIManager ? window.WCLWUIManager.ui : {
                confirmModal: $('#lwwc-confirm-modal')
            };
            ui.confirmModal.removeClass('lwwc-modal-visible').addClass('lwwc-modal-hidden');
            ui.confirmModal.css('display', 'none');
            // Remove focus trap
            this.removeFocusTrap();
            // Restore focus to trigger
            if (this.lastTrigger && typeof this.lastTrigger.focus === 'function' && document.contains(this.lastTrigger)) {
                setTimeout(() => { 
                    if (this.lastTrigger && document.contains(this.lastTrigger)) {
                        this.lastTrigger.focus(); 
                    }
                }, 10);
                this.lastTrigger = null;
            }
        },

        // Focus trap logic
        setupFocusTrap: function($modal) {
            const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
            const focusableEls = $modal.find(focusableSelectors).filter(':visible');
            if (!focusableEls.length) return;
            const firstEl = focusableEls[0];
            const lastEl = focusableEls[focusableEls.length - 1];
            this.focusTrapHandler = function(e) {
                if (e.key === 'Tab' || e.keyCode === 9) {
                    if (focusableEls.length === 1) {
                        e.preventDefault();
                        firstEl.focus();
                        return;
                    }
                    if (e.shiftKey) {
                        if (document.activeElement === firstEl) {
                            e.preventDefault();
                            lastEl.focus();
                        }
                    } else {
                        if (document.activeElement === lastEl) {
                            e.preventDefault();
                            firstEl.focus();
                        }
                    }
                }
            };
            $modal[0].addEventListener('keydown', this.focusTrapHandler, true);
        },
        removeFocusTrap: function() {
            const ui = window.WCLWUIManager ? window.WCLWUIManager.ui : { confirmModal: $('#lwwc-confirm-modal') };
            if (ui.confirmModal.length && this.focusTrapHandler) {
                ui.confirmModal[0].removeEventListener('keydown', this.focusTrapHandler, true);
                this.focusTrapHandler = null;
            }
        },

        // Variation modal focus trap/return logic
        closeVariationModal: function() {
            const modal = $('#lwwc-variation-modal');
            if (modal.length) {
                modal.removeClass('lwwc-modal-visible').addClass('lwwc-modal-hidden').hide();
                // Remove focus trap
                this.removeVariationFocusTrap();
                // Restore focus to trigger
                if (this.lastTrigger && typeof this.lastTrigger.focus === 'function' && document.contains(this.lastTrigger)) {
                    setTimeout(() => { 
                        if (this.lastTrigger && document.contains(this.lastTrigger)) {
                            this.lastTrigger.focus(); 
                        }
                    }, 10);
                    this.lastTrigger = null;
                }
            }
        },
        setupVariationFocusTrap: function($modal) {
            const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
            const focusableEls = $modal.find(focusableSelectors).filter(':visible');
            if (!focusableEls.length) return;
            const firstEl = focusableEls[0];
            const lastEl = focusableEls[focusableEls.length - 1];
            this.variationFocusTrapHandler = function(e) {
                if (e.key === 'Tab' || e.keyCode === 9) {
                    if (focusableEls.length === 1) {
                        e.preventDefault();
                        firstEl.focus();
                        return;
                    }
                    if (e.shiftKey) {
                        if (document.activeElement === firstEl) {
                            e.preventDefault();
                            lastEl.focus();
                        }
                    } else {
                        if (document.activeElement === lastEl) {
                            e.preventDefault();
                            firstEl.focus();
                        }
                    }
                }
            };
            $modal[0].addEventListener('keydown', this.variationFocusTrapHandler, true);
        },
        removeVariationFocusTrap: function() {
            const modal = $('#lwwc-variation-modal');
            if (modal.length && this.variationFocusTrapHandler) {
                modal[0].removeEventListener('keydown', this.variationFocusTrapHandler, true);
                this.variationFocusTrapHandler = null;
            }
        },

        // Close all popups and modals
        closeAllPopups: function() {
            this.closeVariationModal();
            this.hideConfirmModal();
            if (window.WCLWUIManager) {
                window.WCLWUIManager.closeAllPopups();
            }
        }
    };

    // Make modal manager globally available
    window.showConfirmModal = function(message, onConfirm, btnClass = '') {
        if (window.WCLWModalManager) {
            window.WCLWModalManager.showConfirmModal(message, onConfirm, btnClass);
        }
    };

})(jQuery);
