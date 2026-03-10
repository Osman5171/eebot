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
    browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    page = await browser.newPage();
    
    try {
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

initBrowser();

app.get('/', (req, res) => res.send("Bot is active!"));

app.post('/api/verify-cross-check', async (req, res) => {
    const targetTrxID = req.body.transaction_id;
    if (!targetTrxID) return res.status(400).json({ error: "No ID" });

    console.log(`\n⚡ Checking ID: ${targetTrxID}`);

    try {
        // সেশন চেক: যদি কোনো কারণে লগআউট হয়ে যায়
        if (page.url().includes('login')) {
            await initBrowser();
        }

        // ১. সরাসরি Used Transactions-এ গিয়ে চেক (সবচেয়ে দ্রুত)
        await page.goto(`https://pay.eagleeyetopup.com/payment?search=${targetTrxID}`, { waitUntil: 'domcontentloaded' });
        
        const isUsed = await page.evaluate((id) => {
            return document.body.innerText.includes(id);
        }, targetTrxID);

        if (isUsed) {
            console.log(`🚫 USED!`);
            return res.json({ status: "USED" });
        }

        // ২. সরাসরি Store Data-তে গিয়ে ডিলিট
        console.log("✅ CLEAN! Deleting...");
        await page.goto(`https://pay.eagleeyetopup.com/storedatum?search=${targetTrxID}`, { waitUntil: 'domcontentloaded' });
        
        try {
            // ডিলিট বাটনের জন্য অপেক্ষা না করে সরাসরি ক্লিক করার চেষ্টা
            await page.click('button.btn-danger, .fa-trash');
            console.log(`🗑️ Deleted ${targetTrxID}`);
        } catch (e) {
            console.log("⚠️ ID not in store data, it's a new one.");
        }

        return res.json({ status: "CLEAN" });

    } catch (error) {
        console.log("⚠️ Error:", error.message);
        // এরর হলে ব্রাউজার রিস্টার্ট করে নেওয়া ভালো
        initBrowser();
        return res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 Super-Fast API on port ${PORT}`));