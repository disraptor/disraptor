import requests
import json
import secrets
from discourse_client_in_disraptor.third_party_integrations import responseNotAllowed, extractHeader
from functools import wraps
import os


_DISRAPTOR_APP_SECRET_KEY = os.getenv("DISRAPTOR_APP_SECRET_KEY")

def check_disraptor_token(func):
    @wraps(func)
    def func_wrapper(request, *args, **kwargs):
        if extractHeader(request, 'X-Disraptor-App-Secret-Key', None) != _DISRAPTOR_APP_SECRET_KEY:
            return responseNotAllowed('Access forbidden.')

        return func(request, *args, **kwargs)

    return func_wrapper

def __extract_discourse_groups(request, app, sep):
    if not request or not app or not sep or not hasattr(request, 'headers'):
        return []
    ret = extractHeader(request, 'X-Disraptor-Groups', "None").split(",")
    return set([i.split(app + sep)[1] for i in ret if i and len(i.split(sep)) == 2 and len(i.split(app + sep)) == 2 and i.startswith(app+sep)])


def request_is_in_group(request, group, app, sep='___'):
    groups = __extract_discourse_groups(request, app, sep)
    print(groups)
    return  group in groups

class DiscourseApiClient():
    """An API client for discourse behind disraptor."""
    def __init__(self, api_key, url):
        self.api_key = api_key
        self.url = url

    def add_user_as_owner_to_group(self, group_id, user_name):
        """ Create the invite link to get permission to a discourse group """
        ret = self._put(f"groups/{group_id}/owners.json", {"usernames": user_name, "notify_users": "true"})
        
        ret = json.loads(ret.text)

        if 'success' not in ret or ret['success'] != 'OK':
            raise ValueError(f'Could not make the user "{user_name}" an owner of the group with id "{group_id}". Response: ' + str(ret))

        return ret

    def create_group(self, group_name, group_bio, visibility_level=2, members_visibility_level=2):
        """ Create a discourse group."""
        if self.group_exists(group_name):
            raise ValueError(f'Group "{group_name}" exists')

        data = {"group[name]": group_name, "group[visibility_level]": visibility_level,
                "group[members_visibility_level]": members_visibility_level, "group[bio_raw]": group_bio}

        ret = self._post("admin/groups", data)
        return json.loads(ret.text).get('basic_group', {'id': group_name})["id"]

    def group_exists(self, group_name):
        ret = json.loads(self._get(f'groups/{group_name}/members.json').content)
        return 'errors' not in ret or ['The requested URL or resource could not be found.'] != ret['errors']

    def create_invite_link(self, group_id):
        """ Create the invite link to get permission to a discourse group."""
        data = {"group_ids[]": group_id, "max_redemptions_allowed": 20, "expires_at": str(datetime.now().year + 1) + "-12-31"}

        ret = self._post("invites", data)

        return json.loads(ret.text)['link']

    def generate_api_key(self, username, description):
        return json.loads(self._post('admin/api/keys', json.dumps({"key":{"username": username, "description": description}}), {"Content-Type": "application/json"}).content)['key']['key']

    def add_user(self, name, username, email, password=None):
        r = json.loads(self._get('session/hp.json').content)
        existing_users = set([i['username'] for i in self.list_users()])
        if username in existing_users:
            raise ValueError(f'User "{username}" already exists.' )
        password = password if password else secrets.token_urlsafe(15)

        data = {'name': name, 'username': username, 'email': email, 'password': password, 'password_confirmation': r['value'], 
                'challenge': r['challenge'][::-1]  # reverse challenge, discourse security check
                }
        
        r = json.loads(self._post('/u', data, {"Api-Key": None}).content)
        if 'success' not in r or not r['success']:
            raise ValueError(r)

        return r

    def list_users(self):
        ret = []
        for t in ['active', 'new', 'staff', 'suspended', 'silenced', 'staged']:
            r = json.loads(self._get(f'admin/users/list/{t}.json').content)
            if r:
                ret += [i for i in r]
        return ret

    def write_message(self, title, message, target_recipients):
        data = {'raw': message, 'title': title, 'unlist_topic': False, 'is_warning': False, 'archetype': 'private_message',
                'target_recipients': target_recipients, 'draft_key': 'new_private_message'}

        ret = self._post("posts", data, {"Content-Type": "application/x-www-form-urlencoded"})
        ret = ret.text
        ret = json.loads(ret)
        if 'error' in ret or 'id' not in ret:
            raise ValueError(f'Could not write message to group. Got {ret}')

    def _post(self, endpoint, data, headers=None):
        return requests.post(f"{self.url}/{endpoint}", headers=self._to_default_header(headers), data=data)

    def _put(self, endpoint, data, headers=None):
        return requests.put(f"{self.url}/{endpoint}", headers=self._to_default_header(headers), data=data)

    def _get(self, endpoint, headers=None):
        return requests.get(f"{self.url}/{endpoint}", headers=self._to_default_header(headers))

    def _to_default_header(self, headers):
        ret = {"Api-Key": self.api_key, "Accept": "application/json", "Content-Type": "multipart/form-data"}
        if headers:
            for k,v in headers.items():
                ret[k] = v
                if not v:
                    del ret[k]
        return ret
