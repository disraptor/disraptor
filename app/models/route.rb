class Disraptor::Route
  def self.find_all
    routes = Disraptor::RouteStore.get_routes()

    return [] if routes.blank?
    routes.values
  end

  def self.add(route_id, source_path, target_url)
    route = create_route_object(route_id, source_path, target_url)

    Disraptor::RouteStore.add_route(route_id, route)

    route
  end

  def self.edit(route_id, source_path, target_url)
    route = create_route_object(route_id, source_path, target_url)

    # Remove the existing route
    Disraptor::RouteStore.remove_route(route_id)
    # And add the new one
    Disraptor::RouteStore.add_route(route_id, route)

    route
  end

  def self.remove(route_id)
    Disraptor::RouteStore.remove_route(route_id)
  end

  private

  def self.create_route_object(route_id, source_path, target_url)
    route = {
      id: route_id,
      sourcePath: source_path,
      targetURL: target_url
    }
  end
end
