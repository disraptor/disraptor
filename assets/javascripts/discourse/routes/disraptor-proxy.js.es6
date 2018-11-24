import { ajax } from 'discourse/lib/ajax';

/**
 * This is the “disraptor-proxy” route.
 */
export default Discourse.Route.extend({
  /**
   * Retrieves the model with an asynchronous request to the transition URL.
   */
  model(params, transition) {
    // This is used to remove some Discourse styles from the main content area when serving a
    // Disraptor document.
    if (!document.documentElement.classList.contains('disraptor-page')) {
      document.documentElement.classList.add('disraptor-page');
    }

    const headers = {
      'Content-Type': 'text/html'
    };

    const disraptorCookie = localStorage.getItem('disraptor-set-cookie');

    if (disraptorCookie !== null) {
      headers['X-Disraptor-Set-Cookie'] = disraptorCookie;
    }

    return fetch(transition.intent.url, { headers })
      .then(response => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        return response.text();
      })
      .then(responseBody => {
        injectHeadContent(responseBody);

        return {
          disraptorDocument: extractTagContent('body', responseBody)
        };
      })
      .catch(() => this.transitionTo('exception-unknown'));
  },

  renderTemplate() {
    this.render('disraptor-proxy');

    Ember.run.scheduleOnce('afterRender', () => {
      const disraptorRoot = document.querySelector('.disraptor-content');
      const forms = disraptorRoot.querySelectorAll('form');

      forms.forEach(form => {
        if (form.method.toLowerCase() === 'post') {
          form.addEventListener('submit', performPostRequest.bind(this));
        }
      });
    });
  },

  actions: {
    willTransition(transition) {
      if (!transition.targetName.startsWith('disraptor-proxy')) {
        document.documentElement.classList.remove('disraptor-page');
      }

      const injectedElements = document.querySelectorAll('[data-disraptor-tag]');
      injectedElements.forEach(element => {
        element.remove();
      });
    }
  },
});

function injectHeadContent(responseBody) {
  const headContent = extractTagContent('head', responseBody);

  injectTags(headContent, 'link');
  injectTags(headContent, 'style');

  // Special case for scripts. Weird.
  const scriptTags = extractTags(headContent, 'script');
  for (const scriptTag of scriptTags) {
    injectScript(scriptTag.src);
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

function injectTags(headContent, tagName) {
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
function injectScript(src) {
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

  fetch(form.action, {
    method: 'post',
    headers: {
      'Content-Type': `${form.enctype}; charset=UTF-8`
    },
    body: constructRequestBody(form)
  })
    .then(response => {
      // Store the disraptor cookie to pass on to the server on subsequent XHR requests.
      const disraptorCookie = response.headers.get('x-disraptor-set-cookie');
      localStorage.setItem('disraptor-set-cookie', disraptorCookie);

      const location = response.headers.get('x-disraptor-location');
      this.transitionTo(location);
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

  const requestBody = new URLSearchParams();

  for (const [name, value] of formData) {
    requestBody.append(name, value);
  }

  return requestBody;
}
