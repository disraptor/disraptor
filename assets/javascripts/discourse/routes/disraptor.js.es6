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
        const headContent = this.extractTagContent('head', result);
        const linkTags = this.extractLinkTags(headContent);
        for (const linkTag of linkTags) {
          if (linkTag.getAttribute('rel') === 'stylesheet') {
            linkTag.setAttribute('data-disraptor-link', '');
            document.head.insertAdjacentElement('beforeend', linkTag);
          }
        }

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

  /**
   * Extracts all `HTMLLinkElement`s from a string of the HTMLHeadElement.
   *
   * @param {String} headMarkup
   * @returns {Array<HTMLLinkElement>}
   */
  extractLinkTags(headMarkup) {
    // Use a <template> element to parse a DOM fragment
    const headTemplate = document.createElement('template');
    headTemplate.insertAdjacentHTML('beforeend', headMarkup);
    return Array.from(headTemplate.children).filter(element => element.tagName === 'LINK');
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

      const linkTags = document.querySelectorAll('[data-disraptor-link]');
      linkTags.forEach(linkTag => {
        linkTag.remove();
      });
    }
  }
});
