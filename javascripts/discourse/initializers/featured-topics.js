import { apiInitializer } from 'discourse/lib/api';
import FeaturedTopics from '../components/featured-topics';

export default apiInitializer('1.14.0', (api) => {
  api.renderInOutlet(settings.plugin_outlet.trim(), FeaturedTopics);
});
