import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { defaultHomepage } from 'discourse/lib/utilities';
import FeaturedTopic from './featured-topic';

export default class FeaturedTopics extends Component {
  @service router;
  @service store;
  @service siteSettings;
  @tracked featuredTopics = null;

  <template>
    {{#if this.showOnRoute}}
      <div class='featured-topics__wrapper {{settings.plugin_outlet}}'>
        <div class='featured-topics__container'>
          <h2>{{settings.heading}}</h2>
          <div class='featured-topics__topic-wrapper'>
            {{#each this.featuredTopics as |topic|}}
              <FeaturedTopic @topic={{topic}} />
            {{/each}}
          </div>
        </div>
      </div>
    {{/if}}
  </template>

  constructor() {
    super(...arguments);
    this.getFeaturedTopics();
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
    this.featuredTopics = topicList.topics;

    if (settings.show_with_img_only) {
      this.featuredTopics = this.featuredTopics.filter(
        (topic) => topic.image_url,
      );
    }

    if (settings.randomize_topics) {
      this.featuredTopics = this.shuffle(this.featuredTopics);
    }

    this.featuredTopics = this.featuredTopics.slice(
      0,
      settings.max_topic_count,
    );
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  get featuredTags() {
    return settings.featured_tags.replaceAll('|', ' ');
  }

  get showOnRoute() {
    const currentRoute = this.router.currentRouteName;
    switch (settings.show_on) {
      case 'everywhere':
        return !currentRoute.includes('admin');
      case 'homepage':
        return currentRoute === `discovery.${defaultHomepage()}`;
      case 'latest/top/new/categories':
        const topMenu = this.siteSettings.top_menu;
        const targets = topMenu.split('|').map((opt) => `discovery.${opt}`);
        return targets.includes(currentRoute);
      case 'latest':
        return currentRoute === `discovery.latest`;
      case 'categories':
        return currentRoute === `discovery.categories`;
      case 'top':
        return currentRoute === `discovery.top`;
      default:
        return false;
    }
  }
}
