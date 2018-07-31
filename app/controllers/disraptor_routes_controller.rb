class DisraptorRoutesController < ApplicationController
  # For Disraptor documents (i.e. request content type is HTML), don’t respond directly.
  # Instead, wait for an XHR request from the Discourse frontend.
  before_action :check_if_disraptor_enabled, :check_xhr_for_documents
  # Generally, skip the XHR check and respond directly with this controller.
  skip_before_action :check_xhr

  # Handles requests for regular paths like /example for routes with a source path /example.
  def show
    route = Disraptor::Route.find_by_path(request.path)
    target_url = route['targetURL']

    send_proxy_request(request, target_url)
  end

  # Handles requests for wildcard paths like /css/styles.css for routes with a source path /css/*.
  def show_wildcard_path
    wildcard_prefix = get_wildcard_prefix(request.path, params[:wildcard_segment])
    route = Disraptor::Route.find_by_path(wildcard_prefix)
    target_url = construct_target_url(request.path, route['targetURL'], wildcard_prefix)

    send_proxy_request(request, target_url)
  end

  private

  # Sends a proxy request based on the incoming +request+.
  #
  # * *Args*:
  #   - +request+ -> the incoming HTTP request
  #   - +target_url+ -> the target url for the proxy request
  def send_proxy_request(request, target_url)
    Rails.logger.info '👻 Disraptor: Requesting route ' + request.path
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

  # Returns the wildcard prefix for a given +request_path+ and +wildcard_segment+.
  #
  #   get_wildcard_prefix('/css/slidehub/styles.css', 'slidehub/styles')
  #   -> '/css'
  #
  # * *Args*:
  #   - +request_path+ -> the HTTP request.path (e.g. /css/styles.css)
  #   - +wildcard_segment+ -> the wildcard segment of +request_path+ (e.g. styles)
  # * *Returns*:
  #   - the wildcard segment prefix or the +request_path+ (e.g. /css)
  def get_wildcard_prefix(request_path, wildcard_segment)
    wildcard_begin = request_path.index('/' + wildcard_segment)
    wildcard_prefix = request_path[0, wildcard_begin]
  end

  # Returns the target_url constructed out of +request_path+, +target_path+
  # and +wildcard_prefix+.
  #
  # * *Args*:
  #   - +request_path+ -> the HTTP request.path (e.g. /css/styles.css)
  #   - +target_path+ -> (e.g. http://127.0.0.1:4000/css)
  #   - +wildcard_prefix+ -> the wildcard prefix of +request_path+ (e.g. /css)
  # * *Returns*:
  #   - the wildcard segment prefix or the +request_path+ (e.g.
  #     http://127.0.0.1:4000/css/styles.css)
  def construct_target_url(request_path, target_path, wildcard_prefix)
    target_wildcard_begin = target_path.index(wildcard_prefix)
    target_host = target_path[0, target_wildcard_begin]
    target_url = target_host + request_path
  end

  # Stops this controller from handling non-AJAX requests for HTML documents. Instead, it requires
  # Discourse to send an AJAX request for that document. This is necessary for rendering Disraptor
  # documents inside the context of Discourse (e.g. with the top navigation bar).
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
