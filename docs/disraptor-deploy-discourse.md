# Disraptor: Deploy Discourse

*(This document is based of [discourse/discourse: INSTALL-cloud.md](https://github.com/discourse/discourse/blob/master/docs/INSTALL-cloud.md) and [discourse/discourse_docker: README.md](https://github.com/discourse/discourse_docker/blob/master/README.md).)*

## Prerequesites


Get the following information ready:

- Hostname for your web application (e.g. `tira.io`)
- Email address for the admin account (e.g. `info@tira.io`)
- SMPT server address (e.g. `smtp.tira.io`), port (587), user name (e.g. `admin`), and password

Install the following software:

- [Ruby 2.5+](https://www.ruby-lang.org/en/downloads/)
- [Postgres 10+](https://www.postgresql.org/download/)
- [Redis 2.6+](https://redis.io/download)

  ```sh
  sudo apt install redis-server
  ```

- Docker and git:

  ```sh
  wget -qO- https://get.docker.com/ | sh
  ```

## Install Discourse via Docker

```
sudo -s
mkdir /var/discourse
git clone https://github.com/discourse/discourse_docker.git /var/discourse
cd /var/discourse
```

Run and follow the instructions of the Discourse setup script:

```sh
./discourse-setup
```

This produces an `app.yml` file.
