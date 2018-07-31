import { acceptance } from 'helpers/qunit-helpers';

/**
 * Runs Disraptor acceptance tests as a logged-in administrator.
 * Run tests: http://127.0.0.1:3000/qunit?module=Acceptance%3A%20Disraptor
 */
acceptance('Disraptor', { loggedIn: true });

test('Disraptor works', async assert => {
  // Fake the HTTP endpoint for the initial GET request fetching all active routes
  server.get('/disraptor_routes', () => {
    return [
      200,
      { 'Content-Type': 'application/json' },
      {
        disraptor_routes: [
          {
            'id': '46961985',
            'sourcePath': '/test',
            'targetURL': 'http://127.0.0.1:2000/',
            'wildcard': false
          },
          {
            'id': '3886754584',
            'sourcePath': '/test_wildcard',
            'targetURL': 'http://127.0.0.1:2000/wildcard',
            'wildcard': true
          }
        ]
      }
    ];
  });

  // Visit the plugin page
  await visit('/admin/plugins/disraptor');

  // With the initial GET request, the following active routes should exist.
  assert.ok(exists('[data-route-id="46961985"]'), 'Route /test exists.');
  assert.ok(exists('[data-route-id="3886754584"]'), 'Route /test_wildcard exists.');
});
