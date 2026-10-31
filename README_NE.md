# आजको खबर — Full News Portal

यो Replit मा चलाउन मिल्ने Node.js + Express + SQLite समाचार वेबसाइटको सुरुवाती प्रोजेक्ट हो। यसमा सार्वजनिक होमपेज, समाचार विवरण पेज, Admin Login, समाचार CRUD, फोटो अपलोड, Draft/Published, Breaking/Featured विकल्प र आधारभूत साइट सेटिङ छन्।

## Replit मा चलाउने तरिका (Android मोबाइलबाट)

1. Replit खोल्नुहोस् र नयाँ **Node.js** प्रोजेक्ट बनाउनुहोस्।
2. यो ZIP को फाइलहरू प्रोजेक्टको मुख्य फोल्डरमा Upload/Extract गर्नुहोस्। `package.json`, `server.js`, `.replit` र `public` फोल्डर मुख्य ठाउँमा हुनुपर्छ।
3. Replit को **Secrets / Environment Variables** मा यी तीनवटा राख्नुहोस्:
   - `ADMIN_USERNAME` = आफ्नो Admin username
   - `ADMIN_PASSWORD` = बलियो, अरूले नजाने password
   - `SESSION_SECRET` = लामो, अनुमान गर्न नसकिने random string
4. Run थिच्नुहोस्। पहिलो पटक dependency install हुन केही समय लाग्न सक्छ।
5. खुलेको वेबसाइट URL को अन्त्यमा `/admin` थपेर Admin Panel खोल्नुहोस्।
6. Login गरेर समाचार लेख्नुहोस्। `Published` छानेपछि मात्र सार्वजनिक होमपेजमा देखिन्छ; `Draft` ले सार्वजनिक हुँदैन।

## तपाईंको लोगो कसरी राख्ने?

- लोगो फाइल `public/uploads` मा upload गर्नुहोस् वा Admin Panel → वेबसाइट सेटिङ → Logo URL मा सार्वजनिक image URL राख्नुहोस्।
- यो starter मा Logo URL सेटिङ सुरक्षित हुन्छ; Header मा वास्तविक लोगो देखाउने कामका लागि `public/index.html` मा brand mark लाई image बाट बदल्न सकिन्छ।
- तपाईंले रोज्नुभएको लोगो `public/aajko-khabar-logo.png` मा समावेश छ र Header मा देखिन्छ।

## ध्यान दिनुपर्ने कुरा

- यो starter वेबसाइट हो; प्रकाशित समाचारहरू तपाईंले आफैँ लेखेर/जाँचेर प्रकाशित गर्नुपर्छ। यसले स्वतः प्रमाणित समाचार स्रोतबाट समाचार तान्दैन।
- फोटो upload सीमा 5 MB छ।
- SQLite डेटाबेस `data/aajko-khabar.db` मा रहन्छ। Replit deployment मा persistent storage/volume को उपलब्धता र सेटअप जाँच्नुहोस्, नत्र redeploy हुँदा डेटा कायम रहने ग्यारेन्टी हुँदैन।
- Production मा लैजानुअघि HTTPS, बलियो `SESSION_SECRET`, नियमित database backup, rate limiting, CSRF सुरक्षा, moderation र content/legal review थप्नुहोस्।
- यो प्रोजेक्टले Blogger को पुरानो सामग्री आफैँ आयात गर्दैन।
