import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronDown, CircleHelp, Database, Search, UserRound } from 'lucide-react'
import SiteNav from './SiteNav'
import { useLocale } from './LocaleContext'
import './help.css'

const topics = ['fares', 'account', 'data']
const help = {
  en: {
    eyebrow: 'SKYMETRICS HELP', title: 'How can we help?', intro: 'Clear answers about flight fare analysis, your account and the data behind SkyMetrics.', search: 'Search help articles', all: 'All topics', topics: ['Flight fares', 'Your account', 'Our data'], answers: 'Answers to common questions', noResults: 'No articles matched. Try “fare”, “alert” or “data”.', back: 'Back to all articles', next: 'Ready to explore?', nextText: 'Choose a covered route and see the fare in context.', nextLink: 'Explore routes',
    articles: [
      ['fares', 'Can I book a flight on SkyMetrics?', 'No. SkyMetrics helps you understand airfare patterns; it does not sell tickets or complete bookings.'],
      ['fares', 'What does “good fare” mean?', 'We compare a saved fare with similar observations for the same route, travel date and booking window. It is a statistical guide, not a guaranteed market price.'],
      ['fares', 'Why can’t I find my route or date?', 'This prototype covers a selected set of Indian domestic routes and travel dates. The picker only shows combinations present in the dataset.'],
      ['account', 'What can I save in my account?', 'After signing in, you can save trips, follow routes, review recent searches and set a target fare for a saved trip.'],
      ['account', 'How do price alerts work?', 'Set a target fare for a saved trip. When a matching saved observation reaches that amount, a notification can appear in your SkyMetrics account. Alerts are currently in-app.'],
      ['data', 'Are these live or real ticket prices?', 'No. SkyMetrics currently uses simulated Indian domestic airfare observations. Do not use them as live booking quotes.'],
      ['data', 'Is the airfare index official government CPI?', 'No. The policy view is an experimental airfare index based on this simulated dataset. It is not an official government CPI series.'],
    ],
  },
  hi: {
    eyebrow: 'SKYMETRICS सहायता', title: 'हम कैसे मदद करें?', intro: 'उड़ान के किराए, आपके खाते और SkyMetrics के डेटा के बारे में साफ़ जवाब।', search: 'मदद के लेख खोजें', all: 'सभी विषय', topics: ['उड़ान के किराए', 'आपका खाता', 'हमारा डेटा'], answers: 'आम सवालों के जवाब', noResults: 'कोई लेख नहीं मिला। “किराया”, “अलर्ट” या “डेटा” खोजें।', back: 'सभी लेख देखें', next: 'रूट देखने के लिए तैयार हैं?', nextText: 'उपलब्ध रूट चुनें और किराए को संदर्भ में समझें।', nextLink: 'रूट देखें',
    articles: [
      ['fares', 'क्या SkyMetrics पर उड़ान बुक कर सकते हैं?', 'नहीं। SkyMetrics किराए के रुझान समझने में मदद करता है; यह टिकट नहीं बेचता और बुकिंग नहीं करता।'],
      ['fares', '“अच्छे किराए” का क्या मतलब है?', 'हम उसी रूट, यात्रा तारीख और बुकिंग समय के समान रिकॉर्ड से तुलना करते हैं। यह सांख्यिकीय संकेत है, पक्का बाज़ार भाव नहीं।'],
      ['fares', 'मेरा रूट या तारीख क्यों नहीं मिल रही?', 'इस प्रोटोटाइप में चुने हुए भारतीय घरेलू रूट और तारीखें हैं। चयन में केवल उपलब्ध विकल्प दिखते हैं।'],
      ['account', 'खाते में क्या सेव कर सकते हैं?', 'साइन इन करने के बाद आप यात्रा सेव कर सकते हैं, रूट देख सकते हैं, हाल की खोजें और लक्ष्य किराया रख सकते हैं।'],
      ['account', 'किराया अलर्ट कैसे काम करता है?', 'सेव की हुई यात्रा के लिए लक्ष्य किराया तय करें। उस स्तर का रिकॉर्ड मिलने पर खाते में सूचना आ सकती है। अभी अलर्ट ऐप के अंदर ही मिलते हैं।'],
      ['data', 'क्या ये लाइव या असली टिकट कीमतें हैं?', 'नहीं। SkyMetrics अभी सिम्युलेटेड भारतीय घरेलू किराया डेटा इस्तेमाल करता है। इसे लाइव बुकिंग कीमत न मानें।'],
      ['data', 'क्या एयरफेयर इंडेक्स सरकारी CPI है?', 'नहीं। पॉलिसी व्यू इस सिम्युलेटेड डेटा पर आधारित प्रयोगात्मक इंडेक्स है, आधिकारिक सरकारी CPI नहीं।'],
    ],
  },
  bn: {
    eyebrow: 'SKYMETRICS সহায়তা', title: 'কীভাবে সাহায্য করতে পারি?', intro: 'ফ্লাইটের ভাড়া, আপনার অ্যাকাউন্ট এবং SkyMetrics-এর তথ্য সম্পর্কে স্পষ্ট উত্তর।', search: 'সহায়তার নিবন্ধ খুঁজুন', all: 'সব বিষয়', topics: ['ফ্লাইটের ভাড়া', 'আপনার অ্যাকাউন্ট', 'আমাদের তথ্য'], answers: 'সাধারণ প্রশ্নের উত্তর', noResults: 'কোনও নিবন্ধ পাওয়া যায়নি। “ভাড়া”, “অ্যালার্ট” বা “তথ্য” লিখুন।', back: 'সব নিবন্ধ দেখুন', next: 'রুট দেখতে প্রস্তুত?', nextText: 'উপলব্ধ রুট বেছে নিয়ে ভাড়ার প্রেক্ষাপট দেখুন।', nextLink: 'রুট দেখুন',
    articles: [
      ['fares', 'SkyMetrics-এ কি ফ্লাইট বুক করা যায়?', 'না। SkyMetrics ভাড়ার ধরন বুঝতে সাহায্য করে; এখানে টিকিট বিক্রি বা বুকিং হয় না।'],
      ['fares', '“ভালো ভাড়া” বলতে কী বোঝায়?', 'একই রুট, যাত্রার তারিখ ও বুকিং সময়ের কাছাকাছি তথ্যের সঙ্গে আমরা তুলনা করি। এটি পরিসংখ্যানভিত্তিক নির্দেশনা, নিশ্চিত বাজারদর নয়।'],
      ['fares', 'আমার রুট বা তারিখ দেখা যাচ্ছে না কেন?', 'এই নমুনায় বাছাই করা ভারতীয় ঘরোয়া রুট ও তারিখ আছে। তালিকায় শুধু উপলব্ধ বিকল্পই দেখায়।'],
      ['account', 'অ্যাকাউন্টে কী সংরক্ষণ করা যায়?', 'সাইন ইন করে যাত্রা সংরক্ষণ, রুট অনুসরণ, সাম্প্রতিক খোঁজ দেখা এবং লক্ষ্য ভাড়া নির্ধারণ করা যায়।'],
      ['account', 'ভাড়ার অ্যালার্ট কীভাবে কাজ করে?', 'সংরক্ষিত যাত্রার জন্য লক্ষ্য ভাড়া ঠিক করুন। সেই দামে তথ্য মিললে অ্যাকাউন্টে বিজ্ঞপ্তি আসতে পারে। এখন অ্যালার্ট শুধু অ্যাপের মধ্যে আসে।'],
      ['data', 'এগুলি কি লাইভ টিকিটের দাম?', 'না। SkyMetrics এখন কৃত্রিম ভারতীয় ঘরোয়া ভাড়ার তথ্য ব্যবহার করে। এগুলিকে লাইভ বুকিং মূল্য ভাববেন না।'],
      ['data', 'এই বিমানভাড়া সূচক কি সরকারি CPI?', 'না। পলিসি ভিউ-এর সূচক এই কৃত্রিম তথ্যের পরীক্ষামূলক হিসাব; এটি সরকারি CPI নয়।'],
    ],
  },
  mr: {
    eyebrow: 'SKYMETRICS मदत', title: 'आम्ही कशी मदत करू?', intro: 'विमानभाडे, तुमचे खाते आणि SkyMetrics च्या डेटाबद्दल स्पष्ट उत्तरे.', search: 'मदतीचे लेख शोधा', all: 'सर्व विषय', topics: ['विमानभाडे', 'तुमचे खाते', 'आमचा डेटा'], answers: 'नेहमीच्या प्रश्नांची उत्तरे', noResults: 'लेख सापडला नाही. “भाडे”, “अलर्ट” किंवा “डेटा” वापरा.', back: 'सर्व लेख पाहा', next: 'मार्ग पाहायला तयार?', nextText: 'उपलब्ध मार्ग निवडा आणि भाड्याचा संदर्भ पाहा.', nextLink: 'मार्ग पाहा',
    articles: [
      ['fares', 'SkyMetrics वर विमान तिकीट बुक करता येते का?', 'नाही. SkyMetrics भाड्याचे कल समजायला मदत करते; येथे तिकिटांची विक्री किंवा बुकिंग होत नाही.'],
      ['fares', '“चांगले भाडे” म्हणजे काय?', 'त्याच मार्गावरील, प्रवासाच्या तारखेवरील आणि समान बुकिंग वेळेतील नोंदींशी तुलना करतो. हा सांख्यिकीय अंदाज आहे, खात्रीशीर बाजारभाव नाही.'],
      ['fares', 'माझा मार्ग किंवा तारीख का सापडत नाही?', 'या नमुन्यात निवडक भारतीय देशांतर्गत मार्ग आणि तारखा आहेत. यादीत उपलब्ध पर्यायच दिसतात.'],
      ['account', 'खात्यात काय जतन करता येते?', 'साइन इन केल्यावर प्रवास जतन करा, मार्ग पाहा, अलीकडील शोध पाहा आणि लक्ष्य भाडे ठरवा.'],
      ['account', 'भाडे अलर्ट कसा चालतो?', 'जतन केलेल्या प्रवासासाठी लक्ष्य भाडे ठरवा. त्या दराची नोंद मिळाल्यास खात्यात सूचना दिसू शकते. सध्या सूचना फक्त अॅपमध्ये येतात.'],
      ['data', 'हे थेट किंवा खरे तिकीट दर आहेत का?', 'नाही. SkyMetrics सध्या कृत्रिम भारतीय देशांतर्गत भाड्याचा डेटा वापरते. तो थेट बुकिंग दर समजू नका.'],
      ['data', 'विमानभाडे निर्देशांक सरकारी CPI आहे का?', 'नाही. पॉलिसी व्ह्यूमधील निर्देशांक या कृत्रिम डेटावर आधारित प्रयोग आहे; तो अधिकृत सरकारी CPI नाही.'],
    ],
  },
  te: {
    eyebrow: 'SKYMETRICS సహాయం', title: 'మేము ఎలా సహాయపడగలం?', intro: 'విమాన ఛార్జీలు, మీ ఖాతా మరియు SkyMetrics డేటా గురించి స్పష్టమైన సమాధానాలు.', search: 'సహాయ కథనాలను వెతకండి', all: 'అన్ని అంశాలు', topics: ['విమాన ఛార్జీలు', 'మీ ఖాతా', 'మా డేటా'], answers: 'సాధారణ ప్రశ్నలకు సమాధానాలు', noResults: 'కథనాలు కనిపించలేదు. “ధర”, “అలర్ట్” లేదా “డేటా” అని వెతకండి.', back: 'అన్ని కథనాలు చూడండి', next: 'మార్గాన్ని చూడాలా?', nextText: 'అందుబాటులో ఉన్న మార్గాన్ని ఎంచుకుని ధరను సందర్భంతో చూడండి.', nextLink: 'మార్గాలు చూడండి',
    articles: [
      ['fares', 'SkyMetrics లో విమానం బుక్ చేయవచ్చా?', 'లేదు. SkyMetrics ఛార్జీల ధోరణిని అర్థం చేసుకోవడానికి మాత్రమే; టికెట్లు అమ్మదు లేదా బుకింగ్ చేయదు.'],
      ['fares', '“మంచి ఛార్జీ” అంటే ఏమిటి?', 'అదే మార్గం, ప్రయాణ తేదీ మరియు సమానమైన బుకింగ్ సమయంలోని నమోదులతో పోలుస్తాం. ఇది గణాంక సూచన మాత్రమే; ఖచ్చితమైన మార్కెట్ ధర కాదు.'],
      ['fares', 'నా మార్గం లేదా తేదీ ఎందుకు కనిపించడం లేదు?', 'ఈ నమూనాలో కొన్ని భారతీయ దేశీయ మార్గాలు, తేదీలు మాత్రమే ఉన్నాయి. ఉన్న ఎంపికలే జాబితాలో కనిపిస్తాయి.'],
      ['account', 'నా ఖాతాలో ఏమి సేవ్ చేయవచ్చు?', 'సైన్ ఇన్ చేసి ప్రయాణాలను సేవ్ చేయవచ్చు, మార్గాలను గమనించవచ్చు, ఇటీవలి శోధనలు చూడవచ్చు, లక్ష్య ధరను పెట్టవచ్చు.'],
      ['account', 'ధర అలర్ట్ ఎలా పనిచేస్తుంది?', 'సేవ్ చేసిన ప్రయాణానికి లక్ష్య ధర పెట్టండి. ఆ ధరకు నమోదు దొరికితే మీ ఖాతాలో నోటిఫికేషన్ కనిపించవచ్చు. ప్రస్తుతం అలర్ట్‌లు యాప్‌లోనే వస్తాయి.'],
      ['data', 'ఇవి ప్రత్యక్ష టికెట్ ధరలా?', 'లేదు. SkyMetrics ప్రస్తుతం అనుకరణ భారతీయ దేశీయ ఛార్జీల డేటాను ఉపయోగిస్తుంది. వీటిని ప్రత్యక్ష బుకింగ్ ధరలుగా భావించవద్దు.'],
      ['data', 'విమాన ఛార్జీల సూచీ ప్రభుత్వ CPIనా?', 'లేదు. పాలసీ వీక్షణలోని సూచీ ఈ అనుకరణ డేటాతో చేసిన ప్రయోగాత్మక లెక్క మాత్రమే; అధికారిక ప్రభుత్వ CPI కాదు.'],
    ],
  },
  ta: {
    eyebrow: 'SKYMETRICS உதவி', title: 'எப்படி உதவலாம்?', intro: 'விமானக் கட்டணம், உங்கள் கணக்கு மற்றும் SkyMetrics தரவு பற்றிய தெளிவான பதில்கள்.', search: 'உதவிக் கட்டுரைகளைத் தேடுங்கள்', all: 'அனைத்து தலைப்புகள்', topics: ['விமானக் கட்டணம்', 'உங்கள் கணக்கு', 'எங்கள் தரவு'], answers: 'பொதுவான கேள்விகளுக்கான பதில்கள்', noResults: 'கட்டுரை கிடைக்கவில்லை. “கட்டணம்”, “எச்சரிக்கை” அல்லது “தரவு” என்று தேடுங்கள்.', back: 'அனைத்து கட்டுரைகளும்', next: 'வழித்தடம் பார்க்கத் தயாரா?', nextText: 'கிடைக்கும் வழித்தடத்தைத் தேர்ந்தெடுத்து கட்டணத்தைப் புரிந்துகொள்ளுங்கள்.', nextLink: 'வழித்தடங்களைப் பார்க்க',
    articles: [
      ['fares', 'SkyMetrics-இல் விமானம் முன்பதிவு செய்யலாமா?', 'இல்லை. SkyMetrics கட்டணப் போக்கைப் புரிந்துகொள்ள உதவும்; டிக்கெட் விற்கவோ முன்பதிவு செய்யவோ முடியாது.'],
      ['fares', '“நல்ல கட்டணம்” என்றால் என்ன?', 'அதே வழித்தடம், பயணத் தேதி மற்றும் ஒத்த முன்பதிவு நேரத் தரவுகளுடன் ஒப்பிடுகிறோம். இது புள்ளிவிவர வழிகாட்டல் மட்டுமே; உறுதியான சந்தை விலை அல்ல.'],
      ['fares', 'என் வழித்தடம் அல்லது தேதி ஏன் இல்லை?', 'இந்த மாதிரியில் தேர்ந்தெடுக்கப்பட்ட இந்திய உள்நாட்டு வழித்தடங்களும் தேதிகளும் மட்டுமே உள்ளன. கிடைக்கும் தேர்வுகளே பட்டியலில் தெரியும்.'],
      ['account', 'கணக்கில் என்ன சேமிக்கலாம்?', 'உள்நுழைந்து பயணங்களைச் சேமிக்கலாம், வழித்தடங்களைப் பின்தொடரலாம், சமீபத்திய தேடல்களைப் பார்க்கலாம், இலக்கு விலையை அமைக்கலாம்.'],
      ['account', 'விலை எச்சரிக்கை எப்படி வேலை செய்கிறது?', 'சேமித்த பயணத்திற்கு இலக்கு விலையை அமைக்கவும். அந்த விலைப் பதிவு கிடைத்தால் கணக்கில் அறிவிப்பு வரலாம். தற்போது அறிவிப்புகள் செயலிக்குள் மட்டுமே.'],
      ['data', 'இவை நேரடி டிக்கெட் விலைகளா?', 'இல்லை. SkyMetrics இப்போது செயற்கை இந்திய உள்நாட்டு விமானக் கட்டணத் தரவைப் பயன்படுத்துகிறது. இதை நேரடி முன்பதிவு விலையாகக் கருத வேண்டாம்.'],
      ['data', 'விமானக் கட்டணச் சுட்டெண் அரசு CPI-யா?', 'இல்லை. கொள்கைப் பக்கச் சுட்டெண் இந்தச் செயற்கைத் தரவில் செய்யப்பட்ட சோதனை கணக்கு; இது அதிகாரப்பூர்வ அரசு CPI அல்ல.'],
    ],
  },
  gu: {
    eyebrow: 'SKYMETRICS મદદ', title: 'અમે કેવી રીતે મદદ કરી શકીએ?', intro: 'ફ્લાઇટના ભાડા, તમારા ખાતા અને SkyMetricsના ડેટા વિશે સ્પષ્ટ જવાબો.', search: 'મદદના લેખ શોધો', all: 'બધા વિષયો', topics: ['ફ્લાઇટના ભાડા', 'તમારું ખાતું', 'અમારો ડેટા'], answers: 'સામાન્ય પ્રશ્નોના જવાબ', noResults: 'કોઈ લેખ મળ્યો નથી. “ભાડું”, “અલર્ટ” અથવા “ડેટા” શોધો.', back: 'બધા લેખ જુઓ', next: 'માર્ગ જોવા તૈયાર છો?', nextText: 'ઉપલબ્ધ માર્ગ પસંદ કરો અને ભાડું સંદર્ભ સાથે જુઓ.', nextLink: 'માર્ગો જુઓ',
    articles: [
      ['fares', 'SkyMetrics પર ફ્લાઇટ બુક કરી શકાય?', 'ના. SkyMetrics ભાડાના વલણને સમજવામાં મદદ કરે છે; અહીં ટિકિટ વેચાતી નથી કે બુકિંગ થતું નથી.'],
      ['fares', '“સારું ભાડું” એટલે શું?', 'અમે એ જ માર્ગ, મુસાફરીની તારીખ અને સમાન બુકિંગ સમયની નોંધો સાથે સરખામણી કરીએ છીએ. આ આંકડાકીય માર્ગદર્શન છે, ચોક્કસ બજારભાવ નથી.'],
      ['fares', 'મારો માર્ગ અથવા તારીખ કેમ દેખાતી નથી?', 'આ નમૂનામાં પસંદ કરેલા ભારતીય ઘરેલુ માર્ગો અને તારીખો છે. યાદીમાં ઉપલબ્ધ વિકલ્પો જ દેખાય છે.'],
      ['account', 'ખાતામાં શું સાચવી શકાય?', 'સાઇન ઇન કર્યા પછી મુસાફરી સાચવો, માર્ગો પર નજર રાખો, તાજેતરની શોધ જુઓ અને લક્ષ્ય ભાડું નક્કી કરો.'],
      ['account', 'ભાડાનો અલર્ટ કેવી રીતે કામ કરે છે?', 'સાચવેલી મુસાફરી માટે લક્ષ્ય ભાડું નક્કી કરો. તે ભાવની નોંધ મળે તો ખાતામાં સૂચના આવી શકે છે. હાલમાં અલર્ટ ફક્ત એપમાં આવે છે.'],
      ['data', 'આ લાઇવ ટિકિટના ભાવ છે?', 'ના. SkyMetrics હાલમાં કૃત્રિમ ભારતીય ઘરેલુ ભાડાનો ડેટા વાપરે છે. તેને લાઇવ બુકિંગનો ભાવ માનશો નહીં.'],
      ['data', 'હવાઈ ભાડાનો સૂચકાંક સરકારી CPI છે?', 'ના. પોલિસી પેજનો સૂચકાંક આ કૃત્રિમ ડેટા પર આધારિત પ્રાયોગિક ગણતરી છે; તે સત્તાવાર સરકારી CPI નથી.'],
    ],
  },
  bho: {
    eyebrow: 'SKYMETRICS मदद', title: 'हम रउआ के कइसे मदद करीं?', intro: 'उड़ान के किराया, रउआ खाता आ SkyMetrics के डेटा के बारे में साफ जवाब।', search: 'मदद वाला लेख खोजीं', all: 'सब विषय', topics: ['उड़ान के किराया', 'रउआ खाता', 'हमार डेटा'], answers: 'आम सवाल के जवाब', noResults: 'कवनो लेख ना मिलल। “किराया”, “अलर्ट” भा “डेटा” खोजीं।', back: 'सब लेख देखीं', next: 'रूट देखे खातिर तइयार बानी?', nextText: 'उपलब्ध रूट चुनीं आ किराया के संदर्भ में देखीं।', nextLink: 'रूट देखीं',
    articles: [
      ['fares', 'SkyMetrics पर उड़ान बुक हो सकेला का?', 'ना। SkyMetrics किराया के रुझान बुझावे खातिर बा; इहाँ टिकट ना बिकेला आ बुकिंग ना होला।'],
      ['fares', '“बढ़िया किराया” के का मतलब बा?', 'हम ओही रूट, सफर के तारीख आ मिलत-जुलत बुकिंग समय वाला रिकॉर्ड से तुलना करेनी। ई आँकड़ा के संकेत ह, पक्का बाजार भाव ना।'],
      ['fares', 'हमार रूट भा तारीख काहे नइखे मिलत?', 'एह नमूना में कुछ चुनल भारतीय घरेलू रूट आ तारीख बा। सूची में खाली उपलब्ध विकल्प देखाई।'],
      ['account', 'खाता में का सेव कर सकत बानी?', 'लॉग इन कइला के बाद सफर सेव करीं, रूट देखीं, हाल के खोज देखीं आ मन मुताबिक किराया तय करीं।'],
      ['account', 'किराया अलर्ट कइसे काम करेला?', 'सेव कइल सफर खातिर लक्ष्य किराया रखीं। ओह दाम के रिकॉर्ड मिलला पर खाता में सूचना आ सकेला। फिलहाल अलर्ट खाली ऐप के भीतर आवेला।'],
      ['data', 'ई लाइव टिकट के दाम ह का?', 'ना। SkyMetrics अभी भारत के घरेलू किराया के बनावल डेटा इस्तेमाल करेला। एह के लाइव बुकिंग दाम मत समझीं।'],
      ['data', 'हवाई किराया इंडेक्स सरकारी CPI ह का?', 'ना। पॉलिसी पन्ना के इंडेक्स एह बनावल डेटा पर आधारित प्रयोग ह; ई सरकारी CPI ना ह।'],
    ],
  },
}

const icons = [CircleHelp, UserRound, Database]

export default function HelpPage() {
  const { language } = useLocale()
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('all')
  const content = help[language] || help.en
  const results = useMemo(() => content.articles.filter(([category, question, answer], index) => {
    const searchText = `${question} ${answer} ${help.en.articles[index][1]} ${help.en.articles[index][2]}`.toLocaleLowerCase()
    return (topic === 'all' || topic === category) && searchText.includes(query.trim().toLocaleLowerCase())
  }), [content, topic, query])

  return <div className="platform-page help-page" lang={language}><SiteNav section="help" />
    <main>
      <section className="help-hero"><div className="help-hero-inner"><span className="help-eyebrow">{content.eyebrow}</span><h1>{content.title}</h1><p>{content.intro}</p><label className="help-search"><Search size={22} aria-hidden="true"/><span className="sr-only">{content.search}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={content.search}/></label></div></section>
      <div className="help-body"><div className="help-topics" aria-label={content.all}><button className={topic === 'all' ? 'active' : ''} onClick={() => setTopic('all')}>{content.all}</button>{topics.map((name, index) => { const Icon = icons[index]; return <button key={name} className={topic === name ? 'active' : ''} onClick={() => setTopic(name)}><Icon size={18}/>{content.topics[index]}</button> })}</div>
        <div className="help-answers" id="help-answers"><div className="help-section-heading"><span>{String(results.length).padStart(2, '0')} ARTICLES</span><h2>{content.answers}</h2></div>{results.length ? results.map(([category, question, answer], index) => <details className="help-answer" key={`${language}-${category}-${question}`}><summary><span className="help-answer-category">{content.topics[topics.indexOf(category)]}</span><strong>{question}</strong><ChevronDown size={20}/></summary><p>{answer}</p></details>) : <div className="help-empty"><Search size={25}/><p>{content.noResults}</p><button onClick={() => { setQuery(''); setTopic('all') }}>{content.back}</button></div>}</div>
        <div className="help-next"><div><span>SKYMETRICS</span><h2>{content.next}</h2><p>{content.nextText}</p></div><Link to="/flights">{content.nextLink}<ArrowRight size={18}/></Link></div>
      </div>
    </main><footer className="platform-footer">SkyMetrics · Airfare intelligence prototype</footer>
  </div>
}
