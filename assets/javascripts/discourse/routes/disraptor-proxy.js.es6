import DiscourseURL from 'discourse/lib/url';
import DiscourseRoute from 'discourse/routes/discourse';
import { defaultHomepage } from 'discourse/lib/utilities';
import { generateRouteId } from '../lib/generate-route-id';

/**
 * This is the “disraptor-proxy” route.
 */
export default DiscourseRoute.extend({
  defaultHomePath: `/${defaultHomepage()}`,
  defaultHomeRoute: `discovery.${defaultHomepage()}`,

  beforeModel(transition) {
    if (transition.intent.url === this.defaultHomePath) {
      if (window.location.pathname === this.defaultHomePath) {
        // This ensures that the Discourse forum is available when the user requests the default
        // homepage.
        this.transitionTo(this.defaultHomeRoute);
      } else {
        /*
        We want to continue serving Discourse’s home page *if* there is no root route configured via Disraptor. Currently, I cannot think of another way than querying the server for whether a route with the key parameters for a root route exists. If such a route doesn’t
        exist (i.e. the end point responds with a status 404), we transition to Discourse’s home
        page.
        */
        const rootRouteId = generateRouteId('get', '/');

        this.store.find('disraptor/route', rootRouteId)
          .then(() => {
            this.enterDisraptorDocument();
          })
          .catch(error => {
            if (error.jqXHR.status === 404) {
              this.transitionTo(this.defaultHomeRoute);
            }
          });
      }
    } else {
      this.enterDisraptorDocument();
    }
  },

  /**
   * Retrieves the Disraptor document with an asynchronous request to the transition URL.
   *
   * @param {Object} params
   * @param {any} transition
   * @returns {any | Promise<any>}
   */
  model(params, transition) {
    const proxyUrl = transition.intent.url === this.defaultHomePath ? '/' : transition.intent.url;
    return fetch(proxyUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `Disraptor: Route ${proxyUrl} reported: ${response.statusText}`
          );
        }
        return response.text();
      })
      .then(responseBody => { 
        if (!this.siteSettings.disraptor_shadow_dom) {
          injectHeadContent(responseBody);
        }
        return this.getDocumentHostNode(responseBody);
      })
      .catch(error => {
        console.error(error);
        this.leaveDisraptorDocument();
        return fetch('/404-body')
          .then(response => response.text());
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
      this.hijackHomepageLinks();
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
        this.leaveDisraptorDocument();
      }
      
      alert("current URL: " + window.location.href + "\ntarget URL: " + transition.intent.url);
      if (window.location.href == transition.intent.url) {
        transition.abort();
        alert("Refreshing via Ember");
        this.refresh();
      }
      
      if (!this.siteSettings.disraptor_shadow_dom) {
        const injectedElements = document.head.querySelectorAll('[data-disraptor-tag]');
        injectedElements.forEach(element => {
          element.remove();
        });
      }
    },

    /**
     * This makes sure that after the DOM is rendered all scripts are executed.
     * By doing so we make sure objects that get changed by javascripts are actually there.
     *
     * See [emberjs.com: Route events: didTransition][1].
     *
     * [1]: https://api.emberjs.com/ember/3.22/classes/Route/events/didTransition?anchor=didTransition
     */
    didTransition() {
      Ember.run.scheduleOnce('afterRender', this, function () {
        const scripts = document.body.querySelectorAll('[data-disraptor-tag]');
        scripts.forEach(script => {
          /*
           * Scripts that have no trouble running have no downtime from this.
           * However, script which have trouble loading due to prerequisites get recalled in a cyclic way.
           */
          timeoutScript(200, script);
        });
      });
    },
  },

  /**
   * This is a hack to work around a conflict between Discourse and Disraptor.
   *
   * Disraptor wants to hijack the root route for its own purposes without affecting the forum
   * routes (like /latest, /top, etc.). Due to the way Discourse’s client-side code treats these
   * routes, navigating between a Disraptor root route and these forum routes becomes a no-op.
   * This piece of code tries to hijack these links in order to attach an event handler that forces
   * a navigation anyway.
   *
   * More details: https://github.com/disraptor/disraptor/issues/3.
   */
  hijackHomepageLinks() {
    // Hijacks all links to the default homepage that are already rendered.
    document.querySelectorAll(`a[href="${this.defaultHomePath}"]`).forEach(link => {
      link.addEventListener('click', () => {
        this.transitionTo(this.defaultHomeRoute);
      });
    });

    // Hijacks all links to the default homepage within Discourse’s hamburger menu once it has been
    // opened. Only when the toggle is activated will the actual menu be rendered.
    const hamburgerMenuToggle = document.getElementById('toggle-hamburger-menu');
    hamburgerMenuToggle.addEventListener('click', () => {
      setTimeout(() => {
        const hamburgerMenu = document.querySelector('.hamburger-panel');

        if (hamburgerMenu === null) {
          return;
        }

        const homePathLinks = hamburgerMenu.querySelectorAll(`a[href="${this.defaultHomePath}"]`);
        homePathLinks.forEach(link => {
          link.addEventListener('click', () => {
            history.pushState(null, document.title, this.defaultHomePath);
            this.transitionTo(this.defaultHomeRoute);
          });
        });
      }, 50);
    });
  },

  /**
   * Setup when entering a Disraptor route.
   */
  enterDisraptorDocument() {
    if (this.siteSettings.disraptor_shadow_dom) {
      console.info('Disraptor: Using experimental shadow DOM document embedding.');

      if (!document.documentElement.classList.contains('disraptor-uses-shadow-dom')) {
        document.documentElement.classList.add('disraptor-uses-shadow-dom');
      }
    }

    // This is used to remove some Discourse styles from the main content area when serving a
    // Disraptor document.
    if (!document.documentElement.classList.contains('disraptor-page')) {
      document.documentElement.classList.add('disraptor-page');
    }
  },

  /**
   * Cleans up when leaving a Disraptor route.
   */
  leaveDisraptorDocument() {
    document.documentElement.classList.remove('disraptor-page', 'disraptor-uses-shadow-dom');
  }
});

/*
 * Allows cyclic reloading of scripts, which prerequisites are not loaded yet.
 * This makes sure every script was executed after some number of seconds.
 *
 * TODO: This may be possible to do better, but current implementation of Ember does not seem to provide an option.
 */
function timeoutScript(t, script) {
  setTimeout(() => {
    try {
      eval(script.innerHTML);
    }
    catch (e) {
      if (e instanceof ReferenceError){
        timeoutScript(t + 200, script);
      }
    }
  }, t);
}

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
  const bodyContent = extractTagContent('body', responseBody);

  injectTagsIntoHead(headContent, 'link');
  injectTagsIntoHead(headContent, 'style');

  // Special case for scripts. Weird.
  const scriptTags = extractTags(headContent, 'script');
  const scriptTagsBody = extractTags(bodyContent, 'script');

  for (const scriptTag of scriptTags) {
    injectScriptIntoHead(scriptTag.src);
  }

  for (const scriptTag of scriptTagsBody) {
    if (scriptTag.src) {
      injectScriptIntoHead(scriptTag.src);
    }
    else {
      injectScriptIntoBody(scriptTag)
    }
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
  return Array.from(headTemplate.getElementsByTagName('*')).filter(el => el.tagName === tagName.toUpperCase());
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
  document.head.insertAdjacentElement("beforeend", script);
}

function injectScriptIntoBody(originalScript) {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = originalScript.text
  script.setAttribute('data-disraptor-tag', '');

  document.body.insertAdjacentElement("beforeend", script);
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
    },
    body: constructRequestBody(form)
  };

  fetch(form.action, fetchInit)
    .then(response => {
      if (response.headers.has('X-Disraptor-Location')) {
        if (window.location.pathname === response.headers.get('X-Disraptor-Location')) {
          window.location.reload();
        } else {
          this.transitionTo(response.headers.get('X-Disraptor-Location'));
        }
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
