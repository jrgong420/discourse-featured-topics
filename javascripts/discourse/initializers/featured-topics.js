import { withPluginApi } from "discourse/lib/plugin-api";

// Debug mode - set to false for production, true for development
const DEBUG = false; // Set to false to disable all console logs

// Utility functions to replace jQuery
// DOM selection - single element
const $ = (selector, context = document) => context.querySelector(selector);
// DOM selection - multiple elements
const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
// Create element from HTML string
const createElement = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
};

// Helper function to safely get theme settings with fallback values
function getThemeSetting(api, settingName, defaultValue) {
  try {
    // Check if api and container exist
    if (!api || !api.container) {
      if (DEBUG) console.log(`Featured Topics: API or container not available for setting ${settingName}, using default: ${defaultValue}`);
      return defaultValue;
    }

    // Try to get theme-settings service
    const themeSettings = api.container.lookup("service:theme-settings");
    if (!themeSettings || typeof themeSettings.getObjectForTheme !== "function") {
      if (DEBUG) console.log(`Featured Topics: Theme settings service not available for setting ${settingName}, using default: ${defaultValue}`);
      return defaultValue;
    }

    // Try to get current theme ID
    const themeId = api.getCurrentThemeId && api.getCurrentThemeId();
    if (!themeId) {
      if (DEBUG) console.log(`Featured Topics: Theme ID not available for setting ${settingName}, using default: ${defaultValue}`);
      return defaultValue;
    }

    // Try to get theme settings object
    const settings = themeSettings.getObjectForTheme(themeId);
    if (!settings) {
      if (DEBUG) console.log(`Featured Topics: Settings object not available for setting ${settingName}, using default: ${defaultValue}`);
      return defaultValue;
    }

    // Return the setting value or default if not found
    return settings[settingName] !== undefined ? settings[settingName] : defaultValue;
  } catch (error) {
    if (DEBUG) console.error(`Featured Topics: Error getting theme setting ${settingName}:`, error);
    return defaultValue;
  }
}

export default {
  name: "featured-topics",
  initialize(container) {
    withPluginApi("1.14.0", (api) => {
      // Function to initialize on both page load and page change
      const initOnPage = () => {
        // Get the current URL path
        const currentPath = window.location.pathname;

        // Get settings with fallback values
        const showOn = getThemeSetting(api, "show_on", "homepage");

        // Check if we're on a topic page
        const isTopicPage = currentPath.includes("/t/");

        // Remove existing component if we're on a topic page
        if (isTopicPage) {
          const existingComponent = document.querySelector(".featured-topics-container");
          if (existingComponent) {
            existingComponent.remove();
            if (DEBUG) console.log("Featured Topics: Removed on topic page");
          }
          return;
        }

        // Determine if we should show the component based on settings
        let shouldShow = false;

        if (showOn === "everywhere") {
          shouldShow = true;
        } else if (showOn === "homepage" && currentPath === "/") {
          shouldShow = true;
        } else if (showOn === "latest" && currentPath === "/latest") {
          shouldShow = true;
        } else if (showOn === "top-menu" && (currentPath === "/" || currentPath === "/latest")) {
          shouldShow = true;
        } else if (showOn === "categories" && currentPath === "/categories") {
          shouldShow = true;
        } else if (showOn === "top" && currentPath.startsWith("/top")) {
          shouldShow = true;
        }

        if (shouldShow) {
          if (DEBUG) console.log("Featured Topics: Initializing");

          // Initialize the component with a short delay to ensure DOM is ready
          setTimeout(() => initFeaturedTopicsComponent(api), 200);
        } else {
          // Remove component if it exists but shouldn't be shown
          const existingComponent = document.querySelector(".featured-topics-container");
          if (existingComponent) {
            existingComponent.remove();
            if (DEBUG) console.log("Featured Topics: Removed based on settings");
          }
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
  if (document.querySelector(".featured-topics-container")) {
    if (DEBUG) console.log("Featured Topics: Component already exists");
    return;
  }

  // Get the preferred outlet from settings with fallback value
  const preferredOutlet = getThemeSetting(api, "plugin_outlet", "above-main-container");

  if (DEBUG) console.log(`Featured Topics: Preferred outlet from settings: "${preferredOutlet}"`);

  // Prioritized list of outlet selectors to try
  let outletSelectors = [];

  // First add the preferred outlet from settings
  if (preferredOutlet === "discovery-list-container-top") {
    outletSelectors.push(".discovery-list-container-top");
    outletSelectors.push(".plugin-outlet[data-outlet='discovery-list-container-top']");
  } else if (preferredOutlet === "discovery-above") {
    outletSelectors.push(".discovery-above");
    outletSelectors.push(".plugin-outlet[data-outlet='discovery-above']");
  } else if (preferredOutlet === "above-main-container") {
    outletSelectors.push(".above-main-container");
  }

  // Then add fallback outlets in case the preferred one isn't found
  outletSelectors = outletSelectors.concat([
    // Fallback outlets
    ".discovery-list-container-top",
    ".discovery-above",
    ".above-main-container",
    ".plugin-outlet[data-outlet='discovery-list-container-top']",
    ".plugin-outlet[data-outlet='discovery-above']"
  ]);

  // Remove duplicates from the array
  outletSelectors = [...new Set(outletSelectors)];

  // Try to find a suitable outlet
  let outlet = null;

  // First check if main-outlet exists as our fallback
  const mainContent = document.getElementById("main-outlet");
  const mainOutletExists = !!mainContent;

  // Try each outlet selector
  for (const selector of outletSelectors) {
    const currentOutlet = document.querySelector(selector);
    if (currentOutlet && !currentOutlet.querySelector(".featured-topics-container")) {
      outlet = currentOutlet;
      if (DEBUG) console.log(`Featured Topics: Using outlet "${selector}"`);
      break;
    }
  }

  // If we found an outlet, use it
  if (outlet) {
    initFeaturedTopics(api, outlet);
  }
  // Otherwise use main-outlet as fallback if it exists
  else if (mainOutletExists) {
    if (DEBUG) console.log("Featured Topics: Using #main-outlet as fallback");
    initFeaturedTopics(api, mainContent, true);
  }
  // If even main-outlet doesn't exist, we can't proceed
  else {
    console.warn("Featured Topics: Could not find any suitable location");
  }
}

function initFeaturedTopics(api, outlet, prependToOutlet = false) {
  if (DEBUG) console.log("Featured Topics: Creating component");

  if (!outlet) {
    return;
  }

  if (outlet.querySelector(".featured-topics-container")) {
    return;
  }

  // Create container
  const container = createElement("<div class='featured-topics-container'></div>");

  // Either prepend or append based on the parameter
  if (prependToOutlet) {
    outlet.prepend(container);
  } else {
    outlet.appendChild(container);
  }

  // Add loading indicator
  container.innerHTML = "<div class='featured-topics-loading'>Loading featured topics...</div>";

  // Try to get topics using the store
  fetchTopics(api, container);
}

// Separate function to fetch topics
function fetchTopics(api, container) {
  // Get max topic count from settings with fallback value
  const maxTopicCount = getThemeSetting(api, "max_topic_count", 4);
  const featuredTags = getThemeSetting(api, "featured_tags", ["featured"]);

  // Ensure featuredTags is an array
  const tagsArray = Array.isArray(featuredTags) ? featuredTags :
                   (typeof featuredTags === "string" ? [featuredTags] : ["featured"]);

  // First try to use the store if available
  if (api && api.container) {
    try {
      const store = api.container.lookup("service:store");

      if (store && typeof store.findFiltered === "function") {
        // Fetch topics with the featured tags
        store.findFiltered("topicList", {
          filter: "latest",
          params: {
            tags: tagsArray
          }
        }).then(topicList => {
          if (topicList && topicList.topics && topicList.topics.length > 0) {
            // Randomize and limit topics
            let topics = shuffle(topicList.topics);
            topics = topics.slice(0, maxTopicCount); // Limit to max_topic_count

            renderFeaturedTopics(container, topics);
          } else {
            // Fallback to sample topics
            renderSampleTopics(container);
          }
        }).catch(error => {
          if (DEBUG) console.error("Featured Topics: Error fetching topics", error);
          // Fallback to sample topics
          renderSampleTopics(container);
        });

        return;
      } else {
        if (DEBUG) console.log("Featured Topics: Store or findFiltered method not available");
      }
    } catch (error) {
      if (DEBUG) console.error("Featured Topics: Error using store", error);
    }
  } else {
    if (DEBUG) console.log("Featured Topics: API container not available for store lookup");
  }

  // Fallback to fetch API if store is not available
  // Use the maxTopicCount variable that was already defined above

  fetch("/latest.json")
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data && data.topic_list && data.topic_list.topics && data.topic_list.topics.length > 0) {
        // Use topics up to the max_topic_count setting
        const topics = data.topic_list.topics.slice(0, maxTopicCount);
        renderFeaturedTopics(container, topics);
      } else {
        renderSampleTopics(container);
      }
    })
    .catch(error => {
      if (DEBUG) console.error("Featured Topics: AJAX error", error);
      renderSampleTopics(container);
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
function renderSampleTopics(container) {
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

  // Render the sample topics (limited to 4 for sample data)
  renderFeaturedTopics(container, sampleTopics);
}

function renderFeaturedTopics(container, topics) {
  // Clear container
  container.innerHTML = '';

  // Create header
  const header = createElement("<div class='featured-topics-header'><h2>Featured Topics</h2></div>");
  container.appendChild(header);

  // Create carousel container
  const carousel = createElement("<div class='featured-topics-carousel'></div>");
  container.appendChild(carousel);

  // Create navigation buttons with SVG icons to ensure they always display
  const prevButton = createElement("<button class='featured-topics-nav-prev' aria-label='Previous slide'><svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='15 18 9 12 15 6'></polyline></svg></button>");
  const nextButton = createElement("<button class='featured-topics-nav-next' aria-label='Next slide'><svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='9 18 15 12 9 6'></polyline></svg></button>");

  if (topics.length > 3) {
    carousel.appendChild(prevButton);
    carousel.appendChild(nextButton);
  }

  // Create topics wrapper
  const topicsWrapper = createElement("<div class='featured-topics-wrapper'></div>");
  carousel.appendChild(topicsWrapper);

  // Create topics container with a class to indicate it's a flex container
  const topicsContainer = createElement("<div class='featured-topics-items'></div>");
  topicsWrapper.appendChild(topicsContainer);

  // Add topics
  topics.forEach(topic => {
    try {
      const topicCard = createTopicCard(topic);
      topicsContainer.appendChild(topicCard);
    } catch (error) {
      if (DEBUG) console.error("Featured Topics: Error creating topic card", error);
    }
  });

  // Add combined pagination dots for both desktop and mobile
  if (topics.length > 1) {
    const mobileNav = createElement("<div class='featured-topics-mobile-nav'></div>");

    // Add pills for each topic
    topics.forEach((_, index) => {
      const pill = createElement(`<div class='nav-pill ${index === 0 ? "active" : ""}' data-slide='${index}'></div>`);
      mobileNav.appendChild(pill);
    });

    // Append to the carousel container after all topics
    carousel.appendChild(mobileNav);

    if (DEBUG) console.log("Featured Topics: Added navigation pills");
  }

  // Initialize carousel
  try {
    initCarousel(carousel);
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
  const topicCard = createElement("<div class='featured-topics-topic'></div>");

  // Add thumbnail if available
  if (topic.image_url) {
    // Clean up the image URL to ensure it's properly formatted
    const cleanImageUrl = topic.image_url.trim();

    const thumbnail = createElement(`
      <div class='featured-topics-topic-thumbnail'>
        <img src='${cleanImageUrl}' alt='${topic.title}' loading='lazy' onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'200\\' viewBox=\\'0 0 300 200\\'%3E%3Crect width=\\'300\\' height=\\'200\\' fill=\\'%23eee\\' /%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' font-family=\\'Arial\\' font-size=\\'14\\' text-anchor=\\'middle\\' fill=\\'%23999\\' dominant-baseline=\\'middle\\'%3EImage not available%3C/text%3E%3C/svg%3E';">
        <div class='featured-topics-topic-overlay'></div>
      </div>
    `);
    topicCard.appendChild(thumbnail);
  } else {
    // Add a placeholder if no image is available
    const placeholder = createElement(`
      <div class='featured-topics-topic-thumbnail placeholder'>
        <div class='featured-topics-topic-placeholder'></div>
        <div class='featured-topics-topic-overlay'></div>
      </div>
    `);
    topicCard.appendChild(placeholder);
  }

  // Add topic details
  const details = createElement("<div class='featured-topics-topic-details'></div>");
  topicCard.appendChild(details);

  // Add title
  const title = createElement(`<h3 class='featured-topics-topic-title'>${topic.title}</h3>`);
  details.appendChild(title);

  // Add excerpt if available
  if (topic.excerpt) {
    // Remove any HTML tags from the excerpt
    const cleanExcerpt = topic.excerpt.replace(/<\/?[^>]+(>|$)/g, "");
    const excerpt = createElement(`<div class='featured-topics-topic-excerpt'>${cleanExcerpt}</div>`);
    details.appendChild(excerpt);
  }

  // Add CTA buttons
  const buttons = createElement("<div class='featured-topics-cta-buttons'></div>");
  details.appendChild(buttons);

  // Add featured link button if available
  if (hasFeaturedLink) {
    const featuredButton = createElement(`<a href='${featuredLinkUrl}' class='featured-topics-cta-button primary' target='_blank' rel='noopener'>Visit Link</a>`);
    buttons.appendChild(featuredButton);
  }

  // Add topic link button
  const topicButton = createElement(`<a href='${topicUrl}' class='featured-topics-cta-button ${hasFeaturedLink ? "secondary" : "primary"}'>Read Topic</a>`);
  buttons.appendChild(topicButton);

  // Add full topic link
  const fullLink = createElement(`<a href='${topicUrl}' class='featured-topics-topic-link' aria-hidden='true' tabindex='-1'></a>`);
  topicCard.appendChild(fullLink);

  return topicCard;
}

function initCarousel(carousel) {
  const wrapper = carousel.querySelector('.featured-topics-wrapper');
  const container = carousel.querySelector('.featured-topics-items');
  const topics = Array.from(container.querySelectorAll('.featured-topics-topic'));
  const prevButton = carousel.querySelector('.featured-topics-nav-prev');
  const nextButton = carousel.querySelector('.featured-topics-nav-next');
  const mobileNav = carousel.querySelector('.featured-topics-mobile-nav');
  const pills = mobileNav ? Array.from(mobileNav.querySelectorAll('.nav-pill')) : [];

  let currentSlide = 0;
  let startX, startY, endX, endY, threshold = 50;
  let isMobile = window.innerWidth < 768;
  let visibleCards = isMobile ? 1 : (window.innerWidth < 992 ? 2 : 3);
  // Allow scrolling through all cards individually by setting totalSlides to topics.length - 1
  let totalSlides = Math.max(0, topics.length - 1);

  // Add mobile-specific class to container if on mobile
  if (isMobile) {
    container.classList.add('mobile-view');

    // Ensure proper display on mobile by forcing a reflow
    setTimeout(() => {
      container.style.display = 'flex';
      topics.forEach(topic => {
        topic.style.display = 'flex';
      });

      // Force browser to recalculate layout
      wrapper.offsetHeight;
    }, 50);
  }

  // Add keyboard navigation support
  carousel.setAttribute('tabindex', '0'); // Make the carousel focusable

  // Add mouse drag scrolling support for desktop - improved version
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragThreshold = 50; // Minimum drag distance to trigger slide change
  let isHorizontalDrag = false;
  let dragStartTime = 0;

  // Use mousedown/up on the wrapper but track movement on document
  // This allows the drag to continue even if the mouse leaves the carousel
  wrapper.addEventListener('mousedown', function(e) {
    // Only handle left mouse button
    if (e.button !== 0) return;

    // Store initial position and time
    isDragging = true;
    dragStartX = e.pageX;
    dragStartY = e.pageY;
    dragStartTime = Date.now();
    isHorizontalDrag = false; // Reset direction detection

    // Change cursor to indicate grabbing
    wrapper.style.cursor = 'grabbing';

    // Prevent text selection during drag
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;

    // Calculate distance moved
    const dragDistanceX = e.pageX - dragStartX;
    const dragDistanceY = e.pageY - dragStartY;

    // Determine if this is primarily a horizontal drag
    // Only do this once per drag operation
    if (!isHorizontalDrag && (Math.abs(dragDistanceX) > 10 || Math.abs(dragDistanceY) > 10)) {
      isHorizontalDrag = Math.abs(dragDistanceX) > Math.abs(dragDistanceY);
    }

    // If this is a horizontal drag, prevent default to avoid text selection
    // and other browser behaviors
    if (isHorizontalDrag) {
      e.preventDefault();
    }
  });

  document.addEventListener('mouseup', function(e) {
    if (!isDragging) return;

    // Calculate distance and time
    const dragDistanceX = e.pageX - dragStartX;
    const dragTime = Date.now() - dragStartTime;

    // Calculate velocity (pixels per millisecond)
    const velocity = Math.abs(dragDistanceX) / dragTime;

    // Adjust threshold based on velocity - faster flicks can be shorter
    const adjustedThreshold = velocity > 0.5 ? dragThreshold * 0.7 : dragThreshold;

    // If dragged far enough and it's primarily a horizontal drag, change slide
    if (isHorizontalDrag && Math.abs(dragDistanceX) > adjustedThreshold) {
      if (dragDistanceX > 0) {
        // Dragged right - go to previous slide
        if (currentSlide > 0) {
          currentSlide--;
        } else {
          currentSlide = totalSlides;
        }
      } else {
        // Dragged left - go to next slide
        if (currentSlide < totalSlides) {
          currentSlide++;
        } else {
          currentSlide = 0;
        }
      }
      updateCarousel();
    }

    // Reset drag state
    isDragging = false;
    wrapper.style.cursor = 'grab';
  });

  // Handle case where mouse leaves the document or window loses focus
  document.addEventListener('mouseleave', function() {
    if (isDragging) {
      isDragging = false;
      wrapper.style.cursor = 'grab';
    }
  });

  document.addEventListener('blur', function() {
    if (isDragging) {
      isDragging = false;
      wrapper.style.cursor = 'grab';
    }
  });

  carousel.addEventListener('keydown', function(e) {
    // Left arrow key - go to previous slide
    if (e.keyCode === 37) {
      if (currentSlide > 0) {
        currentSlide--;
      } else {
        // At the first slide - loop to the last slide
        currentSlide = totalSlides;
      }
      updateCarousel();
    }
    // Right arrow key - go to next slide
    else if (e.keyCode === 39) {
      if (currentSlide < totalSlides) {
        currentSlide++;
      } else {
        // At the last slide - loop back to the first slide
        currentSlide = 0;
      }
      updateCarousel();
    }
  });

  // Handle next button click with circular navigation
  if (nextButton) {
    nextButton.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent default button behavior

      if (currentSlide < totalSlides) {
        // Normal case - go to next slide
        currentSlide++;
      } else {
        // At the last slide - loop back to the first slide
        currentSlide = 0;
      }

      updateCarousel();
      return false; // Prevent event bubbling
    });
  }

  // Handle prev button click with circular navigation
  if (prevButton) {
    prevButton.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent default button behavior

      if (currentSlide > 0) {
        // Normal case - go to previous slide
        currentSlide--;
      } else {
        // At the first slide - loop to the last slide
        currentSlide = totalSlides;
      }

      updateCarousel();
      return false; // Prevent event bubbling
    });
  }

  // Handle navigation pills click
  if (pills.length > 0) {
    pills.forEach(pill => {
      pill.addEventListener('click', function() {
        const slideIndex = parseInt(this.getAttribute('data-slide'), 10);
        if (slideIndex >= 0 && slideIndex < topics.length) {
          currentSlide = slideIndex;
          updateCarousel();
        }
      });
    });
  }

  // Add touch event handlers for mobile swipe
  wrapper.addEventListener('touchstart', function(e) {
    const touch = e.touches[0] || e.changedTouches[0];
    startX = touch.pageX;
    startY = touch.pageY;
  });

  wrapper.addEventListener('touchmove', function(e) {
    // Prevent default only if horizontal swipe is detected
    // This allows vertical scrolling to still work
    if (e.touches.length > 0) {
      const touch = e.touches[0] || e.changedTouches[0];
      endX = touch.pageX;
      endY = touch.pageY;

      // If horizontal movement is greater than vertical, prevent default
      if (Math.abs(endX - startX) > Math.abs(endY - startY)) {
        e.preventDefault();
      }
    }
  });

  wrapper.addEventListener('touchend', function(e) {
    const touch = e.changedTouches[0];
    endX = touch.pageX;
    endY = touch.pageY;

    // Calculate horizontal distance
    const diffX = endX - startX;

    // If the swipe was significant enough
    if (Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        // Swipe right - go to previous slide with circular navigation
        if (currentSlide > 0) {
          currentSlide--;
        } else {
          // At the first slide - loop to the last slide
          currentSlide = totalSlides;
        }
        updateCarousel();
      } else {
        // Swipe left - go to next slide with circular navigation
        if (currentSlide < totalSlides) {
          currentSlide++;
        } else {
          // At the last slide - loop back to the first slide
          currentSlide = 0;
        }
        updateCarousel();
      }
    }
  });

  // Add mouse wheel / trackpad horizontal scrolling support - completely redesigned for macOS
  let isScrolling = false;
  let scrollTimeout;
  let lastScrollTime = 0;

  wrapper.addEventListener('wheel', function(e) {
    // Always prevent default to avoid page scrolling
    e.preventDefault();

    // Get current time for throttling
    const now = Date.now();

    // Throttle events to avoid rapid firing
    if (now - lastScrollTime < 100) {
      return false;
    }

    lastScrollTime = now;

    // Get the delta X (horizontal scroll) and delta Y (vertical scroll)
    const deltaX = e.deltaX;
    const deltaY = e.deltaY;

    // Determine scroll direction based on the larger delta
    // For macOS, we need to consider both deltaX and deltaY
    let direction = null;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      // If horizontal scrolling is more significant or there's a clear horizontal intent
      if (Math.abs(deltaX) > Math.abs(deltaY) * 0.5) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        // For vertical scrolling, treat down as right and up as left
        direction = deltaY > 0 ? 'right' : 'left';
      }
    }

    // If we have a direction and we're not already scrolling
    if (direction && !isScrolling) {
      isScrolling = true;

      // Clear any existing timeout
      clearTimeout(scrollTimeout);

      // Perform the slide change
      if (direction === 'right') {
        // Go to next slide with circular navigation
        if (currentSlide < totalSlides) {
          currentSlide++;
        } else {
          currentSlide = 0;
        }
      } else {
        // Go to previous slide with circular navigation
        if (currentSlide > 0) {
          currentSlide--;
        } else {
          currentSlide = totalSlides;
        }
      }

      // Update the carousel
      updateCarousel();

      // Set a timeout to allow another scroll after a short delay
      scrollTimeout = setTimeout(function() {
        isScrolling = false;
      }, 500);
    }

    return false; // Ensure the event doesn't propagate
  });

  // Update carousel position
  function updateCarousel() {
    // Get the first card's width and the gap between cards
    const cardWidth = topics.length > 0 ? topics[0].offsetWidth : 0;
    const computedStyle = window.getComputedStyle(container);
    const gapWidth = parseInt(computedStyle.gap) || 16; // Get gap width or default to 16px
    const containerWidth = wrapper.offsetWidth;

    // Calculate the total width of each card including its gap
    const cardTotalWidth = cardWidth + gapWidth;

    // Calculate the exact pixel position for the current slide
    const pixelTranslate = (currentSlide * cardTotalWidth);

    if (DEBUG) console.log(`Featured Topics: Slide ${currentSlide}, Card Width: ${cardWidth}px, Gap: ${gapWidth}px, Translate: ${pixelTranslate}px`);

    // Apply the transform with a fixed pixel value instead of percentage
    // This ensures consistent positioning regardless of scroll position
    container.style.transform = `translateX(-${pixelTranslate}px)`;

    // Update navigation pills - handle wrapping around for pill indicators
    if (pills.length > 0) {
      pills.forEach(pill => {
        pill.classList.remove('active');
      });

      // Calculate the active pill index, wrapping around if needed
      const pillIndex = currentSlide % topics.length;
      const activePill = pills[pillIndex];

      if (activePill) {
        activePill.classList.add('active');
      }
    }

    if (DEBUG) console.log(`Featured Topics: Updated navigation to slide ${currentSlide}`);

    // With circular navigation, buttons are always enabled
    if (prevButton) prevButton.classList.remove('disabled');
    if (nextButton) nextButton.classList.remove('disabled');
  }

  // Handle window resize with debounce for better performance
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      const wasIsMobile = isMobile;
      isMobile = window.innerWidth < 768;
      const newVisibleCards = isMobile ? 1 : (window.innerWidth < 992 ? 2 : 3);

      // Toggle mobile class
      if (isMobile) {
        container.classList.add('mobile-view');
      } else {
        container.classList.remove('mobile-view');
      }

      // If switching between mobile and desktop view, or changing visible cards count
      if (wasIsMobile !== isMobile || newVisibleCards !== visibleCards) {
        visibleCards = newVisibleCards;
        // Maintain continuous scrolling by keeping totalSlides as topics.length - 1
        totalSlides = Math.max(0, topics.length - 1);

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
