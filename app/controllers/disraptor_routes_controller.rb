class DisraptorRoutesController < ApplicationController
  before_action :check_if_disraptor_enabled, :check_xhr_for_documents
  skip_before_action :check_xhr

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
      req = Net::HTTP::Get.new(url.to_s, {'Content-Type' => request.format.to_s})
      res = Net::HTTP.start(url.host, url.port) { |http| http.request(req) }

      if request.format == 'text/html'
        Rails.logger.info 'Loading Disraptor document.'
        render body: res.body.html_safe, content_type: request.format
      else
        Rails.logger.info 'Loading Disraptor resource.'
        render body: res.body, content_type: request.format
      end
    end
  end

  private

  def check_xhr_for_documents
    if request.format == 'text/html'
      check_xhr
    end
  end

  def check_if_disraptor_enabled
    unless SiteSetting.disraptor_enabled
      raise I18n.t('disraptor.errors.not_enabled')
    end
  end
end
