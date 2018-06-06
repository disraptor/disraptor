class RoutesController < ApplicationController
  before_action :check_if_disraptor_enabled

  def index
    Rails.logger.info '_________________________________________'
    Rails.logger.info 'Disraptor: Showing available routes.'

    routes = Disraptor::Route.find_all()

    render json: { routes: routes }
  end

  def update
    Rails.logger.info '_________________________________________'
    Rails.logger.info 'Disraptor: Updating route.'

    route_id = params[:route_id]
    source_path = params[:route][:sourcePath]
    target_url = params[:route][:targetURL]
    route = Disraptor::Route.add(route_id, source_path, target_url)

    render json: route
  end

  def destroy
    Rails.logger.info '_________________________________________'
    Rails.logger.info 'Disraptor: Destroying route.'

    route_id = params[:route_id]
    route = Disraptor::Route.remove(route_id)

    render json: route
  end

  private

  def check_if_disraptor_enabled
    unless SiteSetting.disraptor_enabled
      raise I18n.t('disraptor.errors.not_enabled')
    end
  end
end
