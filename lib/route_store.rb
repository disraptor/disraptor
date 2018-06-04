class Disraptor::RouteStore
  def self.get_routes
    PluginStore.get(Disraptor::PLUGIN_NAME, 'routes') || {}
  end

  def self.add_route(route_id, route)
    routes = PluginStore.get(Disraptor::PLUGIN_NAME, 'routes') || {}
    routes[route_id] = route
    PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', routes)
  end

  def self.remove_route(route_id)
    routes = PluginStore.get(Disraptor::PLUGIN_NAME, 'routes')
    routes.delete(route_id)
    PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', routes)
  end
end
