import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { inject as service } from '@ember/service';
import FeaturedTopic from './featured-topic';

export default class FeaturedTopics extends Component {
  @service router;
  @service store;
  @service site;
  @service siteSettings;
  @tracked featuredTopics = null;

  <template>
    <div class='featured-topics__wrapper {{settings.plugin_outlet}}'>
      <div class='featured-topics__container'>
        {{#each this.featuredTopics as |topic|}}
          <FeaturedTopic @topic={{topic}} />
        {{/each}}
      </div>
    </div>
  </template>

  constructor() {
    super(...arguments);
    this.getFeaturedTopics();
  }

  @action
  shuffle(array) {
    // https://stackoverflow.com/a/12646864
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  @action
  async getFeaturedTopics() {
    const topicList = await this.store.findFiltered('topicList', {
      filter: 'latest',
      params: {
        order: 'activity',
        tags: this.featuredTags,
      },
    });

    this.featuredTopics = topicList.topics
      // .filter((topic) => topic.image_url)
      .slice(0, settings.max_topic_count);

    if (settings.randomize_topics) {
      this.featuredTopics = this.shuffle(this.featuredTopics);
    }
  }

  get featuredTags() {
    return settings.featured_tags.replaceAll('|', ' ');
  }
}
