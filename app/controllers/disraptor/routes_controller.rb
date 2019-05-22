require 'pathname'
require 'uri'

# Controller for handling all requests regarding the configuration of Disraptor routes.
class Disraptor::RoutesController < ApplicationController
  before_action :check_if_disraptor_enabled

  @@allowed_methods = ['get', 'head', 'post', 'put', 'delete', 'options', 'trace']

  # Corresponds to requests in the form
  # GET /disraptor/routes
  def index
    Rails.logger.info('👻 Disraptor: Showing available routes.')

    routes = Disraptor::Route.find_all()

    render json: { 'disraptor/routes': routes }
  end

  # Corresponds to requests in the form
  # GET /disraptor/routes/:route_id
  def show
    route_id = params.require(:route_id)

    route = Disraptor::RouteStore.get_route(route_id)

    if route.nil?
      error_message = "Couldn’t find route for the ID '#{route_id}'."
      Rails.logger.error('❌ Disraptor: Error: ' + error_message)

      return render json: { error: error_message }, status: 404
    end

    render json: { 'disraptor/route': route }
  end

  # Corresponds to requests in the form
  # PUT /disraptor/routes/:route_id
  def update
    Rails.logger.info('👻 Disraptor: Updating route.')

    route_id = params.require(:route_id)
    payload = params.require('disraptor/route')
    source_path = normalize_path(payload['sourcePath'])
    target_url = normalize_uri(payload['targetUrl'])
    request_method = normalize_request_method(payload['requestMethod'])

    if !@@allowed_methods.include?(request_method)
      error_message = "Route request method was #{request_method} but expected one of these: #{@@allowed_methods.join(', ')}."
      Rails.logger.error('❌ Disraptor: Error: ' + error_message)

      return render json: { error: error_message }, status: 400
    end

    if source_path != '/' and source_path.end_with?('/')
      error_message = "Route source path was #{source_path} but it must not end in a slash."
      Rails.logger.error('❌ Disraptor: Error: ' + error_message)

      return render json: { error: error_message }, status: 400
    end

    route = Disraptor::Route.edit(route_id, source_path, target_url, request_method)

    Rails.application.reload_routes!

    render json: { 'disraptor/route': route }
  end

  # Corresponds to requests in the form
  # DELETE /disraptor/routes/:route_id
  def destroy
    Rails.logger.info('👻 Disraptor: Destroying route.')

    if Disraptor::Route.remove(params[:route_id])
      Rails.application.reload_routes!

      render json: success_json
    else
      render json: failed_json
    end
  end

  private

  def check_if_disraptor_enabled
    unless SiteSetting.disraptor_enabled
      raise I18n.t('disraptor.errors.not_enabled')
    end
  end

  def normalize_uri(uri_string)
    uri = URI(uri_string)
    uri.path = normalize_path(uri.path)

    return uri.normalize.to_s
  end

  def normalize_path(path)
    normalized_path = Pathname.new(path).cleanpath.to_s

    if path.end_with?('/') && !normalized_path.end_with?('/')
      normalized_path += '/'
    end

    return normalized_path
  end

  def normalize_request_method(request_method)
    return request_method.downcase
  end
end
