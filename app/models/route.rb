class Disraptor::Route
  class << self
    # Returns an array containing all routes
    def find_all
      routes = Disraptor::RouteStore.get_routes()
      routes.values
    end

    # Returns the route for a given request path
    def find_by_path(request_path)
      routes = Disraptor::RouteStore.get_routes()
      routes.values.detect { |route| route['sourcePath'] == request_path }
    end

    # Adds a new route
    def add(route_id, source_path, target_url, wildcard)
      if source_path.start_with?('/admin')
        Rails.logger.error "😱 Attempt to add admin route '#{source_path}' was cancelled."
        return
      end

      result = Discourse::Application.routes.routes.find { |route| route.ast.to_s.start_with?(source_path) }
      if result
        Rails.logger.warn "⚠ Careful! The new route for '#{source_path}' may interfer with the route for '#{result.ast.to_s.chomp('(.:format)')}'."
      end

      route = create_route_object(route_id, source_path, target_url, wildcard)

      Disraptor::RouteStore.add_route(route_id, route)

      route
    end

    # Updates an existing route
    def edit(route_id, source_path, target_url, wildcard)
      # Remove the existing route
      Disraptor::RouteStore.remove_route(route_id)

      add(route_id, source_path, target_url, wildcard)
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
