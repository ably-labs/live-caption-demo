# Hosting on Azure Static Sites

## How to run on Azure

* Push this repository to GitHub
* Create a new Azure Static Web App
* Link it to your GitHub repository
* Azure will add a build task to your repository and deploy the app

You'll need to add your API key into a a Configuration setting in the Azure management portal.

Click:

* Click Configuration
* Add a setting named ABLY_API_KEY with your API key as the value
* Add a setting named ACS_API_KEY with your Azure Cognitive Services Key as the value
* Add a setting named ACS_API_REGION with your Azure Cognitive Services region as the value
* Save the settings.

## How it works

Azure static web apps don't run traditional "server side code", but if you include a directory with some Azure functions in your application, Azures deployment engine will automatically create and manage Azure functions for you, that you can call from your static application.

For local development, we'll just use the Azure functions SDK to replicate this, but for production, we can use static files (or files created by a static site generator of your choice) and Azure will serve them for us.
