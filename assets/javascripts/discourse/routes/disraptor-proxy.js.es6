import DiscourseURL from 'discourse/lib/url';

/**
 * This is the “disraptor-proxy” route.
 */
export default Discourse.Route.extend({
  /**
   * Retrieves the Disraptor document with an asynchronous request to the transition URL.
   *
   * @param {Object} params
   * @param {any} transition
   * @returns {any | Promise<any>}
   */
  model(params, transition) {
    // This is used to remove some Discourse styles from the main content area when serving a
    // Disraptor document.
    if (!document.documentElement.classList.contains('disraptor-page')) {
      document.documentElement.classList.add('disraptor-page');
    }

    if (this.siteSettings.disraptor_shadow_dom) {
      console.info('Disraptor: Using experimental shadow DOM document embedding.');
    }

    return fetch(transition.intent.url)
      .then(response => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        return response.text();
      })
      .then(responseBody => {
        if (!this.siteSettings.disraptor_shadow_dom) {
          injectHeadContent(responseBody);
        }

        return this.getDocumentHostNode(responseBody);
      })
      .catch((error) => {
        console.error(error);
        this.leaveDisraptor();
        return this.transitionTo('exception-unknown');
      });
  },

  /**
   * Injects the Disraptor document.
   *
   * @param {String} responseBody the complete markup of the Disraptor document
   * @returns {HTMLElement | String} the Disraptor document (either as markup or a document
   * fragment)
   */
  getDocumentHostNode(responseBody) {
    if (this.siteSettings.disraptor_shadow_dom) {
      const doc = new DOMParser().parseFromString(responseBody, 'text/html');

      const documentHostNode = document.createElement('div');
      documentHostNode.classList.add('disraptor-content');
      this.disraptorRoot = documentHostNode.attachShadow({ mode: 'open' });
      this.disraptorRoot.appendChild(doc.documentElement);
      return documentHostNode;
    }

    const bodyContent = extractTagContent('body', responseBody);
    return `<div class="disraptor-content">${bodyContent}</div>`;
  },

  renderTemplate() {
    this.render('disraptor-proxy');

    Ember.run.scheduleOnce('afterRender', () => {
      if (this.siteSettings.disraptor_shadow_dom) {
        this.disraptorRoot.host.addEventListener('click', interceptClick);
      } else {
        this.disraptorRoot = document.querySelector('.disraptor-content');
      }

      const forms = this.disraptorRoot.querySelectorAll('form');
      forms.forEach(form => {
        if (form.method.toLowerCase() === 'post') {
          form.addEventListener('submit', performPostRequest.bind(this));
        }
      });
    });
  },

  actions: {
    /**
     * See [emberjs.com: Route events: willTransition][1].
     *
     * [1]: https://www.emberjs.com/api/ember/3.5/classes/Route/events/willTransition?anchor=willTransition
     *
     * @param {any} transition
     */
    willTransition(transition) {
      if (!transition.targetName.startsWith('disraptor-proxy')) {
        this.leaveDisraptor();
      }
    }
  },

  /**
   * Cleans up when leaving a Disraptor route.
   */
  leaveDisraptor() {
    document.documentElement.classList.remove('disraptor-page');

    if (!this.siteSettings.disraptor_shadow_dom) {
      const injectedElements = document.querySelectorAll('[data-disraptor-tag]');
      injectedElements.forEach(element => {
        element.remove();
      });
    }
  }
});

/**
 * Workaround for [shadow tree navigation not using Ember’s router][1].
 *
 * [1]: https://meta.discourse.org/t/shadow-tree-navigation-doesn-t-go-through-ember-router/103712
 *
 * @param {MouseEvent} event
 */
function interceptClick(event) {
  for (const target of event.composedPath()) {
    if (target.tagName === 'A' && target.href !== '' && !target.href.startsWith('#')) {
      event.preventDefault();
      DiscourseURL.routeTo(target.href);
      return;
    }
  }
}

/**
 * Injects `link`, `style`, and `script` tags in Discourse’s `head` element.
 *
 * @param {String} responseBody the complete markup of the Disraptor document
 */
function injectHeadContent(responseBody) {
  const headContent = extractTagContent('head', responseBody);

  injectTagsIntoHead(headContent, 'link');
  injectTagsIntoHead(headContent, 'style');

  // Special case for scripts. Weird.
  const scriptTags = extractTags(headContent, 'script');
  for (const scriptTag of scriptTags) {
    injectScriptIntoHead(scriptTag.src);
  }
}

/**
 * Extracts the content of a certain HTML element within a string of HTML.
 *
 * @param {String} tagName
 * @param {String} htmlContent
 * @returns {String}
 */
function extractTagContent(tagName, htmlContent) {
  const openTagEndPos = htmlContent.indexOf('>', htmlContent.indexOf(`<${tagName}`));
  const closeTagBeginPos = htmlContent.indexOf(`</${tagName}`);
  return htmlContent.substring(openTagEndPos + 1, closeTagBeginPos);
}

function injectTagsIntoHead(headContent, tagName) {
  const tags = extractTags(headContent, tagName);
  for (const tag of tags) {
    tag.setAttribute('data-disraptor-tag', '');
    document.head.insertAdjacentElement('beforeend', tag);
  }
}

/**
 * Extracts all `Element`s from a string of the HTMLHeadElement.
 *
 * @param {String} headContent
 * @param {'script'|'link'} tagName
 * @returns {Array<Element>}
 */
function extractTags(headContent, tagName) {
  // Use a <template> element to parse a DOM fragment
  const headTemplate = document.createElement('template');
  headTemplate.insertAdjacentHTML('beforeend', headContent);
  return Array.from(headTemplate.children).filter(el => el.tagName === tagName.toUpperCase());
}

/**
 * Based on [html5rocks.com: Deep dive into the murky waters of script loading][1] by Jake
 * Archibald.
 *
 * [1]: https://www.html5rocks.com/en/tutorials/speed/script-loading/
 *
 * @param {String} src
 */
function injectScriptIntoHead(src) {
  const script = document.createElement('script');
  script.async = false;
  script.src = src;
  script.setAttribute('data-disraptor-tag', '');
  document.head.insertAdjacentElement('beforeend', script);
}

/**
 * Handles submit events that are about to perform a POST request.
 *
 * This is necessary for a Disraptor document to be rendered inside a Discourse document. A regular
 * request would load the Disraptor document in the response as a stand-alone document.
 *
 * @param {Event} event
 */
function performPostRequest(event) {
  // Prevent the default action of sending a regular POST request.
  event.preventDefault();

  const form = event.target;

  const fetchInit = {
    method: 'post',
    headers: {
      'Content-Type': `${form.enctype}; charset=utf-8`
    },
    body: constructRequestBody(form)
  };

  fetch(form.action, fetchInit)
    .then(response => {
      if (response.headers.has('X-Disraptor-Location')) {
        this.transitionTo(response.headers.get('X-Disraptor-Location'));
      }
    })
    .catch(console.error);
}

/**
 * Encodes a form’s data for a POST request’s body.
 *
 * Supported encoding types:
 *
 * - `application/x-www-form-urlencoded`
 * - `multipart/form-data`
 *
 * @param {HTMLFormElement} form
 * @returns {FormData|URLSearchParams}
 */
function constructRequestBody(form) {
  const formData = new FormData(form);

  if (form.enctype === 'multipart/form-data') {
    return formData;
  }

  return new URLSearchParams(formData);
}
