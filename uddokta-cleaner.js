const puppeteer = require('puppeteer');

// আপনার লগিন ইউআরএল এবং ক্রেডেনশিয়াল
const LOGIN_URL = 'https://pay.eagleeyeesports.com/public/admin/login'; 
const USER_EMAIL = 'nahidulislam5171@gmail.com';
const USER_PASS = 'Na5171!!+payee5171'; // আপনার আসল পাসওয়ার্ড

// বট কতক্ষণ পর পর আবার চেক করবে? (এখানে ১ ঘণ্টা দেওয়া আছে)
const LOOP_DELAY_MS = 60 * 60 * 1000; // 60 min * 60 sec * 1000 ms

async function cleanUddoktaPaySMS() {
    console.log("==================================================");
    console.log(`🚀 [${new Date().toLocaleString()}] Starting 24-Hour SMS Cleanup Cycle...`);
    console.log("==================================================");
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: "new", // VPS-এর জন্য ব্যাকগ্রাউন্ড মোড
            args: ['--window-size=1920,1080', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log("➡️ Logging into UddoktaPay...");
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.type('input[type="email"]', USER_EMAIL);
        await page.type('input[type="password"]', USER_PASS); 
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        console.log("✅ Logged in successfully!");

        const clickByText = async (text) => {
            await page.waitForFunction(
                (text) => Array.from(document.querySelectorAll('a, button, span, div')).some(e => e.innerText.trim().includes(text)),
                {}, text
            );
            await page.evaluate((text) => {
                const elements = Array.from(document.querySelectorAll('a, button, span, div'));
                const target = elements.find(e => e.innerText.trim().includes(text));
                if (target) target.click();
            }, text);
            await new Promise(r => setTimeout(r, 2000)); 
        };

        console.log("➡️ Navigating to SMS Data...");
        await clickByText('MFS Automation');
        await clickByText('SMS Data');
        await new Promise(r => setTimeout(r, 3000)); 

        console.log("➡️ Selecting 'Approved' folder...");
        await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('a, button, li, span.nav-link, label.btn'));
            const approvedTab = tabs.find(tab => tab.innerText.trim() === 'Approved' || tab.innerText.trim().startsWith('Approved'));
            if (approvedTab) approvedTab.click();
        });
        await new Promise(r => setTimeout(r, 4000)); 

        console.log("➡️ Enabling 'Date' column from Manager...");
        const iconClicked = await page.evaluate(() => {
            const searchInputs = Array.from(document.querySelectorAll('input')).filter(input => input.placeholder && input.placeholder.includes('Search'));
            const tableSearch = searchInputs.length > 1 ? searchInputs[searchInputs.length - 1] : searchInputs[0];
            
            if (tableSearch) {
                let container = tableSearch.parentElement;
                while (container && container.tagName !== 'DIV' && !container.className.includes('flex')) {
                    container = container.parentElement;
                }
                
                if (container && container.parentElement) {
                    const buttons = Array.from(container.parentElement.querySelectorAll('button')).filter(btn => btn.querySelector('svg'));
                    if (buttons.length > 0) {
                        buttons[buttons.length - 1].click(); 
                        return true;
                    }
                }
            }
            
            const allIconButtons = Array.from(document.querySelectorAll('button')).filter(btn => btn.querySelector('svg') && !btn.innerText.trim());
            if (allIconButtons.length > 0) {
                allIconButtons[allIconButtons.length - 1].click();
                return true;
            }
            return false;
        });

        if (iconClicked) {
            await new Promise(r => setTimeout(r, 2000)); 
            await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('label, li, .dropdown-item, span, div'));
                const dateItem = items.find(el => el.innerText.trim() === 'Date');
                if (dateItem) {
                    const checkbox = dateItem.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        if (!checkbox.checked) checkbox.click(); 
                    } else {
                        if (!dateItem.classList.contains('active') && !dateItem.classList.contains('selected')) {
                            dateItem.click();
                        }
                    }
                }
            });
            await page.mouse.click(10, 10);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log("➡️ Setting page limit to 50...");
        await page.evaluate(() => {
            const selects = document.querySelectorAll('select');
            for(let s of selects) {
                if(s.innerText.includes('10')) {
                    s.value = "50";
                    s.dispatchEvent(new Event('change', {bubbles: true}));
                    return;
                }
            }
            const dropdowns = Array.from(document.querySelectorAll('div, button, span')).filter(e => e.innerText.trim() === '10' && (e.parentElement.innerText.includes('Per page') || e.closest('.flex')));
            if(dropdowns.length > 0) {
                dropdowns[0].click(); 
                setTimeout(() => {
                    const option50 = Array.from(document.querySelectorAll('li, span, div')).find(e => e.innerText.trim() === '50');
                    if (option50) option50.click();
                }, 500);
            }
        });
        await new Promise(r => setTimeout(r, 3000)); 

        let deletedCount = 0;
        let hasMore = true;

        console.log("🔍 Scanning for >24h old data...");

        while (hasMore) {
            await new Promise(r => setTimeout(r, 2000)); 

            const targetRowIndex = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table tbody tr'));
                const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000); 
                const dateRegex = /\d{4}-\d{2}-\d{2} \d{2}:\d{2} [AP]M/;

                for (let i = 0; i < rows.length; i++) {
                    const match = rows[i].innerText.match(dateRegex);
                    if (match) {
                        const [datePart, timePart, ampm] = match[0].split(' ');
                        const [year, month, day] = datePart.split('-');
                        let [hour, minute] = timePart.split(':');
                        hour = parseInt(hour, 10);
                        if (ampm === 'PM' && hour < 12) hour += 12;
                        if (ampm === 'AM' && hour === 12) hour = 0;
                        const rowTime = new Date(year, month - 1, day, hour, parseInt(minute), 0).getTime();

                        if (rowTime < twentyFourHoursAgo) return i; 
                    }
                }
                return -1; 
            });

            if (targetRowIndex !== -1) {
                const deleteBtnSelector = `table tbody tr:nth-child(${targetRowIndex + 1}) .btn-danger, table tbody tr:nth-child(${targetRowIndex + 1}) .fa-trash, table tbody tr:nth-child(${targetRowIndex + 1}) button:last-child`;
                const btn = await page.$(deleteBtnSelector);
                
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
                        process.stdout.write(`\r✅ Total items deleted in this cycle: ${deletedCount}`);
                        await new Promise(r => setTimeout(r, 3000)); 
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            } else {
                const moved = await page.evaluate(() => {
                    const nextBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.innerText.trim() === 'Next');
                    if (nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('disabled')) {
                        nextBtn.click(); return true;
                    }
                    return false;
                });

                if (moved) {
                    await new Promise(r => setTimeout(r, 4000)); 
                } else {
                    console.log("\n⚠️ Reached last page. No more old records found.");
                    hasMore = false; 
                }
            }
        }

        console.log(`🎉 Cycle Completed! Deleted ${deletedCount} items.`);

    } catch (error) {
        console.log("\n❌ Error occurred:", error.message);
    } finally {
        if (browser) {
            await browser.close(); // কাজ শেষে ব্রাউজার বন্ধ করে র‍্যাম ফ্রি করা
            console.log("🧹 Browser closed. RAM freed.");
        }
    }
}

// 🔥 অটো-লুপ ফাংশন: এটি অনন্তকাল চলতে থাকবে
async function startAutoBot() {
    while (true) {
        await cleanUddoktaPaySMS();
        
        const nextRun = new Date(Date.now() + LOOP_DELAY_MS).toLocaleTimeString();
        console.log(`\n💤 Sleeping for 1 hour. Next cycle will start at: ${nextRun}\n`);
        
        await new Promise(resolve => setTimeout(resolve, LOOP_DELAY_MS));
    }
}

// বট স্টার্ট করা
startAutoBot();