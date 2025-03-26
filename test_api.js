import fetch from 'node-fetch';

const API_CONFIG = {
    baseUrl: 'https://api.test.skatteverket.se',
    clientId: '864bc863-a50e-4f7a-8ec2-2bc818a771ec',
    clientSecret: '33b53d0c-8c8b-4672-9ef0-eff090287524'
};

async function testAPI() {
    try {
        console.log('1. Hämtar access token...');
        const tokenResponse = await fetch(`${API_CONFIG.baseUrl}/oauth2/v1/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: API_CONFIG.clientId,
                client_secret: API_CONFIG.clientSecret
            })
        });

        console.log('Token Response Status:', tokenResponse.status);
        const tokenData = await tokenResponse.json();
        console.log('Token Response:', tokenData);

        if (!tokenResponse.ok) {
            throw new Error(`Token Error: ${tokenData.error || tokenResponse.statusText}`);
        }

        const accessToken = tokenData.access_token;
        console.log('Access Token mottaget:', accessToken ? 'Ja' : 'Nej');

        console.log('\n2. Hämtar bilmodeller...');
        const correlationId = 'test-' + Date.now();
        console.log('Correlation ID:', correlationId);

        const bilmodellerResponse = await fetch(`${API_CONFIG.baseUrl}/beskattning/bilforman/v2/nybilspriser?typ=PERSONBIL`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'client_id': API_CONFIG.clientId,
                'client_secret': API_CONFIG.clientSecret,
                'skv_client_correlation_id': correlationId
            }
        });

        console.log('Bilmodeller Response Status:', bilmodellerResponse.status);
        const bilmodellerData = await bilmodellerResponse.json();
        console.log('Bilmodeller Response:', bilmodellerData);

        if (!bilmodellerResponse.ok) {
            throw new Error(`Bilmodeller Error: ${bilmodellerData.error || bilmodellerResponse.statusText}`);
        }

        console.log('\nAntal bilmodeller:', bilmodellerData.bilmodeller?.length || 0);

    } catch (error) {
        console.error('\nFel uppstod:', error.message);
        if (error.response) {
            console.error('Response:', await error.response.text());
        }
    }
}

testAPI(); 