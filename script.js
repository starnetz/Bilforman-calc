import { kommunalskatter } from './kommuner.js';

// Konfiguration
const API_CONFIG = {
    baseUrl: 'http://localhost:3000/api'
};

// Globala variabler
let bilmodeller = [];
let accessToken = null;

// DOM-element
const bilmarkeSelect = document.getElementById('bilmarke');
const modellSelect = document.getElementById('modell');
const tillverkningsarSelect = document.getElementById('tillverkningsar');
const drivmedelSelect = document.getElementById('drivmedel');
const anstallningsperiodSelect = document.getElementById('anstallningsperiod');
const delarArGroup = document.getElementById('delarArGroup');
const bilformanForm = document.getElementById('bilformanForm');

// DOM-element för skatteberäkning
let bruttolonInput;
let kommunSelect;
let resultatDiv;
let nextButton;
let valdKommunSpan;

// Konstanter för skatteberäkning
const STATLIG_SKATTESATS = 20.0; // 20% över brytpunkten
const STATLIG_SKATTEGRANS_MANAD = 49875; // 598 500 kr/år

// Beräkna grundavdrag (förenklad version)
function beraknaGrundavdrag(arsinkomst) {
    if (arsinkomst <= 50000) return arsinkomst;
    if (arsinkomst <= 150000) return 50000;
    if (arsinkomst <= 350000) return 50000 + (arsinkomst - 150000) * 0.1;
    return 70000;
}

// Beräkna nettolön utan förmån baserat på bruttolön och kommunalskatt
function beraknaNettolon(bruttolonManad, kommunalskatt) {
    const STATLIG_SKATT = 0.20;
    const BRYTPUNKT_STATLIG_SKATT = 615300 / 12; // Månadsbelopp
    
    // Beräkna marginalskatt
    const harStatligSkatt = bruttolonManad > BRYTPUNKT_STATLIG_SKATT;
    const marginalskatt = kommunalskatt + (harStatligSkatt ? STATLIG_SKATT : 0);
    
    // Beräkna nettolön (förenklad beräkning)
    let nettolon;
    if (harStatligSkatt) {
        const overBrytpunkt = bruttolonManad - BRYTPUNKT_STATLIG_SKATT;
        nettolon = (BRYTPUNKT_STATLIG_SKATT * (1 - kommunalskatt)) + 
                   (overBrytpunkt * (1 - (kommunalskatt + STATLIG_SKATT)));
    } else {
        nettolon = bruttolonManad * (1 - kommunalskatt);
    }
    
    return {
        nettolon,
        marginalskatt
    };
}

// Uppdatera resultatet
function uppdateraResultat() {
    const bruttolonManad = parseFloat(bruttolonInput.value) || 0;
    const valdKommun = kommunSelect.value;
    const kommunalskatt = kommunalskatter[valdKommun] / 100; // Konvertera från procent till decimal
    
    if (bruttolonManad && kommunalskatt) {
        const { nettolon, marginalskatt } = beraknaNettolon(bruttolonManad, kommunalskatt);
        
        valdKommunSpan.textContent = valdKommun;
        document.getElementById('nettolon-belopp').textContent = 
            formatCurrency(nettolon);
        
        const skattInfo = document.querySelector('#nettolon-resultat .space-y-2');
        skattInfo.innerHTML = `
            <div class="flex justify-between items-center border-b border-gray-200 py-3">
                <span>Kommunalskatt (${(kommunalskatt * 100).toFixed(2)}%)</span>
                <span class="font-medium">${formatCurrency(bruttolonManad * kommunalskatt)}/mån</span>
            </div>
            <div class="flex justify-between items-center border-b border-gray-200 py-3">
                <span>Marginalskatt</span>
                <span class="font-medium">${(marginalskatt * 100).toFixed(2)}%</span>
            </div>
            <div class="flex justify-between items-center py-3 text-blue-600 font-semibold">
                <span>Nettolön utan förmån</span>
                <span>${formatCurrency(nettolon)}/mån</span>
            </div>
        `;
        
        resultatDiv.classList.remove('hidden');
        nextButton.disabled = false;
    } else {
        resultatDiv.classList.add('hidden');
        nextButton.disabled = true;
    }
}

// Initiera kommunlistan
function initKommuner() {
    console.log('Initierar kommunlista...');
    console.log('Tillgängliga kommuner:', Object.keys(kommunalskatter).length);
    
    const sortedKommuner = Object.keys(kommunalskatter).sort((a, b) => 
        a.localeCompare(b, 'sv-SE')
    );
    
    console.log('Sorterade kommuner:', sortedKommuner);
    
    // Rensa befintliga alternativ
    kommunSelect.innerHTML = '';
    
    // Lägg till standardalternativ
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Välj kommun';
    kommunSelect.appendChild(defaultOption);
    
    // Lägg till alla kommuner
    sortedKommuner.forEach(kommun => {
        const option = document.createElement('option');
        option.value = kommun;
        option.textContent = `${kommun} (${kommunalskatter[kommun].toFixed(2)}%)`;
        kommunSelect.appendChild(option);
    });
    
    console.log('Kommunlista har initierats med', kommunSelect.options.length - 1, 'kommuner');
}

// Tab-hantering
function showTab(tabId) {
    // Dölj alla sektioner
    document.getElementById('lon-section').classList.add('hidden');
    document.getElementById('bil-section').classList.add('hidden');
    document.getElementById('resultat-section').classList.add('hidden');
    
    // Återställ alla tab-knappar
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('border-blue-500', 'text-blue-600', 'bg-blue-50');
        tab.classList.add('text-gray-500');
    });
    
    // Visa vald sektion och markera tab
    document.getElementById(`${tabId}-section`).classList.remove('hidden');
    const activeTab = document.getElementById(`tab-${tabId}`);
    activeTab.classList.add('border-blue-500', 'text-blue-600', 'bg-blue-50');
    activeTab.classList.remove('text-gray-500');
}

// Initiera sidan
function initPage() {
    console.log('Initierar sidan...');
    
    // Hämta DOM-element
    bruttolonInput = document.getElementById('bruttolön');
    kommunSelect = document.getElementById('kommun');
    resultatDiv = document.getElementById('nettolon-resultat');
    nextButton = document.getElementById('next-button');
    valdKommunSpan = document.getElementById('vald-kommun');
    
    if (!bruttolonInput || !kommunSelect || !resultatDiv || !nextButton || !valdKommunSpan) {
        console.error('Kunde inte hitta alla nödvändiga DOM-element!');
        return;
    }
    
    console.log('DOM-element hittade, initierar kommuner...');
    initKommuner();
    
    // Förifyll bruttolön med 60 000 kr
    bruttolonInput.value = '60000';
    kommunSelect.value = '';
    resultatDiv.classList.add('hidden');
    nextButton.disabled = true;
    
    // Lägg till event listeners
    bruttolonInput.addEventListener('input', uppdateraResultat);
    kommunSelect.addEventListener('change', uppdateraResultat);
    
    // Lägg till event listeners för tab-navigation
    document.getElementById('tab-lon').addEventListener('click', () => showTab('lon'));
    document.getElementById('tab-bil').addEventListener('click', () => showTab('bil'));
    document.getElementById('tab-resultat').addEventListener('click', () => showTab('resultat'));
    
    // Hantera "Nästa"-knappen
    nextButton.addEventListener('click', () => {
        showTab('bil');
        getBilmodeller(); // Hämta bilmodeller när vi går till bilförmånssidan
    });
    
    // Hantera "Tillbaka"-knappar
    document.getElementById('back-to-lon').addEventListener('click', () => showTab('lon'));
    document.getElementById('back-to-bil').addEventListener('click', () => showTab('bil'));
    
    // Lägg till event listeners för förmånsvärdeshantering
    document.getElementById('use-kant-formansvarde').addEventListener('click', useKnownFormansvarde);
    document.getElementById('show-formansvarde-calc').addEventListener('click', showFormanvardeCalc);
    
    console.log('Sidan har initierats');
}

// Vänta på att DOM:en är laddad
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM laddad, startar initiering...');
    initPage();
});

// Hämta access token
async function getAccessToken() {
    try {
        console.log('Begär ny access token...');
        const response = await fetch(`${API_CONFIG.baseUrl}/token`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            }
        });

        console.log('Token-svar status:', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Token-fel:', errorData);
            throw new Error(`Kunde inte hämta access token: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Mottagen token:', data);
        
        if (!data.access_token) {
            throw new Error('Ingen access token i svaret');
        }
        
        accessToken = data.access_token;
        return accessToken;
    } catch (error) {
        console.error('Fel vid hämtning av access token:', error);
        throw error;
    }
}

// Hämta bilmodeller från API
async function getBilmodeller() {
    try {
        if (!accessToken) {
            console.log('Ingen token finns, hämtar ny...');
            await getAccessToken();
        }

        const correlationId = crypto.randomUUID();
        console.log('Anropar API med correlation ID:', correlationId);
        console.log('Använder token:', accessToken);

        const response = await fetch(`${API_CONFIG.baseUrl}/bilmodeller`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        console.log('Bilmodeller-svar status:', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Bilmodeller-fel:', errorData);
            if (response.status === 401) {
                console.log('Token kan vara utgången, försöker hämta ny...');
                accessToken = null;
                return getBilmodeller();
            }
            throw new Error(`Kunde inte hämta bilmodeller: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log('Mottaget API-svar:', data);
        
        if (!data.bilmodeller || data.bilmodeller.length === 0) {
            throw new Error('Inga bilmodeller hittades i svaret');
        }

        bilmodeller = data.bilmodeller;
        console.log('Bilmodeller sparade:', bilmodeller.length);
        console.log('Första bilmodellen:', bilmodeller[0]);
        
        // Fyll i bilmärken direkt
        const bilmarken = [...new Set(bilmodeller.map(bil => bil.bilmarke))].sort();
        console.log('Unika bilmärken:', bilmarken);
        
        bilmarkeSelect.innerHTML = '<option value="">Välj bilmärke</option>';
        
        bilmarken.forEach(marke => {
            const option = document.createElement('option');
            option.value = marke;
            option.textContent = marke;
            bilmarkeSelect.appendChild(option);
        });
        
        console.log('Bilmärken har populerats');
        return bilmodeller;
    } catch (error) {
        console.error('Fel vid hämtning av bilmodeller:', error);
        throw error;
    }
}

// Fyll i modeller baserat på valt bilmärke
function populateModeller() {
    try {
        console.log('Populerar modeller...');
        const valtMarke = bilmarkeSelect.value;
        console.log('Valt bilmärke:', valtMarke);
        
        if (!valtMarke) {
            console.log('Inget bilmärke valt');
            return;
        }
        
        const modeller = bilmodeller
            .filter(bil => bil.bilmarke === valtMarke)
            .map(bil => bil.modell)
            .sort();
        
        console.log('Tillgängliga modeller för valt märke:', modeller);

        modellSelect.innerHTML = '<option value="">Välj modell</option>';
        
        modeller.forEach(modell => {
            const option = document.createElement('option');
            option.value = modell;
            option.textContent = modell;
            modellSelect.appendChild(option);
        });
        
        console.log('Modeller har populerats');
    } catch (error) {
        console.error('Fel vid populerande av modeller:', error);
    }
}

// Fyll i tillverkningsår
function populateTillverkningsar() {
    console.log('Populerar tillverkningsår...');
    const valtMarke = bilmarkeSelect.value;
    const valtModell = modellSelect.value;
    console.log('Valt bilmärke:', valtMarke);
    console.log('Valt modell:', valtModell);
    
    const ar = bilmodeller
        .filter(bil => bil.bilmarke === valtMarke && bil.modell === valtModell)
        .map(bil => bil.tillverkningsar)
        .sort((a, b) => b - a);
    
    console.log('Tillgängliga år:', ar);

    tillverkningsarSelect.innerHTML = '<option value="">Välj år</option>';
    
    ar.forEach(ar => {
        const option = document.createElement('option');
        option.value = ar;
        option.textContent = ar;
        tillverkningsarSelect.appendChild(option);
    });
    
    console.log('År har populerats');
}

// Fyll i drivmedel
function populateDrivmedel() {
    console.log('Populerar drivmedel...');
    const valtMarke = bilmarkeSelect.value;
    const valtModell = modellSelect.value;
    const valtAr = tillverkningsarSelect.value;
    console.log('Valt bilmärke:', valtMarke);
    console.log('Valt modell:', valtModell);
    console.log('Valt år:', valtAr);
    
    const drivmedel = bilmodeller
        .filter(bil => 
            bil.bilmarke === valtMarke && 
            bil.modell === valtModell && 
            bil.tillverkningsar === parseInt(valtAr)
        )
        .map(bil => bil.drivmedel)
        .sort();
    
    console.log('Tillgängliga drivmedel:', drivmedel);

    drivmedelSelect.innerHTML = '<option value="">Välj drivmedel</option>';
    
    drivmedel.forEach(drivmedel => {
        const option = document.createElement('option');
        option.value = drivmedel;
        option.textContent = drivmedel;
        drivmedelSelect.appendChild(option);
    });
    
    console.log('Drivmedel har populerats');
}

// Beräkna förmån enligt Skatteverkets formel
function beraknaForman() {
    const valtMarke = bilmarkeSelect.value;
    const valtModell = modellSelect.value;
    const valtAr = tillverkningsarSelect.value;
    const valtDrivmedel = drivmedelSelect.value;
    const registreringsdatum = document.getElementById('registreringsdatum').value;
    const fordonsskatt = parseFloat(document.getElementById('fordonsskatt').value) || 0;
    const extrautrustning = parseFloat(document.getElementById('extrautrustning').value) || 0;
    const korsMycketTjanst = document.getElementById('tjanstekm-ja').checked;

    const valdBil = bilmodeller.find(bil => 
        bil.bilmarke === valtMarke && 
        bil.modell === valtModell && 
        bil.tillverkningsar === parseInt(valtAr) &&
        bil.drivmedel === valtDrivmedel
    );

    if (!valdBil) {
        console.error('Kunde inte hitta bilinformation');
        return;
    }

    // Hämta nybilspris och lägg till extrautrustning
    const nybilspris = valdBil.nybilspris;
    const formansgrundandePris = nybilspris + extrautrustning;
    
    // Beräkna prisbasbeloppsdelens procentsats (29% av prisbasbeloppet 57 300 kr för 2024)
    const prisbasbelopp = 57300; // Prisbasbelopp för 2024
    const prisbasbeloppsdel = prisbasbelopp * 0.29;

    // Beräkna räntedelen (70% av statslåneräntan + 1 procentenhet) * formansgrundandePris
    const statslanerantan = 0.0396; // 3,96% för 2024
    const rantedel = formansgrundandePris * ((statslanerantan * 0.7) + 0.01);

    // Beräkna prisdelen (13% av formansgrundandePris)
    const prisdel = formansgrundandePris * 0.13;

    // Lägg till fordonsskatt
    const fordonsskattdel = fordonsskatt;

    // Beräkna totalt förmånsvärde per år
    let arsforman = prisbasbeloppsdel + rantedel + prisdel + fordonsskattdel;

    // Nedsättning med 25% om bilen körs mer än 3000 mil i tjänsten
    if (korsMycketTjanst) {
        arsforman *= 0.75;
    }

    // Avrunda till närmaste 100-tal kronor enligt Skatteverkets regler
    arsforman = Math.round(arsforman / 100) * 100;
    const manadsforman = Math.round(arsforman / 12);

    // Spara beräknade värden
    window.beraknatResultat = {
        valdBil: `${valdBil.bilmarke} ${valdBil.modell} ${valdBil.tillverkningsar} ${valdBil.drivmedel}`,
        nybilspris,
        formansgrundandePris,
        prisbasbeloppsdel,
        rantedel,
        prisdel,
        fordonsskattdel,
        arsforman,
        manadsforman
    };
}

// Visa resultat
function visaResultat() {
    if (!window.beraknatResultat) {
        console.error('Inget beräknat resultat finns');
        return;
    }

    const { 
        valdBil, 
        nybilspris, 
        formansgrundandePris,
        prisbasbeloppsdel,
        rantedel,
        prisdel,
        fordonsskattdel,
        arsforman,
        manadsforman 
    } = window.beraknatResultat;

    // Uppdatera DOM med alla värden
    document.getElementById('vald-bil').textContent = valdBil;
    document.getElementById('nybilspris').textContent = formatCurrency(nybilspris);
    document.getElementById('formansgrundandePris').textContent = formatCurrency(formansgrundandePris);

    // Uppdatera resultatvyn med detaljerad beräkning
    const resultatDiv = document.getElementById('resultat-section');
    const detaljDiv = resultatDiv.querySelector('.bg-gradient-to-br');
    
    detaljDiv.innerHTML = `
        <div class="grid grid-cols-1 gap-6">
            <div>
                <p class="text-sm text-gray-500 mb-1">Vald bil</p>
                <p class="text-lg font-semibold text-gray-900">${valdBil}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500 mb-1">Nybilspris</p>
                <p class="text-lg font-semibold text-gray-900">${formatCurrency(nybilspris)}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500 mb-1">Förmånsgrundande pris</p>
                <p class="text-lg font-semibold text-gray-900">${formatCurrency(formansgrundandePris)}</p>
            </div>
            <div class="border-t border-blue-200 pt-4">
                <p class="text-sm text-gray-500 mb-1">Prisbasbeloppsdel</p>
                <p class="text-lg font-semibold text-gray-900">${formatCurrency(prisbasbeloppsdel)}</p>
                <p class="text-xs text-gray-500 mt-1">29% av ett prisbasbelopp (prisbasbeloppet är 57 300 kronor)</p>
            </div>
            <div>
                <p class="text-sm text-gray-500 mb-1">Räntedel</p>
                <p class="text-lg font-semibold text-gray-900">${formatCurrency(rantedel)}</p>
                <p class="text-xs text-gray-500 mt-1">Förmånsgrundande pris multiplicerat med summan av 70% av statslåneräntan (statslåneräntan är 3,96%) och 1%</p>
            </div>
            <div>
                <p class="text-sm text-gray-500 mb-1">Prisdel</p>
                <p class="text-lg font-semibold text-gray-900">${formatCurrency(prisdel)}</p>
                <p class="text-xs text-gray-500 mt-1">13% av förmånsgrundande pris</p>
            </div>
            <div>
                <p class="text-sm text-gray-500 mb-1">Fordonsskatt</p>
                <p class="text-lg font-semibold text-gray-900">${formatCurrency(fordonsskattdel)}</p>
                <p class="text-xs text-gray-500 mt-1">Bilens fordonsskatt enligt vägtrafikskattelagen</p>
            </div>
            <div class="border-t border-blue-200 pt-4">
                <p class="text-sm text-gray-500 mb-1">Förmånsvärde per år</p>
                <p class="text-2xl font-bold text-blue-600">${formatCurrency(arsforman)}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500 mb-1">Förmånsvärde per månad</p>
                <p class="text-3xl font-bold text-blue-600">${formatCurrency(manadsforman)}</p>
            </div>
        </div>
    `;

    // Visa resultatsektionen
    showTab('resultat');
}

// Kontrollera om alla fält är ifyllda och beräkna förmånsvärde
function checkFormAndCalculate() {
    const valtMarke = bilmarkeSelect.value;
    const valtModell = modellSelect.value;
    const valtAr = tillverkningsarSelect.value;
    const valtDrivmedel = drivmedelSelect.value;
    const registreringsdatum = document.getElementById('registreringsdatum').value;
    const fordonsskatt = document.getElementById('fordonsskatt').value;
    const extrautrustning = document.getElementById('extrautrustning').value;
    const showResultButton = document.getElementById('show-result');

    // Kontrollera om alla obligatoriska fält är ifyllda
    if (valtMarke && valtModell && valtAr && valtDrivmedel && 
        registreringsdatum && fordonsskatt && extrautrustning) {
        beraknaForman();
        showResultButton.disabled = false;
    } else {
        showResultButton.disabled = true;
    }
}

// Lägg till event listeners för nya fält
document.getElementById('registreringsdatum').addEventListener('change', checkFormAndCalculate);
document.getElementById('fordonsskatt').addEventListener('input', checkFormAndCalculate);
document.getElementById('extrautrustning').addEventListener('input', checkFormAndCalculate);
document.getElementById('tjanstekm-ja').addEventListener('change', checkFormAndCalculate);
document.getElementById('tjanstekm-nej').addEventListener('change', checkFormAndCalculate);

// Initiera applikationen
async function init() {
    try {
        console.log('Startar initiering av applikationen...');
        await getBilmodeller();
        console.log('Bilmodeller har hämtats och populerats');
        
        // Lägg till event listeners för att hantera ändringar
        bilmarkeSelect.addEventListener('change', () => {
            console.log('Bilmärke ändrat till:', bilmarkeSelect.value);
            populateModeller();
            checkFormAndCalculate();
        });

        modellSelect.addEventListener('change', () => {
            console.log('Modell ändrat till:', modellSelect.value);
            populateTillverkningsar();
            checkFormAndCalculate();
        });

        tillverkningsarSelect.addEventListener('change', () => {
            console.log('Tillverkningsår ändrat till:', tillverkningsarSelect.value);
            populateDrivmedel();
            checkFormAndCalculate();
        });

        drivmedelSelect.addEventListener('change', () => {
            console.log('Drivmedel ändrat till:', drivmedelSelect.value);
            checkFormAndCalculate();
        });

        // Lägg till event listener för "Visa resultat"-knappen
        document.getElementById('show-result').addEventListener('click', () => {
            visaResultat();
            // Lägg till en "Nästa" knapp i resultatvyn
            const resultatDiv = document.getElementById('resultat-section');
            const buttonContainer = resultatDiv.querySelector('.mt-8.flex.justify-end.space-x-4');
            buttonContainer.innerHTML = `
                <button type="button" id="back-to-bil"
                        class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    <i class="fas fa-arrow-left mr-2"></i>
                    Tillbaka
                </button>
                <button type="button" id="show-total-result"
                        class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                    Nästa
                    <i class="fas fa-arrow-right ml-2"></i>
                </button>
            `;
            
            // Lägg till event listeners för knapparna
            document.getElementById('back-to-bil').addEventListener('click', () => showTab('bil'));
            document.getElementById('show-total-result').addEventListener('click', beraknaTotalResultat);
        });

        console.log('Applikationen har initierats');
    } catch (error) {
        console.error('Fel vid initiering:', error);
        alert('Kunde inte ladda bilmodeller. Kontrollera API-anslutningen.');
    }
}

// Starta applikationen när DOM:en är laddad
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM laddad, startar initiering...');
    init();
});

// Formatera valuta
function formatCurrency(amount) {
    return new Intl.NumberFormat('sv-SE', {
        style: 'currency',
        currency: 'SEK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Hantera känt förmånsvärde
function useKnownFormansvarde() {
    const kantFormansvarde = parseFloat(document.getElementById('kant-formansvarde').value);
    if (!kantFormansvarde || kantFormansvarde <= 0) {
        alert('Vänligen ange ett giltigt förmånsvärde');
        return;
    }

    // Spara beräknade värden med endast förmånsvärdet
    window.beraknatResultat = {
        valdBil: 'Egen bil',
        manadsforman: kantFormansvarde,
        arsforman: kantFormansvarde * 12
    };

    // Gå direkt till resultatberäkningen
    beraknaTotalResultat();
}

// Visa formuläret för beräkning av förmånsvärde
function showFormanvardeCalc() {
    document.getElementById('formansvarde-val').classList.add('hidden');
    document.getElementById('formansvarde-calc').classList.remove('hidden');
}

// Uppdatera beräknaTotalResultat för att använda den förenklade formeln
function beraknaTotalResultat() {
    const bruttolonManad = parseFloat(bruttolonInput.value) || 0;
    const valdKommun = kommunSelect.value;
    const kommunalskatt = kommunalskatter[valdKommun] / 100;
    const { manadsforman } = window.beraknatResultat;
    
    // Beräkna nettolön utan förmån och marginalskatt
    const { nettolon: nettoLonUtanForman, marginalskatt } = beraknaNettolon(bruttolonManad, kommunalskatt);
    
    // Beräkna nettokostnad för förmånsbilen
    const nettokostnadForman = manadsforman * marginalskatt;
    
    // Beräkna nettolön med förmån
    const nettoLonMedForman = nettoLonUtanForman - nettokostnadForman;

    // Uppdatera DOM med resultatet
    const resultatDiv = document.getElementById('resultat-section');
    resultatDiv.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
            <div class="p-8">
                <h3 class="text-xl font-semibold text-gray-900 mb-6 text-center">Min lön efter avdrag för förmånsbil</h3>
                
                <div class="bg-blue-50 p-6 rounded-xl mb-8 text-center">
                    <p class="text-4xl font-bold text-gray-900">${formatCurrency(nettoLonMedForman)}/mån</p>
                    <p class="text-sm text-gray-600 mt-2">Din nettolön efter avdrag för bilförmån</p>
                </div>

                <div class="space-y-6">
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 class="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Lön</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <p>Bruttolön</p>
                                <p class="font-medium">${formatCurrency(bruttolonManad)}/mån</p>
                            </div>
                            <div class="flex justify-between">
                                <p>Nettolön utan bilförmån</p>
                                <p class="font-medium">${formatCurrency(nettoLonUtanForman)}/mån</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 class="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Bilförmån</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <p>Förmånsvärde</p>
                                <p class="font-medium">${formatCurrency(manadsforman)}/mån</p>
                            </div>
                            <div class="flex justify-between">
                                <p>Marginalskatt</p>
                                <p class="font-medium">${(marginalskatt * 100).toFixed(2)}%</p>
                            </div>
                            <div class="flex justify-between border-t border-gray-200 pt-3">
                                <p>Nettokostnad för bilen</p>
                                <p class="font-medium">${formatCurrency(nettokostnadForman)}/mån</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <h4 class="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Slutresultat</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between">
                                <p>Nettolön utan bilförmån</p>
                                <p class="font-medium">${formatCurrency(nettoLonUtanForman)}/mån</p>
                            </div>
                            <div class="flex justify-between">
                                <p>Kostnad för bilförmån</p>
                                <p class="font-medium text-red-600">-${formatCurrency(nettokostnadForman)}/mån</p>
                            </div>
                            <div class="flex justify-between border-t border-gray-200 pt-3">
                                <p class="font-medium">Nettolön efter förmån</p>
                                <p class="font-bold text-blue-600">${formatCurrency(nettoLonMedForman)}/mån</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 flex justify-end space-x-4">
                    <button type="button" id="back-to-bil"
                            class="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                        <i class="fas fa-arrow-left mr-2"></i>
                        Tillbaka
                    </button>
                    <button type="button" id="new-calculation"
                            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200">
                        Ny beräkning
                    </button>
                </div>
            </div>
        </div>
    `;

    // Visa resultatsektionen
    showTab('resultat');

    // Lägg till event listeners för knapparna
    document.getElementById('back-to-bil').addEventListener('click', () => showTab('bil'));
    document.getElementById('new-calculation').addEventListener('click', () => {
        // Återställ formulär och visa första tabben
        document.getElementById('bilformanForm').reset();
        document.getElementById('kant-formansvarde').value = '';
        document.getElementById('formansvarde-val').classList.remove('hidden');
        document.getElementById('formansvarde-calc').classList.add('hidden');
        bruttolonInput.value = '60000';
        kommunSelect.value = '';
        showTab('lon');
    });
} 