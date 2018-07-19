class DisraptorRoutesController < ApplicationController
  # For Disraptor documents (i.e. request content type is HTML), don’t respond directly.
  # Instead, wait for an XHR request from the frontend.
  before_action :check_if_disraptor_enabled, :check_xhr_for_documents
  # Generally, skip the XHR check and respond directly with the server-side controller
  skip_before_action :check_xhr

  def show
    Rails.logger.info '👻 Disraptor: Requesting route ' + request.path

    route = nil
    target_url = nil

    if params.key?('wildcard_path')
      wildcard_begin = request.path.index(params[:wildcard_path])
      wildcard_prefix = request.path[0, wildcard_begin - 1]
      wildcard_source_path = wildcard_prefix + '/*'
      route = Disraptor::Route.find_by_path(wildcard_source_path)

      target_wildcard_begin = route['targetURL'].index(wildcard_prefix)
      target_prefix = route['targetURL'][0, target_wildcard_begin]
      target_url = target_prefix + request.path
      Rails.logger.info target_url
    else
      route = Disraptor::Route.find_by_path(request.path)
      target_url = route['targetURL']
    end

    if route.nil?
      render body: nil, status: 404
    else
      url = URI.parse(target_url)
      proxy_request = Net::HTTP::Get.new(url.to_s, {'Content-Type' => request.format.to_s})
      proxy_response = Net::HTTP.start(url.host, url.port) { |http| http.request(proxy_request) }

      if proxy_response.code == '404'
        Rails.logger.info '👻 Disraptor: 404.'
        render body: nil, status: 404
      elsif request.format == 'text/html'
        Rails.logger.info '👻 Disraptor: Loading a document.'
        render body: proxy_response.body.html_safe, content_type: request.format
      else
        Rails.logger.info '👻 Disraptor: Loading a resource.'
        render body: proxy_response.body, content_type: request.format
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
