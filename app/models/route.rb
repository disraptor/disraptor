class Disraptor::Route
  class << self
    # Returns an array containing all routes
    def find_all
      # PluginStore.set(Disraptor::PLUGIN_NAME, 'routes', {})
      routes = Disraptor::RouteStore.get_routes()

      return routes.values
    end

    # Returns the route for a given request path
    def find_by_path(request_path)
      routes = Disraptor::RouteStore.get_routes()

      return routes.values.detect do |route|
        route['sourcePath'] == request_path
      end
    end

    # Adds a new route
    def add(route_id, source_path, target_url)
      if source_path.start_with?('/admin')
        Rails.logger.error("😱 Attempt to add admin route '#{source_path}' was cancelled.")
        return
      end

      existing_source_path = Discourse::Application.routes.routes.find do |route|
        route.ast.to_s.start_with?(source_path)
      end

      if existing_source_path
        Rails.logger.warn(
          "⚠ Careful! The route’s '#{source_path}' might interfer with the route for '#{existing_source_path}'."
        )
      end

      route = create_route_object(route_id, source_path, target_url)

      Disraptor::RouteStore.add_route(route_id, route)

      return route
    end

    # Updates an existing route
    def edit(route_id, source_path, target_url)
      # Remove the existing route
      Disraptor::RouteStore.remove_route(route_id)

      return add(route_id, source_path, target_url)
    end

    # Removes an existing route
    def remove(route_id)
      return Disraptor::RouteStore.remove_route(route_id)
    end

    private

    # Creates a route hash
    #
    # * *Args*:
    #   - +route_id+ -> a route’s ID
    #   - +source_path+ -> a route’s source path
    #   - +target_url+ -> a route’s target URL
    # * *Returns*:
    #   - a route hash
    def create_route_object(route_id, source_path, target_url)
      route = {
        'id' => route_id,
        'sourcePath' => source_path,
        'targetURL' => target_url,
        'segments' => get_special_path_segments(source_path)
      }

      return route
    end

    # Creates an array containing a +source_path+’s dynamic and wildcard path segments.
    #
    # * *Args*:
    #   - +source_path+ -> a route’s source path
    # * *Returns*:
    #   - an array containing a source path’s dynamic and wildcard path segments.
    def get_special_path_segments(source_path)
      special_path_segments = []

      source_path.split('/').each do |segment|
        if segment.start_with?(':') || segment.start_with?('*')
          special_path_segments.push(segment)
        end
      end

      return special_path_segments
    end
  end
end
