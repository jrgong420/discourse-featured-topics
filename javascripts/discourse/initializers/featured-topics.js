import { withPluginApi } from "discourse/lib/plugin-api";

// Debug mode - set to false for production, true for development
const DEBUG = false; // Set to false to disable all console logs

export default {
  name: "featured-topics",
  initialize(container) {
    withPluginApi("1.14.0", (api) => {
      // Function to initialize on both page load and page change
      const initOnPage = () => {
        // Get the current URL path
        const currentPath = window.location.pathname;

        // Only show on homepage or latest page
        if (currentPath === "/" || currentPath === "/latest") {
          if (DEBUG) console.log("Featured Topics: Initializing");

          // Initialize the component with a short delay to ensure DOM is ready
          setTimeout(() => initFeaturedTopicsComponent(api), 200);
        }
      };

      // Initialize on page load
      initOnPage();

      // Also initialize on page change
      api.onPageChange(initOnPage);
    });
  }
};

// Main initialization function with optimized outlet detection
function initFeaturedTopicsComponent(api) {
  // Check if component already exists to avoid duplicates
  if ($(".featured-topics-container").length) {
    if (DEBUG) console.log("Featured Topics: Component already exists");
    return;
  }

  // Prioritized list of outlet selectors to try
  const outletSelectors = [
    // First check preferred outlets
    ".discovery-list-container-top",
    ".discovery-above",
    ".above-main-container",

    // Then check plugin outlets by data attribute
    ".plugin-outlet[data-outlet='discovery-list-container-top']",
    ".plugin-outlet[data-outlet='discovery-above']"
  ];

  // Try to find a suitable outlet
  let $outlet = null;

  // First check if main-outlet exists as our fallback
  const $mainContent = $("#main-outlet");
  const mainOutletExists = $mainContent.length > 0;

  // Try each outlet selector
  for (const selector of outletSelectors) {
    const $currentOutlet = $(selector);
    if ($currentOutlet.length && !$currentOutlet.find(".featured-topics-container").length) {
      $outlet = $currentOutlet;
      if (DEBUG) console.log(`Featured Topics: Using outlet "${selector}"`);
      break;
    }
  }

  // If we found an outlet, use it
  if ($outlet && $outlet.length) {
    initFeaturedTopics(api, $outlet);
  }
  // Otherwise use main-outlet as fallback if it exists
  else if (mainOutletExists) {
    if (DEBUG) console.log("Featured Topics: Using #main-outlet as fallback");
    initFeaturedTopics(api, $mainContent, true);
  }
  // If even main-outlet doesn't exist, we can't proceed
  else {
    console.warn("Featured Topics: Could not find any suitable location");
  }
}

function initFeaturedTopics(api, $outlet, prependToOutlet = false) {
  if (DEBUG) console.log("Featured Topics: Creating component");

  if (!$outlet || !$outlet.length) {
    return;
  }

  if ($outlet.find(".featured-topics-container").length) {
    return;
  }

  // Create container
  const $container = $("<div class='featured-topics-container'></div>");

  // Either prepend or append based on the parameter
  if (prependToOutlet) {
    $outlet.prepend($container);
  } else {
    $outlet.append($container);
  }

  // Add loading indicator
  $container.html("<div class='featured-topics-loading'>Loading featured topics...</div>");

  // Try to get topics using the store
  fetchTopics(api, $container);
}

// Separate function to fetch topics
function fetchTopics(api, $container) {
  // First try to use the store if available
  if (api.container && api.container.lookup) {
    try {
      const store = api.container.lookup("service:store");

      if (store && store.findFiltered) {
        // Fetch topics with the "featured" tag
        store.findFiltered("topicList", {
          filter: "latest",
          params: {
            tags: ["featured"]
          }
        }).then(topicList => {
          if (topicList && topicList.topics && topicList.topics.length > 0) {
            // Randomize and limit topics
            let topics = shuffle(topicList.topics);
            topics = topics.slice(0, 4); // Limit to 4 topics

            renderFeaturedTopics($container, topics);
          } else {
            // Fallback to sample topics
            renderSampleTopics($container);
          }
        }).catch(error => {
          if (DEBUG) console.error("Featured Topics: Error fetching topics", error);
          // Fallback to sample topics
          renderSampleTopics($container);
        });

        return;
      }
    } catch (error) {
      if (DEBUG) console.error("Featured Topics: Error using store", error);
    }
  }

  // Fallback to AJAX if store is not available
  $.ajax({
    url: "/latest.json",
    dataType: "json",
    success: function(data) {
      if (data && data.topic_list && data.topic_list.topics && data.topic_list.topics.length > 0) {
        // Just use the first 4 topics as samples
        const topics = data.topic_list.topics.slice(0, 4);
        renderFeaturedTopics($container, topics);
      } else {
        renderSampleTopics($container);
      }
    },
    error: function(error) {
      if (DEBUG) console.error("Featured Topics: AJAX error", error);
      renderSampleTopics($container);
    }
  });
}

// Helper function to shuffle an array
function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Render sample topics when API calls fail
function renderSampleTopics($container) {
  if (DEBUG) console.log("Featured Topics: Using sample topics");

  // Create sample topics
  const sampleTopics = [
    {
      id: 1,
      title: "Sample Topic 1",
      slug: "sample-topic-1",
      excerpt: "This is a sample topic to demonstrate the featured topics carousel.",
      image_url: "https://via.placeholder.com/300x200?text=Sample+Topic+1",
      featured_link: "https://example.com"
    },
    {
      id: 2,
      title: "Sample Topic 2",
      slug: "sample-topic-2",
      excerpt: "Another sample topic with a different description.",
      image_url: "https://via.placeholder.com/300x200?text=Sample+Topic+2"
    },
    {
      id: 3,
      title: "Sample Topic 3",
      slug: "sample-topic-3",
      excerpt: "A third sample topic to fill out the carousel.",
      image_url: "https://via.placeholder.com/300x200?text=Sample+Topic+3",
      featured_link: "https://example.org"
    },
    {
      id: 4,
      title: "Sample Topic 4",
      slug: "sample-topic-4",
      excerpt: "The fourth and final sample topic in our carousel.",
      image_url: "https://via.placeholder.com/300x200?text=Sample+Topic+4"
    }
  ];

  // Render the sample topics
  renderFeaturedTopics($container, sampleTopics);
}

function renderFeaturedTopics($container, topics) {
  // Clear container
  $container.empty();

  // Create header
  const $header = $("<div class='featured-topics-header'><h2>Featured Topics</h2></div>");
  $container.append($header);

  // Create carousel container
  const $carousel = $("<div class='featured-topics-carousel'></div>");
  $container.append($carousel);

  // Create navigation buttons
  const $prevButton = $("<button class='featured-topics-nav-prev' aria-label='Previous slide'><span class='d-icon d-icon-chevron-left'></span></button>");
  const $nextButton = $("<button class='featured-topics-nav-next' aria-label='Next slide'><span class='d-icon d-icon-chevron-right'></span></button>");

  if (topics.length > 3) {
    $carousel.append($prevButton);
    $carousel.append($nextButton);
  }

  // Create topics wrapper
  const $topicsWrapper = $("<div class='featured-topics-wrapper'></div>");
  $carousel.append($topicsWrapper);

  // Create topics container with a class to indicate it's a flex container
  const $topicsContainer = $("<div class='featured-topics-items'></div>");
  $topicsWrapper.append($topicsContainer);

  // Add topics
  topics.forEach(topic => {
    try {
      const $topic = createTopicCard(topic);
      $topicsContainer.append($topic);
    } catch (error) {
      if (DEBUG) console.error("Featured Topics: Error creating topic card", error);
    }
  });

  // Add pagination dots for desktop
  if (topics.length > 3) {
    const $pagination = $("<div class='featured-topics-pagination'></div>");
    $header.append($pagination);

    const totalSlides = Math.max(0, topics.length - 3);
    for (let i = 0; i <= totalSlides; i++) {
      const $dot = $(`<button class='featured-topics-pagination-dot ${i === 0 ? "active" : ""}' data-slide='${i}' aria-label='Go to slide ${i + 1}'></button>`);
      $pagination.append($dot);
    }
  }

  // Add mobile navigation pills - position after the wrapper for better visibility
  const $mobileNav = $("<div class='featured-topics-mobile-nav'></div>");

  // Add pills for each topic (for mobile view)
  topics.forEach((_, index) => {
    const $pill = $(`<div class='nav-pill ${index === 0 ? "active" : ""}' data-slide='${index}'></div>`);
    $mobileNav.append($pill);
  });

  // Insert after the carousel container to ensure proper positioning
  $container.append($mobileNav);

  // Initialize carousel
  try {
    initCarousel($carousel);
  } catch (error) {
    if (DEBUG) console.error("Featured Topics: Error initializing carousel", error);
  }
}

function createTopicCard(topic) {
  // Check if topic has a featured link
  const hasFeaturedLink = topic.featured_link && topic.featured_link.length > 0;

  // Always point to the first post of the topic
  const topicUrl = `/t/${topic.slug}/${topic.id}/1`;
  const featuredLinkUrl = topic.featured_link;

  // Create topic card
  const $topic = $("<div class='featured-topics-topic'></div>");

  // Add thumbnail if available
  if (topic.image_url) {
    // Clean up the image URL to ensure it's properly formatted
    const cleanImageUrl = topic.image_url.trim();

    const $thumbnail = $(`
      <div class='featured-topics-topic-thumbnail'>
        <img src='${cleanImageUrl}' alt='${topic.title}' loading='lazy' onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'200\\' viewBox=\\'0 0 300 200\\'%3E%3Crect width=\\'300\\' height=\\'200\\' fill=\\'%23eee\\' /%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' font-family=\\'Arial\\' font-size=\\'14\\' text-anchor=\\'middle\\' fill=\\'%23999\\' dominant-baseline=\\'middle\\'%3EImage not available%3C/text%3E%3C/svg%3E';">
        <div class='featured-topics-topic-overlay'></div>
      </div>
    `);
    $topic.append($thumbnail);
  } else {
    // Add a placeholder if no image is available
    const $placeholder = $(`
      <div class='featured-topics-topic-thumbnail placeholder'>
        <div class='featured-topics-topic-placeholder'></div>
        <div class='featured-topics-topic-overlay'></div>
      </div>
    `);
    $topic.append($placeholder);
  }

  // Add topic details
  const $details = $("<div class='featured-topics-topic-details'></div>");
  $topic.append($details);

  // Add title
  const $title = $(`<h3 class='featured-topics-topic-title'>${topic.title}</h3>`);
  $details.append($title);

  // Add excerpt if available
  if (topic.excerpt) {
    // Remove any HTML tags from the excerpt
    const cleanExcerpt = topic.excerpt.replace(/<\/?[^>]+(>|$)/g, "");
    const $excerpt = $(`<div class='featured-topics-topic-excerpt'>${cleanExcerpt}</div>`);
    $details.append($excerpt);
  }

  // Add CTA buttons
  const $buttons = $("<div class='featured-topics-cta-buttons'></div>");
  $details.append($buttons);

  // Add featured link button if available
  if (hasFeaturedLink) {
    const $featuredButton = $(`<a href='${featuredLinkUrl}' class='featured-topics-cta-button primary' target='_blank' rel='noopener'>Visit Link</a>`);
    $buttons.append($featuredButton);
  }

  // Add topic link button
  const $topicButton = $(`<a href='${topicUrl}' class='featured-topics-cta-button ${hasFeaturedLink ? "secondary" : "primary"}'>Read Topic</a>`);
  $buttons.append($topicButton);

  // Add full topic link
  const $fullLink = $(`<a href='${topicUrl}' class='featured-topics-topic-link' aria-hidden='true' tabindex='-1'></a>`);
  $topic.append($fullLink);

  return $topic;
}

function initCarousel($carousel) {
  const $wrapper = $carousel.find('.featured-topics-wrapper');
  const $container = $carousel.find('.featured-topics-items');
  const $topics = $container.find('.featured-topics-topic');
  const $prevButton = $carousel.find('.featured-topics-nav-prev');
  const $nextButton = $carousel.find('.featured-topics-nav-next');
  const $pagination = $('.featured-topics-pagination');
  const $dots = $pagination.find('.featured-topics-pagination-dot');

  let currentSlide = 0;
  let startX, startY, endX, endY, threshold = 50;
  let isMobile = window.innerWidth < 768;
  let visibleCards = isMobile ? 1 : (window.innerWidth < 992 ? 2 : 3);
  let totalSlides = Math.max(0, $topics.length - visibleCards);

  // Add mobile-specific class to container if on mobile
  if (isMobile) {
    $container.addClass('mobile-view');

    // Ensure proper display on mobile by forcing a reflow
    setTimeout(() => {
      $container.css('display', 'flex');
      $topics.css('display', 'flex');

      // Force browser to recalculate layout
      $wrapper[0].offsetHeight;
    }, 50);
  }

  // Disable prev button initially
  $prevButton.addClass('disabled');

  // Handle next button click
  $nextButton.on('click', function(e) {
    e.preventDefault(); // Prevent default button behavior
    if (currentSlide < totalSlides) {
      currentSlide++;
      updateCarousel();
    }
    return false; // Prevent event bubbling
  });

  // Handle prev button click
  $prevButton.on('click', function(e) {
    e.preventDefault(); // Prevent default button behavior
    if (currentSlide > 0) {
      currentSlide--;
      updateCarousel();
    }
    return false; // Prevent event bubbling
  });

  // Handle pagination dots click
  $dots.on('click', function() {
    const slideIndex = $(this).data('slide');
    if (slideIndex >= 0 && slideIndex <= totalSlides) {
      currentSlide = slideIndex;
      updateCarousel();
    }
  });

  // Handle mobile navigation pills click
  $('.featured-topics-mobile-nav .nav-pill').on('click', function() {
    const slideIndex = $(this).data('slide');
    if (slideIndex >= 0 && slideIndex < $topics.length) {
      currentSlide = slideIndex;
      updateCarousel();
    }
  });

  // Add touch event handlers for mobile swipe
  $wrapper.on('touchstart', function(e) {
    const touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
    startX = touch.pageX;
    startY = touch.pageY;
  });

  $wrapper.on('touchmove', function(e) {
    // Prevent default only if horizontal swipe is detected
    // This allows vertical scrolling to still work
    if (e.originalEvent.touches.length > 0) {
      const touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
      endX = touch.pageX;
      endY = touch.pageY;

      // If horizontal movement is greater than vertical, prevent default
      if (Math.abs(endX - startX) > Math.abs(endY - startY)) {
        e.preventDefault();
      }
    }
  });

  $wrapper.on('touchend', function(e) {
    const touch = e.originalEvent.changedTouches[0];
    endX = touch.pageX;
    endY = touch.pageY;

    // Calculate horizontal distance
    const diffX = endX - startX;

    // If the swipe was significant enough
    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        // Swipe right - go to previous slide
        if (currentSlide > 0) {
          currentSlide--;
          updateCarousel();
        }
      } else {
        // Swipe left - go to next slide
        if (currentSlide < totalSlides) {
          currentSlide++;
          updateCarousel();
        }
      }
    }
  });

  // Update carousel position
  function updateCarousel() {
    let translateX;

    if (isMobile) {
      // For mobile, we need to calculate the exact position to center the current card
      // and show a consistent portion of the next card

      // Calculate card width including gap
      const cardWidth = $topics.first().outerWidth(true);
      const containerWidth = $wrapper.width();

      // Calculate the exact pixel amount to translate
      // This ensures the current card is centered with a consistent peek of the next card
      const pixelTranslate = currentSlide * cardWidth;

      // Convert to percentage for smooth responsive behavior
      translateX = (pixelTranslate / containerWidth) * 100;

      // Apply the transform with a negative value to move left
      $container.css('transform', `translateX(-${translateX}%)`);

      // Update mobile navigation pills - ensure we're targeting the correct pills
      // First find the mobile nav within the current carousel
      const $mobileNav = $carousel.find('.featured-topics-mobile-nav');
      $mobileNav.find('.nav-pill').removeClass('active');
      $mobileNav.find(`.nav-pill[data-slide="${currentSlide}"]`).addClass('active');
    } else {
      // For desktop, calculate the exact position based on card width and gap
      const cardWidth = $topics.first().outerWidth(true);
      const containerWidth = $wrapper.width();
      const gapWidth = parseInt($container.css('gap')) || 16; // Get gap width or default to 16px

      // Calculate the exact pixel amount to translate
      // This ensures proper scrolling on desktop
      const pixelTranslate = currentSlide * (cardWidth + gapWidth);

      // Convert to percentage for smooth responsive behavior
      translateX = (pixelTranslate / containerWidth) * 100;

      // Apply the transform with a negative value to move left
      $container.css('transform', `translateX(-${translateX}%)`);
    }

    // Update button states
    $prevButton.toggleClass('disabled', currentSlide === 0);
    $nextButton.toggleClass('disabled', currentSlide === totalSlides);

    // Update pagination dots
    $dots.removeClass('active');
    $dots.eq(currentSlide).addClass('active');
  }

  // Handle window resize with debounce for better performance
  let resizeTimer;
  $(window).on('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      const wasIsMobile = isMobile;
      isMobile = window.innerWidth < 768;
      const newVisibleCards = isMobile ? 1 : (window.innerWidth < 992 ? 2 : 3);

      // Toggle mobile class
      $container.toggleClass('mobile-view', isMobile);

      // If switching between mobile and desktop view, or changing visible cards count
      if (wasIsMobile !== isMobile || newVisibleCards !== visibleCards) {
        visibleCards = newVisibleCards;
        totalSlides = Math.max(0, $topics.length - visibleCards);

        // Reset carousel position
        currentSlide = 0;
        updateCarousel();
      } else {
        // Just update the carousel with the new dimensions
        // This ensures proper positioning even if just the window width changes
        updateCarousel();
      }
    }, 150); // Small delay to avoid excessive calculations during resize
  });

  // Initialize the carousel
  updateCarousel();
}
