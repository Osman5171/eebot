const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors'); 

const app = express();
app.use(express.json());
app.use(cors());

let browser;
let page;

// সার্ভার চালু হওয়ার সময় একবার ব্রাউজার খুলে লগইন করে রাখবে
async function initBrowser() {
    console.log("🚀 Initializing browser and logging in...");
    try {
        if (browser) await browser.close(); // পুরোনো ব্রাউজার থাকলে বন্ধ করে দেওয়া

        browser = await puppeteer.launch({ 
            headless: true, 
            // Render-এ ইনস্টল করা ক্রোম খুঁজে পাওয়ার জন্য নিচের লাইনটি জরুরি
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--single-process' // মেমোরি বাঁচানোর জন্য
            ] 
        });
        
        page = await browser.newPage();
        
        await page.goto('https://pay.eagleeyetopup.com/login', { waitUntil: 'domcontentloaded' });
        await page.type('input[type="email"], input[name="email"]', 'nac009hid@gmail.com');
        await page.type('input[type="password"], input[name="password"]', '123456');
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[type="submit"]')
        ]);
        
        console.log("✅ Login successful! Session saved.");
    } catch (err) {
        console.log("❌ Initial login failed:", err.message);
    }
}

// ইনিশিয়াল কল
initBrowser();

app.get('/', (req, res) => res.send("Bot is active and running!"));

app.post('/api/verify-cross-check', async (req, res) => {
    const targetTrxID = req.body.transaction_id;
    if (!targetTrxID) return res.status(400).json({ error: "No ID provided" });

    console.log(`\n⚡ Checking ID: ${targetTrxID}`);

    try {
        // সেশন চেক: যদি পেজ না থাকে বা লগআউট হয়ে যায়
        if (!page || page.url().includes('login')) {
            console.log("🔄 Session lost, re-logging in...");
            await initBrowser();
        }

        // ১. সরাসরি Used Transactions-এ গিয়ে চেক
        await page.goto(`https://pay.eagleeyetopup.com/payment?search=${targetTrxID}`, { waitUntil: 'domcontentloaded' });
        
        const isUsed = await page.evaluate((id) => {
            return document.body.innerText.includes(id);
        }, targetTrxID);

        if (isUsed) {
            console.log(`🚫 ID: ${targetTrxID} is USED!`);
            return res.json({ status: "USED" });
        }

        // ২. সরাসরি Store Data-তে গিয়ে ডিলিট
        console.log(`✅ ID: ${targetTrxID} is CLEAN! Deleting from store...`);
        await page.goto(`https://pay.eagleeyetopup.com/storedatum?search=${targetTrxID}`, { waitUntil: 'domcontentloaded' });
        
        try {
            // ডিলিট বাটনে ক্লিক
            await page.click('button.btn-danger, .fa-trash');
            console.log(`🗑️ Deleted ${targetTrxID}`);
        } catch (e) {
            console.log("⚠️ ID not found in store data, possibly already handled.");
        }

        return res.json({ status: "CLEAN" });

    } catch (error) {
        console.log("⚠️ Error details:", error.message);
        // মারাত্মক এরর হলে ব্রাউজার রিস্টার্ট করা
        initBrowser();
        return res.status(500).json({ error: "Verification server encountered an error" });
    }
});

// Render সাধারণত ১০০০ পোর্টে রান করতে বলে অথবা process.env.PORT ব্যবহার করে
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🟢 Super-Fast API is live on port ${PORT}`));