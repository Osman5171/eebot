const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors'); 

const app = express();
app.use(express.json());
app.use(cors()); // React ওয়েবসাইট থেকে রিকোয়েস্ট অ্যালাউ করার জন্য

// 🟢 সার্ভার সারাজীবন সজাগ রাখার জন্য একটি সিম্পল রাউট (Cron-job এর জন্য)
app.get('/', (req, res) => {
    res.send("🚀 Bot is awake and running!");
});

app.post('/api/verify-cross-check', async (req, res) => {
    const targetTrxID = req.body.transaction_id;
    
    if (!targetTrxID) {
        return res.status(400).json({ error: "Transaction ID is required" });
    }

    console.log(`\n⚡ FAST Check Started for ID: ${targetTrxID}`);

    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    const page = await browser.newPage();

    // পপ-আপ অটো-অ্যাকসেপ্ট করা
    page.on('dialog', async dialog => {
        await dialog.accept(); 
    });

    try {
        // ১. লগইন করা (networkidle2 এর বদলে domcontentloaded ব্যবহার করা হয়েছে স্পিডের জন্য)
        await page.goto('https://pay.eagleeyetopup.com/login', { waitUntil: 'domcontentloaded' });
        
        await page.waitForSelector('input[type="email"], input[type="text"], input[name="email"]');
        await page.type('input[type="email"], input[type="text"], input[name="email"]', 'nac009hid@gmail.com');
        
        await page.waitForSelector('input[type="password"], input[name="password"]');
        await page.type('input[type="password"], input[name="password"]', '123456');
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('button[type="submit"]')
        ]);

        // ২. Used Transactions পেজে গিয়ে চেক করা যে আইডিটা অলরেডি ইউজড কিনা
        console.log("📂 Checking 'Used Transactions' page...");
        await page.goto('https://pay.eagleeyetopup.com/payment', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('input[type="search"], input[placeholder*="Search"]');
        await page.type('input[type="search"], input[placeholder*="Search"]', targetTrxID);
        await new Promise(resolve => setTimeout(resolve, 1000)); // সার্চের জন্য মাত্র ১ সেকেন্ড অপেক্ষা

        // পেজের ভেতর লেখাগুলো চেক করা
        const pageText = await page.evaluate(() => document.body.innerText);

        if (pageText.includes(targetTrxID)) {
            // আইডিটি ২ নম্বর সাইটে পাওয়া গেছে, তার মানে এটি USED!
            console.log(`🚫 ID ${targetTrxID} is already USED in Top-up!`);
            await browser.close();
            return res.json({ status: "USED", message: "This transaction is already used." });
        }

        // ৩. যদি USED না হয়, তার মানে এটি CLEAN! এবার Store Data থেকে মুছে ফেলার পালা।
        console.log("✅ ID is CLEAN! Going to 'Store Data' to delete it...");
        await page.goto('https://pay.eagleeyetopup.com/storedatum', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('input[type="search"], input[placeholder*="Search"]');
        await page.type('input[type="search"], input[placeholder*="Search"]', targetTrxID);
        await new Promise(resolve => setTimeout(resolve, 1000)); // মাত্র ১ সেকেন্ড অপেক্ষা

        try {
            // ডিলিট বাটনে ক্লিক করা
            await page.click('button.btn-danger, a.btn-danger, .fa-trash, .text-danger, [title*="Delete"]');
            console.log(`🗑️ Deleted ${targetTrxID} from Store Data.`);
        } catch (err) {
            console.log(`⚠️ Note: ID not found in Store Data. It might be a new valid ID.`);
        }

        await browser.close();
        
        // React-কে সিগন্যাল দেওয়া যে আইডি একদম ফ্রেশ
        return res.json({ status: "CLEAN", message: "Transaction is valid." });

    } catch (error) {
        console.log("⚠️ Error: ", error.message);
        await browser.close();
        return res.status(500).json({ error: "Server error", details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🟢 Live Check API is running on port ${PORT}`);
});