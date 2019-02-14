# Controller for handling all requests regarding the configuration of Disraptor routes.
class Disraptor::RoutesController < ApplicationController
  before_action :check_if_disraptor_enabled

  # Corresponds to requests in the form
  # GET /disraptor/routes
  def index
    Rails.logger.info('👻 Disraptor: Showing available routes.')

    routes = Disraptor::Route.find_all()

    render json: { 'disraptor/routes': routes }
  end

  # Corresponds to requests in the form
  # PUT /disraptor/routes/:route_id
  def update
    Rails.logger.info('👻 Disraptor: Updating route.')

    route_id = params.require(:route_id)
    payload = params.require('disraptor/route')
    source_path = payload['sourcePath']
    target_url = payload['targetURL']
    request_method = payload['requestMethod']

    if source_path.end_with?('/')
      error_message = 'A route’s source path must not end in a slash.'
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

    route_id = params[:route_id]
    route = Disraptor::Route.remove(route_id)

    Rails.application.reload_routes!

    render json: success_json
  end

  private

  def check_if_disraptor_enabled
    unless SiteSetting.disraptor_enabled
      raise I18n.t('disraptor.errors.not_enabled')
    end
  end
end
