def responseNotAllowed(message):
    raise ValueError('No implementation available')

def extractHeader(request, header, default):
    raise ValueError('No implementation available')

try:
    from django.http import HttpResponseNotAllowed

    def responseNotAllowedDjango(message):
        return HttpResponseNotAllowed(message)

    def extractHeaderDjango(request, header, default):
        return request.headers.get(header, default) if request and request.headers else default

    responseNotAllowed = responseNotAllowedDjango
    extractHeader = extractHeaderDjango
except:
    # we are not in django
    pass
