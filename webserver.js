import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const port = 3001; // Använder port 3001 eftersom 3000 används av API-servern

// Servera statiska filer från aktuell katalog
app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`Server körs på http://localhost:${port}`);
}); 