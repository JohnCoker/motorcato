# Database Stuff

The site is backed by a PostgreSQL database, from which all dynamic content is built. See `schema.sql` for the tables.

## Seed Data & History

The `seed` directory contains hand-created rows that bring seed the database. The `migrate` directory contains a program
which reads a CSV file dumped from the old MS SQL Server database and generates a file of SQL statements to migrate that
data into the new form (for PostgreSQL).

Note that the migrate program does not drop any data, but it does mark some obviously invalid rows as "rejected" (when
the manufacturer or engine code is invalid).

## Development

For local testing, set the environment variable `DATABASE_URL` to an appropriate connection string. For example, if your
user name is "john" and you're running the PostgreSQL server locally using the database "motorcato":
```
export DATABASE_URL='postgres://john@localhost/motorcato'
```
Note that when running in Heroku, this is the standard setup provided for your container.
