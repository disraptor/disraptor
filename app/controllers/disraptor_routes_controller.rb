class DisraptorRoutesController < ApplicationController
  before_action :check_if_disraptor_enabled

  def show
    Rails.logger.info '┌──────────────────────────────┐'
    Rails.logger.info '│ Disraptor: Requesting route. │'
    Rails.logger.info '└──────────────────────────────┘'

    route = Disraptor::Route.find_by_source_path(request.path)

    if route.nil?
      render body: nil, status: 404
    else
      target_url = route['targetURL']

      url = URI.parse(target_url)
      req = Net::HTTP::Get.new(url.to_s)
      res = Net::HTTP.start(url.host, url.port) { |http| http.request(req) }

      render html: res.body.html_safe
    end
  end

  private

  def check_if_disraptor_enabled
    unless SiteSetting.disraptor_enabled
      raise I18n.t('disraptor.errors.not_enabled')
    end
  end
end
