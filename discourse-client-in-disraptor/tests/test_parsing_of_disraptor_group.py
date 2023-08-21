from discourse_client_in_disraptor.discourse_api_client import request_is_in_group

class DummyRequest():
    def __init__(self, headers):
        self.headers = {'X-Disraptor-Groups': headers}


def test_with_non_existing_disraptor_prefix():
    request = DummyRequest('hello,world')
    assert request_is_in_group(request, 'hello', 'app') == False

def test_with_existing_disraptor_prefix_01():
    request = DummyRequest('app___hello,app___world')
    assert request_is_in_group(request, 'hello', 'app') == True

def test_with_existing_disraptor_prefix_02():
    request = DummyRequest('app___hello,app___world')
    assert request_is_in_group(request, 'hello', None) == False

def test_with_existing_disraptor_prefix_03():
    request = DummyRequest('app___hello,app___world')
    assert request_is_in_group(request, 'dog', 'app') == False

def test_with_wrong_request():
    request = None
    assert request_is_in_group(request, 'dog', 'app') == False
