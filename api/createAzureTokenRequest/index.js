const fetch = require('node-fetch');
const atob = require('atob');

const subscriptionKey = process.env.ACS_API_KEY;
const serviceRegion = process.env.ACS_API_REGION;

module.exports = async function (context, req) {    
    const result = await fetch(`https://${serviceRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
        method: 'post',
        body:    JSON.stringify({}),
        headers: { 
            'Content-Type': 'application/json' ,
            'Ocp-Apim-Subscription-Key' : subscriptionKey
        },
    });

    const responseText = await result.text();
    const token = JSON.parse(atob(responseText.split(".")[1]));
    
    context.res = {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authorizationToken:responseText, ...token })
    };
};