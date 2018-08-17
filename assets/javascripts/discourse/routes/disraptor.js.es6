import { ajax } from 'discourse/lib/ajax';

/**
 * Handles routing for Disraptor documents.
 */
export default Discourse.Route.extend({
  disraptorDocument: '',

  /**
   * Send an AJAX request for the current path to the server to retrieve a Disraptor document for
   * the current route.
   */
  beforeModel(transition) {
    // This is used to remove some Discourse styles from the main content area when serving a
    // Disraptor document.
    document.documentElement.classList.add('disraptor-page');

    // Load the Disraptor document
    return ajax(transition.intent.url, { dataType: 'html' })
      .then(result => {
        this.injectLinkTags(result);
        this.injectScriptTags(result);

        const bodyContent = this.extractTagContent('body', result);
        this.set('disraptorDocument', bodyContent);
      })
      .catch(console.error);
  },

  model() {
    return {
      disraptorDocument: this.get('disraptorDocument')
    };
  },

  renderTemplate() {
    // Renders the template `../templates/disraptor.hbs`
    this.render('disraptor');
  },

  injectLinkTags(result) {
    const headContent = this.extractTagContent('head', result);
    const linkTags = this.extractTags(headContent, 'link');
    for (const linkTag of linkTags) {
      linkTag.setAttribute('data-disraptor-link', '');
      document.head.insertAdjacentElement('beforeend', linkTag);
    }
  },

  injectScriptTags(result) {
    const headContent = this.extractTagContent('head', result);
    const scriptTags = this.extractTags(headContent, 'script');
    for (const scriptTag of scriptTags) {
      injectScript(scriptTag.src);
    }
  },

  /**
   * Extracts all `HTMLLinkElement`s from a string of the HTMLHeadElement.
   *
   * @param {String} headMarkup
   * @param {'script'|'link'} tagName
   * @returns {Array<HTMLScriptElement>|Array<HTMLLinkElement>}
   */
  extractTags(headMarkup, tagName) {
    // Use a <template> element to parse a DOM fragment
    const headTemplate = document.createElement('template');
    headTemplate.insertAdjacentHTML('beforeend', headMarkup);
    return Array.from(headTemplate.children).filter(el => el.tagName === tagName.toUpperCase());
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
    willTransition() {
      document.documentElement.classList.remove('disraptor-page');

      const disraptorElements = document.querySelectorAll(
        '[data-disraptor-link], [data-disraptor-script]'
      );

      disraptorElements.forEach(element => {
        element.remove();
      });
    }
  }
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
  document.head.appendChild(script);
}
