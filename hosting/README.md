# Hosting Files

This directory contains configuration and scripts for hosting the site.

Three external services are used:
 - PostgreSQL database
 - [SendGrid](https://sendgrid.com/) email sending
 - Google [reCAPTCHA](https://developers.google.com/recaptcha/)

The app expects environment variables to be set to allow contacting to each of the services:
 - `DATABASE_URL` connection URL to the PostgreSQL database
 - `SENDGRID_API_KEY` client key for SendGrid
 - `RECAPTCHA_SECRET` secret key for reCAPTCHA
