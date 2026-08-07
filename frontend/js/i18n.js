// frontend/js/i18n.js - Comprehensive Multilingual UI Engine for SwachhLens

const TRANSLATIONS = {
    en: {
        navHome: "Gateway",
        navCitizen: "Citizen Portal",
        navCommand: "Municipal Command",
        navAbout: "About System",
        navBack: "Back to Gateway",
        liveAi: "Live Vision AI",
        engineBadge: "SwachhLens AI Sensor Engine",
        
        // Homepage
        homePill: "Bhubaneswar Municipal Corporation (BMC) • AI Civic Engine",
        homeTitle: "SwachhLens BMC Gateway",
        homeSubtitle: "Official AI-Powered Waste Response Decision Support System for Bhubaneswar Municipal Wards & Vision Logistics",
        cardCitizenTitle: "BMC Citizen App",
        cardCitizenDesc: "Report civic waste issues across Bhubaneswar with instant photo capture, Odia voice transcriptions, and automated face/license plate privacy receipts.",
        btnLaunchCitizen: "Launch Citizen App",
        cardCommandTitle: "BMC Municipal Command",
        cardCommandDesc: "Bhubaneswar Ward Leaflet logistics map, real-time algorithmic urgency dispatch queue, and inter-departmental forwarding.",
        btnOfficerLogin: "BMC Officer Login",
        cardAboutTitle: "BMC AI Architecture & Workflow",
        cardAboutDesc: "Deep dive into Pixtral-12B multimodal computer vision, YuNet ONNX privacy blurring, 20m Haversine spatial deduplication, and multi-factor urgency scoring.",
        btnExploreAbout: "Explore System Architecture",

        // Features Grid on Homepage
        featHeading: "Core AI & Telemetry Innovations",
        featVisionTitle: "Pixtral Multimodal Vision",
        featVisionDesc: "Auto-classifies waste category (Plastic, Organic, E-Waste, Debris) and estimates volume band.",
        featPrivacyTitle: "YuNet Privacy Blur",
        featPrivacyDesc: "Automatically detects and pixelates faces and vehicle license plates before storing reports.",
        featVoiceTitle: "Multilingual Voice Notes",
        featVoiceDesc: "Speak in Odia, Hindi, Bengali, or English. Transcribed and translated to English for sanitation crews.",
        featDedupTitle: "20m Haversine Deduplication",
        featDedupDesc: "Detects nearby active reports within 20m, merging duplicate complaints and boosting urgency scores.",

        // Citizen Form Page
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
        lblResPlan: "AI Dispatch Plan:",

        // About Page
        aboutTitle: "SwachhLens System Architecture & AI Workflow",
        aboutSub: "An end-to-end multi-agent computer vision & spatial decision support framework designed for municipal sanitation logistics.",
        step1Title: "1. Multi-Modal Telemetry Ingestion",
        step1Desc: "Captures high-resolution geo-tagged photographs, real-time GPS coordinates, and regional voice notes in Odia, Hindi, Bengali, or English.",
        step2Title: "2. YuNet Edge Privacy Anonymization",
        step2Desc: "OpenCV YuNet ONNX neural network and Haar Cascade classifiers detect faces and vehicle registration plates, pixelating them instantly to preserve citizen privacy.",
        step3Title: "3. 20m Haversine Spatial Deduplication",
        step3Desc: "Calculates spherical distance between incoming GPS coordinates and existing active tickets. Matches within 20m are merged to prevent redundant dispatches while boosting urgency scores.",
        step4Title: "4. Pixtral-12B Multimodal Vision Classification",
        step4Desc: "Evaluates visual waste severity, categorizing material into Plastic, Organic, Hazardous, or Construction Debris and assigning volume scale bands.",
        step5Title: "5. Deterministic Dispatch & Sensitivity Router",
        step5Desc: "Computes final urgency score factoring volume, environmental hazards (drains/fire), and location sensitivity (+1.5 boost for Schools, Hospitals, Water Bodies) to route specific crew units."
    },
    or: {
        navHome: "ଗେଟୱେ",
        navCitizen: "ନାଗରିକ ପୋର୍ଟାଲ୍",
        navCommand: "ମ୍ୟୁନିସିପାଲ୍ କମାଣ୍ଡ",
        navAbout: "ସିଷ୍ଟମ୍ ବିଷୟରେ",
        navBack: "ଗେଟୱେକୁ ଫେରନ୍ତୁ",
        liveAi: "ଲାଇଭ୍ ଭିଜନ୍ AI",
        engineBadge: "ସ୍ୱଚ୍ଛଲେନ୍ସ AI ସେନ୍ସର ଇଞ୍ଜିନ୍",
        
        // Homepage
        homePill: "ଟେକ୍ନୋଭା ୩.୦ • AI ସିଭିକ୍ ଇଣ୍ଟେଲିଜେନ୍ସ",
        homeTitle: "ସ୍ୱଚ୍ଛଲେନ୍ସ AI ଇଞ୍ଜିନ୍",
        homeSubtitle: "AI-ଦ୍ୱାରା ପରିଚାଳିତ ମ୍ୟୁନିସିପାଲ୍ ସଫେଇ, ସ୍ପାସିଆଲ୍ ଡିଡ୍ୟୁପ୍ଲିକେସନ୍ ଏବଂ କମ୍ପ୍ୟୁଟର ଭିଜନ୍ ଲଜିଷ୍ଟିକ୍ସ ଇଞ୍ଜିନ୍",
        cardCitizenTitle: "ନାଗରିକ ପୋର୍ଟାଲ୍",
        cardCitizenDesc: "ଫୋଟୋ, ଆଞ୍ଚଳିକ କଣ୍ଠସ୍ୱର ନୋଟ୍ ଏବଂ ଗୋପନୀୟତା ସୁରକ୍ଷା ସହିତ ଆବର୍ଜନା ସମସ୍ୟା ତୁରନ୍ତ ରିପୋର୍ଟ କରନ୍ତୁ।",
        btnLaunchCitizen: "ନାଗରିକ ଆପ୍ ଖୋଲନ୍ତୁ",
        cardCommandTitle: "ମ୍ୟୁନିସିପାଲ୍ କମାଣ୍ଡ",
        cardCommandDesc: "ସ୍ପାସିଆଲ୍ ଲିଫ୍‌ଲେଟ୍ ମ୍ୟାପ୍, ରିଅଲ୍-ଟାଇମ୍ ଅଲଗୋରିଦମିକ୍ ଜରୁରୀ ଡିସପାଚ୍ କ୍ୟୁ ଏବଂ ଯାଞ୍ଚ ପୋର୍ଟାଲ୍।",
        btnOfficerLogin: "ଅଫିସର ଲଗଇନ୍",
        cardAboutTitle: "AI ଆର୍କିଟେକ୍ଚର୍ ଏବଂ କାର୍ଯ୍ୟପ୍ରଣାଳୀ",
        cardAboutDesc: "ପିକ୍ସଟ୍ରାଲ୍-12B ଭିଜନ୍ ମୋଡେଲ୍, ୟୁନେଟ୍ ଗୋପନୀୟତା ଧୂସର, ୨୦ ମିଟର ଡିଡ୍ୟୁପ୍ଲିକେସନ୍ ଏବଂ ସ୍କୋରିଙ୍ଗ୍ ବୁଝନ୍ତୁ।",
        btnExploreAbout: "ସିଷ୍ଟମ୍ ଆର୍କିଟେକ୍ଚର୍ ଦେଖନ୍ତୁ",

        // Features Grid on Homepage
        featHeading: "ମୁଖ୍ୟ AI ଏବଂ ଟେଲିମେଟ୍ରି ଉଦ୍ଭାବନ",
        featVisionTitle: "ପିକ୍ସଟ୍ରାଲ୍ ମଲ୍ଟିମୋଡାଲ୍ ଭିଜନ୍",
        featVisionDesc: "ସ୍ୱୟଂଚାଳିତ ଭାବରେ ଆବର୍ଜନା ବର୍ଗ (ପ୍ଲାଷ୍ଟିକ୍, ଜୈବିକ, ଇ-ବର୍ଜ୍ୟ, ଡେବ୍ରିସ୍) ବର୍ଗୀକରଣ କରେ।",
        featPrivacyTitle: "ୟୁନେଟ୍ ପ୍ରାଇଭେସି ବ୍ଲର୍",
        featPrivacyDesc: "ମୁହଁ ଏବଂ ଗାଡି ନମ୍ବର ପ୍ଲେଟ୍ ଚିହ୍ନଟ କରି ସ୍ୱୟଂଚାଳିତ ଭାବରେ ଧୂସର (Blur) କରେ।",
        featVoiceTitle: "ବହୁଭାଷୀ ଭଏସ୍ ନୋଟ୍",
        featVoiceDesc: "ଓଡ଼ିଆ, ହିନ୍ଦୀ, ବଙ୍ଗାଳୀ କିମ୍ବା ଇଂରାଜୀରେ କୁହନ୍ତୁ। ସଫେଇ କର୍ମଚାରୀଙ୍କ ପାଇଁ ଇଂରାଜୀରେ ଅନୁବାଦ ହୁଏ।",
        featDedupTitle: "୨୦ ମିଟର ହାଭରସାଇନ୍ ଡିଡ୍ୟୁପ୍ଲିକେସନ୍",
        featDedupDesc: "୨୦ ମିଟର ମଧ୍ୟରେ ଥିବା ନକଲି ରିପୋର୍ଟଗୁଡ଼ିକୁ ଚିହ୍ନଟ କରି ଏକତ୍ରିତ କରେ।",

        // Citizen Form Page
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
        lblResPlan: "AI କାର୍ଯ୍ୟାନୁଷ୍ଠାନ ଯୋଜନା:",

        // About Page
        aboutTitle: "ସ୍ୱଚ୍ଛଲେନ୍ସ ସିଷ୍ଟମ୍ ଆର୍କିଟେକ୍ଚର୍ ଏବଂ AI କାର୍ଯ୍ୟପ୍ରଣାଳୀ",
        aboutSub: "ମ୍ୟୁନିସିପାଲିଟି ସଫେଇ ପରିଚାଳନା ପାଇଁ ପ୍ରସ୍ତୁତ ଏକ ସମ୍ପୂର୍ଣ୍ଣ ମଲ୍ଟି-ଏଜେଣ୍ଟ କମ୍ପ୍ୟୁଟର ଭିଜନ୍ ଏବଂ AI ନିଷ୍ପତ୍ତି ପ୍ରଣାଳୀ।",
        step1Title: "୧. ମଲ୍ଟି-ମୋଡାଲ୍ ଡାଟା ସଂଗ୍ରହ",
        step1Desc: "ଜିଓ-ଟ୍ୟାଗ୍ ସହିତ ଫୋଟୋ, ଜିପିଏସ୍ ଏବଂ ଓଡ଼ିଆ, ହିନ୍ଦୀ, ଇଂରାଜୀ କଣ୍ଠସ୍ୱର ସଂଗ୍ରହ କରେ।",
        step2Title: "୨. ୟୁନେଟ୍ ଗୋପନୀୟତା ଅନୋନିମାଇଜେସନ୍",
        step2Desc: "ସ୍ୱୟଂଚାଳିତ ଭାବରେ ମୁହଁ ଏବଂ ଗାଡି ନମ୍ବର ପ୍ଲେଟ୍ ଧୂସର କରି ନାଗରିକଙ୍କ ଗୋପନୀୟତା ରକ୍ଷା କରେ।",
        step3Title: "୩. ୨୦ ମିଟର ହାଭରସାଇନ୍ ଡିଡ୍ୟୁପ୍ଲିକେସନ୍",
        step3Desc: "୨୦ ମିଟର ପରିସର ମଧ୍ୟରେ ଥିବା ନକଲି ଅଭିଯୋଗକୁ ଏକତ୍ରିତ କରି ଜରୁରୀ ସ୍କୋର ବୃଦ୍ଧି କରେ।",
        step4Title: "୪. ପିକ୍ସଟ୍ରାଲ୍-12B ଭିଜନ୍ ବର୍ଗୀକରଣ",
        step4Desc: "ଆବର୍ଜନା ପ୍ରକାର (ପ୍ଲାଷ୍ଟିକ୍, ଜୈବିକ, ବିପଜ୍ଜନକ, ଡେବ୍ରିସ୍) ଏବଂ ଆନୁମାନିକ ପରିମାଣ ନିରୂପଣ କରେ।",
        step5Title: "୫. ଜରୁରୀ ସ୍କୋର ଏବଂ ଟିମ୍ ପ୍ରେରଣ",
        step5Desc: "ପରିମାଣ, ବିପଦ ଏବଂ ସମ୍ବେଦନଶୀଳ ଅଞ୍ଚଳ (ସ୍କୁଲ/ହସ୍ପିଟାଲ) ଆଧାରରେ ଉପଯୁକ୍ତ ସଫେଇ ଟିମ୍ ପଠାଏ।"
    },
    hi: {
        navHome: "गेटवे",
        navCitizen: "नागरिक पोर्टल",
        navCommand: "नगर निगम कमांड",
        navAbout: "सिस्टम के बारे में",
        navBack: "गेटवे पर वापस जाएं",
        liveAi: "लाइव विज़न AI",
        engineBadge: "स्वच्छलेंस AI सेंसर इंजन",
        
        // Homepage
        homePill: "टेकनोवा 3.0 • AI नागरिक इंटेलिजेंस",
        homeTitle: "स्वच्छलेंस AI इंजन",
        homeSubtitle: "AI-संचालित नगर निगम स्वच्छता निर्णय प्रणाली, स्थानिक डुप्लीकेशन जांच और कंप्यूटर विज़न लॉजिस्टिक्स",
        cardCitizenTitle: "नागरिक पोर्टल",
        cardCitizenDesc: "तस्वीर, क्षेत्रीय वॉयस नोट और स्वचालित गोपनीयता सुरक्षा के साथ कचरा समस्याओं की तुरंत रिपोर्ट करें।",
        btnLaunchCitizen: "नागरिक ऐप खोलें",
        cardCommandTitle: "नगर निगम कमांड",
        cardCommandDesc: "स्थानिक लीफलेट मैप, वास्तविक समय प्राथमिकता प्रेषण कतार और निरीक्षण पोर्टल।",
        btnOfficerLogin: "अधिकारी लॉगिन",
        cardAboutTitle: "AI आर्किटेक्चर और कार्यप्रणाली",
        cardAboutDesc: "पिक्सट्राल-12B विज़न मॉडल, यूनेट गोपनीयता धुंधलापन, 20 मीटर डुप्लीकेशन और स्कोरिंग को समझें।",
        btnExploreAbout: "सिस्टम आर्किटेक्चर देखें",

        // Features Grid on Homepage
        featHeading: "मुख्य AI और टेलीमेट्री नवाचार",
        featVisionTitle: "पिक्सट्राल मल्टीमॉडल विज़न",
        featVisionDesc: "कचरे की श्रेणी (प्लास्टिक, जैविक, ई-कचरा, मलबे) को स्वचालित रूप से वर्गीकृत करता है।",
        featPrivacyTitle: "यूनेट गोपनीयता धुंधलापन",
        featPrivacyDesc: "चेहरे और वाहन लाइसेंस प्लेट को स्वचालित रूप से धुंधला (Blur) करता है।",
        featVoiceTitle: "बहुभाषी वॉयस नोट्स",
        featVoiceDesc: "उड़िया, हिंदी, बंगाली या अंग्रेजी में बोलें। सफाई कर्मचारियों के लिए अंग्रेजी में अनुवादित होता है।",
        featDedupTitle: "20 मीटर डुप्लीकेशन जांच",
        featDedupDesc: "20 मीटर के भीतर डुप्लिकेट शिकायतों को पहचानकर प्राथमिकता बढ़ाता है।",

        // Citizen Form Page
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
        lblResPlan: "AI कार्रवाई योजना:",

        // About Page
        aboutTitle: "स्वच्छलेंस सिस्टम आर्किटेक्चर और AI कार्यप्रणाली",
        aboutSub: "नगर निगम स्वच्छता प्रबंधन के लिए बनाया गया एक संपूर्ण मल्टी-एजेंट कंप्यूटर विज़न और निर्णय समर्थन ढांचा।",
        step1Title: "1. मल्टी-मॉडल डेटा संग्रह",
        step1Desc: "जियो-टैग फोटो, जीपीएस और उड़िया, हिंदी, अंग्रेजी वॉयस नोट्स एकत्र करता है।",
        step2Title: "2. यूनेट गोपनीयता अनोनिमाइजेशन",
        step2Desc: "स्वचालित रूप से चेहरे और वाहन लाइसेंस प्लेट को धुंधला करके नागरिक गोपनीयता की रक्षा करता है।",
        step3Title: "3. 20 मीटर डुप्लीकेशन जांच",
        step3Desc: "20 मीटर के भीतर डुप्लिकेट शिकायतों को मिलाकर प्राथमिकता स्कोर बढ़ाता है।",
        step4Title: "4. पिक्सट्राल-12B विज़न वर्गीकरण",
        step4Desc: "कचरे के प्रकार (प्लास्टिक, जैविक, खतरनाक, मलबा) और अनुमानित मात्रा का मूल्यांकन करता है।",
        step5Title: "5. प्राथमिकता स्कोर और टीम प्रेषण",
        step5Desc: "मात्रा, खतरे और संवेदनशील क्षेत्र (स्कूल/अस्पताल) के आधार पर उपयुक्त सफाई दल भेजता है।"
    }
};

let currentUiLang = localStorage.getItem("swachh_ui_lang") || "en";

document.addEventListener("DOMContentLoaded", () => {
    applyUiLanguage(currentUiLang);
    const sel = document.getElementById("uiLangSelect");
    if (sel) sel.value = currentUiLang;
});

function changeUiLanguage(langCode) {
    currentUiLang = langCode;
    localStorage.setItem("swachh_ui_lang", langCode);
    applyUiLanguage(langCode);

    // Also sync the voice transcript language select on citizen page automatically
    const voiceLangSel = document.getElementById("langSelect");
    if (voiceLangSel) {
        if (langCode === "or") voiceLangSel.value = "or-IN";
        else if (langCode === "hi") voiceLangSel.value = "hi-IN";
        else if (langCode === "en") voiceLangSel.value = "en-IN";
    }
}

function applyUiLanguage(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;

    // Query all elements with data-i18n attributes
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) {
            el.innerHTML = dict[key];
        }
    });

    // Query elements with data-i18n-ph placeholder attributes
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
        const key = el.getAttribute("data-i18n-ph");
        if (dict[key]) {
            el.placeholder = dict[key];
        }
    });
}
