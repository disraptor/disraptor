# Controller for handling all Disraptor configuration request
# That is, all request that are
class DisraptorConfigController < ApplicationController
  before_action :check_if_disraptor_enabled

  # Corresponds to requests in the form
  # GET /disraptor_routes
  def index
    Rails.logger.info '👻 Disraptor: Showing available routes.'

    routes = Disraptor::Route.find_all()

    render json: { disraptor_routes: routes }
  end

  # Corresponds to requests in the form
  # PUT /disraptor_routes/:route_id
  def update
    Rails.logger.info '👻 Disraptor: Updating route.'

    route_id = params[:route_id]
    source_path = params[:disraptor_route][:sourcePath]
    target_url = params[:disraptor_route][:targetURL]
    route = Disraptor::Route.add(route_id, source_path, target_url)

    Rails.application.reload_routes!

    render json: { disraptor_route: route }
  end

  # Corresponds to requests in the form
  # DELETE /disraptor_routes/:route_id
  def destroy
    Rails.logger.info '👻 Disraptor: Destroying route.'

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
