# name: disraptor
# about: I don’t know how to describe it, yet.
# version: 0.1
# authors: Philipp Rudloff
# url: http://disraptor.org

enabled_site_setting :disraptor_enabled

register_asset 'stylesheets/disraptor-plugin.scss'
register_asset 'stylesheets/disraptor-view.scss'

# Adds a link the Disraptor plugin on the `/admin/plugins` page with the route `disraptor`.
add_admin_route 'disraptor.title', 'disraptor'

  module ::Disraptor
    PLUGIN_NAME ||= 'disraptor'.freeze
  end

  load File.expand_path('../lib/route_store.rb', __FILE__)
load File.expand_path('../app/models/route.rb', __FILE__)

after_initialize do
  load File.expand_path('../app/controllers/disraptor_config_controller.rb', __FILE__)
  load File.expand_path('../app/controllers/disraptor_routes_controller.rb', __FILE__)

  Discourse::Application.routes.append do
    # Serve the default plugins content when the user directly opens the Disraptor plugin.
    get '/admin/plugins/disraptor' => 'admin/plugins#index', constraints: AdminConstraint.new

    get '/disraptor_routes' => 'disraptor_config#index', constraints: AdminConstraint.new
    put '/disraptor_routes/:route_id' => 'disraptor_config#update', constraints: AdminConstraint.new
    delete '/disraptor_routes/:route_id' => 'disraptor_config#destroy', constraints: AdminConstraint.new

    Disraptor::RouteStore.get_routes.values.each do |route|
      # Check for a wildcard path (e.g. `/css/*`)
      if route['wildcard']
        # Construct routes of the form `/css/*wildcard_segment` as described in:
        # http://guides.rubyonrails.org/routing.html#route-globbing-and-wildcard-segments
        #
        # `DisraptorRoutesController#show` will now receive a `params` object including a
        # `wildcard_segment` property. For a request to `/css/slidehub/styles.css`, its
        # value will be `slidehub/styles`. Note that the extension (e.g. `.css`) is missing.
        # Instead, the `format` property will be set to `CSS`
        get "/#{route['sourcePath']}/*wildcard_segment" => 'disraptor_routes#show_wildcard_path'
      else
        get "/#{route['sourcePath']}" => 'disraptor_routes#show'
      end
    end
  end
end
