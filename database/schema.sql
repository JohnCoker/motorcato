create table admins (
  id serial primary key,
  email text unique not null,
  passwd text not null,
  enabled boolean not null default true,
  reset_token text,
  reset_expires timestamp
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
create type motor_type as enum (
 'SU', 'reload', 'hybrid'
);
create table reports (
  id serial primary key,
  created_at timestamp not null default now(),
  manufacturer text not null,
  designation text not null,
  common_name text,
  motor_type motor_type,
  serial_no text,
  failure_date date,
  location text,
  temperature integer,
  fail_nozzle_blown boolean default false,
  fail_ejection_blown boolean default false,
  fail_casing_split boolean default false,
  fail_propellant_ejected boolean default false,
  fail_burn_through boolean default false,
  burn_through_loc text,
  fail_no_ejection boolean default false,
  fail_bad_delay boolean default false,
  actual_delay numeric,
  fail_other boolean default false,
  other_desc text,
  reported_mfr boolean default false,
  more_motors boolean default false,
  comments text,
  reported_date date,
  reporter_name text,
  reporter_addr1 text,
  reporter_addr2 text,
  reporter_city text,
  reporter_state text,
  reporter_zip text,
  reporter_email text,
  reporter_phone text,
  reporter_nar text,
  reporter_car text,
  reporter_tra text,
  reporter_ukra text,
  old_id integer,
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
