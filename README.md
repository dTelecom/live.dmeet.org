# dMeet livestreaming demo

This Next.js application lets a host start a stream and viewers join it. Its server signs participant tokens locally with the older dTelecom server SDK.

For a new Cloud project, use [dTelecom Live](https://github.com/dTelecom/dtelecom-live). Its README walks through issuing a Cloud token and connecting to the room.

## Database setup for the historical example

1. Open https://vercel.com/dashboard/stores
2. Click "Create" at Postgress (Beta)
3. Select storage type "Postgress" and press "Continue"
4. Type database name, select location and press "Create"
5. Press "Connect Project" in "Getting started" section, select your project
6. Redeploy your project

## Running the historical example locally

Clone the repo and install dependencies:

```bash
git clone git@github.com:dTelecom/live.dmeet.org.git
cd live.dmeet.org
npm install
```

The original app expects a registered signing keypair in `API_KEY` and `API_SECRET`. Project keys from dTelecom Cloud use a different token flow.

Then run the development server:

```bash
npm run dev
```

You can test it by opening <http://localhost:3000> in a browser.
