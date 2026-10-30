/**
 * ZiyoNazorat AI - Ma'lumotlar Boshqaruvi
 * Vazifalar, guruh a'zolari va AI tekshiruvlarini to'liq boshqarish (qo'shish, tahrirlash, o'chirish)
 */

const STORAGE_KEYS = {
  USERS: 'ziyo_clean_users_v5',
  GROUPS: 'ziyo_clean_groups_v5',
  ASSIGNMENTS: 'ziyo_clean_assignments_v5',
  SUBMISSIONS: 'ziyo_clean_submissions_v5',
  CURRENT_USER: 'ziyo_clean_current_user_v5',
  THEME: 'ziyo_clean_theme_v5',
  API_KEY: 'ziyo_clean_gemini_api_key_v5'
};

// Standart AI API kaliti (Foydalanuvchi Sozlamalarda kiritishi mumkin)
const DEFAULT_API_KEY = '';

// Boshlang'ich AI guruhlari (Ustoz istalgancha yangi guruh yarata oladi)
const DEFAULT_GROUPS = [
  {
    id: 'grp-1',
    name: '1-Guruh: AI Asoslari',
    description: 'Sun\'iy intellekt va Prompt muhandisligi boshlang\'ich kursi',
    schedule: 'Dush-Chor-Juma (18:00)',
    createdAt: '2026-10-28'
  },
  {
    id: 'grp-2',
    name: '2-Guruh: Amaliy Promptlar',
    description: 'Amaliy promptlar va murakkab zanjirli ko\'rsatmalar kursi',
    schedule: 'Sesh-Pay-Shan (19:00)',
    createdAt: '2026-10-28'
  },
  {
    id: 'grp-3',
    name: '3-Guruh: Biznesda AI',
    description: 'Biznes va kompaniyalar uchun sun\'iy intellekt vositalari',
    schedule: 'Shanba-Yakshanba (10:00)',
    createdAt: '2026-10-28'
  }
];

// Asosiy Ustoz hisobi
const DEFAULT_USERS = [
  {
    id: 'u-teacher-main',
    name: 'Ustoz (Admin)',
    role: 'teacher',
    title: 'AI Asoslari va Prompt Engineering Ustozi',
    email: 'ustoz@ziyonazorat.uz',
    phone: '+998 90 123 45 67',
    group: 'Barcha guruhlar',
    avatar: 'UA',
    joinedAt: '2026-10-28',
    subjects: ['AI Asoslari', 'Prompt Engineering']
  }
];

// O'quvchilar bajarishi uchun 5 ta asosiy amaliy AI mavzusi
const DEFAULT_ASSIGNMENTS = [
  {
    id: 'hw-pr-101',
    subject: 'Rol va Kontekst',
    subjectBadgeClass: 'badge-role',
    targetGroup: 'Barcha guruhlar',
    title: 'AI ga aniq rol va kontekst berish (Persona Prompting)',
    description: `Sun'iy intellektga oddiy buyruq emas, balki professional darajada ko'rsatma (prompt) yozing.
Topshiriq sharti:
1. AI ga aniq rol bering (Masalan: "Sen 10 yillik tajribaga ega marketing mutaxassisisan...").
2. Vazifaning maqsadini va kontekstini batafsil tushuntiring.
3. AI kimga mo'ljallab yozishi kerakligini (maqsadli auditoriyani) ko'rsating.
O'zingiz tuzgan to'liq prompt matnini yuboring.`,
    deadline: '2026-11-05',
    deadlineDisplay: '5-Noyabr, 2026 (23:59)',
    maxScore: 100,
    difficulty: 'Boshlang\'ich',
    criteria: 'Rolning aniqligi (30%), Kontekst va maqsadning to\'liqligi (40%), Auditoriya belgilanishi (30%)',
    sampleSolution: `Rol: Sen 10 yillik tajribaga ega raqamli marketing mutaxassisisan.
Kontekst: Toshkent shahrida yangi ochilgan "CoffeeHub" nomli shinam qahvaxona uchun 1 oylik reklama rejasi kerak.
Auditoriya: 18-35 yoshdagi talabalar va frilanserlar.
Vazifa: Instagram va Telegram uchun 5 ta eng samarali reklama g'oyasini qisqa tavsif bilan taklif qil.`,
    createdAt: '2026-10-28'
  },
  {
    id: 'hw-pr-102',
    subject: 'Misollar bilan o\'rgatish',
    subjectBadgeClass: 'badge-fewshot',
    targetGroup: 'Barcha guruhlar',
    title: 'Few-Shot usuli: Misollar orqali AI ni o\'rgatuvchi prompt tuzish',
    description: `Sun'iy intellekt siz xohlagan qolipda javob berishi uchun unga avval 2-3 ta to'g'ri namuna (misol) ko'rsatish zarur.
Topshiriq sharti:
1. AI ga mijozlar sharhlarini (fikrlarini) tahlil qilishni buyuring.
2. Unga kamida 2 ta to'g'ri ishlangan misol bering.
3. AI uchinchi yangi sharhni aynan shu qolipda tahlil qilishi uchun to'liq promptni yozing.`,
    deadline: '2026-11-07',
    deadlineDisplay: '7-Noyabr, 2026 (20:00)',
    maxScore: 100,
    difficulty: 'O\'rta',
    criteria: 'Misollar sifati va aniqligi (40%), Prompt strukturasi (35%), Chiqish qolipiga moslik (25%)',
    sampleSolution: `Quyidagi misollarga qarab, yangi mijoz sharhini tahlil qil:
Misol 1: "Telefon sifati zo'r, narxi ham qulay." -> Ijobiy (Baho: 5/5)
Misol 2: "Rangi rasmda boshqacha edi, yoqmadi." -> Salbiy (Baho: 2/5)
Endi yangi sharhni xuddi shu formatda tahlil qil: "Mahsulot yaxshi yetib keldi, faqat qutisi ozroq ezilgan."`,
    createdAt: '2026-10-28'
  },
  {
    id: 'hw-pr-103',
    subject: 'Qadamma-qadam fikrlash',
    subjectBadgeClass: 'badge-cot',
    targetGroup: 'Barcha guruhlar',
    title: 'Qadamma-qadam tahlil (Chain-of-Thought) prompti',
    description: `Sun'iy intellekt murakkab savollarga shoshilmasdan, mantiqiy qadamlar bilan xatosiz javob berishi uchun "Qadamma-qadam o'yla" usulini qo'llash kerak.
Topshiriq sharti:
1. AI ga murakkab hayotiy yoki moliyaviy vaziyatni bering.
2. Promptda AI ga to'g'ridan-to'g'ri yakuniy javobni bermasdan, avval 1-qadam, 2-qadam, 3-qadam ko'rinishida har bir bosqichni asoslab tahlil qilishni buyuring.
3. Promptingizni yozib jo'nating.`,
    deadline: '2026-11-09',
    deadlineDisplay: '9-Noyabr, 2026 (23:59)',
    maxScore: 100,
    difficulty: 'O\'rta',
    criteria: 'Qadamlarga bo\'lish talabining kiritilishi (40%), Mantiqiy savol qo\'yilishi (30%), Izoh to\'g\'riligi (30%)',
    sampleSolution: `Savol: Bir tadbirkor 10 mln so'm sarmoya bilan savdo boshlamoqchi. Oylik xarajatlar va daromadni baholash kerak.
Ko'rsatma: Iltimos, darhol yakuniy raqamni aytma. Javobingni qadamma-qadam tahlil qil:
1-qadam: Boshlang'ich kutilayotgan xarajatlarni hisobla.
2-qadam: Mumkin bo'lgan kutilmagan xatarlarni sanab o't.
3-qadam: Sof foydaga chiqish muddatini mantiqan chiqarib ber.`,
    createdAt: '2026-10-28'
  },
  {
    id: 'hw-pr-104',
    subject: 'Format va Cheklovlar',
    subjectBadgeClass: 'badge-format',
    targetGroup: 'Barcha guruhlar',
    title: 'Aniq format va qat\'iy cheklovlar berish (Jadval / Ro\'yxat)',
    description: `AI ko'p gapirmasdan, aynan kerakli ko'rinishda (jadval yoki punktlar bilan) javob qaytarishi uchun aniq cheklovlar qo'yishni o'rganamiz.
Topshiriq sharti:
1. AI ga matn berib, undan faqat 5 ta eng asosiy xulosani ajratishni buyuring.
2. Qat'iy cheklov qo'ying: "Ortiqcha kirish va xulosa gaplar yozma. Javobni faqat jadval ko'rinishida ber".
3. So'zlar soniga yoki tiliga aniq chegara belgilang.`,
    deadline: '2026-11-11',
    deadlineDisplay: '11-Noyabr, 2026 (18:00)',
    maxScore: 100,
    difficulty: 'Boshlang\'ich',
    criteria: 'Jadval formati talabi (35%), Ortiqcha gaplarni taqiqlovchi cheklov (35%), Natija aniqligi (30%)',
    sampleSolution: `Quyidagi maqoladan eng muhim 5 ta fikrni ajratib ber.
Cheklovlar:
- Hech qanday "Salom", "Mana siz so'ragan ma'lumot" kabi ortiqcha kirish va yakuniy gaplar yozma.
- Faqat quyidagi Markdown jadval ko'rinishida ber: | Raqam | Qisqa xulosa | Amaliy foydasi |
- Har bir band 15 ta so'zdan oshmasin.`,
    createdAt: '2026-10-28'
  },
  {
    id: 'hw-pr-105',
    subject: 'Xatoliklarni Kamaytirish',
    subjectBadgeClass: 'badge-guardrail',
    targetGroup: 'Barcha guruhlar',
    title: "AI to'qib gapirmasligi (gallyutsinatsiya) uchun to'g'ri prompt tuzish",
    description: `Sun'iy intellekt bilmagan narsasini to'qib chiqarmasligi uchun maxsus himoya ko'rsatmalaridan foydalanamiz.
Topshiriq sharti:
1. AI ga biror murakkab mavzuda savol bering.
2. Promptga maxsus himoya shartini qo'shing: "Faqat berilgan matnga tayan. Agar matnda javob bo'lmasa, taxmin qilma, 'Bu matnda mavjud emas' deb ochiq ayt".
3. AI o'z javobiga ishonch darajasini (1 dan 10 gacha) ham baholab berishini so'rang.`,
    deadline: '2026-11-14',
    deadlineDisplay: '14-Noyabr, 2026 (22:00)',
    maxScore: 100,
    difficulty: 'O\'rta',
    criteria: 'To\'qima ma\'lumotni cheklash sharti (40%), Ishonch darajasi talabi (30%), Tushunarlilik (30%)',
    sampleSolution: `Ko'rsatma: Quyidagi matn bo'yicha berilgan savolga javob ber.
Muhim qoida: Faqat matndagi aniq faktlardan foydalan. O'zingdan birorta so'z yoki raqam qo'shma. Agar matnda javob topilmasa, aniq qilib "Berilgan matnda bu ma'lumot yo'q" deb javob ber.
Javob oxirida ma'lumotning aniqligiga ishonchingni [1-10] shkalada ko'rsat.`,
    createdAt: '2026-10-28'
  }
];

const DEFAULT_SUBMISSIONS = [];

class DataStore {
  static init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.GROUPS)) {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(DEFAULT_GROUPS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS)) {
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(DEFAULT_ASSIGNMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUBMISSIONS)) {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(DEFAULT_SUBMISSIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USERS[0]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.API_KEY)) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, DEFAULT_API_KEY);
    }
  }

  static getGroups() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || JSON.stringify(DEFAULT_GROUPS));
  }

  static saveGroups(groups) {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  }

  static addGroup(group) {
    const groups = this.getGroups();
    groups.push(group);
    this.saveGroups(groups);
    if (window.SupabaseService && SupabaseService.isConnected) {
      SupabaseService.upsertGroup(group);
    }
    return group;
  }

  static deleteGroup(groupId) {
    let groups = this.getGroups();
    groups = groups.filter(g => g.id !== groupId);
    this.saveGroups(groups);
    if (window.SupabaseService && SupabaseService.isConnected) {
      SupabaseService.deleteGroup(groupId);
    }
    return true;
  }

  static getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  }

  static saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  static addUser(user) {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    if (window.SupabaseService && SupabaseService.isConnected) {
      SupabaseService.upsertUser(user);
    }
    return user;
  }

  static deleteUser(userId) {
    let users = this.getUsers();
    users = users.filter(u => u.id !== userId);
    this.saveUsers(users);
    
    // Agar o'chirilgan foydalanuvchi joriy foydalanuvchi bo'lsa, ustozga o'tkazish
    const current = this.getCurrentUser();
    if (current.id === userId) {
      this.setCurrentUser(users[0] || DEFAULT_USERS[0]);
    }
    if (window.SupabaseService && SupabaseService.isConnected) {
      SupabaseService.deleteUser(userId);
    }
    return true;
  }

  static getCurrentUser() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || JSON.stringify(DEFAULT_USERS[0]));
  }

  static setCurrentUser(user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  static getAssignments() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS) || '[]');
  }

  static saveAssignments(assignments) {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
  }

  static addAssignment(assignment) {
    const assignments = this.getAssignments();
    assignments.unshift(assignment);
    this.saveAssignments(assignments);
    if (window.SupabaseService && SupabaseService.isConnected) {
      SupabaseService.upsertAssignment(assignment);
    }
    return assignment;
  }

  static deleteAssignment(assignmentId) {
    let assignments = this.getAssignments();
    assignments = assignments.filter(a => a.id !== assignmentId);
    this.saveAssignments(assignments);
    
    // Shu vazifaga tegishli topshiriqlarni ham tozalash
    let subs = this.getSubmissions();
    subs = subs.filter(s => s.assignmentId !== assignmentId);
    this.saveSubmissions(subs);
    if (window.SupabaseService && SupabaseService.isConnected) {
      SupabaseService.deleteAssignment(assignmentId);
    }
    return true;
  }

  static getSubmissions() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '[]');
  }

  static saveSubmissions(submissions) {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  }

  static addSubmission(submission) {
    const submissions = this.getSubmissions();
    submissions.unshift(submission);
    this.saveSubmissions(submissions);
    if (window.SupabaseService && SupabaseService.isConnected) {
      SupabaseService.upsertSubmission(submission);
    }
    return submission;
  }

  static updateSubmission(submissionId, updatedFields) {
    const submissions = this.getSubmissions();
    const index = submissions.findIndex(s => s.id === submissionId);
    if (index !== -1) {
      submissions[index] = { ...submissions[index], ...updatedFields };
      this.saveSubmissions(submissions);
      if (window.SupabaseService && SupabaseService.isConnected) {
        SupabaseService.upsertSubmission(submissions[index]);
      }
      return submissions[index];
    }
    return null;
  }

  static getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || DEFAULT_API_KEY;
  }

  static setApiKey(key) {
    const cleanKey = (key || '').trim().replace(/^['"]|['"]$/g, '');
    localStorage.setItem(STORAGE_KEYS.API_KEY, cleanKey);
  }

  static resetToDefault() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(DEFAULT_GROUPS));
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(DEFAULT_ASSIGNMENTS));
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(DEFAULT_SUBMISSIONS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEFAULT_USERS[0]));
  }
}

DataStore.init();
