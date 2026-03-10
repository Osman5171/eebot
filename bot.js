const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

async function deleteTransactionBot(targetTrxID) {
    console.log(`🚀 Bot is waking up to delete ID: ${targetTrxID}...`);
    
    // লাইভ সার্ভারের জন্য পরিবর্তন: headless: true এবং no-sandbox আর্গুমেন্ট যোগ করা হয়েছে
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    page.on('dialog', async dialog => {
        await dialog.accept(); 
    });

    try {
        await page.goto('https://pay.eagleeyetopup.com/login', { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('input[type="email"], input[type="text"], input[name="email"]');
        await page.type('input[type="email"], input[type="text"], input[name="email"]', 'apnar_email@example.com', { delay: 50 });

        await page.waitForSelector('input[type="password"], input[name="password"]');
        await page.type('input[type="password"], input[name="password"]', 'apnar_password_ekhane', { delay: 50 });

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('button[type="submit"]')
        ]);
        
        await page.goto('https://pay.eagleeyetopup.com/storedatum', { waitUntil: 'networkidle2' });

        await page.waitForSelector('input[type="search"], input[placeholder*="Search"]');
        await page.type('input[type="search"], input[placeholder*="Search"]', targetTrxID, { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 2000)); 

        await page.waitForSelector('button.btn-danger, a.btn-danger, .fa-trash, .text-danger, [title*="Delete"]');
        await page.click('button.btn-danger, a.btn-danger, .fa-trash, .text-danger, [title*="Delete"]');

        console.log(`🎉 Successfully deleted Transaction ID: ${targetTrxID} from Topup site!`);
        
        await new Promise(resolve => setTimeout(resolve, 3000)); 
        await browser.close();

    } catch (error) {
        console.log("⚠️ Bot encountered an error: ", error.message);
        await browser.close();
    }
}

app.post('/webhook/uddoktapay', async (req, res) => {
    const trxID = req.body.transaction_id || req.body.trx_id; 

    if (trxID) {
        console.log(`\n🔔 New Payment Alert from eSports! Transaction ID: ${trxID}`);
        res.status(200).send("Webhook Received Successfully");
        await deleteTransactionBot(trxID);
    } else {
        res.status(400).send("Transaction ID missing");
    }
});

// লাইভ সার্ভারের জন্য পরিবর্তন: process.env.PORT যোগ করা হয়েছে
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🟢 Bridge Server is running on port ${PORT}`);
});