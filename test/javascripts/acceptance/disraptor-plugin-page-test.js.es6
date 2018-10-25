import { acceptance } from 'helpers/qunit-helpers';

/**
 * Runs Disraptor acceptance tests as a logged-in administrator.
 * Run tests: http://127.0.0.1:3000/qunit?module=Acceptance%3A%20Disraptor
 */
acceptance('Disraptor’s plugin page works', { loggedIn: true });

const targetHost = 'http://127.0.0.1:2000/';

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
            'targetURL': targetHost
          }
        ]
      }
    ];
  });

  // Visit the plugin page
  await visit('/admin/plugins/disraptor');

  // With the initial GET request, the following active routes should exist.
  assert.ok(exists('[data-route-id="46961985"]'), 'Route /test exists.');

  server.put('/disraptor_routes/1498996', () => {
    return [
      200,
      { 'Content-Type': 'application/json' },
      {
        disraptor_route: {
          'id': '1498996',
          'sourcePath': '/css',
          'targetURL': `${targetHost}css`
        }
      }
    ];
  });

  await fillIn('.dr-new-route__source-path input', '/css');
  await fillIn('.dr-new-route__target-url input', `${targetHost}css`);
  await click('.dr-new-route__submit');

  assert.ok(exists('[data-route-id="1498996"]'), 'Route /css exists.');
});
