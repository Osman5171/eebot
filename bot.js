const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors'); 

const app = express();
app.use(express.json());
app.use(cors()); // React ওয়েবসাইট থেকে রিকোয়েস্ট অ্যালাউ করার জন্য

app.post('/api/verify-cross-check', async (req, res) => {
    const targetTrxID = req.body.transaction_id;
    
    if (!targetTrxID) {
        return res.status(400).json({ error: "Transaction ID is required" });
    }

    console.log(`\n🔍 Live Check Started for ID: ${targetTrxID}`);

    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    // পপ-আপ অটো-অ্যাকসেপ্ট করা
    page.on('dialog', async dialog => {
        await dialog.accept(); 
    });

    try {
        // ১. লগইন করা
        await page.goto('https://pay.eagleeyetopup.com/login', { waitUntil: 'networkidle2' });
        await page.waitForSelector('input[type="email"], input[type="text"], input[name="email"]');
        await page.type('input[type="email"], input[type="text"], input[name="email"]', 'nac009hid@gmail.com', { delay: 30 });
        await page.waitForSelector('input[type="password"], input[name="password"]');
        await page.type('input[type="password"], input[name="password"]', '123456', { delay: 30 });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);

        // ২. Used Transactions পেজে গিয়ে চেক করা যে আইডিটা অলরেডি ইউজড কিনা
        console.log("📂 Checking 'Used Transactions' page...");
        await page.goto('https://pay.eagleeyetopup.com/payment', { waitUntil: 'networkidle2' });
        await page.waitForSelector('input[type="search"], input[placeholder*="Search"]');
        await page.type('input[type="search"], input[placeholder*="Search"]', targetTrxID, { delay: 50 });
        await new Promise(resolve => setTimeout(resolve, 2000)); // সার্চের জন্য ২ সেকেন্ড অপেক্ষা

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
        await page.goto('https://pay.eagleeyetopup.com/storedatum', { waitUntil: 'networkidle2' });
        await page.waitForSelector('input[type="search"], input[placeholder*="Search"]');
        await page.type('input[type="search"], input[placeholder*="Search"]', targetTrxID, { delay: 50 });
        await new Promise(resolve => setTimeout(resolve, 2000));

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