# Database Stuff

For local testing, set the environment variable `DATABASE_URL` to an appropriate connection string. For example, if your
user name is "john" and you're running the PostgreSQL server locally using the database "motorcato":
```
export DATABASE_URL='postgres://john@localhost/motorcato'
```
Note that when running in Heroku, this is the standard setup provided for your container.
