/**
 * ZiyoNazorat AI - UI Renderer
 * Vazifa va a'zolar qo'shish, boshqarish hamda tepadagi barcha bo'limlarga to'liq kirish (access) ta'minlangan
 */

class UIRenderer {
  static showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconSvg = type === 'success' 
      ? SVGIcons.checkCircle('text-emerald', 18) 
      : (type === 'warning' ? SVGIcons.alertTriangle('text-amber', 18) : SVGIcons.sparkles('text-cyan', 18));
    
    toast.innerHTML = `<span>${iconSvg}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  static renderStats() {
    const assignments = DataStore.getAssignments();
    const submissions = DataStore.getSubmissions();
    const students = DataStore.getUsers().filter(u => u.role === 'student');

    const totalHwElem = document.getElementById('statTotalHw');
    const totalStudentsElem = document.getElementById('statTotalStudents');
    const checkedAiElem = document.getElementById('statCheckedAi');
    const avgScoreElem = document.getElementById('statAvgScore');

    if (totalHwElem) totalHwElem.textContent = assignments.length;
    if (totalStudentsElem) totalStudentsElem.textContent = students.length;
    if (checkedAiElem) checkedAiElem.textContent = submissions.length;

    if (avgScoreElem) {
      if (submissions.length > 0) {
        const sum = submissions.reduce((acc, s) => acc + (s.aiReport?.score || 0), 0);
        const avg = Math.round(sum / submissions.length);
        avgScoreElem.textContent = `${avg}%`;
      } else {
        avgScoreElem.textContent = '—';
      }
    }
  }

  static renderAssignments(filterSubject = 'all', searchQuery = '') {
    const container = document.getElementById('assignmentsGrid');
    if (!container) return;

    let assignments = DataStore.getAssignments();
    const submissions = DataStore.getSubmissions();
    const currentUser = DataStore.getCurrentUser();
    const isTeacher = currentUser.role === 'teacher';

    if (filterSubject !== 'all') {
      assignments = assignments.filter(a => a.subject.toLowerCase().includes(filterSubject.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      assignments = assignments.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    }

    if (assignments.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="margin-bottom: 0.8rem; display: inline-flex; padding: 1rem; border-radius: 50%; background: rgba(99,102,241,0.1); color: var(--primary);">
            ${SVGIcons.search('', 36)}
          </div>
          <h3>Mos keluvchi prompt vazifasi topilmadi</h3>
          <p style="margin-bottom: 1.2rem;">Yangi vazifa yaratish orqali guruh o'quvchilariga topshiriq bering.</p>
          <button class="btn btn-sm btn-primary" onclick="App.openModal('modalCreateHw')">
            ${SVGIcons.plus('', 15)} <span>Yangi Vazifa Qo'shish</span>
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = assignments.map(a => {
      const assignSubmissions = submissions.filter(s => s.assignmentId === a.id);
      const subCount = assignSubmissions.length;
      const totalStudents = DataStore.getUsers().filter(u => u.role === 'student').length;
      const progressPercent = totalStudents > 0 ? Math.min(100, Math.round((subCount / totalStudents) * 100)) : 0;

      const mySubmission = !isTeacher ? assignSubmissions.find(s => s.studentId === currentUser.id) : null;

      let studentActionHtml = '';
      if (!isTeacher) {
        if (mySubmission) {
          studentActionHtml = `
            <button class="btn btn-sm btn-outline-white" style="color: var(--accent-emerald); border-color: var(--accent-emerald);" onclick="App.viewSubmissionReport('${mySubmission.id}')">
              ${SVGIcons.checkCircle('', 16)} <span>AI Tekshirgan (${mySubmission.aiReport?.score} ball)</span>
            </button>
          `;
        } else {
          studentActionHtml = `
            <button class="btn btn-sm btn-primary" onclick="App.openSubmitModal('${a.id}')">
              ${SVGIcons.send('', 16)} <span>Promptni Topshirish</span>
            </button>
          `;
        }
      }

      return `
        <div class="assignment-card" id="card-${a.id}">
          <div class="card-top-bar">
            <span class="subject-badge ${a.subjectBadgeClass || 'badge-role'}">
              ${SVGIcons.sparkles('', 14)} ${a.subject}
            </span>
            <span class="status-indicator status-active">
              ${SVGIcons.clock('', 13)} ${a.deadlineDisplay || a.deadline}
            </span>
          </div>

          <h3 class="card-title" onclick="App.viewAssignmentDetails('${a.id}')">${a.title}</h3>
          <p class="card-desc">${a.description}</p>

          <div class="assignment-meta-info">
            <div class="meta-item">
              ${SVGIcons.barChart('', 15)} <span>Maksimal:</span> <strong>${a.maxScore} ball</strong>
            </div>
            <div class="meta-item">
              ${SVGIcons.layers('', 15)} <span>Daraja:</span> <strong>${a.difficulty || 'Boshlang\'ich'}</strong>
            </div>
          </div>

          <div class="ai-progress-section">
            <div class="progress-header">
              <span>Guruh topshirishi: ${subCount}/${totalStudents} o'quvchi</span>
              <span>${progressPercent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${progressPercent >= 70 ? 'green' : ''}" style="width: ${progressPercent}%;"></div>
            </div>
          </div>

          <div class="card-footer-actions">
            <button class="btn btn-sm btn-outline-white" style="color: var(--primary); border-color: rgba(99,102,241,0.3);" onclick="App.viewAssignmentDetails('${a.id}')" title="Shartni to'liq ko'rish">
              ${SVGIcons.fileCode('', 15)} <span>Shart</span>
            </button>

            ${isTeacher ? `
              <button class="btn btn-sm btn-grad-purple" onclick="App.viewAssignmentSubmissions('${a.id}')" title="Kelib tushgan javoblarni ko'rish">
                ${SVGIcons.sparkles('', 15)} <span>AI Hisobotlar (${subCount})</span>
              </button>
              <button class="btn btn-sm btn-outline-white" style="color: var(--primary); border-color: rgba(99,102,241,0.25);" onclick="App.openSubmitModal('${a.id}')" title="Sinov prompti topshirish">
                ${SVGIcons.send('', 14)} <span>Sinov</span>
              </button>
            ` : studentActionHtml}

            <!-- Vazifani o'chirish tugmasi -->
            <button class="icon-btn" style="width: 32px; height: 32px; color: var(--accent-rose); border-color: rgba(244,63,94,0.2);" onclick="App.deleteAssignment('${a.id}')" title="Vazifani o'chirish">
              ${SVGIcons.trash('', 14)}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  static renderStudentsTable(filterGroup = 'all', searchQuery = '') {
    this.renderGroupsCards();
    this.populateGroupDropdowns();

    const tbody = document.getElementById('studentsTableBody');
    if (!tbody) return;

    let students = DataStore.getUsers().filter(u => u.role !== 'teacher');
    const submissions = DataStore.getSubmissions();
    const assignments = DataStore.getAssignments();

    if (filterGroup !== 'all') {
      students = students.filter(s => (s.group || '').toLowerCase().includes(filterGroup.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      students = students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q)
      );
    }

    if (students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
            <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem;">
              Hozircha guruhda a'zolar yo'q
            </div>
            <p style="font-size: 0.88rem; max-width: 480px; margin: 0 auto 1.2rem;">
              Yangi o'quvchi yoki yordamchi ustozni guruhga qo'shish uchun quyidagi tugmani bosing.
            </p>
            <button class="btn btn-sm btn-primary" onclick="App.openModal('modalAddMember')">
              ${SVGIcons.plus('', 15)} <span>Yangi A'zo Qo'shish</span>
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = students.map(st => {
      const mySubs = submissions.filter(s => s.studentId === st.id);
      const totalHw = assignments.length;
      const completedCount = mySubs.length;
      const pendingCount = Math.max(0, totalHw - completedCount);

      let avg = 0;
      if (completedCount > 0) {
        const sum = mySubs.reduce((acc, s) => acc + (s.aiReport?.score || 0), 0);
        avg = Math.round(sum / completedCount);
      }

      let badgeClass = 'score-mid';
      if (avg >= 85) badgeClass = 'score-high';
      else if (avg < 75 && completedCount > 0) badgeClass = 'score-low';

      const roleBadge = st.role === 'assistant' 
        ? `<span class="ai-chip" style="background: var(--grad-sunset);">Yordamchi</span>`
        : `<span class="ai-chip" style="background: rgba(99,102,241,0.15); color: var(--primary);">O'quvchi</span>`;

      return `
        <tr>
          <td>
            <div class="student-row-cell">
              <div class="table-avatar">${st.avatar || 'O'}</div>
              <div>
                <div class="student-meta-name">${st.name}</div>
                <div class="student-meta-class">${st.email || ''} ${st.phone ? '• ' + st.phone : ''}</div>
              </div>
            </div>
          </td>
          <td>
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-main);">${st.group || '1-Guruh'}</span>
          </td>
          <td>
            ${roleBadge}
          </td>
          <td>
            <strong style="color: var(--accent-emerald); font-family: monospace;">${completedCount} ta</strong>
          </td>
          <td>
            <span style="color: ${pendingCount > 0 ? 'var(--accent-amber)' : 'var(--text-muted)'}; font-weight: 700; font-family: monospace;">
              ${pendingCount} ta qoldiq
            </span>
          </td>
          <td>
            ${completedCount > 0 ? `
              <span class="score-badge ${badgeClass}">
                ${SVGIcons.activity('', 14)} ${avg} ball
              </span>
            ` : `<span class="score-badge score-pending">Topshirmagan</span>`}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-sm btn-outline-white" style="color: var(--primary); padding: 0.35rem 0.65rem;" onclick="App.viewStudentProfileReport('${st.id}')" title="A'zo profilini ko'rish">
              ${SVGIcons.barChart('', 14)} <span>Tahlil</span>
            </button>
            <button class="icon-btn" style="width: 32px; height: 32px; display: inline-flex; color: var(--accent-rose); border-color: rgba(244,63,94,0.2); margin-left: 0.35rem;" onclick="App.deleteMember('${st.id}')" title="Guruhdan o'chirish">
              ${SVGIcons.trash('', 14)}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  static renderAiReportsTab(selectedAssignmentId = null) {
    const container = document.getElementById('aiReportsContent');
    if (!container) return;

    const assignments = DataStore.getAssignments();
    if (assignments.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <div style="margin-bottom: 0.8rem; display: inline-flex; padding: 1rem; border-radius: 50%; background: rgba(99,102,241,0.1); color: var(--primary);">
            ${SVGIcons.fileCode('', 36)}
          </div>
          <h3>Hozircha birorta ham vazifa yaratilmagan</h3>
          <p style="margin-bottom: 1.2rem;">AI hisobotlarini ko'rish uchun avval yangi vazifa qo'shing.</p>
          <button class="btn btn-sm btn-primary" onclick="App.openModal('modalCreateHw')">
            ${SVGIcons.plus('', 15)} <span>Yangi Vazifa Qo'shish</span>
          </button>
        </div>
      `;
      return;
    }

    const activeId = selectedAssignmentId || assignments[0].id;
    const digest = AIService.generateClassDigest(activeId);
    const submissions = DataStore.getSubmissions().filter(s => s.assignmentId === activeId);

    const selectOptions = assignments.map(a => `
      <option value="${a.id}" ${a.id === activeId ? 'selected' : ''}>
        [${a.subject}] ${a.title}
      </option>
    `).join('');

    const hasSubmissions = submissions.length > 0;

    container.innerHTML = `
      <div class="ai-report-banner">
        <div class="ai-report-banner-text">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
            <span class="ai-chip">${SVGIcons.brain('', 13)} AI Prompt Tekshiruvchisi</span>
            <span style="font-size: 0.8rem; color: var(--accent-cyan); font-weight: 700; display: inline-flex; align-items: center; gap: 0.3rem;">
              <span class="ai-pulse-dot" style="width: 7px; height: 7px;"></span> Jonli Tahlil
            </span>
          </div>
          <h3>${digest.subject}: ${digest.assignmentTitle}</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Guruh bo'yicha topshirish foizi: <strong>${digest.completionRate}%</strong> | 
            O'rtacha prompt bali: <strong style="color: var(--accent-emerald);">${hasSubmissions ? digest.avgScore + ' ball' : 'Hali ishlar yo\'q'}</strong>
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <select class="filter-select" onchange="UIRenderer.renderAiReportsTab(this.value)">
            ${selectOptions}
          </select>
          <button class="btn btn-sm btn-primary" onclick="window.print()">
            ${SVGIcons.printer('', 15)} <span>Hisobotni Chop Etish</span>
          </button>
        </div>
      </div>

      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="card-heading-row">
            <h3>${SVGIcons.alertTriangle('text-rose', 18)} Promptlarda Aniqlangan Kamchiliklar</h3>
            <span class="ai-chip" style="background: var(--grad-sunset);">Diagnostika</span>
          </div>
          <div class="mistake-list">
            ${hasSubmissions ? digest.topMistakes.map(m => `
              <div class="mistake-item">
                <div class="mistake-content">
                  <h4>${m.text}</h4>
                  <p>O'quvchilar prompt yozayotganda yo'l qo'ygan kamchilik.</p>
                </div>
                ${m.count > 0 ? `<span class="mistake-stat">${m.count} ta o'quvchida</span>` : ''}
              </div>
            `).join('') : `
              <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
                Hozircha ushbu vazifa bo'yicha hech qaysi o'quvchi prompt yubormagan. Topshiriqlar kelib tushishi bilanoq umumiy kamchiliklar shu yerda avtomatik jamlanadi.
              </div>
            `}
          </div>

          <div class="ai-recommendation-box">
            <h4>${SVGIcons.sparkles('text-cyan', 16)} Ustoz Uchun Dars Tavsiyasi:</h4>
            <p>${hasSubmissions ? digest.teacherActionPlan : 'O\'quvchilar o\'z promptlarini topshirgach, AI sinf bo\'yicha dars tavsiyasini shakllantiradi.'}</p>
          </div>
        </div>

        <div class="analytics-card">
          <div class="card-heading-row">
            <h3>${SVGIcons.users('text-cyan', 18)} Guruh O'quvchilari Holati</h3>
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">${digest.submittedCount}/${digest.totalStudents} topshirgan</span>
          </div>

          <div style="margin-bottom: 1.2rem;">
            <div style="font-size: 0.84rem; font-weight: 700; color: var(--accent-emerald); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.35rem;">
              ${SVGIcons.checkCircle('text-emerald', 15)} A'lo Yozilgan Promptlar (90+ ball):
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              ${digest.highScorers.length > 0 ? digest.highScorers.map(name => `
                <span class="ai-pill good">${SVGIcons.sparkles('', 12)} ${name}</span>
              `).join('') : '<span style="font-size: 0.8rem; color: var(--text-muted);">Hozircha yo\'q</span>'}
            </div>
          </div>

          <div style="margin-bottom: 1.2rem;">
            <div style="font-size: 0.84rem; font-weight: 700; color: var(--accent-rose); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.35rem;">
              ${SVGIcons.alertTriangle('text-rose', 15)} Yaxshilash Kerak bo'lganlar (< 75 ball):
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              ${digest.needAttention.length > 0 ? digest.needAttention.map(item => `
                <span class="ai-pill mistake">${item.name} (${item.score} b)</span>
              `).join('') : '<span style="font-size: 0.8rem; color: var(--accent-emerald);">Kamchilik aniqlanganlar yo\'q</span>'}
            </div>
          </div>

          <div>
            <div style="font-size: 0.84rem; font-weight: 700; color: var(--accent-amber); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.35rem;">
              ${SVGIcons.clock('text-amber', 15)} Topshirish Kutilayotgan O'quvchilar:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
              ${digest.pendingStudents.length > 0 ? digest.pendingStudents.map(st => `
                <span class="ai-pill neutral">${st.name}</span>
              `).join('') : '<span style="font-size: 0.8rem; color: var(--text-muted);">Guruhda o\'quvchi yo\'q yoki barchasi topshirgan</span>'}
            </div>
          </div>
        </div>
      </div>

      <div class="submissions-table-card">
        <div class="table-header-box">
          <h3 style="font-size: 1.15rem; display: flex; align-items: center; gap: 0.5rem;">
            ${SVGIcons.fileCode('text-cyan', 18)} Ushbu Vazifaga Kelib Tushgan Promptlar va AI Tahlillari
          </h3>
          <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
            Jami: ${submissions.length} ta tekshirilgan
          </span>
        </div>

        <div style="overflow-x: auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>O'quvchi & Guruh</th>
                <th>Topshirilgan Vaqt</th>
                <th>AI Bali</th>
                <th>Prompt Sifati</th>
                <th>Mustaqillik</th>
                <th style="text-align: right;">Harakat</th>
              </tr>
            </thead>
            <tbody>
              ${submissions.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    Hozircha bu vazifaga hech kim prompt yubormadi. O'quvchilar o'z yechimlarini topshirishgach, AI tekshiruvi natijalari shu yerda ko'rinadi.
                  </td>
                </tr>
              ` : submissions.map(sub => `
                <tr>
                  <td>
                    <div class="student-row-cell">
                      <div class="table-avatar">${sub.studentAvatar || 'O'}</div>
                      <div>
                        <div class="student-meta-name">${sub.studentName}</div>
                        <div class="student-meta-class">${sub.studentGroup}</div>
                      </div>
                    </div>
                  </td>
                  <td style="font-size: 0.85rem; color: var(--text-muted); font-family: monospace;">
                    ${sub.submittedAt}
                  </td>
                  <td>
                    <span class="score-badge ${sub.aiReport?.score >= 85 ? 'score-high' : (sub.aiReport?.score < 75 ? 'score-low' : 'score-mid')}">
                      ${SVGIcons.sparkles('', 13)} ${sub.aiReport?.score || 0} ball
                    </span>
                  </td>
                  <td>
                    <div style="font-size: 0.85rem; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-main); font-weight: 600;">
                      ${sub.aiReport?.status || 'Tekshirilgan'}
                    </div>
                  </td>
                  <td>
                    <span style="font-size: 0.78rem; font-weight: 700; color: var(--accent-emerald); display: inline-flex; align-items: center; gap: 0.25rem;">
                      ${SVGIcons.shieldCheck('text-emerald', 14)} ${sub.aiReport?.plagiarismRisk || '1%'}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-sm btn-outline-white" style="color: var(--primary);" onclick="App.viewSubmissionReport('${sub.id}')">
                      <span>Batafsil Hisobot ➔</span>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  static renderHeaderUser() {
    const currentUser = DataStore.getCurrentUser();
    const isTeacher = currentUser.role === 'teacher';

    const avatarElem = document.getElementById('userAvatarDisplay');
    const nameElem = document.getElementById('userNameDisplay');
    const roleElem = document.getElementById('userRoleDisplay');
    const roleSelect = document.getElementById('roleSwitcherSelect');

    if (avatarElem) avatarElem.textContent = currentUser.avatar || (isTeacher ? 'UA' : 'O');
    if (nameElem) nameElem.textContent = currentUser.name;
    if (roleElem) roleElem.textContent = isTeacher ? 'Ustoz (Admin)' : currentUser.group || 'O\'quvchi';
    if (roleSelect) roleSelect.value = currentUser.id;

    this.renderAiStatusBadge();
    this.populateGroupDropdowns();
  }

  static renderAiStatusBadge() {
    const status = AIService.getAiStatus();
    const badgeElem = document.getElementById('aiHeaderStatusBadge');
    if (!badgeElem) return;

    const dotClass = status.connected ? (status.type === 'openai' ? 'openai-active' : 'gemini-active') : 'local-active';
    badgeElem.className = `ai-status-indicator`;
    badgeElem.innerHTML = `
      <span class="ai-pulse-dot ${dotClass}"></span>
      <span>${status.badgeText}</span>
    `;
  }

  static populateGroupDropdowns() {
    const groups = DataStore.getGroups();

    // 1. Yangi a'zo modalidagi guruh tanlovi
    const memberGroupSelect = document.getElementById('newMemberGroup');
    if (memberGroupSelect) {
      const curVal = memberGroupSelect.value;
      memberGroupSelect.innerHTML = groups.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
      if (curVal && groups.some(g => g.name === curVal)) memberGroupSelect.value = curVal;
    }

    // 2. Yangi vazifa modalidagi guruh tanlovi
    const hwGroupSelect = document.getElementById('newHwTargetGroup');
    if (hwGroupSelect) {
      const curVal = hwGroupSelect.value;
      hwGroupSelect.innerHTML = `
        <option value="Barcha guruhlar">Barcha guruhlar</option>
        ${groups.map(g => `<option value="${g.name}">${g.name}</option>`).join('')}
      `;
      if (curVal) hwGroupSelect.value = curVal;
    }

    // 3. A'zolar jadvalining guruh filtri
    const filterGroupSelect = document.getElementById('groupFilterSelect');
    if (filterGroupSelect) {
      const curVal = filterGroupSelect.value;
      filterGroupSelect.innerHTML = `
        <option value="all">Barcha Guruhlar</option>
        ${groups.map(g => `<option value="${g.name}">${g.name}</option>`).join('')}
      `;
      if (curVal) filterGroupSelect.value = curVal;
    }
  }

  static renderGroupsCards() {
    const container = document.getElementById('groupCardsContainer');
    if (!container) return;

    const groups = DataStore.getGroups();
    const users = DataStore.getUsers().filter(u => u.role !== 'teacher');

    let html = groups.map(g => {
      const membersInGroup = users.filter(u => (u.group || '').toLowerCase().includes(g.name.toLowerCase()) || (u.group || '') === g.name);
      return `
        <div class="group-card">
          <div class="group-card-header">
            <div>
              <div class="group-card-title">${g.name}</div>
              <span class="ai-chip" style="background: rgba(99,102,241,0.12); color: var(--primary); font-size: 0.76rem;">
                ${SVGIcons.users('', 12)} ${membersInGroup.length} ta o'quvchi
              </span>
            </div>
            ${groups.length > 1 ? `
              <button class="icon-btn" style="width: 30px; height: 30px; color: var(--accent-rose); border-color: rgba(244,63,94,0.2);" onclick="App.deleteGroup('${g.id}')" title="Guruhni o'chirish">
                ${SVGIcons.trash('', 13)}
              </button>
            ` : ''}
          </div>

          <p class="group-card-desc">${g.description || 'AI va Prompt Engineering o\'quv guruhi'}</p>

          <div class="group-card-meta">
            <span style="display: inline-flex; align-items: center; gap: 0.35rem;">
              ${SVGIcons.clock('', 13)} ${g.schedule || 'Dars jadvali belgilanmagan'}
            </span>
          </div>

          <div class="group-card-footer">
            <button class="btn btn-sm btn-outline-white" style="color: var(--primary);" onclick="App.openAddMemberForGroup('${g.name}')">
              ${SVGIcons.plus('', 13)} <span>+ O'quvchi Qo'shish</span>
            </button>
            <button class="btn btn-sm btn-outline-white" style="color: var(--text-muted);" onclick="App.filterStudentsByGroup('${g.name}')">
              <span>Filtrlash ➔</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    html += `
      <div class="group-card" style="border: 2px dashed rgba(99,102,241,0.35); background: rgba(99,102,241,0.03); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; cursor: pointer; min-height: 180px;" onclick="App.openModal('modalCreateGroup')">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--grad-primary); color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; box-shadow: 0 4px 14px var(--primary-glow);">
          ${SVGIcons.plus('', 22)}
        </div>
        <h4 style="font-size: 1.05rem; margin-bottom: 0.3rem;">+ Yangi Guruh Yaratish</h4>
        <p style="font-size: 0.8rem; color: var(--text-muted); max-width: 220px;">
          Istalgancha yangi AI o'quv guruhlarini oching va talabalarni qabul qiling
        </p>
      </div>
    `;

    container.innerHTML = html;
  }
}
