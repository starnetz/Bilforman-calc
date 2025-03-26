import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Funktion för att döda process på port 3000
async function killPort3000() {
    try {
        // Försök med pkill först
        await execAsync('pkill -f "node server.js"');
        console.log('Försökte döda process med pkill');
    } catch (error) {
        console.log('Ingen process hittades med pkill');
    }

    try {
        // Om pkill misslyckades, försök med lsof
        const { stdout } = await execAsync('lsof -i :3000 | grep LISTEN');
        if (stdout) {
            const pid = stdout.split(/\s+/)[1];
            console.log(`Hittade process ${pid} på port 3000, dödar den...`);
            await execAsync(`kill -9 ${pid}`);
            console.log('Processen har dödats');
        }
    } catch (error) {
        // Ignorera fel om ingen process hittades
        if (!error.message.includes('no process found')) {
            console.error('Fel vid dödning av process:', error);
        }
    }

    // Vänta en kort stund för att säkerställa att porten är ledig
    await new Promise(resolve => setTimeout(resolve, 1000));
}

// Starta servern
async function startServer() {
    try {
        // Döda eventuell existerande process på port 3000
        await killPort3000();
        
        // Starta servern
        const server = app.listen(PORT, () => {
            console.log(`Server kör på http://localhost:${PORT}`);
        });

        // Hantera process avslutning
        process.on('SIGTERM', () => {
            console.log('SIGTERM signal mottaget. Stänger server...');
            server.close(() => {
                console.log('Server stängd');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT signal mottaget. Stänger server...');
            server.close(() => {
                console.log('Server stängd');
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('Fel vid start av server:', error);
        process.exit(1);
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// OAuth credentials för token
const oauthClientId = "361f5e9b75dcc0875080b65628ce0023e9bb24cd7902dc67";
const oauthClientSecret = "aaedd9a768031bea5bc12fd7885bc645ad2e938d03870023e9bb24cd7902dc67";
const oauthCredentials = Buffer.from(`${oauthClientId}:${oauthClientSecret}`).toString('base64');

// API Gateway credentials
const apiClientId = '864bc863-a50e-4f7a-8ec2-2bc818a771ec';
const apiClientSecret = '33b53d0c-8c8b-4672-9ef0-eff090287524';

// Funktion för att hämta token
async function fetchToken() {
    try {
        console.log('Begär ny token från SKV API...');
        console.log('Använder OAuth credentials:');
        console.log('Client ID:', oauthClientId);
        console.log('Client Secret:', oauthClientSecret);
        
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'bilforman',
            client_id: oauthClientId,
            client_secret: oauthClientSecret
        });
        console.log('Request body:', body.toString());

        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Accept': 'application/json; charset=utf-8'
        };
        console.log('Request headers:', headers);

        const tokenUrl = "https://sysoauth2.test.skatteverket.se/oauth2/v1/sys/token";
        console.log('Token URL:', tokenUrl);

        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: headers,
            body: body.toString(),
            proxy: 'http://klientproxy.dmz.skv.se:8080'
        });

        console.log('Token-svar status:', tokenResponse.status);
        console.log('Token-svar headers:', tokenResponse.headers);
        
        const tokenData = await tokenResponse.json();
        console.log('Token-svar body:', tokenData);

        if (!tokenResponse.ok) {
            console.error('❌ Token-svar:', tokenData);
            throw new Error(`Token-fel: ${tokenResponse.status} ${tokenData.error_description || tokenData.message || tokenResponse.statusText}`);
        }

        console.log('✅ Token mottagen:', tokenData.access_token);
        return tokenData.access_token;
    } catch (error) {
        console.error('Fel vid hämtning av token:', error);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Proxy för token
app.post('/api/token', async (req, res) => {
    try {
        const token = await fetchToken();
        res.json({ access_token: token });
    } catch (error) {
        console.error('Fel vid hämtning av token:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Proxy för bilmodeller
app.get('/api/bilmodeller', async (req, res) => {
    try {
        const correlationId = 'proxy-' + Date.now();
        console.log('Begär bilmodeller från SKV API...');
        console.log('Authorization header:', req.headers.authorization);
        console.log('Alla request headers:', req.headers);
        
        if (!req.headers.authorization) {
            throw new Error('Ingen authorization header skickad');
        }

        const headers = {
            'Accept': 'application/json',
            'Authorization': req.headers.authorization,
            'client_id': apiClientId,
            'client_secret': apiClientSecret,
            'skv_client_correlation_id': correlationId
        };
        console.log('Request headers för bilmodeller:', headers);

        const response = await fetch('https://api.test.skatteverket.se/beskattning/bilforman/v2/nybilspriser?typ=PERSONBIL', {
            method: 'GET',
            headers: headers
        });

        console.log('Bilmodeller-svar status:', response.status);
        console.log('Bilmodeller-svar headers:', response.headers);
        
        const data = await response.json();
        console.log('Bilmodeller-svar body:', data);

        if (!response.ok) {
            console.error('Detaljerat fel:', {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: data
            });
            throw new Error(`Bilmodeller-fel: ${data.error || response.statusText}`);
        }

        res.json(data);
    } catch (error) {
        console.error('Fel vid hämtning av bilmodeller:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// Starta servern
startServer(); 