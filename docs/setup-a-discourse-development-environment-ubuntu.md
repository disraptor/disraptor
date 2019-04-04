# Setup a Discourse development environment (Ubuntu)

*(Closely following [discourse.org: Beginners Guide to Install Discourse on Ubuntu for Development](https://meta.discourse.org/t/beginners-guide-to-install-discourse-on-ubuntu-for-development/14727))*

1. Install the following packages:

   ```sh
   sudo apt update
   sudo apt install git build-essential libxslt1-dev libcurl4-openssl-dev libksba8 libksba-dev libqtwebkit-dev libreadline-dev libssl-dev zlib1g-dev libsnappy-dev libsqlite3-dev sqlite3 postgresql postgresql-server-dev-all postgresql-contrib redis-server curl imagemagick advancecomp gifsicle jpegoptim libjpeg-progs optipng pngcrush pngquant jhead
   ```

2. Install a current version of Ruby (via [rvm](http://rvm.io/) or [rbenv](https://github.com/rbenv/rbenv)).

   Restart your terminal and check whether you’re using the correct Ruby version.

3. Install the following ruby gems:

   ```sh
   gem install rails postgresql
   ```

4. Setup the PostgreSQL database.

   4.1. Open the PostgreSQL prompt.

   ```sh
   sudo -u postgres psql postgres
   ```

   4.2. Create a new database user with the same name as your system user account with the password `discourse`.

   ```
   CREATE ROLE ubuntuusername WITH LOGIN ENCRYPTED PASSWORD 'discourse' CREATEDB SUPERUSER;
   ```

   4.3. Create the `discourse_development` and `discourse_test` databases.

   ```
   CREATE DATABASE discourse_development WITH OWNER ubuntuusername ENCODING 'UTF8' TEMPLATE template0;
   CREATE DATABASE discourse_test WITH OWNER ubuntuusername ENCODING 'UTF8' TEMPLATE template0;
   ```

   4.4. Exit the prompt by pressing <kbd>Ctrl</kbd>+<kbd>D</kbd>.

5. Configure `discourse_development` database.

   5.1. Login to the `discourse_development` with the newly created database user and the previously set password.

   ```sh
   psql -d discourse_development -U ubuntuusername -h localhost
   ```

   5.2. Create the extensions `pg_trgm` and `hstore`.

   ```
   CREATE EXTENSION pg_trgm;
   CREATE EXTENSION hstore;
   ```

   5.3. Exit the prompt by pressing <kbd>Ctrl</kbd>+<kbd>D</kbd>.

6. Repeat the previous step for `discourse_test` (instead of `discourse_development`).
7. Setup Discourse.

   7.1. Clone the Discourse repository ([github.com/discourse/discourse](https://github.com/discourse/discourse/)).

   7.2. Navigate to the local repository.

   ```sh
   cd discourse
   ```

   7.3. Install Discourse’s dependencies.

   ```sh
   bundle install
   ```

   7.4. Run this:

   ```sh
   bundle exec rake db:create db:migrate
   RAILS_ENV=test bundle exec rake db:create db:migrate
   ```

   7.5. Start the local development server.

   ```sh
   RAILS_ENV=development bundle exec rails server
   ```

8. Create a new admin user. With this user, you can log in to Discourse once the server was started.

   ```sh
   RAILS_ENV=development bundle exec rake admin:create
   ```

9. Start the local development server like this:

   ```sh
   RAILS_ENV=development bundle exec rails server
   ```

   or like this to have the server be available remotely:

   ```sh
   RAILS_ENV=development bundle exec rails server --binding=0.0.0.0
   ```

10. Setup Disraptor.

   10.1. Clone the Disraptor repository ([github.com/disraptor/disraptor](https://github.com/disraptor/disraptor/)).

   10.2. Navigate to Discourse’s plugin directory.

   ```sh
   cd discourse/plugins
   ```

   10.3. Create a symbolic link to the location of the Disraptor plugin (the following command assumes that the Disraptor repository is located right next to the Discourse repository).

   ```sh
   ln -s ../../disraptor disraptor
   ```

11. Login to Discourse at [localhost:3000](http://localhost:3000).
12. Activate the Disraptor plugin.

    12.1. Navigate to [localhost:3000/admin/plugins](http://localhost:3000/admin/plugins)

    12.2. Click *Settings* next to “disraptor”.

    12.3. Check *Enable Disraptor* and apply the changes by pressing the tick mark next to the checkbox.

13. Create a new route at [localhost:3000/admin/plugins/disraptor](http://localhost:3000/admin/plugins/disraptor)
