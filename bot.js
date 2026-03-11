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
                '--window-size=1920,1080' // 🔥 ম্যাজিক ১: ফুল এইচডি স্ক্রিন সাইজ
            ] 
        });
        
        page = await browser.newPage();

        // 🔥 ম্যাজিক ২: ওয়েবসাইটকে বোঝানো যে এটা উইন্ডোজ ১০ এর আসল ক্রোম ব্রাউজার
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        await page.setDefaultNavigationTimeout(30000); 

        // GLOBAL DIALOG HANDLER: Always accept "Are you sure?" popups
        page.on('dialog', async dialog => {
            console.log(`[DIALOG] Auto-Accepted: ${dialog.message()}`);
            await dialog.accept();
        });
        
        // 🔥 Ultra-Fast Load (domcontentloaded)
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

app.get('/', (req, res) => res.send("Bot is active in Stealth & Ultra-Fast Mode!"));

/**
 * Targeted Deletion with Quick Retry Logic
 */
app.post('/api/verify-cross-check', (req, res) => {
    const targetTrxID = req.body.transaction_id;
    if (!targetTrxID) return res.status(400).json({ error: "No ID provided" });

    console.log(`\n⚡ Received ID: ${targetTrxID}. Processing Instantly...`);

    // Instant Response to Supabase
    res.json({ status: "PROCESSING", message: `Searching for ID: ${targetTrxID}` });

    (async () => {
        try {
            if (!page || page.url().includes('login')) {
                console.log("🔄 Session lost, re-logging in...");
                await initBrowser();
            }

            // 1. Used Transactions Check (Fast)
            try {
                await page.goto(`https://pay.eagleeyetopup.com/payment?search=${targetTrxID}`, { 
                    waitUntil: 'domcontentloaded',
                    timeout: 30000 
                });
                
                const isUsed = await page.evaluate((id) => {
                    return document.body.innerText.includes(id);
                }, targetTrxID);

                if (isUsed) {
                    console.log(`🚫 ID: ${targetTrxID} is USED! Skipping deletion.`);
                    return; 
                }
            } catch (navErr) {
                console.log(`⚠️ Used Check timed out for ${targetTrxID}, moving to Store search.`);
            }

            // 2. Start Quick Retry Loop (Max 3 attempts, 5s wait)
            console.log(`✅ ID: ${targetTrxID} is CLEAN. Searching Store Data...`);
            
            const maxAttempts = 3; 
            const waitTime = 5000; 

            async function attemptDelete(attempt) {
                if (attempt > maxAttempts) {
                    console.log(`❌ Giving up! ID ${targetTrxID} not found after ${maxAttempts} attempts.`);
                    return;
                }

                try {
                    console.log(`🔍 [Attempt ${attempt}/${maxAttempts}] Searching for: ${targetTrxID}`);
                    
                    await page.goto(`https://pay.eagleeyetopup.com/storedatum?search=${targetTrxID}`, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 30000 
                    });

                    // ২ সেকেন্ড অপেক্ষা টেবিল রেন্ডার হওয়ার জন্য
                    await new Promise(r => setTimeout(r, 2000));

                    const idExists = await page.evaluate((id) => {
                        return document.body.innerText.includes(id);
                    }, targetTrxID);

                    if (idExists) {
                        const deleteBtn = 'button.btn-danger, a.btn-danger, .fa-trash, [title="Delete"]';
                        const button = await page.$(deleteBtn);
                        if (button) {
                            await page.click(deleteBtn);
                            console.log(`🗑️ SUCCESS: Targeted ID ${targetTrxID} found and deleted!`);
                        } else {
                            console.log(`⚠️ ID found but Delete Button is missing for ${targetTrxID}`);
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
app.listen(PORT, () => console.log(`🟢 Stealth Bot is live on port ${PORT}`));