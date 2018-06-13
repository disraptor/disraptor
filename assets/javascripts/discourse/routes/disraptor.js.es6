import { ajax } from 'discourse/lib/ajax';

/**
 * Handles Disraptor’s routing.
 */
export default Discourse.Route.extend({
  targetContent: null,

  /**
   * Need to send another request for the current path to the server because the Rails controller
   * won’t react to the initial request. See `./app/controllers/disraptor_routes_controller.rb`.
   */
  beforeModel(transition) {
    return ajax(transition.intent.url, { type: 'GET', dataType: 'text' })
      .then(result => {
        this.set('targetContent', result);
      })
      .catch(error => {
        console.error(error);
      });
  },

  renderTemplate: function () {
    // Attempts to render the template `../templates/disraptor.hbs`
    this.render('disraptor');
  },

  actions: {
    didTransition: function () {
      // After the template rendered
      Ember.run.scheduleOnce('afterRender', this, function () {
        document.documentElement.classList.add('disraptor-page');

        if (this.get('targetContent')) {
          const view = document.querySelector('#disraptor-view');
          if (view) {
            const sanitized = this.get('targetContent')
              .replace('&', '&amp;')
              .replace(/[\\"']/g, '&quot;');

            view.insertAdjacentHTML('beforeend', `<iframe sandbox="allow-same-origin allow-scripts" srcdoc="${sanitized}"></iframe>`);
            const iframe = view.lastElementChild;

            iframe.onload = function () {
              iframe.style.setProperty('height', iframe.contentWindow.document.documentElement.scrollHeight + 'px');
            };
          }
        }
      });
    }
  }
});
