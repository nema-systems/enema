Initial deployment of client-app on Vercel:
* Setup Vercel account
* Install Vercell CLI through npm
* Run 'vercel' in client-app/ and deploy
* Setup env vars for clerk dev key
* Update API URLS to use config setting consistently
* API_URL env added

Setting up trial DB on Neon:
* Created a new Neon DB project
* Tables were auto-created in public by sqlalchemy, init.sql didn't quite seem right so not applying it

Setting up API hosting on Render:
* Create account
* Link with github
* Configure new project for the API using Docker
* Deploy, running, healthy, api/docs loads okay
* Needed to add CORS config
* Setup env vars for DATABASE_URL, ENVIRONMENT.  JWT and TEMPORAL env are set but shouldn't be used, just to avoid issues.
* Database URL from Neon had ssl options that don't seem to be supported by asyncpg, so removed those