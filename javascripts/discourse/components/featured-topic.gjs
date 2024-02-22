import Component from '@glimmer/component';
import { action, computed } from '@ember/object';
import { htmlSafe } from '@ember/template';
import { categoryLinkHTML } from 'discourse/helpers/category-link';
import formatDate from 'discourse/helpers/format-date';
import { renderAvatar } from 'discourse/helpers/user-avatar';

const displayHeight = 400;
const displayWidth = 400;

export default class FeaturedTopic extends Component {
  <template>
    <a class='featured-topic__container {{this.tag}}' href='{{this.unreadUrl}}'>

      <div class='featured-topic__tag'>
        <a
          href={{this.tagUrl}}
          data-tag-name={{this.tag}}
          class='discourse-tag box'
        >{{this.tag}}</a>
      </div>

      {{#if @topic.thumbnails}}
        <div class='featured-topic__thumbnail'>
          <img
            src={{this.thumbnailUrl}}
            {{!-- srcset={{this.srcset}} --}}
            width={{displayWidth}}
            height={{displayHeight}}
            loading='lazy'
            class=''
          />
        </div>
      {{/if}}

      <div class='featured-topic__details'>
        <h2 class='featured-topic__topic-title'>{{htmlSafe @topic.title}}</h2>

        <div class='topic-header'>
          <div class='category-link'>{{categoryLinkHTML @topic.category}}</div>
          <span class='topic-date'>{{formatDate
              @topic.created_at
              format='tiny'
            }}</span>
        </div>
      </div>

    </a>
  </template>

  get unreadUrl() {
    return this.args.topic.linked_post_number
      ? this.args.topic.urlForPostNumber(this.args.topic.linked_post_number)
      : this.args.topic.get('lastUnreadUrl');
  }

  get tag() {
    return this.args.topic.tags.find((element) =>
      settings.featured_tags.split('|').includes(element),
    );
  }
  get tagUrl() {
    return `/tag/${this.tag}`;
  }

  get thumbnailUrl() {
    if (!this.args.topic.thumbnails) {
      return;
    }
    // console.log(this.args.topic.thumbnails[1].url);
    return this.args.topic.thumbnails[0].url;
  }
}
