const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors'); 

const app = express();
app.use(express.json());
app.use(cors());

// ==========================================
// ⚙️ CONFIGURATION & CREDENTIALS
// ==========================================
const TOPUP_URL_LOGIN = 'https://pay.eagleeyetopup.com/login';
const TOPUP_USER = 'nac009hid@gmail.com';
const TOPUP_PASS = '123456';

const UDDOKTAPAY_URL_LOGIN = 'https://pay.eagleeyeesports.com/public/admin/login'; 
const UDDOKTAPAY_USER = 'nahidulislam5171@gmail.com';
const UDDOKTAPAY_PASS = 'Na5171!!+payee5171'; 

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 ঘণ্টা

// গ্লোবাল ভেরিয়েবল (শুধুমাত্র API এর জন্য)
let apiBrowser;
let apiPage;

// 🔥 হোম পেজ ফিক্স (যাতে Cannot GET / এরর না আসে)
app.get('/', (req, res) => {
    res.send("<h1>🦅 EagleEye Master Bot is Active!</h1><p>Real-Time Sync and Auto Cleanup are running smoothly.</p>");
});

// =========================================================================
// 🟢 PART 1: REAL-TIME API SYSTEM (Always On)
// =========================================================================

async function initApiBrowser() {
    console.log("🚀 Initializing Main Browser Engine...");
    try {
        if (apiBrowser) await apiBrowser.close(); 

        apiBrowser = await puppeteer.launch({ 
            headless: "new", 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080'] 
        });
        
        apiPage = await apiBrowser.newPage();
        await apiPage.setViewport({ width: 1920, height: 1080 });
        await apiPage.setDefaultNavigationTimeout(30000); 

        // পপআপ অটো একসেপ্ট
        apiPage.on('dialog', async dialog => {
            await dialog.accept().catch(() => {});
        });
        
        await apiPage.goto(TOPUP_URL_LOGIN, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await apiPage.type('input[type="email"]', TOPUP_USER);
        await apiPage.type('input[type="password"]', TOPUP_PASS);
        
        await Promise.all([
            apiPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
            apiPage.click('button[type="submit"]')
        ]);
        
        console.log("✅ API Browser Login Successful! Ready for Verification Sync.");
    } catch (err) {
        console.log("❌ API Browser Login Failed:", err.message);
    }
}

// 🌐 API 1: Check Used Status
app.post('/api/check-used-status', async (req, res) => {
    const targetTrxID = req.body.transaction_id;
    if (!targetTrxID) return res.status(400).json({ error: "No ID provided" });

    try {
        if (!apiPage || apiPage.url().includes('login')) await initApiBrowser();
        
        await apiPage.goto(`https://pay.eagleeyetopup.com/payment?search=${targetTrxID}`, { 
            waitUntil: 'domcontentloaded', timeout: 30000 
        });
        
        const isUsed = await apiPage.evaluate((id) => document.body.innerText.includes(id), targetTrxID);
        
        if (isUsed) {
            console.log(`🚫 Sync Check: ID ${targetTrxID} is USED.`);
            res.json({ is_used: true });
        } else {
            console.log(`✅ Sync Check: ID ${targetTrxID} is CLEAN.`);
            res.json({ is_used: false });
        }
    } catch (error) {
        res.json({ is_used: false, error: error.message });
    }
});

// 🌐 API 2: Verify Cross Check & Targeted Delete
app.post('/api/verify-cross-check', (req, res) => {
    const targetTrxID = req.body.transaction_id;
    if (!targetTrxID) return res.status(400).json({ error: "No ID provided" });

    res.json({ status: "PROCESSING", message: `Searching for ID: ${targetTrxID}` });

    (async () => {
        try {
            if (!apiPage || apiPage.url().includes('login')) await initApiBrowser();

            const maxAttempts = 3; 
            const waitTime = 5000; 

            async function attemptDelete(attempt) {
                if (attempt > maxAttempts) return;
                try {
                    await apiPage.goto(`https://pay.eagleeyetopup.com/storedatum?search=${targetTrxID}`, { 
                        waitUntil: 'domcontentloaded', timeout: 30000 
                    });
                    await new Promise(r => setTimeout(r, 2000));
                    
                    const idExists = await apiPage.evaluate((id) => document.body.innerText.includes(id), targetTrxID);

                    if (idExists) {
                        const deleteBtn = 'button.btn-danger, a.btn-danger, .fa-trash, [title="Delete"]';
                        const button = await apiPage.$(deleteBtn);
                        if (button) {
                            await button.click();
                            console.log(`🗑️ SYNC SUCCESS: Targeted ID ${targetTrxID} deleted!`);
                        }
                    } else {
                        setTimeout(() => attemptDelete(attempt + 1), waitTime);
                    }
                } catch (e) {
                    setTimeout(() => attemptDelete(attempt + 1), waitTime);
                }
            }
            attemptDelete(1);
        } catch (error) {
            console.log("⚠️ Target Delete Error:", error.message);
        }
    })();
});

// =========================================================================
// 🧹 PART 2: DUAL CLEANER SYSTEM (Runs in a new TAB to save RAM)
// =========================================================================

// 🧹 টাস্ক ১: টপ-আপ সাইট ক্লিন করা
async function cleanTopUpSite(browser) {
    console.log("\n▶️ [TASK 1] Starting Top-Up Site 24h Cleanup...");
    const page = await browser.newPage(); // 🔥 নতুন ট্যাব
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        page.on('dialog', async dialog => await dialog.accept().catch(() => {}));
        
        await page.goto(TOPUP_URL_LOGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.type('input[type="email"]', TOPUP_USER);
        await page.type('input[type="password"]', TOPUP_PASS);
        await Promise.all([ page.waitForNavigation(), page.click('button[type="submit"]') ]);

        await page.goto('https://pay.eagleeyetopup.com/storedatum', { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 3000));

        let deletedCount = 0;
        let hasMore = true;

        while (hasMore) {
            const targetRow = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                const limitTime = Date.now() - (24 * 60 * 60 * 1000); 
                // 🔥 Fix: Single/Double digits date & time
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
                        
                        // 🔥 BD Time (+6) Convert to Server UTC
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
                    deletedCount++;
                    await new Promise(r => setTimeout(r, 2000));
                } else hasMore = false;
            } else {
                hasMore = false; 
            }
        }
        console.log(`✅ Top-Up Site Cleanup Done! Deleted: ${deletedCount} records.`);
    } catch (e) {
        console.log("❌ Error in Top-Up Cleanup:", e.message);
    } finally {
        await page.close(); // 🔥 কাজ শেষে ট্যাব ক্লোজ
    }
}

// 🧹 টাস্ক ২: UddoktaPay ক্লিন করা
async function cleanUddoktaPay(browser) {
    console.log("\n▶️ [TASK 2] Starting UddoktaPay SMS 24h Cleanup...");
    const page = await browser.newPage(); // 🔥 নতুন ট্যাব
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
        await page.goto(UDDOKTAPAY_URL_LOGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.type('input[type="email"]', UDDOKTAPAY_USER);
        await page.type('input[type="password"]', UDDOKTAPAY_PASS); 
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

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

        const iconClicked = await page.evaluate(() => {
            const searchInputs = Array.from(document.querySelectorAll('input')).filter(i => i.placeholder && i.placeholder.includes('Search'));
            const tableSearch = searchInputs.length > 1 ? searchInputs[searchInputs.length - 1] : searchInputs[0];
            if (tableSearch) {
                let container = tableSearch.parentElement;
                while (container && container.tagName !== 'DIV' && !container.className.includes('flex')) {
                    container = container.parentElement;
                }
                if (container && container.parentElement) {
                    const buttons = Array.from(container.parentElement.querySelectorAll('button')).filter(btn => btn.querySelector('svg'));
                    if (buttons.length > 0) { buttons[buttons.length - 1].click(); return true; }
                }
            }
            return false;
        });

        if (iconClicked) {
            await new Promise(r => setTimeout(r, 2000)); 
            await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('label, li, .dropdown-item, span'));
                const dateItem = items.find(el => el.innerText.trim() === 'Date');
                if (dateItem) {
                    const checkbox = dateItem.querySelector('input[type="checkbox"]');
                    if (checkbox && !checkbox.checked) checkbox.click(); 
                    else if (!checkbox && !dateItem.classList.contains('active')) dateItem.click();
                }
            });
            await page.mouse.click(10, 10);
            await new Promise(r => setTimeout(r, 1000));
        }

        await page.evaluate(() => {
            const selects = document.querySelectorAll('select');
            for(let s of selects) {
                if(s.innerText.includes('10')) { s.value = "50"; s.dispatchEvent(new Event('change', {bubbles: true})); return; }
            }
            const dropdowns = Array.from(document.querySelectorAll('div, button, span')).filter(e => e.innerText.trim() === '10' && e.closest('.flex'));
            if(dropdowns.length > 0) {
                dropdowns[0].click(); 
                setTimeout(() => {
                    const option50 = Array.from(document.querySelectorAll('li, span')).find(e => e.innerText.trim() === '50');
                    if (option50) option50.click();
                }, 500);
            }
        });
        await new Promise(r => setTimeout(r, 3000)); 

        let deletedCount = 0;
        let hasMore = true;

        while (hasMore) {
            await new Promise(r => setTimeout(r, 2000)); 

            const targetRowIndex = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                const limitTime = Date.now() - (24 * 60 * 60 * 1000); 
                // 🔥 Fix: Single/Double digits date & time
                const regex = /\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}\s*[AP]M/i; // No seconds here

                for (let i = 0; i < rows.length; i++) {
                    const match = rows[i].innerText.match(regex);
                    if (match) {
                        const [date, time, ampm] = match[0].split(' ');
                        const [y, m, d] = date.split('-');
                        let [hh, mm] = time.split(':');
                        hh = parseInt(hh, 10);
                        if (ampm.toUpperCase() === 'PM' && hh < 12) hh += 12;
                        if (ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
                        
                        // 🔥 BD Time (+6) Convert to Real Server Time
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
                    page.once('dialog', async d => await d.accept().catch(() => {}));
                    await btn.click();
                    await new Promise(r => setTimeout(r, 1500));
                    
                    const popupHandled = await page.evaluate(() => {
                        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Delete' && !b.closest('tbody'));
                        if (confirmBtn) { confirmBtn.click(); return true; }
                        return false;
                    });

                    if (popupHandled) {
                        deletedCount++;
                        await new Promise(r => setTimeout(r, 3000)); 
                    } else hasMore = false;
                } else hasMore = false;
            } else {
                const moved = await page.evaluate(() => {
                    const nextBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.trim() === 'Next');
                    if (nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('disabled')) {
                        nextBtn.click(); return true;
                    }
                    return false;
                });
                if (moved) await new Promise(r => setTimeout(r, 4000)); 
                else hasMore = false; 
            }
        }
        console.log(`✅ UddoktaPay Cleanup Done! Deleted: ${deletedCount} records.`);
    } catch (e) {
        console.log("❌ Error in UddoktaPay Cleanup:", e.message);
    } finally {
        await page.close(); // 🔥 কাজ শেষে ট্যাব ক্লোজ
    }
}

// 🚀 মাস্টার কন্ট্রোলার (Tab System - NO NEW BROWSER)
async function runDualCleaner() {
    console.log(`\n==================================================`);
    console.log(`🧹 [${new Date().toLocaleString()}] Opening cleanup tabs in Main Browser...`);
    
    try {
        if (!apiBrowser) await initApiBrowser();
        
        await cleanTopUpSite(apiBrowser);
        await cleanUddoktaPay(apiBrowser);

    } catch (error) {
        console.log("❌ Fatal Error in Dual Cleanup:", error.message);
    } finally {
        console.log("👻 Cleanup tabs closed. RAM safe.");
        console.log(`==================================================\n`);
    }
}

// =========================================================================
// 🚀 SERVER START & SCHEDULING
// =========================================================================

const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
    console.log(`\n🟢 EagleEye Master Bot live on port ${PORT}`);
    
    // ১. API ব্রাউজার চালু করা (সবসময় চলবে)
    await initApiBrowser();

    // ২. ডুয়াল ক্লিনার চালু করা (চেক করার জন্য ১ মিনিট পর চলবে)
    setTimeout(runDualCleaner, 1 * 60 * 1000);

    // ৩. ডুয়াল ক্লিনার লুপ (প্রতি ১ ঘণ্টা পর পর চলবে)
    setInterval(runDualCleaner, CLEANUP_INTERVAL_MS);
});