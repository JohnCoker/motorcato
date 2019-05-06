create table admins (
  id serial primary key,
  email text unique not null,
  passwd text not null,
  enabled boolean not null default true
);
create table notifications (
  id serial primary key,
  date date not null,
  headline text not null,
  url text,
  body text,
  posted_by integer not null references admins,
  expired boolean not null default false
);
create type failure as enum ('cato', 'delay', 'nozzle', 'ejection', 'propellant', 'split', 'burnthrough', 'other');
create table reports (
  id serial primary key,
  reported_date date not null,
  manufacturer text not null,
  motor text not null,
  serial_no text,
  failure_date date not null,
  location text,
  temperature integer,
  failure failure,
  description text,
  reported_mfr boolean default false,
  more_motors boolean default false,
  comments text,
  reporter_email text,
  reporter_phone text,
  reporter_nar text,
  reporter_car text,
  reporter_tra text,
  rejected boolean not null default false
);
create table photos (
  id serial primary key,
  report integer not null references reports,
  image bytea not null,
  width integer not null,
  height integer not null,
  resolution integer,
  orientation integer
);
create table notes (
  id serial primary key,
  report integer not null references reports,
  posted_by integer not null references admins,
  date date not null,
  note text not null
);
