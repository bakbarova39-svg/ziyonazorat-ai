/**
 * ZiyoNazorat AI - Asosiy Ilova Boshqaruvchisi
 * AI asoslari va prompt engineering guruhlari uchun qulay, sodda va tushunarli kontroller
 */

const App = {
  activeTab: 'assignments',
  currentAssignmentForSubmit: null,

  init() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
    this.setTheme(savedTheme);

    this.populateRoleSwitcher();
    this.setupEventListeners();
    this.switchTab('assignments');
    this.refreshAll();

    // Supabase bulut bazasini ishga tushirish
    if (window.SupabaseService) {
      SupabaseService.init();
    }
  },

  refreshAll() {
    UIRenderer.renderHeaderUser();
    UIRenderer.renderStats();
    UIRenderer.renderAssignments();
    UIRenderer.renderStudentsTable();

    if (window.SupabaseService) {
      SupabaseService.updateStatusUI();
    }
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    const themeIcon = document.getElementById('themeToggleBtn');
    if (themeIcon) {
      themeIcon.innerHTML = theme === 'dark' ? SVGIcons.sun('', 18) : SVGIcons.moon('', 18);
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  },

  populateRoleSwitcher() {
    const select = document.getElementById('roleSwitcherSelect');
    if (!select) return;

    const users = DataStore.getUsers();
    select.innerHTML = users.map(u => {
      const roleLabel = u.role === 'teacher' ? 'Ustoz: ' : (u.role === 'assistant' ? 'Yordamchi: ' : 'O\'quvchi: ');
      return `
        <option value="${u.id}">
          ${roleLabel} ${u.name} (${u.group || u.role})
        </option>
      `;
    }).join('') + `
      <option value="__new_member__">+ Yangi a'zo qo'shish...</option>
    `;

    const current = DataStore.getCurrentUser();
    select.value = current.id;
  },

  switchUser(userId) {
    if (userId === '__new_member__' || userId === '__new_student__') {
      this.openModal('modalAddMember');
      this.populateRoleSwitcher();
      return;
    }

    const users = DataStore.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      DataStore.setCurrentUser(user);
      const roleTxt = user.role === 'teacher' ? 'Ustoz' : (user.role === 'assistant' ? 'Yordamchi Ustoz' : 'O\'quvchi');
      UIRenderer.showToast(`Profil tanlandi: ${user.name} (${roleTxt})`, 'info');
      this.refreshAll();
    }
  },

  switchTab(tabName) {
    this.activeTab = tabName;

    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const target = document.getElementById(`view-${tabName}`);
    if (target) {
      target.classList.add('active');
    }

    const heroBanner = document.querySelector('.hero-banner');
    if (heroBanner) {
      heroBanner.style.display = tabName === 'assignments' ? 'block' : 'none';
    }

    if (tabName === 'reports') {
      UIRenderer.renderAiReportsTab();
    } else if (tabName === 'assignments') {
      UIRenderer.renderAssignments();
    } else if (tabName === 'students') {
      UIRenderer.renderStudentsTable();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  openModal(modalId) {
    if (modalId === 'modalRegister') modalId = 'modalAddMember';

    if (modalId === 'modalAiConnect') {
      const apiKey = DataStore.getApiKey();
      const input = document.getElementById('modalApiKeyInput');
      const engineText = document.getElementById('modalAiCurrentEngine');
      if (input) input.value = apiKey;
      if (engineText) engineText.textContent = AIService.getAiStatus().provider;
    } else if (modalId === 'modalSupabaseConnect') {
      if (window.SupabaseService) SupabaseService.updateStatusUI();
    } else if (modalId === 'modalCreateHw' || modalId === 'modalAddMember') {
      UIRenderer.populateGroupDropdowns();
    }

    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    if (modalId === 'modalRegister') modalId = 'modalAddMember';
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  },

  handleCreateAssignment(e) {
    e.preventDefault();

    const subject = document.getElementById('newHwSubject').value;
    const title = document.getElementById('newHwTitle').value.trim();
    const description = document.getElementById('newHwDescription').value.trim();
    const deadline = document.getElementById('newHwDeadline').value;
    const maxScore = parseInt(document.getElementById('newHwMaxScore').value || 100, 10);
    const difficulty = document.getElementById('newHwDifficulty').value;
    const targetGroupElem = document.getElementById('newHwTargetGroup');
    const targetGroup = targetGroupElem ? targetGroupElem.value : 'Barcha guruhlar';
    const criteria = document.getElementById('newHwCriteria').value.trim();
    const sampleSolution = document.getElementById('newHwSolution').value.trim();

    if (!title || !description || !deadline) {
      UIRenderer.showToast('Iltimos, barcha majburiy maydonlarni to\'ldiring!', 'warning');
      return;
    }

    let badgeClass = 'badge-role';
    if (subject.includes('Misol')) badgeClass = 'badge-fewshot';
    else if (subject.includes('Qadamma')) badgeClass = 'badge-cot';
    else if (subject.includes('Format')) badgeClass = 'badge-format';
    else if (subject.includes('Xato')) badgeClass = 'badge-guardrail';

    const newAssignment = {
      id: `hw-pr-${Date.now().toString().slice(-4)}`,
      subject,
      subjectBadgeClass: badgeClass,
      targetGroup,
      title,
      description,
      deadline,
      deadlineDisplay: `${deadline} (23:59)`,
      maxScore,
      difficulty,
      criteria: criteria || 'Rol va kontekst (35%), Ko\'rsatma aniqligi (35%), Format (30%)',
      sampleSolution: sampleSolution || '',
      createdAt: new Date().toISOString().split('T')[0]
    };

    DataStore.addAssignment(newAssignment);
    this.closeModal('modalCreateHw');
    document.getElementById('formCreateHw').reset();

    UIRenderer.showToast(`Yangi prompt vazifasi muvaffaqiyatli qo'shildi: "${title}"`, 'success');
    this.refreshAll();
  },

  deleteAssignment(assignmentId) {
    const assignments = DataStore.getAssignments();
    const hw = assignments.find(a => a.id === assignmentId);
    if (!hw) return;

    if (confirm(`Rostdan ham "${hw.title}" vazifasini o'chirmoqchimisiz? Unga yuborilgan barcha tekshiruvlar ham o'chiriladi.`)) {
      DataStore.deleteAssignment(assignmentId);
      this.refreshAll();
      UIRenderer.showToast(`"${hw.title}" vazifasi o'chirildi!`, 'info');
    }
  },

  viewAssignmentDetails(assignmentId) {
    const assignments = DataStore.getAssignments();
    const hw = assignments.find(a => a.id === assignmentId);
    if (!hw) return;

    const modalBody = document.getElementById('assignmentDetailsBody');
    const currentUser = DataStore.getCurrentUser();
    const isTeacher = currentUser.role === 'teacher';

    const subs = DataStore.getSubmissions().filter(s => s.assignmentId === hw.id);

    modalBody.innerHTML = `
      <div style="margin-bottom: 1.2rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <span class="subject-badge ${hw.subjectBadgeClass || 'badge-role'}">
          ${SVGIcons.sparkles('', 13)} ${hw.subject}
        </span>
        <span class="status-indicator status-active">
          ${SVGIcons.clock('', 12)} Topshirish muddati: ${hw.deadlineDisplay || hw.deadline}
        </span>
        <span class="status-indicator" style="background: rgba(99,102,241,0.1); color: var(--primary);">
          ${SVGIcons.barChart('', 12)} Maksimal ball: ${hw.maxScore}
        </span>
      </div>

      <h2 style="font-size: 1.4rem; margin-bottom: 0.8rem; color: var(--text-main);">${hw.title}</h2>

      <div class="report-box" style="margin-bottom: 1.2rem; white-space: pre-line;">
        <strong style="color: var(--primary); display: block; margin-bottom: 0.4rem;">Vazifa sharti va nima qilish kerakligi:</strong>
${hw.description}
      </div>

      <div style="background: rgba(6,182,212,0.06); border: 1px solid rgba(6,182,212,0.25); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.2rem;">
        <strong style="color: var(--accent-cyan); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.3rem;">
          ${SVGIcons.sliders('', 16)} AI Baholash Mezonlari (Qoidalari):
        </strong>
        <p style="font-size: 0.88rem; color: var(--text-main);">${hw.criteria}</p>
      </div>

      ${isTeacher && hw.sampleSolution ? `
        <div style="background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.25); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.2rem;">
          <strong style="color: var(--accent-emerald); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.3rem;">
            ${SVGIcons.code('', 16)} Ustozning Namunaviy Prompti (AI solishtirishi uchun):
          </strong>
          <pre class="code-preview-block" style="font-size: 0.84rem; white-space: pre-wrap; color: var(--text-main);">${hw.sampleSolution}</pre>
        </div>
      ` : ''}

      <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 1rem;">
        <span style="font-size: 0.88rem; color: var(--text-muted);">
          Guruhdan kelib tushgan promptlar: <strong style="color: var(--text-main);">${subs.length} ta</strong>
        </span>

        <div>
          ${!isTeacher ? `
            <button class="btn btn-primary" onclick="App.closeModal('modalAssignmentDetails'); App.openSubmitModal('${hw.id}')">
              ${SVGIcons.send('', 15)} <span>Promptni Topshirish</span>
            </button>
          ` : `
            <button class="btn btn-grad-purple" onclick="App.closeModal('modalAssignmentDetails'); App.viewAssignmentSubmissions('${hw.id}')">
              ${SVGIcons.sparkles('', 15)} <span>AI Hisobotlarini Ko'rish</span>
            </button>
          `}
        </div>
      </div>
    `;

    this.openModal('modalAssignmentDetails');
  },

  openSubmitModal(assignmentId) {
    const assignments = DataStore.getAssignments();
    const hw = assignments.find(a => a.id === assignmentId);
    if (!hw) return;

    const currentUser = DataStore.getCurrentUser();
    if (currentUser.role === 'teacher') {
      UIRenderer.showToast('Ustoz sifatida sinov tariqasida prompt topshirilmoqda.', 'info');
    }

    this.currentAssignmentForSubmit = hw;

    const modalTitle = document.getElementById('submitModalHwTitle');
    const modalDesc = document.getElementById('submitModalHwDesc');
    const form = document.getElementById('formSubmitHomework');

    if (modalTitle) modalTitle.textContent = `${hw.subject}: ${hw.title}`;
    if (modalDesc) modalDesc.textContent = hw.description;
    if (form) form.reset();

    document.getElementById('attachedFileNameDisplay').textContent = '';
    this.openModal('modalSubmitHw');
  },

  async handleSubmitHomework(e) {
    e.preventDefault();
    const hw = this.currentAssignmentForSubmit;
    if (!hw) return;

    const currentUser = DataStore.getCurrentUser();
    const answerText = document.getElementById('submitAnswerText').value.trim();
    const externalLink = document.getElementById('submitExternalLink').value.trim();
    const submitBtn = document.getElementById('btnSubmitWithAI');

    if (!answerText) {
      UIRenderer.showToast('Iltimos, o\'zingiz tuzgan promptni yozing!', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `${SVGIcons.refresh('animate-spin', 16)} <span>AI promptni tekshirmoqda...</span>`;

    try {
      const aiReport = await AIService.evaluateSubmission(hw, answerText, currentUser.name);

      const newSubmission = {
        id: `sub-pr-${Date.now().toString().slice(-5)}`,
        assignmentId: hw.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        studentAvatar: currentUser.avatar || 'AI',
        studentGroup: currentUser.group || '1-Guruh: AI Asoslari',
        submittedAt: new Date().toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        answerText,
        attachedFile: document.getElementById('attachedFileNameDisplay').textContent || null,
        externalLink,
        status: 'graded',
        aiReport,
        teacherNote: '',
        teacherApproved: true
      };

      DataStore.addSubmission(newSubmission);

      this.closeModal('modalSubmitHw');
      UIRenderer.showToast(`Promptingiz qabul qilindi va AI tomonidan tekshirildi! Ball: ${aiReport.score}/100`, 'success');

      this.refreshAll();

      setTimeout(() => {
        this.viewSubmissionReport(newSubmission.id);
      }, 400);

    } catch (err) {
      console.error('Submission error:', err);
      UIRenderer.showToast('Xatolik yuz berdi. Qaytadan urinib ko\'ring.', 'warning');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `${SVGIcons.send('', 16)} <span>Promptni Topshirish va AI ga Yuborish</span>`;
    }
  },

  viewSubmissionReport(submissionId) {
    const submissions = DataStore.getSubmissions();
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return;

    const assignments = DataStore.getAssignments();
    const hw = assignments.find(a => a.id === sub.assignmentId) || { title: 'AI Prompt Vazifasi', subject: 'Prompt Engineering' };
    const currentUser = DataStore.getCurrentUser();
    const isTeacher = currentUser.role === 'teacher';

    const modalBody = document.getElementById('aiReportModalBody');
    const r = sub.aiReport || {};

    modalBody.innerHTML = `
      <div class="ai-score-banner">
        <div>
          <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.85; display: inline-flex; align-items: center; gap: 0.35rem;">
            ${SVGIcons.sparkles('', 14)} ${hw.subject} • ${hw.title}
          </span>
          <h2 style="font-size: 1.45rem; margin-top: 0.2rem;">${sub.studentName}</h2>
          <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 0.35rem;">
            ${sub.studentGroup} | Topshirildi: ${sub.submittedAt}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="ai-score-big">
            ${r.score || 0} <span>/ 100</span>
          </div>
          <span style="font-size: 0.78rem; font-weight: 700; background: rgba(255,255,255,0.2); padding: 0.2rem 0.6rem; border-radius: var(--radius-pill); display: inline-flex; align-items: center; gap: 0.3rem;">
            ${SVGIcons.shieldCheck('', 13)} Mustaqillik: ${r.plagiarismRisk || '1%'}
          </span>
        </div>
      </div>

      <!-- Ustoz uchun sodda xulosa -->
      <div class="report-section">
        <h4 class="report-section-title">
          ${SVGIcons.brain('text-cyan', 18)} <span>Ustoz Uchun AI Tahliliy Xulosasi:</span>
        </h4>
        <div class="report-box teacher-highlight">
          <p style="margin-bottom: 0.6rem; font-weight: 500;">${r.teacherSummary || 'Tahlil tayyorlanmoqda...'}</p>
          <div style="font-weight: 700; color: var(--primary); margin-top: 0.5rem; font-size: 0.88rem; display: flex; align-items: center; gap: 0.35rem;">
            ${SVGIcons.sparkles('text-cyan', 15)} Ustozga Dars Rejasi Tavsiyasi:
          </div>
          <p style="font-style: italic; color: var(--text-main); margin-top: 0.2rem;">${r.teacherRecommendation || 'Alohida tavsiya yo\'q.'}</p>
        </div>
      </div>

      <!-- Kuchli va noaniq tomonlar -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.4rem;">
        <div class="report-box">
          <strong style="color: var(--accent-emerald); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;">
            ${SVGIcons.checkCircle('text-emerald', 16)} Promptning Kuchli Jihatlari:
          </strong>
          <ul style="padding-left: 1.2rem; font-size: 0.85rem; color: var(--text-main);">
            ${(r.strengths || []).map(s => `<li style="margin-bottom: 0.35rem;">${s}</li>`).join('')}
          </ul>
        </div>

        <div class="report-box">
          <strong style="color: var(--accent-rose); display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;">
            ${SVGIcons.alertTriangle('text-rose', 16)} Promptdagi Noaniqliklar / Kamchiliklar:
          </strong>
          ${(r.detectedMistakes && r.detectedMistakes.length > 0) ? `
            <ul style="padding-left: 1.2rem; font-size: 0.85rem; color: var(--text-main);">
              ${r.detectedMistakes.map(m => `<li style="margin-bottom: 0.35rem;">${m}</li>`).join('')}
            </ul>
          ` : `
            <p style="font-size: 0.85rem; color: var(--accent-emerald); display: flex; align-items: center; gap: 0.3rem;">
              ${SVGIcons.checkCircle('text-emerald', 15)} Prompt qoidalarga to'liq mos tuzilgan!
            </p>
          `}
        </div>
      </div>

      <!-- O'quvchi yozgan prompt -->
      <div class="report-section">
        <h4 class="report-section-title">
          ${SVGIcons.code('text-cyan', 18)} <span>O'quvchi Tuzgan Prompt (Ko'rsatma):</span>
        </h4>
        <div class="code-preview-block" style="white-space: pre-wrap; font-family: inherit; font-size: 0.9rem; background: rgba(99,102,241,0.04); color: var(--text-main); padding: 1.2rem; border-radius: var(--radius-md); border: 1px solid var(--border-light); max-height: 240px; overflow-y: auto;">
${sub.answerText}
        </div>
      </div>

      <!-- O'quvchiga tushunarli maslahat -->
      <div class="report-section">
        <h4 class="report-section-title">
          ${SVGIcons.sparkles('text-cyan', 18)} <span>O'quvchiga Qoldirilgan AI Maslahati:</span>
        </h4>
        <div class="report-box">
          <p>${r.studentFeedback || ''}</p>
        </div>
      </div>

      <!-- Ustoz izohi -->
      <div class="report-section" style="border-top: 1px solid var(--border-light); padding-top: 1.2rem;">
        <h4 class="report-section-title">
          ${SVGIcons.user('text-cyan', 18)} <span>Ustozning Shaxsiy Izohi va Yakuniy Bahosi:</span>
        </h4>
        <div style="display: flex; gap: 0.8rem; margin-top: 0.5rem;">
          <input type="text" id="teacherCustomNoteInput" class="form-control" placeholder="Ustoz izohi (masalan: Ajoyib prompt, qabul qilindi)..." value="${sub.teacherNote || ''}" ${!isTeacher ? 'disabled' : ''}>
          ${isTeacher ? `
            <button class="btn btn-primary" onclick="App.saveTeacherNote('${sub.id}')">
              <span>Saqlash</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    this.openModal('modalAiReport');
  },

  saveTeacherNote(submissionId) {
    const input = document.getElementById('teacherCustomNoteInput');
    const note = input ? input.value.trim() : '';

    DataStore.updateSubmission(submissionId, {
      teacherNote: note,
      teacherApproved: true
    });

    UIRenderer.showToast('Ustoz izohi muvaffaqiyatli saqlandi!', 'success');
  },

  viewAssignmentSubmissions(assignmentId) {
    this.switchTab('reports');
    UIRenderer.renderAiReportsTab(assignmentId);
  },

  viewStudentProfileReport(studentId) {
    const users = DataStore.getUsers();
    const st = users.find(u => u.id === studentId);
    if (!st) return;

    const subs = DataStore.getSubmissions().filter(s => s.studentId === studentId);
    const assignments = DataStore.getAssignments();

    const avg = subs.length > 0 ? Math.round(subs.reduce((a, b) => a + (b.aiReport?.score || 0), 0) / subs.length) : 0;

    const modalBody = document.getElementById('studentProfileBody');
    modalBody.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1.2rem; margin-bottom: 1.5rem;">
        <div class="table-avatar" style="width: 60px; height: 60px; font-size: 1.4rem;">${st.avatar || 'AI'}</div>
        <div>
          <h2 style="font-size: 1.4rem;">${st.name}</h2>
          <div style="color: var(--text-muted); font-size: 0.88rem;">${st.group || '1-Guruh: AI Asoslari'} • ${st.email || ''}</div>
          <div style="margin-top: 0.4rem;">
            <span class="score-badge score-high">
              ${SVGIcons.activity('', 14)} O'rtacha prompt sifati: ${avg} ball
            </span>
          </div>
        </div>
      </div>

      <h4 style="font-size: 1.1rem; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.4rem;">
        ${SVGIcons.fileCode('text-cyan', 17)} Topshirilgan Prompt Vazifalari Tarixi (${subs.length} ta):
      </h4>
      <div style="display: flex; flex-direction: column; gap: 0.8rem;">
        ${subs.length === 0 ? '<p style="color: var(--text-muted);">Hozircha prompt topshirilmagan.</p>' : subs.map(s => {
          const hw = assignments.find(a => a.id === s.assignmentId) || { title: 'Vazifa', subject: 'AI' };
          return `
            <div style="background: var(--card-bg); border: 1px solid var(--border-light); padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between;">
              <div>
                <strong>${hw.subject}: ${hw.title}</strong>
                <div style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">Topshirildi: ${s.submittedAt}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.8rem;">
                <span class="score-badge ${s.aiReport?.score >= 85 ? 'score-high' : 'score-mid'}">
                  ${s.aiReport?.score || 0} ball
                </span>
                <button class="btn btn-sm btn-outline-white" style="color: var(--primary);" onclick="App.closeModal('modalStudentProfile'); App.viewSubmissionReport('${s.id}')">
                  <span>Hisobot ➔</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.openModal('modalStudentProfile');
  },

  handleAddMember(e) {
    e.preventDefault();
    const name = document.getElementById('newMemberName').value.trim();
    const role = document.getElementById('newMemberRole').value;
    const group = document.getElementById('newMemberGroup').value;
    const phone = document.getElementById('newMemberPhone').value.trim();
    const email = document.getElementById('newMemberEmail').value.trim();

    if (!name) {
      UIRenderer.showToast('Iltimos, a\'zo ism-familiyasini kiriting!', 'warning');
      return;
    }

    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AI';
    const newMember = {
      id: `u-${role}-${Date.now().toString().slice(-4)}`,
      name,
      role,
      group,
      phone: phone || '+998 90 000 00 00',
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@ziyonazorat.uz`,
      avatar: initials,
      joinedAt: new Date().toISOString().split('T')[0],
      avgScore: 0,
      completedHw: 0,
      pendingHw: 0
    };

    DataStore.addUser(newMember);
    DataStore.setCurrentUser(newMember);

    this.closeModal('modalAddMember');
    const form = document.getElementById('formAddMember');
    if (form) form.reset();
    this.populateRoleSwitcher();

    UIRenderer.showToast(`Yangi a'zo qo'shildi: ${name} (${group})`, 'success');
    this.refreshAll();
  },

  deleteMember(userId) {
    if (userId === 'u-teacher-main') {
      UIRenderer.showToast('Asosiy ustoz hisobini o\'chirib bo\'lmaydi!', 'warning');
      return;
    }

    const users = DataStore.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (confirm(`Rostdan ham "${user.name}"ni guruhdan o'chirmoqchimisiz?`)) {
      DataStore.deleteUser(userId);
      this.populateRoleSwitcher();
      this.refreshAll();
      UIRenderer.showToast(`"${user.name}" muvaffaqiyatli o'chirildi!`, 'info');
    }
  },

  // ==========================================
  // GURUHLAR BOSHQARUVI (ISTALGANCHA GURUH YARATISH)
  // ==========================================
  handleCreateGroup(e) {
    e.preventDefault();
    const name = document.getElementById('newGroupNameInput').value.trim();
    const desc = document.getElementById('newGroupDescInput').value.trim();
    const sched = document.getElementById('newGroupScheduleInput').value.trim();

    if (!name || !desc) {
      UIRenderer.showToast('Iltimos, guruh nomi va yo\'nalishini kiriting!', 'warning');
      return;
    }

    const newGroup = {
      id: `grp-${Date.now().toString().slice(-4)}`,
      name,
      description: desc,
      schedule: sched || 'Dars jadvali belgilanmagan',
      createdAt: new Date().toISOString().split('T')[0]
    };

    DataStore.addGroup(newGroup);
    this.closeModal('modalCreateGroup');
    document.getElementById('formCreateGroup').reset();

    UIRenderer.populateGroupDropdowns();
    UIRenderer.renderGroupsCards();
    this.populateRoleSwitcher();

    UIRenderer.showToast(`Yangi AI guruhi yaratildi: "${name}"`, 'success');
  },

  deleteGroup(groupId) {
    const groups = DataStore.getGroups();
    const grp = groups.find(g => g.id === groupId);
    if (!grp) return;

    if (confirm(`Rostdan ham "${grp.name}" guruhini o'chirmoqchimisiz?`)) {
      DataStore.deleteGroup(groupId);
      UIRenderer.populateGroupDropdowns();
      UIRenderer.renderGroupsCards();
      this.populateRoleSwitcher();
      UIRenderer.showToast(`"${grp.name}" guruhi muvaffaqiyatli o'chirildi!`, 'info');
    }
  },

  openAddMemberForGroup(groupName) {
    this.openModal('modalAddMember');
    const groupSelect = document.getElementById('newMemberGroup');
    if (groupSelect) {
      groupSelect.value = groupName;
    }
  },

  filterStudentsByGroup(groupName) {
    const filterSelect = document.getElementById('groupFilterSelect');
    if (filterSelect) {
      filterSelect.value = groupName;
    }
    UIRenderer.renderStudentsTable(groupName);
    const tableElem = document.getElementById('studentsTableBody');
    if (tableElem) {
      tableElem.scrollIntoView({ behavior: 'smooth' });
    }
  },

  // ==========================================
  // OVOZLI XABAR VA AI BILAN VAZIFA TO'LDIRISH
  // ==========================================
  isRecordingVoice: false,
  speechRecognition: null,
  voiceTimerInterval: null,
  voiceSeconds: 0,

  toggleVoiceRecording() {
    if (this.isRecordingVoice) {
      this.stopVoiceRecording();
    } else {
      this.startVoiceRecording();
    }
  },

  startVoiceRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = document.getElementById('btnToggleVoiceRecord');
    const btnText = document.getElementById('voiceRecordBtnText');
    const statusBar = document.getElementById('voiceRecordingStatus');
    const timerElem = document.getElementById('voiceTimer');
    const transcriptInput = document.getElementById('voiceTranscriptInput');

    this.voiceSeconds = 0;
    if (timerElem) timerElem.textContent = '00:00';
    if (statusBar) statusBar.style.display = 'flex';
    if (btn) btn.classList.add('recording');
    if (btnText) btnText.textContent = 'Yozishni To\'xtatish';
    this.isRecordingVoice = true;

    // Timer
    clearInterval(this.voiceTimerInterval);
    this.voiceTimerInterval = setInterval(() => {
      this.voiceSeconds++;
      const m = Math.floor(this.voiceSeconds / 60).toString().padStart(2, '0');
      const s = (this.voiceSeconds % 60).toString().padStart(2, '0');
      if (timerElem) timerElem.textContent = `${m}:${s}`;
    }, 1000);

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'uz-UZ';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (e) => {
          let currentTranscript = '';
          for (let i = 0; i < e.results.length; i++) {
            currentTranscript += e.results[i][0].transcript + ' ';
          }
          if (transcriptInput) {
            transcriptInput.value = currentTranscript.trim();
          }
        };

        recognition.onerror = (e) => {
          console.warn('SpeechRecognition error:', e.error);
        };

        recognition.start();
        this.speechRecognition = recognition;
        UIRenderer.showToast('Mikrofon yoqildi. Topshiriq shartlarini erkin gapiring...', 'info');
      } catch (err) {
        console.warn('SpeechRecognition start error:', err);
      }
    } else {
      UIRenderer.showToast('Brauzeringizda ovoz yozilmoqda. Gapiring yoki xohlasangiz matnni kiritishingiz mumkin.', 'info');
    }
  },

  stopVoiceRecording() {
    const btn = document.getElementById('btnToggleVoiceRecord');
    const btnText = document.getElementById('voiceRecordBtnText');
    const statusBar = document.getElementById('voiceRecordingStatus');

    this.isRecordingVoice = false;
    clearInterval(this.voiceTimerInterval);

    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {}
      this.speechRecognition = null;
    }

    if (btn) btn.classList.remove('recording');
    if (btnText) btnText.textContent = 'Ovozli Xabar Yozish';
    if (statusBar) statusBar.style.display = 'none';

    const transcriptInput = document.getElementById('voiceTranscriptInput');
    if (transcriptInput && transcriptInput.value.trim()) {
      UIRenderer.showToast('Ovoz yozildi! Endi "AI Bo\'limlarni To\'ldirsin" tugmasini bosing.', 'success');
    } else {
      UIRenderer.showToast('Ovoz yozish to\'xtatildi.', 'info');
    }
  },

  insertSampleVoiceText() {
    const transcriptInput = document.getElementById('voiceTranscriptInput');
    const sample = "1-Guruh AI Asoslari uchun yangi amaliy vazifa yaratmoqchiman. Mavzu: Rol va Kontekst berish. Topshiriq sharti: O'quvchilar sun'iy intellektga 10 yillik tajribali raqamli marketing mutaxassisi rolini berib, yangi ochilgan IT akademiya uchun reklama strategiyasi tuzish promptini yozsin. Muddat 12-noyabrgacha, maksimal ball 100 ball. Format aniq jadval ko'rinishida bo'lsin.";
    if (transcriptInput) {
      transcriptInput.value = sample;
    }
    UIRenderer.showToast('Namunaviy audio matn joylandi! "AI Bo\'limlarni To\'ldirsin" tugmasini bosing.', 'info');
  },

  async parseVoiceWithAI() {
    const transcriptInput = document.getElementById('voiceTranscriptInput');
    const text = transcriptInput ? transcriptInput.value.trim() : '';

    if (!text) {
      UIRenderer.showToast('Iltimos, avval ovozli xabar yozing yoki matn kiriting!', 'warning');
      return;
    }

    const parseBtn = document.getElementById('btnParseVoiceWithAI');
    if (parseBtn) {
      parseBtn.disabled = true;
      parseBtn.innerHTML = `${SVGIcons.refresh('animate-spin', 15)} <span>AI audio xabarni tahlil qilmoqda...</span>`;
    }

    try {
      const parsed = await AIService.parseVoiceToHomework(text);

      const subjectElem = document.getElementById('newHwSubject');
      const targetGroupElem = document.getElementById('newHwTargetGroup');
      const difficultyElem = document.getElementById('newHwDifficulty');
      const titleElem = document.getElementById('newHwTitle');
      const descElem = document.getElementById('newHwDescription');
      const deadlineElem = document.getElementById('newHwDeadline');
      const maxScoreElem = document.getElementById('newHwMaxScore');
      const criteriaElem = document.getElementById('newHwCriteria');
      const solutionElem = document.getElementById('newHwSolution');

      if (subjectElem && parsed.subject) subjectElem.value = parsed.subject;
      if (targetGroupElem && parsed.targetGroup) targetGroupElem.value = parsed.targetGroup;
      if (difficultyElem && parsed.difficulty) difficultyElem.value = parsed.difficulty;
      if (titleElem && parsed.title) titleElem.value = parsed.title;
      if (descElem && parsed.description) descElem.value = parsed.description;
      if (deadlineElem && parsed.deadline) deadlineElem.value = parsed.deadline;
      if (maxScoreElem && parsed.maxScore) maxScoreElem.value = parsed.maxScore;
      if (criteriaElem && parsed.criteria) criteriaElem.value = parsed.criteria;
      if (solutionElem && parsed.sampleSolution) solutionElem.value = parsed.sampleSolution;

      // Glow highlight animation
      [subjectElem, targetGroupElem, difficultyElem, titleElem, descElem, deadlineElem, maxScoreElem, criteriaElem, solutionElem].forEach(el => {
        if (el) {
          el.classList.add('field-ai-filled');
          setTimeout(() => el.classList.remove('field-ai-filled'), 2200);
        }
      });

      UIRenderer.showToast('Sun\'iy intellekt audio xabarni tahlil qilib, barcha maydonlarni avtomatik to\'ldirdi!', 'success');

    } catch (err) {
      console.error('Voice parsing error:', err);
      UIRenderer.showToast('AI audio tahlilida xatolik yuz berdi. Qaytadan urinib ko\'ring.', 'warning');
    } finally {
      if (parseBtn) {
        parseBtn.disabled = false;
        parseBtn.innerHTML = `${SVGIcons.sparkles('', 16)} <span>AI Bo'limlarni To'ldirsin</span>`;
      }
    }
  },

  // ==========================================
  // AI CONNECTION MODAL
  // ==========================================
  saveModalApiKey() {
    const input = document.getElementById('modalApiKeyInput');
    const key = input ? input.value.trim().replace(/^['"]|['"]$/g, '') : '';
    DataStore.setApiKey(key);
    UIRenderer.renderAiStatusBadge();
    const settingsInput = document.getElementById('settingsApiKeyInput');
    if (settingsInput) settingsInput.value = key;
    this.closeModal('modalAiConnect');
    const status = AIService.getAiStatus();
    UIRenderer.showToast(key ? `${status.provider} muvaffaqiyatli ulandi va saqlandi!` : 'Mahalliy ZiyoNazorat AI mexanizmi faol!', 'success');
  },

  saveSettings() {
    const input = document.getElementById('settingsApiKeyInput');
    const apiKey = input ? input.value.trim().replace(/^['"]|['"]$/g, '') : '';
    DataStore.setApiKey(apiKey);
    UIRenderer.renderAiStatusBadge();
    const modalInput = document.getElementById('modalApiKeyInput');
    if (modalInput) modalInput.value = apiKey;
    const status = AIService.getAiStatus();
    UIRenderer.showToast(apiKey ? `${status.provider} sozlamalari saqlandi!` : 'Mahalliy ZiyoNazorat AI mexanizmi faol!', 'success');
  },

  async saveSupabaseSettings() {
    const url = document.getElementById('settingsSupabaseUrlInput')?.value || '';
    const key = document.getElementById('settingsSupabaseKeyInput')?.value || '';
    
    UIRenderer.showToast('Supabase bazasiga ulanish tekshirilmoqda...', 'info');
    const res = await SupabaseService.saveConfig(url, key);
    if (res.success) {
      UIRenderer.showToast(res.message, 'success');
      this.populateRoleSwitcher();
      this.refreshAll();
    } else {
      UIRenderer.showToast(res.message, 'warning');
    }
  },

  async saveModalSupabase() {
    const url = document.getElementById('modalSupabaseUrlInput')?.value || '';
    const key = document.getElementById('modalSupabaseKeyInput')?.value || '';
    
    UIRenderer.showToast('Supabase bazasiga ulanish tekshirilmoqda...', 'info');
    const res = await SupabaseService.saveConfig(url, key);
    this.closeModal('modalSupabaseConnect');
    if (res.success) {
      UIRenderer.showToast(res.message, 'success');
      this.populateRoleSwitcher();
      this.refreshAll();
    } else {
      UIRenderer.showToast(res.message, 'warning');
    }
  },

  async syncFromSupabase() {
    if (!SupabaseService.isConnected) {
      UIRenderer.showToast("Avval Supabase URL va Anon kalitini kiritib ulaning!", 'warning');
      return;
    }
    UIRenderer.showToast("Supabase bulutidan yuklanmoqda...", 'info');
    const ok = await SupabaseService.pullFromCloud(false);
    if (ok) {
      this.populateRoleSwitcher();
      this.refreshAll();
    }
  },

  async syncToSupabase() {
    if (!SupabaseService.isConnected) {
      UIRenderer.showToast("Avval Supabase URL va Anon kalitini kiritib ulaning!", 'warning');
      return;
    }
    try {
      UIRenderer.showToast("Ma'lumotlar Supabase bulutiga yuklanmoqda...", 'info');
      await SupabaseService.pushToCloud();
      UIRenderer.showToast("Barcha lokal ma'lumotlar Supabase bazasiga muvaffaqiyatli yuklandi!", 'success');
    } catch (err) {
      UIRenderer.showToast("Yuklashda xatolik: " + err.message, 'warning');
    }
  },

  disconnectSupabase() {
    if (confirm("Supabase bulut bazasidan uzilsinmi? (Lokal ma'lumotlaringiz saqlanib qoladi)")) {
      SupabaseService.disconnect();
      const elU1 = document.getElementById('settingsSupabaseUrlInput');
      const elK1 = document.getElementById('settingsSupabaseKeyInput');
      const elU2 = document.getElementById('modalSupabaseUrlInput');
      const elK2 = document.getElementById('modalSupabaseKeyInput');
      if (elU1) elU1.value = '';
      if (elK1) elK1.value = '';
      if (elU2) elU2.value = '';
      if (elK2) elK2.value = '';
      UIRenderer.showToast("Supabase bazasidan uzildi. Mahalliy xotira (localStorage) rejimi faol.", 'info');
    }
  },

  copySupabaseSql() {
    const codeBlock = document.getElementById('supabaseSqlCodeBlock');
    const text = codeBlock ? codeBlock.textContent : '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        const btnText = document.getElementById('copySqlBtnText');
        if (btnText) {
          const old = btnText.textContent;
          btnText.textContent = "Nusxalandi! ✓";
          setTimeout(() => { btnText.textContent = old; }, 2500);
        }
        UIRenderer.showToast("Supabase SQL sxemasi buferga nusxalandi!", "success");
      }).catch(() => {
        UIRenderer.showToast("Nusxa olish uchun matnni qo'lda belgilang", "info");
      });
    } else {
      UIRenderer.showToast("Nusxa olish uchun matnni belgilang", "info");
    }
  },

  resetDemoData() {
    if (confirm('Barcha namunaviy prompt vazifalari va guruhlar dastlabki holatga qaytarilsinmi?')) {
      DataStore.resetToDefault();
      this.populateRoleSwitcher();
      this.refreshAll();
      UIRenderer.showToast('Ma\'lumotlar dastlabki holatga tiklandi!', 'info');
    }
  },

  setupEventListeners() {
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    const roleSelect = document.getElementById('roleSwitcherSelect');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        this.switchUser(e.target.value);
      });
    }

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Vazifalar filtri va qidiruv
    const subjectFilter = document.getElementById('subjectFilterSelect');
    const searchInput = document.getElementById('searchHwInput');

    if (subjectFilter) {
      subjectFilter.addEventListener('change', () => {
        UIRenderer.renderAssignments(subjectFilter.value, searchInput ? searchInput.value : '');
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const sub = subjectFilter ? subjectFilter.value : 'all';
        UIRenderer.renderAssignments(sub, searchInput.value);
      });
    }

    // Guruhlar filtri va a'zolarni qidiruv
    const groupFilter = document.getElementById('groupFilterSelect');
    const searchMemberInput = document.getElementById('searchMemberInput');

    if (groupFilter) {
      groupFilter.addEventListener('change', () => {
        UIRenderer.renderStudentsTable(groupFilter.value, searchMemberInput ? searchMemberInput.value : '');
      });
    }

    if (searchMemberInput) {
      searchMemberInput.addEventListener('input', () => {
        const grp = groupFilter ? groupFilter.value : 'all';
        UIRenderer.renderStudentsTable(grp, searchMemberInput.value);
      });
    }

    document.querySelectorAll('.close-modal-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    const formCreateHw = document.getElementById('formCreateHw');
    if (formCreateHw) {
      formCreateHw.addEventListener('submit', (e) => this.handleCreateAssignment(e));
    }

    const formSubmitHw = document.getElementById('formSubmitHomework');
    if (formSubmitHw) {
      formSubmitHw.addEventListener('submit', (e) => this.handleSubmitHomework(e));
    }

    const formAddMember = document.getElementById('formAddMember');
    if (formAddMember) {
      formAddMember.addEventListener('submit', (e) => this.handleAddMember(e));
    }

    const formCreateGroup = document.getElementById('formCreateGroup');
    if (formCreateGroup) {
      formCreateGroup.addEventListener('submit', (e) => this.handleCreateGroup(e));
    }

    const dropzone = document.getElementById('fileDropzone');
    const fileInput = document.getElementById('mockFileInput');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          const f = e.target.files[0];
          document.getElementById('attachedFileNameDisplay').innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 0.35rem;">
              ${SVGIcons.fileCode('', 15)} ${f.name} (${(f.size/1024).toFixed(1)} KB)
            </span>
          `;
        }
      });
    }

    const keyInput = document.getElementById('settingsApiKeyInput');
    if (keyInput) {
      keyInput.value = DataStore.getApiKey();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
