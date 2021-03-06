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
    def add(route_id, source_path, target_url, request_method)
      if source_path.start_with?('/admin')
        Rails.logger.error("😱 Attempt to add admin route '#{source_path}' was cancelled.")
        return
      end

      route = create_route_object(route_id, source_path, target_url, request_method)

      Disraptor::RouteStore.add_route(route_id, route)

      return route
    end

    # Updates an existing route
    def edit(route_id, source_path, target_url, request_method)
      if Disraptor::RouteStore.has_route(route_id)
        Disraptor::RouteStore.remove_route(route_id)
      end

      return add(route_id, source_path, target_url, request_method)
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
    def create_route_object(route_id, source_path, target_url, request_method)
      route = {
        'id' => route_id,
        'sourcePath' => source_path,
        'targetUrl' => target_url,
        'requestMethod' => request_method.to_sym,
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
