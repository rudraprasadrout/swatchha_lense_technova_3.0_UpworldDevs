// multilingual support for the swachhlens UI
// currently supports english, odia, and hindi

const TRANSLATIONS = {
    en: {
        navHome: "Home",
        navCitizen: "Report Issue",
        navCommand: "Officer Portal",
        navAbout: "About System",
        navBack: "Back to Home",
        liveAi: "Live Vision AI",
        engineBadge: "SwachhLens Engine",
        
        // homepage stuff
        homePill: "Bhubaneswar Municipal Corporation (BMC) Portal",
        homeTitle: "Cleaner City, Faster Response",
        homeSubtitle: "Report garbage, blocked drains, or sanitation issues in seconds. Captured photos are instantly routed to municipal cleanup teams.",
        cardCitizenTitle: "Report a Sanitation Issue",
        cardCitizenDesc: "Snap a photo of waste or blocked drains, add a voice note in Odia or Hindi, and submit immediately. No login required.",
        btnLaunchCitizen: "Report Issue Now",
        cardCommandTitle: "Municipal Staff Portal",
        cardCommandDesc: "Access live ward map, view incoming citizen reports, manage priority queues, and dispatch cleanup crews.",
        btnOfficerLogin: "Officer Login",
        cardAboutTitle: "System Architecture",
        cardAboutDesc: "Learn how automated vision classification, privacy blurring, spatial deduplication, and priority scoring work.",
        btnExploreAbout: "Explore System",

        // how it works section
        featHeading: "How It Works",
        howItWorksSub: "Three quick steps to report and clear civic issues",
        step1Header: "Snap & Capture",
        step1Detail: "Take a quick photo of the issue. Location and timestamp are detected automatically.",
        step2Header: "Privacy Safeguard",
        step2Detail: "Faces and license plates are automatically blurred before storing to ensure citizen privacy.",
        step3Header: "Rapid Cleanup",
        step3Detail: "Municipal teams get instant location alerts and dispatch sanitation trucks immediately.",

        // citizen form page
        formHeaderTitle: "Report Civic Issue (BMC Wards)",
        formHeaderSub: "Capture image, speak regional note, & auto-anonymize",
        tapPhotoTitle: "Tap to Capture Photo",
        tapPhotoSub: "Supports live camera & gallery selection",
        lblGps: "GPS Coordinates",
        lblTime: "Timestamp",
        lblLang: "Regional Voice Language",
        lblMic: "Tap Voice",
        lblVoiceNote: "Voice Note Transcript",
        phVoiceNote: "Speak in your regional language or type notes here...",
        lblSensitivity: "Location Sensitivity Zone",
        optSensNone: "General Zone (Normal Priority)",
        optSensSchool: "School / Hospital Zone (+1.5 Urgency)",
        optSensWater: "Water Body / Drainage Canal (+1.5 Urgency)",
        optSensMarket: "Public Market / Bus Stand (+1.5 Urgency)",
        btnSubmit: "Submit Complaint",
        receiptHeader: "Complaint Registered",
        lblResCat: "Waste Category:",
        lblResVol: "Est. Volume:",
        lblResDisp: "Dispatch Unit:",
        lblResUrg: "Algorithmic Urgency:",
        lblResPlan: "Action Plan:",

        // about page
        aboutTitle: "SwachhLens System Architecture & Workflow",
        aboutSub: "An end-to-end computer vision and spatial decision support framework designed for municipal sanitation logistics.",
        step1Title: "1. Data Collection",
        step1Desc: "Captures geo-tagged photographs, real-time GPS coordinates, and regional voice notes in Odia, Hindi, or English.",
        step2Title: "2. Privacy Anonymization",
        step2Desc: "OpenCV YuNet model detects faces and vehicle registration plates, pixelating them instantly to preserve citizen privacy.",
        step3Title: "3. 20m Spatial Deduplication",
        step3Desc: "Calculates distance between incoming GPS coordinates and existing active tickets. Matches within 20m are merged to prevent duplicate tickets.",
        step4Title: "4. Vision Classification",
        step4Desc: "Evaluates visual waste severity, categorizing material into Plastic, Organic, Hazardous, or Construction Debris and assigning volume scale bands.",
        step5Title: "5. Priority Dispatch Router",
        step5Desc: "Computes urgency score factoring volume, environmental hazards (drains/fire), and location sensitivity to route specific crew units."
    },
    or: {
        navHome: "ମୁଖ୍ୟ ପୃଷ୍ଠା",
        navCitizen: "ଅଭିଯୋଗ କରନ୍ତୁ",
        navCommand: "ଅଫିସର ପୋର୍ଟାଲ୍",
        navAbout: "ସିଷ୍ଟମ୍ ବିଷୟରେ",
        navBack: "ମୁଖ୍ୟ ପୃଷ୍ଠାକୁ ଫେରନ୍ତୁ",
        liveAi: "ଲାଇଭ୍ ଭିଜନ୍ AI",
        engineBadge: "ସ୍ୱଚ୍ଛଲେନ୍ସ ଇଞ୍ଜିନ୍",
        
        homePill: "ଭୁବନେଶ୍ୱର ମ୍ୟୁନିସିପାଲ୍ କୋର୍ପୋରେସନ୍ (BMC) ପୋର୍ଟାଲ୍",
        homeTitle: "ସ୍ୱଚ୍ଛ ସହର, ତୁରନ୍ତ କାର୍ଯ୍ୟାନୁଷ୍ଠାନ",
        homeSubtitle: "କିଛି ସେକେଣ୍ଡରେ ଆବର୍ଜନା, ଅବରୋଧ ହୋଇଥିବା ନାଳ କିମ୍ବା ସଫେଇ ସମସ୍ୟା ରିପୋର୍ଟ କରନ୍ତୁ। ଉଠାଯାଇଥିବା ଫୋଟୋ ତୁରନ୍ତ ସଫେଇ ଟିମ୍ ପାଖକୁ ଯାଏ।",
        cardCitizenTitle: "ସଫେଇ ସମସ୍ୟା ରିପୋର୍ଟ କରନ୍ତୁ",
        cardCitizenDesc: "ଆବର୍ଜନା କିମ୍ବା ନାଳର ଫୋଟୋ ଉଠାନ୍ତୁ, ଓଡ଼ିଆ କିମ୍ବା ହିନ୍ଦୀରେ କଣ୍ଠସ୍ୱର କୁହନ୍ତୁ ଏବଂ ଦାଖଲ କରନ୍ତୁ। ଲଗଇନ୍ ଦରକାର ନାହିଁ।",
        btnLaunchCitizen: "ଅଭିଯୋଗ ରିପୋର୍ଟ କରନ୍ତୁ",
        cardCommandTitle: "ମ୍ୟୁନିସିପାଲ୍ ଅଫିସର ପୋର୍ଟାଲ୍",
        cardCommandDesc: "ୱାର୍ଡ ମ୍ୟାପ୍ ଦେଖନ୍ତୁ, ଆସୁଥିବା ନାଗରିକ ଅଭିଯୋଗ ଯାଞ୍ଚ କରନ୍ତୁ ଏବଂ ସଫେଇ ଟିମ୍ ପଠାନ୍ତୁ।",
        btnOfficerLogin: "ଅଫିସର ଲଗଇନ୍",
        cardAboutTitle: "ସିଷ୍ଟମ୍ ବିଷୟରେ",
        cardAboutDesc: "ସ୍ୱୟଂଚାଳିତ ବର୍ଗୀକରଣ, ଗୋପନୀୟତା ସୁରକ୍ଷା ଏବଂ ପ୍ରାଥମିକତା ସ୍କୋରିଙ୍ଗ୍ କିପରି କାମ କରେ ଜାଣନ୍ତୁ।",
        btnExploreAbout: "ସିଷ୍ଟମ୍ ଦେଖନ୍ତୁ",

        featHeading: "କିପରି କାର୍ଯ୍ୟ କରେ",
        howItWorksSub: "ସିଭିକ୍ ସମସ୍ୟା ରିପୋର୍ଟ କରିବା ପାଇଁ ୩ଟି ସହଜ ପଦକ୍ଷେପ",
        step1Header: "ଫୋଟୋ ଉଠାନ୍ତୁ",
        step1Detail: "ସମସ୍ୟାର ଫୋଟୋ ଉଠାନ୍ତୁ। ସ୍ଥାନ ଏବଂ ସମୟ ସ୍ୱୟଂଚାଳିତ ଭାବରେ ଚିହ୍ନଟ ହୁଏ।",
        step2Header: "ଗୋପନୀୟତା ସୁରକ୍ଷା",
        step2Detail: "ନାଗରିକଙ୍କ ଗୋପନୀୟତା ରଖିବା ପାଇଁ ମୁହଁ ଏବଂ ଗାଡି ନମ୍ବର ପ୍ଲେଟ୍ ଧୂସର (Blur) କରାଯାଏ।",
        step3Header: "ତୁରନ୍ତ ସଫେଇ",
        step3Detail: "ମ୍ୟୁନିସିପାଲିଟି ଟିମ୍ ତୁରନ୍ତ ସ୍ଥାନ ସୂଚନା ପାଇ ସଫେଇ ଗାଡି ପଠାନ୍ତି।",

        formHeaderTitle: "ନାଗରିକ ସମସ୍ୟା ରିପୋର୍ଟ କରନ୍ତୁ",
        formHeaderSub: "ଫୋଟୋ ଉଠାନ୍ତୁ, କଣ୍ଠସ୍ୱର ନୋଟ୍ କୁହନ୍ତୁ ଏବଂ ସ୍ୱୟଂଚାଳିତ ଗୋପନୀୟତା ରଖନ୍ତୁ",
        tapPhotoTitle: "ଫୋଟୋ ଉଠାଇବା ପାଇଁ ଟ୍ୟାପ୍ କରନ୍ତୁ",
        tapPhotoSub: "ଲାଇଭ୍ କ୍ୟାମେରା ଏବଂ ଗ୍ୟାଲେରୀ ସପୋର୍ଟ କରେ",
        lblGps: "GPS ସ୍ଥାନାଙ୍କ (Coordinates)",
        lblTime: "ସମୟ ସୂଚୀ (Timestamp)",
        lblLang: "ଆଞ୍ଚଳିକ ଭଏସ୍ ଭାଷା",
        lblMic: "ଭଏସ୍ ଟ୍ୟାପ୍",
        lblVoiceNote: "ଭଏସ୍ ନୋଟ୍ ଟ୍ରାନ୍ସକ୍ରିପ୍ଟ",
        phVoiceNote: "ଆପଣଙ୍କ ଆଞ୍ଚଳିକ ଭାଷାରେ କୁହନ୍ତୁ କିମ୍ବା ଏଠାରେ ଲେଖନ୍ତୁ...",
        lblSensitivity: "ସ୍ଥାନର ସମ୍ବେଦନଶୀଳତା (Zone)",
        optSensNone: "ସାଧାରଣ ଅଞ୍ଚଳ (ସାଧାରଣ ପ୍ରାଥମିକତା)",
        optSensSchool: "ବିଦ୍ୟାଳୟ / ଡାକ୍ତରଖାନା ଅଞ୍ଚଳ (+୧.୫ ଜରୁରୀ)",
        optSensWater: "ଜଳାଶୟ / ନାଳ ଅଞ୍ଚଳ (+୧.୫ ଜରୁରୀ)",
        optSensMarket: "ହାଟ / ବସ୍ ଷ୍ଟାଣ୍ଡ ଅଞ୍ଚଳ (+୧.୫ ଜରୁରୀ)",
        btnSubmit: "ଅଭିଯୋଗ ଦାଖଲ କରନ୍ତୁ",
        receiptHeader: "ଅଭିଯୋଗ ପଞ୍ଜିକୃତ ହେଲା",
        lblResCat: "ଆବର୍ଜନା ବର୍ଗ:",
        lblResVol: "ଆନୁମାନିକ ପରିମାଣ:",
        lblResDisp: "ପଠାଯାଇଥିବା ଟିମ୍:",
        lblResUrg: "ଜରୁରୀ ସ୍କୋର (Urgency):",
        lblResPlan: "କାର୍ଯ୍ୟାନୁଷ୍ଠାନ ଯୋଜନା:",

        aboutTitle: "ସ୍ୱଚ୍ଛଲେନ୍ସ ସିଷ୍ଟମ୍ ଆର୍କିଟେକ୍ଚର୍ ଏବଂ କାର୍ଯ୍ୟପ୍ରଣାଳୀ",
        aboutSub: "ମ୍ୟୁନିସିପାଲିଟି ସଫେଇ ପରିଚାଳନା ପାଇଁ ପ୍ରସ୍ତୁତ ଏକ ସମ୍ପୂର୍ଣ୍ଣ କಮ୍ପ୍ୟୁଟର ଭିଜନ୍ ଏବଂ ନିଷ୍ପତ୍ତି ପ୍ରଣାଳୀ।",
        step1Title: "୧. ଡାଟା ସଂଗ୍ରହ",
        step1Desc: "ଜିଓ-ଟ୍ୟାଗ୍ ସହିତ ଫୋଟୋ, ଜିପିଏସ୍ ଏବଂ ଓଡ଼ିଆ, ହିନ୍ଦୀ, ଇଂରାଜୀ କଣ୍ଠସ୍ୱର ସଂଗ୍ରହ କରେ।",
        step2Title: "୨. ଗୋପନୀୟତା ଅନୋନିମାଇଜେସନ୍",
        step2Desc: "ସ୍ୱୟଂଚାଳିତ ଭାବରେ ମୁହଁ ଏବଂ ଗାଡି ନମ୍ବର ପ୍ଲେଟ୍ ଧୂସର କରି ନାଗରିକଙ୍କ ଗୋପନୀୟତା ରକ୍ଷା କରେ।",
        step3Title: "୩. ୨୦ ମିଟର ଡିଡ୍ୟୁପ୍ଲିକେସନ୍",
        step3Desc: "୨୦ ମିଟର ପରିସର ମଧ୍ୟରେ ଥିବା ନକଲି ଅଭିଯୋଗକୁ ଏକତ୍ରିତ କରେ।",
        step4Title: "୪. ଭିଜନ୍ ବର୍ଗୀକରଣ",
        step4Desc: "ଆବର୍ଜନା ପ୍ରକାର (ପ୍ଲାଷ୍ଟିକ୍, ଜୈବିକ, ବିପଜ୍ଜନକ, ଡେବ୍ରିସ୍) ଏବଂ ଆନୁମାନିକ ପରିମାଣ ନିରୂପଣ କରେ।",
        step5Title: "୫. ଟିମ୍ ପ୍ରେରଣ",
        step5Desc: "ପରିମାଣ, ବିପଦ ଏବଂ ସମ୍ବେଦନଶୀଳ ଅଞ୍ଚଳ ଆଧାରରେ ଉପଯୁକ୍ତ ସଫେଇ ଟିମ୍ ପଠାଏ।"
    },
    hi: {
        navHome: "होम",
        navCitizen: "समस्या रिपोर्ट करें",
        navCommand: "अधिकारी पोर्टल",
        navAbout: "सिस्टम के बारे में",
        navBack: "होम पर वापस जाएं",
        liveAi: "लाइव विज़न AI",
        engineBadge: "स्वच्छलेंस इंजन",
        
        homePill: "भुवनेश्वर नगर निगम (BMC) पोर्टल",
        homeTitle: "स्वच्छ शहर, त्वरित कार्रवाई",
        homeSubtitle: "कुछ ही सेकंड में कचरा, अवरुद्ध नालियों या स्वच्छता संबंधी समस्याओं की रिपोर्ट करें। फोटो सीधे सफाई टीमों को भेजी जाती हैं।",
        cardCitizenTitle: "स्वच्छता समस्या रिपोर्ट करें",
        cardCitizenDesc: "कचरे या बंद नाले की फोटो खींचें, उड़िया या हिंदी में वॉयस नोट जोड़ें और तुरंत जमा करें। लॉगिन की आवश्यकता नहीं है।",
        btnLaunchCitizen: "अभी रिपोर्ट दर्ज करें",
        cardCommandTitle: "नगर निगम अधिकारी पोर्टल",
        cardCommandDesc: "वार्ड मानचित्र देखें, आने वाली नागरिक शिकायतों की जांच करें और सफाई दल तैनात करें।",
        btnOfficerLogin: "अधिकारी लॉगिन",
        cardAboutTitle: "सिस्टम आर्किटेक्चर",
        cardAboutDesc: "जानें कि स्वचालित विज़न वर्गीकरण, गोपनीयता धुंधलापन और प्राथमिकता स्कोरिंग कैसे काम करती है।",
        btnExploreAbout: "सिस्टम देखें",

        featHeading: "यह कैसे काम करता है",
        howItWorksSub: "नागरिक समस्याओं को रिपोर्ट करने के 3 आसान चरण",
        step1Header: "फोटो खींचें",
        step1Detail: "समस्या की तुरंत फोटो लें। स्थान और समय अपने आप पहचाना जाता है।",
        step2Header: "गोपनीयता सुरक्षा",
        step2Detail: "नागरिक गोपनीयता के लिए चेहरे और वाहन नंबर प्लेट स्वचालित रूप से धुंधले किए जाते हैं।",
        step3Header: "त्वरित सफाई",
        step3Detail: "नगर निगम टीमों को तुरंत स्थान अलर्ट मिलता है और सफाई वाहन भेजे जाते हैं।",

        formHeaderTitle: "नागरिक समस्या रिपोर्ट करें",
        formHeaderSub: "फोटो खींचें, क्षेत्रीय वॉयस नोट बोलें और गोपनीयता रखें",
        tapPhotoTitle: "फोटो खींचने के लिए टैप करें",
        tapPhotoSub: "लाइव कैमरा और गैलरी सपोर्ट करता है",
        lblGps: "GPS निर्देशांक (Coordinates)",
        lblTime: "समय मोहर (Timestamp)",
        lblLang: "क्षेत्रीय वॉयस भाषा",
        lblMic: "वॉयस टैप",
        lblVoiceNote: "वॉयस नोट ट्रांसक्रिप्ट",
        phVoiceNote: "अपनी क्षेत्रीय भाषा में बोलें या यहां लिखें...",
        lblSensitivity: "स्थान की संवेदनशीलता (Zone)",
        optSensNone: "सामान्य क्षेत्र (सामान्य प्राथमिकता)",
        optSensSchool: "स्कूल / अस्पताल क्षेत्र (+1.5 प्राथमिकता)",
        optSensWater: "जल निकाय / नाला क्षेत्र (+1.5 प्राथमिकता)",
        optSensMarket: "सार्वजनिक बाजार / बस स्टैंड (+1.5 प्राथमिकता)",
        btnSubmit: "शिकायत दर्ज करें",
        receiptHeader: "शिकायत दर्ज की गई",
        lblResCat: "कचरा श्रेणी:",
        lblResVol: "अनुमानित मात्रा:",
        lblResDisp: "तैनात दल (Dispatch):",
        lblResUrg: "प्राथमिकता स्कोर:",
        lblResPlan: "कार्रवाई योजना:",

        aboutTitle: "स्वच्छलेंस सिस्टम आर्किटेक्चर और कार्यप्रणाली",
        aboutSub: "नगर निगम स्वच्छता प्रबंधन के लिए बनाया गया एक संपूर्ण कंप्यूटर विज़न और निर्णय समर्थन ढांचा।",
        step1Title: "1. डेटा संग्रह",
        step1Desc: "जियो-टैग फोटो, जीपीएस और उड़िया, हिंदी, अंग्रेजी वॉयस नोट्स एकत्र करता है।",
        step2Title: "2. गोपनीयता अनोनिमाइजेशन",
        step2Desc: "स्वचालित रूप से चेहरे और वाहन लाइसेंस प्लेट को धुंधला करके नागरिक गोपनीयता की रक्षा करता है।",
        step3Title: "3. 20 मीटर डुप्लीकेशन जांच",
        step3Desc: "20 मीटर के भीतर डुप्लिकेट शिकायतों को मिलाकर प्राथमिकता स्कोर बढ़ाता है।",
        step4Title: "4. विज़न वर्गीकरण",
        step4Desc: "कचरे के प्रकार (प्लास्टिक, जैविक, खतरनाक, मलबा) और अनुमानित मात्रा का मूल्यांकन करता है।",
        step5Title: "5. प्राथमिकता टीम प्रेषण",
        step5Desc: "मात्रा, खतरे और संवेदनशील क्षेत्र के आधार पर उपयुक्त सफाई दल भेजता है।"
    }
};

let currentUiLang = localStorage.getItem("swachh_ui_lang") || "en";

function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", current);
    localStorage.setItem("swachh_theme", current);
    updateThemeIcon(current);
}

function updateThemeIcon(theme) {
    const icons = document.querySelectorAll(".themeIconBtn");
    icons.forEach(btn => {
        if (theme === "light") {
            btn.innerHTML = `<i class="fa-solid fa-sun" style="color:#d97706;"></i>`;
        } else {
            btn.innerHTML = `<i class="fa-solid fa-moon" style="color:#10b981;"></i>`;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // load saved theme or default to dark
    const savedTheme = localStorage.getItem("swachh_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
    applyUiLanguage(currentUiLang);
    const sel = document.getElementById("uiLangSelect");
    if (sel) sel.value = currentUiLang;
});

function changeUiLanguage(langCode) {
    currentUiLang = langCode;
    localStorage.setItem("swachh_ui_lang", langCode);
    applyUiLanguage(langCode);

    // also switch the voice language to match
    const voiceLangSel = document.getElementById("langSelect");
    if (voiceLangSel) {
        if (langCode === "or") voiceLangSel.value = "or-IN";
        else if (langCode === "hi") voiceLangSel.value = "hi-IN";
        else if (langCode === "en") voiceLangSel.value = "en-IN";
    }
}

function applyUiLanguage(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    // swap out text content for all elements with data-i18n attribute
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) {
            el.innerHTML = dict[key];
        }
    });

    // same for placeholder text
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
        const key = el.getAttribute("data-i18n-ph");
        if (dict[key]) {
            el.placeholder = dict[key];
        }
    });
}
