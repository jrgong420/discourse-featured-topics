# Changelog

All notable changes to the Featured Topics component will be documented in this file.

## [1.0.0] - 2024-06-01

### Added
- Initial release of the Featured Topics component
- Responsive carousel design for desktop, tablet, and mobile
- Support for featured links and topic thumbnails
- Customizable card width for both desktop and mobile
- Configurable display locations
- Navigation arrows and indicator pills
- Horizontal scrolling with mouse/trackpad
- Touch support for mobile devices

### Fixed
- Removed center icon overlay when using left/right arrows
- Fixed component outlet implementation to respect settings
- Added proper null/undefined checks for theme settings
- Ensured component functions even when theme settings are unavailable
- Fixed variable redeclaration issue in fetchTopics function

### Changed
- Updated documentation with comprehensive usage instructions
- Improved error handling throughout the codebase
- Enhanced accessibility with keyboard navigation support
- Optimized carousel performance with debounced resize handling
