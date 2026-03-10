const axios = require('axios');

async function testWebhookApi() {
    try {
        console.log("⏳ storesms ওয়েবহুক লিংকটি চেক করা হচ্ছে...");
        
        // ওয়েবহুক লিংকে আমরা প্রথমে একটি সাধারণ GET রিকোয়েস্ট পাঠিয়ে দেখি সার্ভার কী উত্তর দেয়
        const response = await axios.get('https://pay.eagleeyetopup.com/storesms/C44MTgzMzQyNjQ5ODYxNTUx');

        console.log("✅ Success! সার্ভার থেকে উত্তর এসেছে:");
        console.log(response.data);

    } catch (error) {
        console.log("❌ Error এসেছে। সার্ভারের উত্তর:");
        console.log(error.response ? error.response.data : error.message);
    }
}

testWebhookApi();