const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

// ==========================================
// ⚙️ CONFIGURATION & CREDENTIALS
// ==========================================
const TOPUP_URL_LOGIN = 'https://pay.eagleeyetopup.com/login';
const TOPUP_USER = 'nac009hid@gmail.com';
const TOPUP_PASS = '123456';

const UDDOKTAPAY_URL_LOGIN = 'https://pay.eagleeyeesports.com/public/admin/login'; 
const UDDOKTAPAY_USER = 'nahidulislam5171@gmail.com';
const UDDOKTAPAY_PASS = 'Na5171!!+payee5171'; 

let apiBrowser;
let apiPage;

// =========================================================================
// 🟢 PART 1: MAIN ENGINE INIT
// =========================================================================
async function initApiBrowser() {
    console.log("🚀 Initializing Browser (Screen Mode ON)...");
    try {
        apiBrowser = await puppeteer.launch({ 
            headless: false, // 🔥 Screen ON (চোখে দেখার জন্য)
            defaultViewport: null,
            args: ['--start-maximized'] // ফুল স্ক্রিনে ওপেন হবে
        });
        
        apiPage = await apiBrowser.newPage();
        await apiPage.goto(TOPUP_URL_LOGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await apiPage.type('input[type="email"]', TOPUP_USER);
        await apiPage.type('input[type="password"]', TOPUP_PASS);
        await Promise.all([
            apiPage.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            apiPage.click('button[type="submit"]')
        ]);
        console.log("✅ Main Browser Login Successful!");
    } catch (err) {
        console.log("❌ Browser Error:", err.message);
    }
}

// =========================================================================
// 🧹 PART 2: DUAL CLEANER SYSTEM (Visual Mode)
// =========================================================================

async function cleanTopUpSite(browser) {
    console.log("\n▶️ [TASK 1] Starting Top-Up Site Cleanup...");
    const page = await browser.newPage(); 
    try {
        page.on('dialog', async dialog => await dialog.accept());
        await page.goto(TOPUP_URL_LOGIN, { waitUntil: 'domcontentloaded' });
        
        const isEmailBoxThere = await page.$('input[type="email"]');
        if (isEmailBoxThere) {
            await page.type('input[type="email"]', TOPUP_USER);
            await page.type('input[type="password"]', TOPUP_PASS);
            await Promise.all([ page.waitForNavigation(), page.click('button[type="submit"]') ]);
        }

        await page.goto('https://pay.eagleeyetopup.com/storedatum', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 3000));

        let hasMore = true;
        while (hasMore) {
            const targetRow = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                const limitTime = Date.now() - (24 * 60 * 60 * 1000); 
                const regex = /\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}\s*[AP]M/i; 

                for (let i = 0; i < rows.length; i++) {
                    const match = rows[i].innerText.match(regex);
                    if (match) {
                        const [date, time, ampm] = match[0].split(' ');
                        const [y, m, d] = date.split('-');
                        let [hh, mm, ss] = time.split(':');
                        hh = parseInt(hh, 10);
                        if (ampm.toUpperCase() === 'PM' && hh < 12) hh += 12;
                        if (ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
                        
                        const recordTimeBD = Date.UTC(y, m - 1, d, hh, parseInt(mm, 10), parseInt(ss, 10));
                        const recordTimeRealUTC = recordTimeBD - (6 * 60 * 60 * 1000);

                        if (recordTimeRealUTC < limitTime) return i; 
                    }
                }
                return -1; 
            });

            if (targetRow !== -1) {
                const btnSel = `table tbody tr:nth-child(${targetRow + 1}) .btn-danger, table tbody tr:nth-child(${targetRow + 1}) .fa-trash`;
                const btn = await page.$(btnSel);
                if (btn) {
                    await btn.click();
                    console.log("🗑️ Deleted a Top-Up record!");
                    await new Promise(r => setTimeout(r, 2000));
                } else hasMore = false;
            } else hasMore = false; 
        }
        console.log(`✅ Top-Up Site Cleanup Done!`);
    } catch (e) { console.log("❌ Error:", e.message); } 
    finally { await page.close(); }
}

async function cleanUddoktaPay(browser) {
    console.log("\n▶️ [TASK 2] Starting UddoktaPay SMS Cleanup...");
    const page = await browser.newPage(); 
    try {
        await page.goto(UDDOKTAPAY_URL_LOGIN, { waitUntil: 'domcontentloaded' });
        
        const isEmailBoxThere = await page.$('input[type="email"]');
        if (isEmailBoxThere) {
            await page.type('input[type="email"]', UDDOKTAPAY_USER);
            await page.type('input[type="password"]', UDDOKTAPAY_PASS); 
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        }

        const clickByText = async (text) => {
            await page.evaluate((t) => {
                const elements = Array.from(document.querySelectorAll('a, button, span, div'));
                const target = elements.find(e => e.innerText.trim().includes(t));
                if (target) target.click();
            }, text);
            await new Promise(r => setTimeout(r, 2000)); 
        };

        await clickByText('MFS Automation');
        await clickByText('SMS Data');
        await new Promise(r => setTimeout(r, 3000)); 

        await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('a, button, li, span.nav-link, label.btn'));
            const approvedTab = tabs.find(tab => tab.innerText.trim().startsWith('Approved'));
            if (approvedTab) approvedTab.click();
        });
        await new Promise(r => setTimeout(r, 4000)); 

        let hasMore = true;
        while (hasMore) {
            await new Promise(r => setTimeout(r, 2000)); 
            const targetRowIndex = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                const limitTime = Date.now() - (24 * 60 * 60 * 1000); 
                const regex = /\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}\s*[AP]M/i; 

                for (let i = 0; i < rows.length; i++) {
                    const match = rows[i].innerText.match(regex);
                    if (match) {
                        const [date, time, ampm] = match[0].split(' ');
                        const [y, m, d] = date.split('-');
                        let [hh, mm] = time.split(':');
                        hh = parseInt(hh, 10);
                        if (ampm.toUpperCase() === 'PM' && hh < 12) hh += 12;
                        if (ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
                        
                        const recordTimeBD = Date.UTC(y, m - 1, d, hh, parseInt(mm, 10), 0);
                        const recordTimeRealUTC = recordTimeBD - (6 * 60 * 60 * 1000);

                        if (recordTimeRealUTC < limitTime) return i; 
                    }
                }
                return -1; 
            });

            if (targetRowIndex !== -1) {
                const btnSel = `table tbody tr:nth-child(${targetRowIndex + 1}) .btn-danger, table tbody tr:nth-child(${targetRowIndex + 1}) .fa-trash`;
                const btn = await page.$(btnSel);
                if (btn) {
                    page.once('dialog', async d => await d.accept());
                    await btn.click();
                    
                    await new Promise(r => setTimeout(r, 1500));
                    const popupHandled = await page.evaluate(() => {
                        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Delete' && !b.closest('tbody'));
                        if (confirmBtn) { confirmBtn.click(); return true; }
                        return false;
                    });
                    
                    if (popupHandled) {
                        console.log("🗑️ Deleted an UddoktaPay record!");
                        await new Promise(r => setTimeout(r, 3000)); 
                    } else hasMore = false;
                } else hasMore = false;
            } else hasMore = false; 
        }
        console.log(`✅ UddoktaPay Cleanup Done!`);
    } catch (e) { console.log("❌ Error:", e.message); } 
    finally { await page.close(); }
}

async function startVisualTest() {
    await cleanTopUpSite(apiBrowser);
    await cleanUddoktaPay(apiBrowser);
    console.log("🎉 VISUAL TEST COMPLETE!");
}

// =========================================================================
// 🚀 START THE VISUAL TEST
// =========================================================================
app.listen(10001, async () => {
    console.log(`\n🟢 Starting Visual Test... Watch your screen!`);
    await initApiBrowser();
    
    // 🔥 ৫ সেকেন্ড পর ব্রাউজার নিজে নিজে কাজ শুরু করবে
    setTimeout(startVisualTest, 5000); 
});