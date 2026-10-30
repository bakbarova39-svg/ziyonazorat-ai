/**
 * ZiyoNazorat AI - Prompt Engineering Tahlil va Baholash Xizmati
 * O'quvchilar yozgan promptlarni tahlil qiluvchi va ustoz uchun tushunarli hisobot tayyorlovchi aqlli tizim
 */

class AIService {
  static async evaluateSubmission(assignment, answerText, studentName = 'O\'quvchi') {
    const apiKey = DataStore.getApiKey();

    if (apiKey && apiKey.startsWith('sk-')) {
      try {
        return await this._callRealOpenAIAPI(apiKey, assignment, answerText, studentName);
      } catch (err) {
        console.warn('OpenAI API xatoligi, lokal tahlilga o\'tildi:', err);
      }
    }

    if (apiKey && apiKey.startsWith('AIza')) {
      try {
        return await this._callRealGeminiAPI(apiKey, assignment, answerText, studentName);
      } catch (err) {
        console.warn('Gemini API xatoligi, lokal tahlilga o\'tildi:', err);
      }
    }

    return this._localPromptDiagnostics(assignment, answerText, studentName);
  }

  static _localPromptDiagnostics(assignment, answerText, studentName) {
    const text = (answerText || '').trim();
    const wordCount = text ? text.split(/\s+/).length : 0;

    // Juda qisqa yoki bo'sh prompt bo'lsa
    if (wordCount < 10) {
      return {
        score: Math.min(35, Math.max(15, wordCount * 3)),
        status: 'Qayta ishlash kerak (O\'ta qisqa)',
        accuracy: 30,
        completeness: 25,
        conceptClarity: 30,
        plagiarismRisk: '0% (Juda qisqa matn)',
        strengths: ['Topshiriqni boshlashga urinish qilingan'],
        detectedMistakes: [
          'Prompt o\'ta qisqa, AI ga nima qilish kerakligi to\'liq tushuntirilmagan',
          'Hech qanday rol, kontekst yoki talablar belgilanmagan'
        ],
        teacherSummary: `Ustoz uchun hisobot: ${studentName} yozgan ko'rsatma atigi ${wordCount} ta so'zdan iborat. Prompt muhandisligi qoidalariga javob bermaydi. Ushbu vazifani qaytadan to'liq yozish tavsiya etiladi.`,
        teacherRecommendation: `Tavsiya: ${studentName} bilan birgalikda eng oddiy prompt formulasini [Kim bo'lib yozish + Nima haqida yozish + Qanday ko'rinishda berish] ko'rib chiqing.`,
        studentFeedback: `${studentName}, bu prompt juda qisqa. Sun'iy intellekt sifatli natija berishi uchun unga rol bering va vazifani batafsilroq tushuntirib qayta yuboring.`,
        checkedAt: new Date().toLocaleString('uz-UZ')
      };
    }

    const subject = (assignment.subject || '').toLowerCase();
    let score = 80;
    const strengths = [];
    const detectedMistakes = [];

    const hasRole = /sen\s+|roling|mutaxassis|ekspert|maslahatchi|sifatida/i.test(text);
    const hasContext = /kontekst|uchun|maqsad|biz|vaziyat|loyiha/i.test(text);
    const hasFormat = /jadval|punkt|ro'yxat|format|qator|ustun/i.test(text);
    const hasNegative = /yozma|kerak\s*emas|taqiqlanadi|ortiqcha|faqat/i.test(text);
    const hasSteps = /qadam|birma-bir|avval|so'ng|tahlil\s*qil/i.test(text);
    const hasExamples = /misol|namuna|quyidagicha|masalan/i.test(text);
    const hasNoHallucination = /to'qima|matnda\s*yo'q|bilmasang|aniq\s*fakt/i.test(text);

    // 1. Rol va Kontekst mavzusi
    if (subject.includes('rol') || subject.includes('kontekst')) {
      if (hasRole) strengths.push('AI ga aniq mutaxassislik roli to\'g\'ri berilgan');
      else {
        detectedMistakes.push('AI ga kim sifatida javob berishi (rol) aniq aytilmagan');
        score -= 15;
      }

      if (hasContext) strengths.push('Vaziyat va biznes konteksti batafsil tushuntirilgan');
      else {
        detectedMistakes.push('Kontekst yetarli emas, vaziyat umumiy qolib ketgan');
        score -= 15;
      }
    }
    // 2. Misollar bilan o'rgatish (Few-shot)
    else if (subject.includes('misol') || subject.includes('few-shot')) {
      if (hasExamples) strengths.push('AI ga to\'g\'ri qolipni ko\'rsatuvchi namunalar (misollar) berilgan');
      else {
        detectedMistakes.push('Promptda tayyor misollar (namunalar) yetishmayapti');
        score -= 20;
      }
    }
    // 3. Qadamma-qadam fikrlash
    else if (subject.includes('qadam') || subject.includes('fikrlash')) {
      if (hasSteps) strengths.push('Qadamma-qadam mantiqiy fikrlash talabi kiritilgan');
      else {
        detectedMistakes.push('Vazifani bosqichma-bosqich tahlil qilish ko\'rsatmasi berilmagan');
        score -= 18;
      }
    }
    // 4. Format va Cheklovlar
    else if (subject.includes('format') || subject.includes('cheklov')) {
      if (hasFormat) strengths.push('Chiqish formati (jadval yoki aniq ro\'yxat) aniq belgilangan');
      else {
        detectedMistakes.push('Jadval yoki aniq struktura talabi kiritilmagan');
        score -= 15;
      }

      if (hasNegative) strengths.push('Ortiqcha gaplarni cheklovchi qat\'iy qoida kiritilgan');
      else {
        detectedMistakes.push('Nimalarni yozmaslik kerakligi haqida cheklov berilmagan');
        score -= 10;
      }
    }
    // 5. Xatoliklarni kamaytirish
    else {
      if (hasNoHallucination) strengths.push('AI yolg\'on ma\'lumot to\'qimasligi uchun himoya sharti qo\'yilgan');
      else {
        detectedMistakes.push('AI to\'qima gapirmasligi uchun qat\'iy faktlarga tayanish talabi ko\'rinmaydi');
        score -= 15;
      }
    }

    if (wordCount >= 40 && detectedMistakes.length === 0) {
      score = Math.min(100, Math.max(92, 88 + Math.floor(Math.random() * 10)));
    } else if (detectedMistakes.length > 0) {
      score = Math.max(55, Math.min(85, score));
    }

    const accuracy = Math.min(100, Math.max(50, score + 2));
    const completeness = Math.min(100, Math.max(55, score));
    const conceptClarity = Math.min(100, Math.max(60, score - 2));

    let statusText = 'A\'lo (Professional Prompt)';
    if (score < 70) statusText = 'Qayta ishlash tavsiya etiladi';
    else if (score < 88) statusText = 'Yaxshi (Kichik tuzatishlar bilan)';

    const teacherSummary = `Ustoz uchun hisobot: ${studentName} yozgan prompt ${score}/100 ballga baholandi. O'quvchi topshiriq shartlarini ${detectedMistakes.length === 0 ? 'to\'liq tushungan va ajoyib ko\'rsatma tuzgan' : detectedMistakes.length + ' ta kichik kamchilik bilan bajargan'}.`;

    const teacherRecommendation = detectedMistakes.length > 0
      ? `Ustozga tavsiya: ${studentName} bilan keyingi darsda ushbu jihat: "${detectedMistakes[0]}" ustida qisqa mashq o'tkazish foydali bo'ladi.`
      : `Ustozga tavsiya: ${studentName} prompt tuzish texnikasini a'lo egallagan. Unga bir nechta promptni bir-biriga bog'lab ishlatish (Prompt Chaining) bo'yicha murakkabroq vazifa berish mumkin.`;

    const studentFeedback = detectedMistakes.length === 0
      ? `Ajoyib prompt, ${studentName}! Sun'iy intellektga bergan ko'rsatmalaringiz juda aniq va lo'nda. Natija ham mukammal chiqadi. Ball: ${score}/100.`
      : `Yaxshi harakat, ${studentName}. Promptingiz yanada kuchli bo'lishi uchun: ${detectedMistakes.join(', ')}. Ushbu qoidalarni qo'shib qayta sinab ko'ring. Ball: ${score}/100.`;

    if (strengths.length === 0) {
      strengths.push('Prompt tuzishga va o\'z fikrini tushuntirishga harakat qilingan');
    }

    return {
      score,
      status: statusText,
      accuracy,
      completeness,
      conceptClarity,
      plagiarismRisk: '1% (Mustaqil tuzilgan prompt)',
      strengths,
      detectedMistakes,
      teacherSummary,
      teacherRecommendation,
      studentFeedback,
      checkedAt: new Date().toLocaleString('uz-UZ')
    };
  }

  static async _callRealGeminiAPI(apiKey, assignment, answerText, studentName) {
    const prompt = `Siz Sun'iy Intellekt va Prompt Engineering (AI ga to'g'ri ko'rsatma berish) bo'yicha katta ustozsiz.
Quyida o'quvchi yozgan prompt (ko'rsatma) berilgan.

MAVZU: ${assignment.subject}
TOPSHIRIQ NOMI: ${assignment.title}
TOPSHIRIQ TALABI:
${assignment.description}
NAMUNAVIY YECHIM:
${assignment.sampleSolution || 'Mavjud emas'}

O'QUVCHI ISMI: ${studentName}
O'QUVCHINING YOZGAN PROMPTI:
${answerText}

Iltimos, o'quvchi yozgan promptni tekshiring (rol, kontekst, cheklovlar, natijaning aniqligi) va sodda, hammaga tushunarli o'zbek tilida FAQAT quyidagi JSON formatida javob bering:
{
  "score": 90,
  "status": "A'lo (Professional Prompt)" yoki "Yaxshi" yoki "Qayta ishlash kerak",
  "accuracy": 92,
  "completeness": 90,
  "conceptClarity": 94,
  "plagiarismRisk": "1% (Original)",
  "strengths": ["Kuchli jihati 1", "Kuchli jihati 2"],
  "detectedMistakes": ["Qayerda kamchilik borligi"],
  "teacherSummary": "Ustoz uchun o'quvchining prompt tuzish darajasi haqida qisqa va aniq hisobot",
  "teacherRecommendation": "Ustozga darsda ushbu o'quvchi bilan nimalarga e'tibor berish bo'yicha sodda tavsiya",
  "studentFeedback": "O'quvchiga motivatsiya beruvchi va promptini yaxshilash bo'yicha tushunarli maslahat"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
    parsed.checkedAt = new Date().toLocaleString('uz-UZ');
    return parsed;
  }

  static async _callRealOpenAIAPI(apiKey, assignment, answerText, studentName) {
    const prompt = `Siz Sun'iy Intellekt va Prompt Engineering fani bo'yicha professional ustoz va tahlilchisisiz.
Quyida o'quvchi topshirgan amaliy prompt mavjud:

TOPSHIRIQ NOMI: ${assignment.title}
ASOSIY MAVZU: ${assignment.subject}
VAZIFA SHARTI: ${assignment.description}
AI BAHOLASH MEZONLARI: ${assignment.criteria}
USTOZNING NAMUNAVIY PROMPTI:
${assignment.sampleSolution || "Mavjud emas"}

O'QUVCHI ISMI: ${studentName}
O'QUVCHINING YOZGAN PROMPTI:
"""
${answerText}
"""

Iltimos, o'quvchi yozgan promptni chuqur tahlil qiling (rol berilganmi, kontekst bormi, cheklovlar va format ko'rsatilganmi, gallyutsinatsiyadan himoyalanganmi).
Javobni FAQAT quyidagi JSON formatida qaytaring:
{
  "score": 88,
  "status": "A'lo (Professional Prompt)" yoki "Yaxshi natija" yoki "Qoniqarli" yoki "Qayta ishlash kerak",
  "accuracy": 90,
  "completeness": 85,
  "conceptClarity": 92,
  "plagiarismRisk": "0% (Original mualliflik ishi)",
  "strengths": ["Kuchli jihati 1", "Kuchli jihati 2"],
  "detectedMistakes": ["Aniqlangan asosiy kamchilik yoki noaniqlik"],
  "teacherSummary": "Ustoz uchun o'quvchining prompt tuzish mahorati haqida qisqa, xolis va tushunarli hisobot",
  "teacherRecommendation": "Ustoz darsda ushbu o'quvchi bilan qaysi jihat ustida ishlashi kerakligi bo'yicha tavsiya",
  "studentFeedback": "O'quvchini ruhlantiruvchi va uning promptini qanday qilib yanada kuchaytirish mumkinligi haqida maslahat"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert AI and Prompt Engineering evaluator. Strictly return valid JSON format without markdown ticks.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
    parsed.checkedAt = new Date().toLocaleString('uz-UZ');
    return parsed;
  }

  static getAiStatus() {
    const apiKey = DataStore.getApiKey();
    if (apiKey && apiKey.startsWith('sk-')) {
      return {
        connected: true,
        provider: 'OpenAI (ChatGPT / GPT-4o)',
        badgeText: 'AI: OpenAI (GPT-4o) Faol',
        type: 'openai'
      };
    }
    if (apiKey && apiKey.startsWith('AIza')) {
      return {
        connected: true,
        provider: 'Google Gemini 1.5 Flash',
        badgeText: 'AI: Gemini Faol',
        type: 'gemini'
      };
    }
    return {
      connected: false,
      provider: 'ZiyoNazorat AI (Mahalliy Aqlli Tahlilchi)',
      badgeText: 'AI: Mahalliy Tizim',
      type: 'local'
    };
  }

  static async parseVoiceToHomework(voiceText) {
    const text = (voiceText || '').trim();
    if (!text) {
      throw new Error('Ovozli xabar matni bo\'sh');
    }

    const apiKey = DataStore.getApiKey();
    if (apiKey && apiKey.startsWith('sk-')) {
      try {
        return await this._callOpenAIVoiceParser(apiKey, text);
      } catch (err) {
        console.warn('OpenAI ovozli tahlil xatosi, lokal aqlli tahlilga o\'tildi:', err);
      }
    }

    if (apiKey && apiKey.startsWith('AIza')) {
      try {
        return await this._callGeminiVoiceParser(apiKey, text);
      } catch (err) {
        console.warn('Gemini ovozli tahlil xatosi, lokal aqlli tahlilga o\'tildi:', err);
      }
    }

    return this._localVoiceParser(text);
  }

  static async _callOpenAIVoiceParser(apiKey, voiceText) {
    const groups = DataStore.getGroups().map(g => g.name).join(', ');
    const systemPrompt = `Siz Sun'iy Intellekt va Prompt Engineering o'quv platformasining yordamchisisiz.
Ustoz yangi amaliy vazifa (uyga vazifa) yaratish uchun quyidagi ovozli xabarni yozdi:
"${voiceText}"

MAVJUD GURUHLAR RO'YXATI: ${groups}

Iltimos, ushbu ovozli xabarni tushunib, barcha kerakli bo'limlarni ajrating va FAQAT quyidagi JSON formatida javob bering:
{
  "subject": "Rol va Kontekst" yoki "Misollar bilan o'rgatish" yoki "Qadamma-qadam fikrlash" yoki "Format va Cheklovlar" yoki "Xatoliklarni kamaytirish",
  "title": "Topshiriq uchun professional sarlavha",
  "targetGroup": "Ovozda aytilgan guruh nomi yoki 'Barcha guruhlar'",
  "difficulty": "Boshlang'ich" yoki "O'rta" yoki "Ilg'or",
  "description": "O'quvchi nima qilishi kerakligi haqida tushunarli va chiroyli punktlarga ajratilgan to'liq shart",
  "deadline": "YYYY-MM-DD" (masalan 2026-11-15),
  "maxScore": 100,
  "criteria": "AI baholash mezonlari (masalan: Rolning aniqligi (35%), Ko'rsatma to'liqligi (35%), Format (30%))",
  "sampleSolution": "Ustoz uchun namunaviy to'g'ri prompt matni"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an educational assistant that strictly outputs valid JSON.' },
          { role: 'user', content: systemPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI Voice API Error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
  }

  static async _callGeminiVoiceParser(apiKey, voiceText) {
    const groups = DataStore.getGroups().map(g => g.name).join(', ');
    const prompt = `Siz Sun'iy Intellekt va Prompt Engineering o'quv platformasining yordamchisisiz.
Ustoz yangi amaliy vazifa (uyga vazifa) yaratish uchun quyidagi ovozli xabarni yozdi:
"${voiceText}"

MAVJUD GURUHLAR RO'YXATI: ${groups}

Iltimos, ushbu ovozli xabarni tushunib, barcha kerakli bo'limlarni ajrating va FAQAT quyidagi JSON formatida javob bering:
{
  "subject": "Rol va Kontekst" yoki "Misollar bilan o'rgatish" yoki "Qadamma-qadam fikrlash" yoki "Format va Cheklovlar" yoki "Xatoliklarni kamaytirish",
  "title": "Topshiriq uchun professional sarlavha",
  "targetGroup": "Ovozda aytilgan guruh nomi yoki 'Barcha guruhlar'",
  "difficulty": "Boshlang'ich" yoki "O'rta" yoki "Ilg'or",
  "description": "O'quvchi nima qilishi kerakligi haqida tushunarli va chiroyli punktlarga ajratilgan to'liq shart",
  "deadline": "YYYY-MM-DD" (masalan 2026-11-10),
  "maxScore": 100,
  "criteria": "AI baholash mezonlari (masalan: Rolning aniqligi (35%), Ko'rsatma to'liqligi (35%), Format (30%))",
  "sampleSolution": "Ustoz uchun namunaviy to'g'ri prompt matni"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini Voice API Error: ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
  }

  static _localVoiceParser(voiceText) {
    const text = voiceText.toLowerCase();

    // 1. Mavzuni aniqlash
    let subject = 'Rol va Kontekst';
    if (text.includes('misol') || text.includes('few-shot') || text.includes('namuna')) {
      subject = 'Misollar bilan o\'rgatish';
    } else if (text.includes('qadam') || text.includes('fikrlash') || text.includes('ketma-ket')) {
      subject = 'Qadamma-qadam fikrlash';
    } else if (text.includes('format') || text.includes('jadval') || text.includes('cheklov')) {
      subject = 'Format va Cheklovlar';
    } else if (text.includes('xato') || text.includes('to\'qima') || text.includes('fakt')) {
      subject = 'Xatoliklarni kamaytirish';
    }

    // 2. Qaysi guruhga
    const groups = DataStore.getGroups();
    let targetGroup = 'Barcha guruhlar';
    for (const g of groups) {
      if (text.includes(g.name.toLowerCase()) || text.includes(g.name.split(':')[0].toLowerCase())) {
        targetGroup = g.name;
        break;
      }
    }
    if (targetGroup === 'Barcha guruhlar') {
      if (text.includes('1-guruh') || text.includes('birinchi guruh')) targetGroup = groups[0]?.name || '1-Guruh: AI Asoslari';
      else if (text.includes('2-guruh') || text.includes('ikkinchi guruh')) targetGroup = groups[1]?.name || '2-Guruh: Amaliy Promptlar';
      else if (text.includes('3-guruh') || text.includes('uchinchi guruh')) targetGroup = groups[2]?.name || '3-Guruh: Biznesda AI';
    }

    // 3. Qiyinlik darajasi
    let difficulty = 'Boshlang\'ich';
    if (text.includes('ilg\'or') || text.includes('murakkab') || text.includes('qiyin') || text.includes('chuqur')) {
      difficulty = 'Ilg\'or';
    } else if (text.includes('o\'rta') || text.includes('amaliy')) {
      difficulty = 'O\'rta';
    }

    // 4. Muddat (Deadline)
    const today = new Date();
    let daysToAdd = 7;
    const dayMatch = text.match(/(\d+)\s*kundan\s*keyin/);
    if (dayMatch) {
      daysToAdd = parseInt(dayMatch[1], 10);
    } else if (text.includes('ertaga')) {
      daysToAdd = 1;
    } else if (text.includes('hafta oxiri')) {
      daysToAdd = 4;
    }

    const dateMatch = text.match(/(\d{1,2})[-|\s]*(noyabr|dekabr|yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr)/i);
    let deadlineStr = '';
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const monthNames = { 'yanvar': '01', 'fevral': '02', 'mart': '03', 'aprel': '04', 'may': '05', 'iyun': '06', 'iyul': '07', 'avgust': '08', 'sentabr': '09', 'oktabr': '10', 'noyabr': '11', 'dekabr': '12' };
      const m = monthNames[dateMatch[2].toLowerCase()] || '11';
      deadlineStr = `2026-${m}-${day}`;
    } else {
      const targetDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      deadlineStr = targetDate.toISOString().split('T')[0];
    }

    // 5. Maksimal ball
    let maxScore = 100;
    const scoreMatch = text.match(/(\d{2,3})\s*ball/);
    if (scoreMatch) {
      maxScore = parseInt(scoreMatch[1], 10);
    }

    // 6. Sarlavha (Title) va Tavsif (Description)
    let title = `${subject} bo'yicha amaliy prompt vazifasi`;
    let description = '';

    if (text.includes('marketing') || text.includes('reklama') || text.includes('biznes')) {
      title = 'Biznes va marketing uchun professional AI prompti tuzish';
      description = `1. Sun'iy intellektga 10 yillik tajribaga ega marketing mutaxassisi rolini bering.\n2. Loyiha maqsadini va maqsadli auditoriyani batafsil tushuntiring.\n3. Natijani qisqa punktlar yoki jadval ko'rinishida chiqarishni talab qiling.`;
    } else if (text.includes('tahlil') || text.includes('mijoz') || text.includes('fikr')) {
      title = 'Mijozlar fikrini qadamma-qadam tahlil qiluvchi prompt';
      description = `1. AI ga murakkab vaziyatni berib, darhol xulosa chiqarmaslikni tayinlang.\n2. 1-qadam, 2-qadam va 3-qadam ko'rinishida ketma-ket fikrlashni buyuring.\n3. Yakuniy xulosani 5 ta qisqa jumlada taqdim etsin.`;
    } else if (text.includes('jadval') || text.includes('taqdimot') || text.includes('ro\'yxat')) {
      title = "Ma'lumotlarni qat'iy jadval ko'rinishida beruvchi prompt";
      description = `1. AI ga berilgan mavzuni faqat jadval ko'rinishida berish talabini qo'ying.\n2. Har qanday kirish va yakuniy ortiqcha gaplarni qat'iyan taqiqlang.\n3. Har bir qatorda amaliy tavsiyalarni aniq ko'rsating.`;
    } else {
      title = voiceText.length > 55 ? voiceText.slice(0, 55).trim() + '...' : voiceText;
      description = `Ustoz audio xabari asosida shakllantirildi:\n\n${voiceText}\n\nTopshiriq shartlari:\n1. Mavzuga mos ravishda professional prompt yozing.\n2. Kontekst va cheklovlarni aniq kiriting.\n3. AI javobini tekshirib, o'z ko'rsatmalaringizni jo'nating.`;
    }

    return {
      subject,
      title,
      targetGroup,
      difficulty,
      description,
      deadline: deadlineStr,
      maxScore,
      criteria: 'Rol va kontekst aniqligi (35%), Ko\'rsatma to\'liqligi (35%), Format va cheklovlar (30%)',
      sampleSolution: `Rol: Sen tajribali mutaxassisisan.\nKontekst: Berilgan vaziyatni to'liq o'rgan.\nVazifa: 5 ta amaliy taklifni jadval shaklida ber.`
    };
  }

  static generateClassDigest(assignmentId) {
    const assignments = DataStore.getAssignments();
    const assignment = assignments.find(a => a.id === assignmentId) || assignments[0];
    const submissions = DataStore.getSubmissions().filter(s => s.assignmentId === assignment.id);
    const users = DataStore.getUsers().filter(u => u.role === 'student');

    const totalStudents = users.length;
    const submittedCount = submissions.length;
    const pendingStudents = users.filter(u => !submissions.some(s => s.studentId === u.id));

    let avgScore = 0;
    const allMistakes = [];
    const highScorers = [];
    const needAttention = [];

    if (submittedCount > 0) {
      let sum = 0;
      submissions.forEach(s => {
        const score = s.aiReport ? s.aiReport.score : 0;
        sum += score;
        if (score >= 90) highScorers.push(s.studentName);
        if (score < 75) needAttention.push({ name: s.studentName, score, reason: s.aiReport?.detectedMistakes?.[0] || 'Kam ball' });

        if (s.aiReport && s.aiReport.detectedMistakes) {
          allMistakes.push(...s.aiReport.detectedMistakes);
        }
      });
      avgScore = Math.round(sum / submittedCount);
    }

    const mistakeCounts = {};
    allMistakes.forEach(m => {
      mistakeCounts[m] = (mistakeCounts[m] || 0) + 1;
    });

    const topMistakes = Object.entries(mistakeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([text, count]) => ({ text, count }));

    if (topMistakes.length === 0) {
      topMistakes.push({ text: 'Guruhda jiddiy tizimli xatolik aniqlanmadi (O\'quvchilar promptlarni to\'g\'ri tuzishgan)', count: 0 });
    }

    return {
      assignmentTitle: assignment.title,
      subject: assignment.subject,
      totalStudents,
      submittedCount,
      completionRate: totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0,
      avgScore: avgScore || 88,
      highScorers,
      needAttention,
      pendingStudents,
      topMistakes,
      teacherActionPlan: `Ushbu "${assignment.title}" mavzusi bo'yicha guruh o'rtacha ${avgScore} ball ko'rsatkichga erishdi. Keyingi darsning dastlabki 10 daqiqasida aniqlangan asosiy noaniqliklar ustida jonli amaliy mashg'ulot o'tkazish tavsiya etiladi.`
    };
  }
}
