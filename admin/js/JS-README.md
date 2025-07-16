# WooCommerce Link Wizard - JavaScript Modules

This directory contains the modularized JavaScript architecture for the WooCommerce Link Wizard plugin. The codebase has been refactored from a monolithic `admin.js` file into specialized, maintainable modules with clear separation of concerns.

## Architecture Overview

The plugin follows a modular architecture with a lightweight coordinator pattern:

- **admin.js** - Lightweight coordinator that initializes modules and handles global event delegation
- **Core Modules** - Essential functionality split into focused modules
- **Feature Modules** - Optional features that can be loaded independently

## File Structure

### Core Coordinator
- `admin.js` - Main coordinator, initializes modules and handles global events (200+ lines, down from 1,837)

### Core Modules (Essential)
- `ui-manager.js` - UI element registry, button states, feedback, settings visibility
- `modal-manager.js` - Modal dialog management and interactions
- `link-generator.js` - Link generation coordination, parameter parsing/validation
- `search-manager.js` - Page/product search functionality
- `saved-links-manager.js` - Saved link CRUD operations and display

### Feature Modules (Optional)
- `quick-select.js` - Quick product selection shortcuts
- `checkout-wizard.js` - Checkout process wizard functionality
- `variation-sidebar-manager.js` - Product variation selection interface
- `checkout-url-handler.js` - URL generation for checkout processes
- `add-to-cart.js` - Add to cart functionality integration
- `coupon-manager.js` - Coupon code management

## Module Interfaces

### Initialization Pattern
All modules follow a consistent initialization pattern:
```javascript
window.ModuleName = {
    init: function() {
        // Module initialization logic
        return publicAPI;
    }
};
```

### Event System
Modules communicate through a global event system using jQuery custom events:
- `wclw:product-selected` - Product selection events
- `wclw:variation-selected` - Variation selection events  
- `wclw:link-generated` - Link generation completion
- `wclw:error` - Error notifications

### Global API
The coordinator exposes these global functions for backward compatibility:
- `window.closeAllPopups()` - Close all open modals/popups

## Module Dependencies

### Core Dependencies
```
admin.js (coordinator)
├── ui-manager.js (required)
├── modal-manager.js (required)  
├── search-manager.js (required)
├── link-generator.js (required)
└── saved-links-manager.js (required)
```

### Feature Dependencies
```
Optional modules can be loaded independently:
├── quick-select.js
├── checkout-wizard.js
├── variation-sidebar-manager.js
├── checkout-url-handler.js
├── add-to-cart.js
└── coupon-manager.js
```

## Loading Order

1. **Core modules** are loaded first (ui-manager, modal-manager, etc.)
2. **Feature modules** are loaded afterward (quick-select, checkout-wizard, etc.)
3. **admin.js coordinator** is loaded last to initialize everything

## Benefits of Modularization

### Before (Monolithic)
- Single 1,837-line file
- Mixed concerns and responsibilities  
- Difficult to maintain and debug
- High coupling between features
- Code duplication across functionality

### After (Modular)
- Lightweight 200+ line coordinator
- Clear separation of concerns
- Easy to maintain and extend
- Loose coupling via events
- Reusable, focused modules
- Future-proof architecture

## Development Guidelines

### Adding New Features
1. Create a new module file following the naming convention
2. Implement the standard `init()` method
3. Use the global event system for communication
4. Add initialization to `admin.js` coordinator
5. Update this README with module documentation

### Module Best Practices
- Keep modules focused on a single responsibility
- Use the global event system for inter-module communication
- Expose a consistent public API via the `init()` method
- Include error handling and fallbacks
- Add descriptive console logging for debugging

### Event Naming Convention
- Use `wclw:` prefix for all custom events
- Use kebab-case for event names
- Include relevant data in event details

## Testing

Each module can be tested independently by:
1. Loading only the required dependencies
2. Initializing the module via its `init()` method
3. Testing the exposed public API
4. Verifying event handling behavior

## Migration Notes

This refactoring maintains backward compatibility while providing a cleaner, more maintainable codebase. Existing functionality should continue to work without changes to the WordPress admin interface.

## Version History

- **v4.1.2** - Major modularization refactor, extracted core functionality into separate modules
- **Previous** - Monolithic admin.js architecture
