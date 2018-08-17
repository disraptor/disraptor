class Disraptor::Route
  class << self
    # Returns an array containing all routes
    def find_all
      routes = Disraptor::RouteStore.get_routes()

      return [] if routes.blank?
      routes.values
    end

    # Returns the route for a given request path
    def find_by_path(request_path)
      routes = Disraptor::RouteStore.get_routes()
      routes.values.detect { |route| route['sourcePath'] == request_path }
    end

    # Adds a new route
    def add(route_id, source_path, target_url, wildcard)
      if (source_path.start_with?('/admin'))
        Rails.logger.error "😱 Attempt to add admin route '#{source_path}' was cancelled."
        return
      end

      route = create_route_object(route_id, source_path, target_url, wildcard)

      Disraptor::RouteStore.add_route(route_id, route)

      route
    end

    # Updates an existing route
    def edit(route_id, source_path, target_url, wildcard)
      route = create_route_object(route_id, source_path, target_url, wildcard)

      # Remove the existing route
      Disraptor::RouteStore.remove_route(route_id)
      # And add the new one
      Disraptor::RouteStore.add_route(route_id, route)

      route
    end

    # Removes an existing route
    def remove(route_id)
      Disraptor::RouteStore.remove_route(route_id)
    end

    private

    # Creates a hash that represents a route
    def create_route_object(route_id, source_path, target_url, wildcard)
      route = {
        'id' => route_id,
        'sourcePath' => source_path,
        'targetURL' => target_url,
        'wildcard' => wildcard
      }
    end
  end
end
