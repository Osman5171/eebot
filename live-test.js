const puppeteer = require('puppeteer');

async function runLiveTest() {
    console.log("🚀 লাইভ টেস্ট শুরু হচ্ছে...");
    
    // 🔥 এখানে আপনার যেকোনো একটা পেমেন্টের ট্রানজেকশন আইডি দিন যেটা আপনি ডিলিট করতে চান
    const testTrxID = "DCB30C85XZ"; 

    // headless: false মানে ব্রাউজার স্ক্রিনে দেখা যাবে
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null, // ফুল স্ক্রিন
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();

    try {
        console.log("১. লগইন পেজে যাচ্ছে...");
        await page.goto('https://pay.eagleeyetopup.com/login', { waitUntil: 'domcontentloaded' });
        await page.type('input[type="email"]', 'nac009hid@gmail.com');
        await page.type('input[type="password"]', '123456');
        
        await Promise.all([
            page.waitForNavigation(),
            page.click('button[type="submit"]')
        ]);
        console.log("✅ লগইন সফল!");

        console.log(`২. Store Data তে ${testTrxID} সার্চ করছে...`);
        await page.goto(`https://pay.eagleeyetopup.com/storedatum?search=${testTrxID}`, { waitUntil: 'domcontentloaded' });

        // আপনি যাতে চোখে দেখতে পারেন, তাই ৩ সেকেন্ড অপেক্ষা করা হচ্ছে
        await new Promise(r => setTimeout(r, 3000));

        // পপ-আপ একসেপ্ট করা
        page.on('dialog', async dialog => {
            console.log("✅ পপ-আপ (Are you sure?) ওকে করা হয়েছে!");
            await dialog.accept();
        });

        console.log("৩. ডিলিট বাটন খুঁজছে...");
        const deleteBtn = 'button.btn-danger, a.btn-danger, .fa-trash, [title="Delete"]';
        
        const buttonExists = await page.$(deleteBtn);
        if (buttonExists) {
            console.log("🎯 বাটন পাওয়া গেছে! ক্লিক করা হচ্ছে...");
            await page.click(deleteBtn);
            console.log("🗑️ ডিলিট সাকসেসফুল!");
        } else {
            console.log("❌ ডিলিট বাটন স্ক্রিনে পাওয়া যায়নি! (সম্ভবত বাটনের নাম অন্য কিছু)");
        }

        // ১০ সেকেন্ড ব্রাউজার খোলা রেখে তারপর বন্ধ করবে
        console.log("👀 ১০ সেকেন্ড পর ব্রাউজার বন্ধ হয়ে যাবে...");
        await new Promise(r => setTimeout(r, 10000));
        await browser.close();

    } catch (error) {
        console.log("⚠️ এরর:", error.message);
        await browser.close();
    }
}

runLiveTest();