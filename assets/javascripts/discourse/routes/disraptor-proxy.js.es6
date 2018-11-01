import { ajax } from 'discourse/lib/ajax';

/**
 * This is the “disraptor-proxy” route.
 */
export default Discourse.Route.extend({
  disraptorDocument: '',

  /**
   * Send an AJAX request for the current path to the server to retrieve a Disraptor document for
   * the current route.
   */
  beforeModel(transition) {
    console.log(this.routeName, '#beforeModel');

    // This is used to remove some Discourse styles from the main content area when serving a
    // Disraptor document.
    if (!document.documentElement.classList.contains('disraptor-page')) {
      document.documentElement.classList.add('disraptor-page');
    }

    // Load the Disraptor document
    return ajax(transition.intent.url, { dataType: 'html' })
      .then(result => {
        this.initContent(result);
      })
      .catch(console.error);
  },

  initContent(result) {
    const headContent = this.extractTagContent('head', result);

    this.injectTags(headContent, 'link');
    this.injectTags(headContent, 'style');

    // Special case for scripts. Weird.
    const scriptTags = this.extractTags(headContent, 'script');
    for (const scriptTag of scriptTags) {
      injectScript(scriptTag);
    }

    const bodyContent = this.extractTagContent('body', result);
    this.set('disraptorDocument', bodyContent);
  },

  injectTags(headContent, tagName) {
    const tags = this.extractTags(headContent, tagName);
    for (const tag of tags) {
      tag.setAttribute(`data-disraptor-${tagName}`, '');
      document.head.insertAdjacentElement('beforeend', tag);
    }
  },

  /**
   * Extracts all `Element`s from a string of the HTMLHeadElement.
   *
   * @param {String} headContent
   * @param {'script'|'link'} tagName
   * @returns {Array<Element>}
   */
  extractTags(headContent, tagName) {
    // Use a <template> element to parse a DOM fragment
    const headTemplate = document.createElement('template');
    headTemplate.insertAdjacentHTML('beforeend', headContent);
    return Array.from(headTemplate.children).filter(el => el.tagName === tagName.toUpperCase());
  },

  model() {
    return {
      disraptorDocument: this.get('disraptorDocument')
    };
  },

  renderTemplate() {
    this.render('disraptor-proxy');
  },

  /**
   * Extracts the content of a certain HTML element within a string of HTML.
   *
   * @param {String} tagName
   * @param {String} htmlContent
   * @returns {String}
   */
  extractTagContent(tagName, htmlContent) {
    const openTagEndPos = htmlContent.indexOf('>', htmlContent.indexOf(`<${tagName}`));
    const closeTagBeginPos = htmlContent.indexOf(`</${tagName}`);
    return htmlContent.substring(openTagEndPos + 1, closeTagBeginPos);
  },

  actions: {
    willTransition(transition) {
      console.log(this.routeName, '#willTransition');

      this.set('disraptorDocument', '');

      if (!transition.targetName.startsWith('disraptor-proxy')) {
        document.documentElement.classList.remove('disraptor-page');
      }

      const injectedElements = document.querySelectorAll(
        '[data-disraptor-link], [data-disraptor-script], [data-disraptor-style]'
      );

      injectedElements.forEach(element => {
        element.remove();
      });
    }
  },
});

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
  script.setAttribute('data-disraptor-script', '');
  document.head.insertAdjacentElement('beforeend', script);
}
