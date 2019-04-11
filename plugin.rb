# name: disraptor
# about: Disraptor tries to separate web application development from the development of other, often crucial features like user management, authentication, mailing, social networking, etc.
# version: 0.2.1
# authors: Philipp Rudloff
# url: https://disraptor.org

enabled_site_setting :disraptor_enabled

register_asset 'stylesheets/disraptor-view.scss'

# Adds a link the Disraptor plugin on the `/admin/plugins` page with the route `disraptor`.
add_admin_route 'disraptor.title', 'disraptor'

module ::Disraptor
  PLUGIN_NAME ||= 'disraptor'.freeze
end

load File.expand_path('../lib/route_store.rb', __FILE__)
load File.expand_path('../app/models/route.rb', __FILE__)

after_initialize do
  load File.expand_path('../app/controllers/disraptor/routes_controller.rb', __FILE__)
  load File.expand_path('../app/controllers/proxy_controller.rb', __FILE__)

  Discourse::Application.routes.append do
    # Serve the default plugins content when the user directly opens the Disraptor plugin.
    get '/admin/plugins/disraptor' => 'admin/plugins#index', constraints: AdminConstraint.new
  end

  # No longer needed with the following commit:
  # https://github.com/discourse/discourse/commit/98d09c90acc503051d02094a9f25113eb5fdf293
  # Tagged to be released with 2.3
  add_to_serializer(:current_user, :groups, false) {
    object.groups.pluck(:name)
  }

  # For some reason the leading `::` segment is important and also
  # for another reason, the engine has to be defined here, not in some file. ¯\_(ツ)_/¯
  module ::Disraptor
    class RoutesEngine < ::Rails::Engine
      engine_name "#{Disraptor::PLUGIN_NAME}_routes"
      isolate_namespace Disraptor
    end
  end

  Discourse::Application.routes.append do
    mount Disraptor::RoutesEngine => '/disraptor'
  end

  Disraptor::RoutesEngine.routes.draw do
    get '/routes' => 'routes#index'
    get '/routes/:route_id' => 'routes#show'
    put '/routes/:route_id' => 'routes#update'
    delete '/routes/:route_id' => 'routes#destroy'
  end

  # `Discourse::Application.routes` is an `ActionDispatch::Routing::RouteSet` object. Source code:
  # https://github.com/rails/rails/blob/master/actionpack/lib/action_dispatch/routing/route_set.rb
  Discourse::Application.routes.prepend do
    Disraptor::RouteStore.get_routes.values.each do |route|
      # Use `format: false` to ensure wildcard path segments include extensions, e.g.:
      # Requesting /styles.css and having a wildcard path /*wildcard yields a `wildcard` field set
      # to `styles.css` instead of just `styles`.
      match route['sourcePath'] => 'proxy#resolve', format: false, segments: route['segments'], via: route['requestMethod']
    end
  end

  Rails.application.reload_routes!
end
