const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors'); 

const app = express();
app.use(express.json());
app.use(cors());

let browser;
let page;

/**
 * Initialize Browser in Stealth & Ultra-Fast Mode
 */
async function initBrowser() {
    console.log("🚀 Initializing browser in Stealth Desktop Mode...");
    try {
        if (browser) await browser.close(); 

        browser = await puppeteer.launch({ 
            headless: "new", 
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--single-process',
                '--window-size=1920,1080'
            ] 
        });
        
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setDefaultNavigationTimeout(30000); 

        page.on('dialog', async dialog => {
            console.log(`[DIALOG] Auto-Accepted: ${dialog.message()}`);
            await dialog.accept();
        });
        
        await page.goto('https://pay.eagleeyetopup.com/login', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });

        await page.type('input[type="email"]', 'nac009hid@gmail.com');
        await page.type('input[type="password"]', '123456');
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
            page.click('button[type="submit"]')
        ]);
        
        console.log("✅ Login successful! Bot is ready as a REAL USER.");
    } catch (err) {
        console.log("❌ Initial login failed:", err.message);
    }
}

initBrowser();

app.get('/', (req, res) => res.send("Stealth Bot + Real-Time Checker is active!"));

/**
 * 🕵️‍♂️ REAL-TIME CHECKER: টপ-আপ সাইটের Payment (Used) পেজ চেক করা
 * URL: http://31.97.50.28:10000/api/check-used-status
 */
app.post('/api/check-used-status', async (req, res) => {
    const targetTrxID = req.body.transaction_id;
    if (!targetTrxID) return res.status(400).json({ error: "No ID provided" });

    console.log(`\n🔍 Checking if ID: ${targetTrxID} is already USED in Top-up site...`);
    
    try {
        if (!page || page.url().includes('login')) await initBrowser();
        
        // আপনার দেওয়া লিংকে গিয়ে আইডি চেক করছে
        await page.goto(`https://pay.eagleeyetopup.com/payment?search=${targetTrxID}`, { 
            waitUntil: 'domcontentloaded', timeout: 30000 
        });
        
        const isUsed = await page.evaluate((id) => document.body.innerText.includes(id), targetTrxID);
        
        if (isUsed) {
            console.log(`🚫 RESULT: ID ${targetTrxID} is already USED in Top-up Site!`);
            res.json({ is_used: true });
        } else {
            console.log(`✅ RESULT: ID ${targetTrxID} is CLEAN.`);
            res.json({ is_used: false });
        }
    } catch (error) {
        console.log("⚠️ Check Error:", error.message);
        // এরর হলে পেমেন্ট যেন আটকে না থাকে, তাই false পাঠানো হচ্ছে
        res.json({ is_used: false, error: error.message });
    }
});

/**
 * 🗑️ Targeted Deletion (Esports Web -> Top-up Web direction)
 * URL: http://31.97.50.28:10000/api/verify-cross-check
 */
app.post('/api/verify-cross-check', (req, res) => {
    const targetTrxID = req.body.transaction_id;
    if (!targetTrxID) return res.status(400).json({ error: "No ID provided" });

    console.log(`\n⚡ Received ID: ${targetTrxID}. Processing Deletion from Store Data...`);
    res.json({ status: "PROCESSING", message: `Searching for ID: ${targetTrxID}` });

    (async () => {
        try {
            if (!page || page.url().includes('login')) await initBrowser();

            console.log(`✅ Searching Store Data to delete: ${targetTrxID}...`);
            const maxAttempts = 3; 
            const waitTime = 5000; 

            async function attemptDelete(attempt) {
                if (attempt > maxAttempts) {
                    console.log(`❌ Giving up! ID ${targetTrxID} not found after ${maxAttempts} attempts.`);
                    return;
                }
                try {
                    console.log(`🔍 [Attempt ${attempt}/3] Searching for: ${targetTrxID}`);
                    await page.goto(`https://pay.eagleeyetopup.com/storedatum?search=${targetTrxID}`, { 
                        waitUntil: 'domcontentloaded', timeout: 30000 
                    });
                    await new Promise(r => setTimeout(r, 2000));
                    const idExists = await page.evaluate((id) => document.body.innerText.includes(id), targetTrxID);

                    if (idExists) {
                        const deleteBtn = 'button.btn-danger, a.btn-danger, .fa-trash, [title="Delete"]';
                        const button = await page.$(deleteBtn);
                        if (button) {
                            await page.click(deleteBtn);
                            console.log(`🗑️ SUCCESS: Targeted ID ${targetTrxID} found and deleted!`);
                        }
                        return; 
                    } else {
                        console.log(`⏳ ID ${targetTrxID} not found yet. Waiting 5s...`);
                        setTimeout(() => attemptDelete(attempt + 1), waitTime);
                    }
                } catch (e) {
                    console.log(`⚠️ Attempt ${attempt} error: ${e.message}. Retrying...`);
                    setTimeout(() => attemptDelete(attempt + 1), waitTime);
                }
            }
            attemptDelete(1);
        } catch (error) {
            console.log("⚠️ Core Task Error:", error.message);
        }
    })();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🟢 Stealth Bot + Real-Time Checker live on port ${PORT}`));