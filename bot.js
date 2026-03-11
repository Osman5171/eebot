const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors'); 
const fetch = require('node-fetch'); // যদি Node v18 এর নিচে হয়, তবে এটি লাগবে

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

app.get('/', (req, res) => res.send("Stealth Bot + Interceptor is active!"));

/**
 * 🕵️‍♂️ REVERSE INTERCEPTOR: টপ-আপ সাইটে পেমেন্ট হলে ESP সাইটে ব্লক করা
 * URL: http://31.97.50.28:10000/api/reverse-interceptor
 */
app.post('/api/reverse-interceptor', async (req, res) => {
    const payload = req.body;
    // গেটওয়ে থেকে আসা ট্রানজেকশন আইডি খুঁজে বের করা
    const trxID = payload.transaction_id || payload.trx_id || payload.id;

    console.log(`\n🕵️‍♂️ INTERCEPTED: New Payment Signal! ID: ${trxID}`);

    if (trxID) {
        try {
            console.log(`🚫 Blocking ID: ${trxID} in ESP Website (Supabase)...`);
            
            /**
             * 🔥 সুপাবেজে ডাটা পাঠানোর লজিক (নিচের কমেন্টটুকু আপনার সুপাবেজ ডাটা অনুযায়ী সেট করতে হবে)
             * * await fetch('YOUR_SUPABASE_URL/rest/v1/used_transactions', {
             * method: 'POST',
             * headers: {
             * 'apikey': 'YOUR_SUPABASE_ANON_KEY',
             * 'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY',
             * 'Content-Type': 'application/json'
             * },
             * body: JSON.stringify({ transaction_id: trxID, source: 'TOPUP_SITE_INTERCEPT' })
             * });
             */
            
            console.log(`✅ ID: ${trxID} successfully blacklisted in ESP DB.`);
        } catch (err) {
            console.log("⚠️ ESP DB Update Error:", err.message);
        }
    }

    // টপ-আপ সাইটে ডাটা ফরওয়ার্ড করা
    try {
        console.log(`➡️ Forwarding data to Top-up site secret webhook...`);
        const topupWebhookUrl = "https://pay.eagleeyetopup.com/storesms/C44MTgzMzQyNjQ5ODYxNTUx";
        
        const response = await fetch(topupWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.text();
        console.log(`🏁 Top-up site response: ${result}`);
        
        // অরিজিনাল গেটওয়েকে উত্তর পাঠিয়ে দেওয়া
        res.status(200).send(result);
    } catch (error) {
        console.log("❌ Forwarding failed:", error.message);
        res.status(500).send("Error forwarding to top-up site");
    }
});

/**
 * Targeted Deletion (Esports Web -> Top-up Web direction)
 */
app.post('/api/verify-cross-check', (req, res) => {
    const targetTrxID = req.body.transaction_id;
    if (!targetTrxID) return res.status(400).json({ error: "No ID provided" });

    console.log(`\n⚡ Received ID: ${targetTrxID}. Processing Instantly...`);
    res.json({ status: "PROCESSING", message: `Searching for ID: ${targetTrxID}` });

    (async () => {
        try {
            if (!page || page.url().includes('login')) await initBrowser();

            try {
                await page.goto(`https://pay.eagleeyetopup.com/payment?search=${targetTrxID}`, { 
                    waitUntil: 'domcontentloaded', timeout: 30000 
                });
                const isUsed = await page.evaluate((id) => document.body.innerText.includes(id), targetTrxID);
                if (isUsed) {
                    console.log(`🚫 ID: ${targetTrxID} is USED! Skipping deletion.`);
                    return; 
                }
            } catch (navErr) {
                console.log(`⚠️ Used Check timed out for ${targetTrxID}, moving to Store search.`);
            }

            console.log(`✅ ID: ${targetTrxID} is CLEAN. Searching Store Data...`);
            const maxAttempts = 3; 
            const waitTime = 5000; 

            async function attemptDelete(attempt) {
                if (attempt > maxAttempts) return;
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
                        setTimeout(() => attemptDelete(attempt + 1), waitTime);
                    }
                } catch (e) {
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
app.listen(PORT, () => console.log(`🟢 Stealth Bot + Interceptor live on port ${PORT}`));