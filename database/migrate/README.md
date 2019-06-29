# Data Migration

This Node.js program reads the CSV spreadsheet dumped from the old MS Sql Server database.

Note that most of the values are text, so most of the complexity is in standardizing values. In particular, dates are entered in a variety of formats.

Note the program does _not_ drop any data, but it does mark some obviously invalid rows as "rejected" (when the
manufacturer is unknown or engine code is invalid).

It reads the CSV dump from the old DB and produces a SQL file of insert statements that matches the tables declared in
schema.sql (see parent directory). The input file is `mess.csv`, read from the `tmp` directory at the top of the
repo (`../../tmp`). The output is `migrate.sql`, written into the same directory.
