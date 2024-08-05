const APP_TOKEN = 'd28721be-fd2d-4b45-869e-9f253b554e50';
const PROMO_ID = '43e35910-c168-4634-ad4f-52fd764a843f';
const EVENTS_DELAY = 20000;
const defaultLanguage = document.documentElement.getAttribute('lang')

var currentLanguage;
var keygenActive = false;

document.addEventListener('DOMContentLoaded', () => {
    const languageSelect = document.getElementById('languageSelect');
    const supportedLangs = Array.from(languageSelect.options).map(option => option.value);

    const storedLang = localStorage.getItem('language');
    const userLang = storedLang || navigator.language || navigator.userLanguage;
    const defaultLang = supportedLangs.includes(userLang) ? userLang : defaultLanguage;
    switchLanguage(defaultLang);
});

async function loadTranslations(language) {
    try {
        const response = await fetch(`locales/${language}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load translations: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading translations:', error);
        alert('Failed to load translations. Check the console for details.');
        throw error;
    }
}

async function getTranslation(key) {
    const translations = await loadTranslations(currentLanguage);
    return translations[key] || key;
}

function applyTranslations(translations) {
    document.querySelector('h1').innerText = translations.title;
    document.getElementById('keyCountLabel').innerText = keygenActive
        ? translations.selectKeyCountLabel_selected + document.getElementById('keyCountSelect').value
        : translations.selectKeyCountLabel;
    document.getElementById('startBtn').innerText = translations.generateButton;
    document.getElementById('generatedKeysTitle').innerText = translations.generatedKeysTitle;
    document.getElementById('creatorChannelBtn').innerText = translations.footerButton;
    document.getElementById('copyAllBtn').innerText = translations.copyAllKeysButton;

    document.querySelectorAll('.copyKeyBtn').forEach(button => {
        button.innerText = translations.copyKeyButton || 'Copy Key';
    });
}

async function switchLanguage(language) {
    try {
        const translations = await loadTranslations(language);
        applyTranslations(translations);
        currentLanguage = language;
        localStorage.setItem('language', language);
        languageSelect.value = language;
    } catch (error) {
        console.error('Error switching language:', error);
    }
}

languageSelect.addEventListener('change', () => {
    const newLanguage = languageSelect.value;
    switchLanguage(newLanguage);
});

document.getElementById('startBtn').addEventListener('click', async () => {
    const startBtn = document.getElementById('startBtn');
    const keyCountSelect = document.getElementById('keyCountSelect');
    const keyCountLabel = document.getElementById('keyCountLabel');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const keyContainer = document.getElementById('keyContainer');
    const keysList = document.getElementById('keysList');
    const copyAllBtn = document.getElementById('copyAllBtn');
    const generatedKeysTitle = document.getElementById('generatedKeysTitle');
    const keyCount = parseInt(keyCountSelect.value);

    progressBar.style.width = '0%';
    progressText.innerText = '0%';
    progressContainer.classList.remove('hidden');
    keyContainer.classList.add('hidden');
    generatedKeysTitle.classList.add('hidden');
    keysList.innerHTML = '';
    keyCountSelect.classList.add('hidden');
    keyCountLabel.innerText = await getTranslation('selectKeyCountLabel_selected') + keyCount;
    startBtn.classList.add('hidden');
    copyAllBtn.classList.add('hidden');
    startBtn.disabled = true;

    let progress = 0;
    keygenActive = true;

    const updateProgress = (increment) => {
        const steps = 10;
        const stepIncrement = increment / steps;
        let step = 0;

        const increaseProgress = () => {
            if (!keygenActive) return;
            if (step < steps) {
                progress += stepIncrement;
                progressBar.style.width = `${progress}%`;
                progressText.innerText = `${Math.round(progress)}%`;
                step++;
                setTimeout(increaseProgress, 2000 / steps + Math.random() * 1000);
            }
        };

        increaseProgress();
    };

    const generateKeyProcess = async () => {
        const clientId = generateClientId();
        let clientToken;
        try {
            clientToken = await login(clientId);
        } catch (error) {
            alert(`Failed to log in: ${error.message}`);
            startBtn.disabled = false;
            return null;
        }

        for (let i = 0; i < 7; i++) {
            await sleep(EVENTS_DELAY * delayRandom());
            const hasCode = await emulateProgress(clientToken);
            updateProgress(10 / keyCount);
            if (hasCode) {
                break;
            }
        }

        try {
            const key = await generateKey(clientToken);
            updateProgress(30 / keyCount);
            return key;
        } catch (error) {
            alert(`Failed to generate key: ${error.message}`);
            return null;
        }
    };

    const keys = await Promise.all(Array.from({ length: keyCount }, generateKeyProcess));

    keygenActive = false;

    progressBar.style.width = '100%';
    progressText.innerText = '100%';

    if (keys.length > 1) {
        const keyItemsPromises = keys.filter(key => key).map(async (key, index) => {
            const copyKeyButtonText = await getTranslation('copyKeyButton');
            return `
                <div class="key-item">
                    <div class="key-number">${index + 1}</div>
                    <input type="text" value="${key}" readonly>
                    <button class="copyKeyBtn copy-button" data-key="${key}">${copyKeyButtonText}</button>
                </div>
            `;
        });
        const keyItemsHtml = await Promise.all(keyItemsPromises);
        keysList.innerHTML = keyItemsHtml.join('');
        copyAllBtn.classList.remove('hidden');
    } else if (keys.length === 1) {
        keysList.innerHTML = `
            <div class="key-item">
                <div class="key-number">1</div>
                <input type="text" value="${keys[0]}" readonly>
                <button class="copyKeyBtn copy-button" data-key="${keys[0]}">${await getTranslation('copyKeyButton')}</button>
            </div>
        `;
    }

    keyContainer.classList.remove('hidden');
    generatedKeysTitle.classList.remove('hidden');
    keyCountLabel.innerText = await getTranslation('selectKeyCountLabel');
    document.querySelectorAll('.copyKeyBtn').forEach(button => {
        button.addEventListener('click', (event) => {
            const key = event.target.getAttribute('data-key');
            navigator.clipboard.writeText(key).then(async () => {
                event.target.innerText = await getTranslation('keyCopied');
                event.target.style.backgroundColor = '#28a745';
                setTimeout(async () => {
                    event.target.innerText = await getTranslation('copyKeyButton');
                    event.target.style.backgroundColor = '#6a0080';
                }, 2000);
            });
        });
    });
    copyAllBtn.addEventListener('click', async (event) => {
        const keysText = keys.filter(key => key).join('\n');
        navigator.clipboard.writeText(keysText).then(async () => {
            event.target.innerText = await getTranslation('allKeysCopied');
            event.target.style.backgroundColor = '#28a745';
            setTimeout(async () => {
                event.target.innerText = await getTranslation('copyAllKeysButton');
                event.target.style.backgroundColor = '#6a0080';
            }, 2000);
        });
    });

    startBtn.classList.remove('hidden');
    keyCountSelect.classList.remove('hidden');
    startBtn.disabled = false;
});

document.getElementById('creatorChannelBtn').addEventListener('click', () => {
    window.location.href = 'https://t.me/pdosi_project';
});

function generateClientId() {
    const timestamp = Date.now();
    const randomNumbers = Array.from({ length: 19 }, () => Math.floor(Math.random() * 10)).join('');
    return `${timestamp}-${randomNumbers}`;
}

async function login(clientId) {
    const response = await fetch('https://api.gamepromo.io/promo/login-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appToken: APP_TOKEN, clientId, clientOrigin: 'deviceid' })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to log in');
    }
    return data.clientToken;
}

function generateUUID() {
    if (typeof crypto.randomUUID === 'function') {
        try {
            return crypto.randomUUID();
        } catch (error) {
            console.warn('crypto.randomUUID() failed, falling back to old method.');
        }
    }

    const cryptoObj = window.crypto || window.msCrypto;
    if (cryptoObj && cryptoObj.getRandomValues) {
        const bytes = new Uint8Array(16);
        cryptoObj.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        return [
            bytes.slice(0, 4).toString('hex'),
            bytes.slice(4, 6).toString('hex'),
            bytes.slice(6, 8).toString('hex'),
            bytes.slice(8, 10).toString('hex'),
            bytes.slice(10).toString('hex')
        ].join('-');
    } else {
        console.warn('crypto.getRandomValues not supported. Falling back to a less secure method.');
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

async function emulateProgress(clientToken) {
    const response = await fetch('https://api.gamepromo.io/promo/register-event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clientToken}`
        },
        body: JSON.stringify({
            promoId: PROMO_ID,
            eventId: generateUUID(),
            eventOrigin: 'undefined'
        })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to register event');
    }
    return data.hasCode;
}

async function generateKey(clientToken) {
    const response = await fetch('https://api.gamepromo.io/promo/create-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clientToken}`
        },
        body: JSON.stringify({ promoId: PROMO_ID })
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to generate key');
    }
    return data.promoCode;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function delayRandom() {
    return Math.random() / 3 + 1;
}
