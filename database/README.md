# Database Stuff

The site is backed by a PostgreSQL database, from which all dynamic content is built. See `schema.sql` for the tables.

## History

The `history` directory contains data from the old site and collected by hand from email MESS reports. This gets turned
into seed data loaded by hand when the site is brought up.

## Development

For local testing, set the environment variable `DATABASE_URL` to an appropriate connection string. For example, if your
user name is "john" and you're running the PostgreSQL server locally using the database "motorcato":
```
export DATABASE_URL='postgres://john@localhost/motorcato'
```
Note that when running in Heroku, this is the standard setup provided for your container.
