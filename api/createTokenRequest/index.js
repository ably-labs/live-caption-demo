const Ably = require('ably/promises');

module.exports = async function (context, req) {
    const client = new Ably.Realtime(process.env.ABLY_API_KEY);
    const tokenRequestData = await client.auth.createTokenRequest({ clientId: 'ably-livecaption' });
    context.res = {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tokenRequestData)
    };
};