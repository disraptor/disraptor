class Disraptor::RouteStore
  class << self
    def get_routes
      return PluginStore.get(Disraptor::PLUGIN_NAME, 'routes') || {}
    end

    def get_route(route_id)
      routes = get_routes()

      return routes[route_id]
    end

    def has_route(route_id)
      routes = get_routes()

      return routes.key?(route_id)
    end

    def add_route(route_id, route)
      routes = get_routes()
      routes[route_id] = route

      return PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', routes)
    end

    def remove_route(route_id)
      routes = PluginStore.get(Disraptor::PLUGIN_NAME, 'routes')

      if has_route(route_id)
        routes.delete(route_id)

        return PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', routes)
      end

      return get_routes()
    end
  end
end
