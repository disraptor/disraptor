# Controller for handling all requests regarding the configuration of Disraptor routes.
class Disraptor::RoutesController < ApplicationController
  before_action :check_if_disraptor_enabled

  # Corresponds to requests in the form
  # GET /disraptor_routes
  def index
    Rails.logger.info('👻 Disraptor: Showing available routes.')

    routes = Disraptor::Route.find_all()

    render json: { disraptor_routes: routes }
  end

  # Corresponds to requests in the form
  # PUT /disraptor_routes/:route_id
  def update
    Rails.logger.info('👻 Disraptor: Updating route.')

    route_id = params[:route_id]
    source_path = params[:disraptor_route][:sourcePath]
    target_url = params[:disraptor_route][:targetURL]
    request_method = params[:disraptor_route][:requestMethod]

    if source_path.end_with?('/')
      error_message = 'A route’s source path must not end in a slash.'
      Rails.logger.error('❌ Disraptor: Error: ' + error_message)

      return render json: { error: error_message }, status: 400
    end

    route = Disraptor::Route.edit(route_id, source_path, target_url, request_method)

    Rails.application.reload_routes!

    render json: { disraptor_route: route }
  end

  # Corresponds to requests in the form
  # DELETE /disraptor_routes/:route_id
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
