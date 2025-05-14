# Featured Topics for Discourse

A customizable, responsive carousel component for showcasing featured topics in Discourse forums.

## Features

- Responsive design that works on desktop, tablet, and mobile devices
- Horizontal scrolling carousel with navigation arrows and indicator pills
- Support for featured links and topic thumbnails
- Customizable card width for both desktop and mobile
- Configurable display locations (homepage, latest, categories, etc.)
- Graceful fallbacks when theme settings are unavailable
- Compatible with Discourse's new Glimmer topic list

## Tech Stack

- **Vanilla JavaScript**: No external dependencies or frameworks
- **SCSS**: For styling with Discourse theme variables
- **Discourse Theme API**: For integration with Discourse
- **Discourse Plugin Outlets**: For positioning the component

## Installation

1. Create a new theme component in your Discourse admin panel
2. Upload all files from this repository to the theme component
3. Configure the settings according to your needs
4. Enable the theme component

## Configuration

The component can be configured through the theme settings:

| Setting | Description | Default |
|---------|-------------|---------|
| `featured_tags` | Tags used to identify featured topics | `featured` |
| `layout` | Layout style for the component | `cards` |
| `max_topic_count` | Maximum number of topics to display | `4` |
| `randomize_topics` | Whether to randomize the order of topics | `true` |
| `show_with_img_only` | Only show topics with images | `false` |
| `show_on_mobile` | Whether to show on mobile devices | `true` |
| `show_on` | Where to display the component | `homepage` |
| `plugin_outlet` | Discourse plugin outlet to use | `above-main-container` |
| `desktop_card_width` | Width of cards on desktop | *(responsive)* |
| `mobile_card_width` | Width of cards on mobile | *(responsive)* |

## Usage

### Basic Usage

Once installed and enabled, the component will automatically display featured topics based on your configuration. Topics with the tag specified in `featured_tags` will be displayed in the carousel.

### Creating Featured Topics

1. Create or edit a topic in your Discourse forum
2. Add the tag specified in your `featured_tags` setting (default: "featured")
3. Add an image to the topic for better visual appeal
4. Optionally add a featured link URL if you want to link to an external resource

### Customizing Appearance

The component uses Discourse theme variables for colors, making it automatically match your forum's theme. You can further customize the appearance by:

1. Adjusting the card width settings for desktop and mobile
2. Modifying the SCSS files in the theme component
3. Changing the layout setting between cards and list views

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Android Chrome)

## Development

### File Structure

- `about.json`: Component metadata
- `settings.yml`: Theme settings configuration
- `javascripts/discourse/initializers/featured-topics.js`: Main JavaScript implementation
- `stylesheets/jquery-carousel.scss`: Carousel styling
- `stylesheets/cards.scss`: Card layout styling
- `stylesheets/list.scss`: List layout styling
- `common/common.scss`: Common styles and imports

### Error Handling

The component includes robust error handling:

- Graceful fallbacks when theme settings are unavailable
- Sample topics displayed when no featured topics are found
- Proper null/undefined checks throughout the code
- Detailed debug logging (when DEBUG is set to true)

## License

This project is licensed under the MIT License.
