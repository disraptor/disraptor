# A Lightweight Discourse Client for Disraptor Apps

Simple access to the discourse API required to use [Disraptor](https://www.disraptor.org).

Install via:

```
pip3 install discourse-client-in-disraptor
```

### Usage:

Generate an API key via:

```
from discourse_client_in_disraptor import DiscourseApiClient
client = DiscourseApiClient(url='https://www.tira.io', api_key='<API-KEY>')
client.generate_api_key('<user>', '<description>')
```

Test if a user has access to a group

```
from discourse_client_in_disraptor.discourse_api_client import request_is_in_group
request_is_in_group(request=http_request, group=model, app='chatnoir_chat')
```

