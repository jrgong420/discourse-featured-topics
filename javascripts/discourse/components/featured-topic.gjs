import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';
import UserLink from 'discourse/components/user-link';
import avatar from 'discourse/helpers/avatar';
import { categoryLinkHTML } from 'discourse/helpers/category-link';
import formatDate from 'discourse/helpers/format-date';

const responsiveRatios = [0.75, 1, 1.5];
const displayHeight = 500;
const displayWidth = 500;

export default class FeaturedTopic extends Component {
  <template>
    <a
      class='featured-topics__topic-container {{this.tag}} {{this.thumbnail}} '
      href='{{this.unreadUrl}}'
    >

      <div class='featured-topics__topic-tag'>
        <a
          href={{this.tagUrl}}
          data-tag-name={{this.tag}}
          class='discourse-tag box'
        >{{this.tag}}</a>
      </div>

      {{#if @topic.thumbnails}}
        <div class='featured-topics__topic-thumbnail'>
          <img
            src={{this.fallbackSrc}}
            srcset={{this.srcset}}
            width={{this.width}}
            height={{this.height}}
            loading='lazy'
            class=''
          />
        </div>
      {{/if}}

      <div class='featured-topics__topic-details'>
        <h2 class='topic-title'>{{htmlSafe @topic.title}}</h2>
        <div class='category-link'>{{categoryLinkHTML @topic.category}}</div>
        <span class='topic-date'>{{formatDate
            @topic.created_at
            format='tiny'
          }}</span>
        {{#if @topic.hasExcerpt}}
          <div class='topic-excerpt'>
            {{htmlSafe @topic.excerpt}}
          </div>
        {{/if}}
        <div class='topic-author'>
          <UserLink @user={{@topic.creator}}>
            {{avatar @topic.creator imageSize='medium'}}
            <span class='topic-author-name'>{{@topic.creator.name}}</span>
          </UserLink>
        </div>
      </div>

    </a>
  </template>

  get unreadUrl() {
    return this.args.topic.linked_post_number
      ? this.args.topic.urlForPostNumber(this.args.topic.linked_post_number)
      : this.args.topic.get('lastUnreadUrl');
  }

  get thumbnail() {
    if (!this.args.topic.thumbnails) {
      return;
    }
    return 'thumbnail';
  }

  get tag() {
    return this.args.topic.tags.find((element) =>
      settings.featured_tags.split('|').includes(element),
    );
  }

  get tagUrl() {
    return `/tag/${this.tag}`;
  }

  get original() {
    return this.args.topic.thumbnails[0];
  }

  get width() {
    return this.original.width;
  }

  get height() {
    return this.original.height;
  }

  findBest(maxWidth, maxHeight) {
    if (!this.args.topic.thumbnails) {
      return;
    }

    const largeEnough = this.args.topic.thumbnails.filter((t) => {
      if (!t.url) {
        return false;
      }
      return t.max_width >= maxHeight;
    });

    if (largeEnough.lastObject) {
      return largeEnough.lastObject;
    }

    return this.original;
  }

  get fallbackSrc() {
    return this.findBest(displayWidth, displayHeight).url;
  }

  get srcset() {
    return responsiveRatios
      .map((ratio) => {
        const match = this.findBest(
          ratio * displayHeight,
          ratio * displayWidth,
        );
        return `${match.url} ${ratio}x`;
      })
      .join(',');
  }
}
