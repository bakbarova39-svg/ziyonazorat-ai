/**
 * ZiyoNazorat AI - Supabase Bulut Baza Integratsiyasi
 * Real-time PostgreSQL, Row Level Security va avtomatlashtirilgan sinxronlash
 */

const SUPABASE_STORAGE_KEYS = {
  URL: 'ziyo_supabase_url_v1',
  ANON_KEY: 'ziyo_supabase_anon_key_v1',
  LAST_SYNC: 'ziyo_supabase_last_sync_v1'
};

const SupabaseService = {
  client: null,
  isConnected: false,
  isSyncing: false,
  channel: null,

  getConfig() {
    return {
      url: (localStorage.getItem(SUPABASE_STORAGE_KEYS.URL) || '').trim(),
      key: (localStorage.getItem(SUPABASE_STORAGE_KEYS.ANON_KEY) || '').trim(),
      lastSync: localStorage.getItem(SUPABASE_STORAGE_KEYS.LAST_SYNC) || null
    };
  },

  async init() {
    const { url, key } = this.getConfig();
    if (url && key && window.supabase) {
      try {
        this.client = window.supabase.createClient(url, key, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        const ok = await this.testConnection();
        if (ok) {
          this.isConnected = true;
          this.setupRealtime();
          // Orqa fonda bulutdagi so'nggi ma'lumotlarni tekshirib olish
          this.pullFromCloud(true);
        }
      } catch (err) {
        console.warn('Supabase init warning:', err);
        this.isConnected = false;
      }
    }
    this.updateStatusUI();
  },

  async testConnection() {
    if (!this.client) return false;
    try {
      const { data, error } = await this.client.from('groups').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        if (error.message && error.message.includes('relation "public.groups" does not exist')) {
          console.warn('Supabase ulandi, ammo jadvallar hali yaratilmagan');
          return true;
        }
        console.error('Supabase test error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Supabase connection failed:', err);
      return false;
    }
  },

  async saveConfig(url, key) {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    const cleanKey = (key || '').trim().replace(/^['"]|['"]$/g, '');

    if (!cleanUrl || !cleanKey) {
      this.disconnect();
      return { 
        success: false, 
        message: 'URL yoki Anon kalit kiritilmadi. Mahalliy rejimda ish davom etadi.' 
      };
    }

    if (!cleanUrl.startsWith('https://')) {
      return { 
        success: false, 
        message: 'Supabase URL "https://" bilan boshlanishi kerak (Masalan: https://xyz.supabase.co)' 
      };
    }

    try {
      if (!window.supabase) {
        throw new Error("Supabase kutubxonasi brauzerda yuklanmadi. Internet aloqasini tekshiring.");
      }

      const client = window.supabase.createClient(cleanUrl, cleanKey);
      const { error } = await client.from('groups').select('id').limit(1);

      let extraTip = '';
      if (error && error.message && error.message.includes('relation "public.groups" does not exist')) {
        extraTip = " Eslatma: Supabase SQL Editor bo'limida 'supabase_schema.sql' skriptini ishga tushirishingiz zarur!";
      }

      localStorage.setItem(SUPABASE_STORAGE_KEYS.URL, cleanUrl);
      localStorage.setItem(SUPABASE_STORAGE_KEYS.ANON_KEY, cleanKey);
      this.client = client;
      this.isConnected = true;

      this.setupRealtime();
      this.updateStatusUI();

      // Bulutdan yuklab olish
      await this.pullFromCloud(true);

      return {
        success: true,
        message: 'Supabase bulut bazasiga muvaffaqiyatli ulandi!' + extraTip
      };
    } catch (err) {
      console.error('Supabase save error:', err);
      return {
        success: false,
        message: "Ulanishda xatolik: " + (err.message || "Kalit yoki URL noto'g'ri")
      };
    }
  },

  disconnect() {
    localStorage.removeItem(SUPABASE_STORAGE_KEYS.URL);
    localStorage.removeItem(SUPABASE_STORAGE_KEYS.ANON_KEY);
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
    this.client = null;
    this.isConnected = false;
    this.updateStatusUI();
  },

  updateStatusUI() {
    // 1. Headerdagi indikator
    const headerBadge = document.getElementById('supabaseHeaderStatusBadge');
    if (headerBadge) {
      if (this.isConnected) {
        headerBadge.className = 'supabase-status-indicator connected';
        headerBadge.innerHTML = `
          <span class="ai-pulse-dot" style="background: #10b981; box-shadow: 0 0 10px #10b981;"></span>
          <span>Supabase: Bulutda</span>
        `;
      } else {
        headerBadge.className = 'supabase-status-indicator disconnected';
        headerBadge.innerHTML = `
          <span class="ai-pulse-dot" style="background: #94a3b8;"></span>
          <span>Supabase: Mahalliy</span>
        `;
      }
    }

    // 2. Sozlamalardagi holat
    const settingsStatus = document.getElementById('supabaseSettingsStatus');
    if (settingsStatus) {
      if (this.isConnected) {
        settingsStatus.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; color: #10b981; font-weight: 700;">
            <span class="ai-pulse-dot" style="background: #10b981;"></span>
            <span>Faol va Ulangan (Real-time Cloud)</span>
          </div>
        `;
      } else {
        settingsStatus.innerHTML = `
          <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-muted); font-weight: 600;">
            <span class="ai-pulse-dot" style="background: #94a3b8;"></span>
            <span>Ulanmagan (Mahalliy localStorage)</span>
          </div>
        `;
      }
    }

    // 3. So'nggi sinxronlash vaqti
    const lastSyncEl = document.getElementById('supabaseLastSyncDisplay');
    if (lastSyncEl) {
      const cfg = this.getConfig();
      lastSyncEl.textContent = cfg.lastSync ? `So'nggi sinxron: ${cfg.lastSync}` : 'Hali sinxronlanmagan';
    }

    // 4. Inputlarni sinxronlash
    const cfg = this.getConfig();
    ['settingsSupabaseUrlInput', 'modalSupabaseUrlInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el && (!el.value || el.value !== cfg.url)) el.value = cfg.url;
    });
    ['settingsSupabaseKeyInput', 'modalSupabaseKeyInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el && (!el.value || el.value !== cfg.key)) el.value = cfg.key;
    });
  },

  setupRealtime() {
    if (!this.client || this.channel) return;
    try {
      this.channel = this.client
        .channel('ziyo-realtime-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => this.pullFromCloud(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => this.pullFromCloud(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => this.pullFromCloud(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => this.pullFromCloud(true))
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  },

  async pullFromCloud(silent = false) {
    if (!this.client || !this.isConnected || this.isSyncing) return false;
    this.isSyncing = true;
    try {
      const [groupsRes, usersRes, assignmentsRes, submissionsRes] = await Promise.all([
        this.client.from('groups').select('*'),
        this.client.from('users').select('*'),
        this.client.from('assignments').select('*'),
        this.client.from('submissions').select('*')
      ]);

      let changed = false;

      if (!groupsRes.error && Array.isArray(groupsRes.data) && groupsRes.data.length > 0) {
        const mappedGroups = groupsRes.data.map(g => ({
          id: g.id,
          name: g.name,
          description: g.description || '',
          schedule: g.schedule || '',
          createdAt: g.created_at || ''
        }));
        DataStore.saveGroups(mappedGroups);
        changed = true;
      }

      if (!usersRes.error && Array.isArray(usersRes.data) && usersRes.data.length > 0) {
        const mappedUsers = usersRes.data.map(u => ({
          id: u.id,
          name: u.name,
          role: u.role || 'student',
          title: u.title || '',
          email: u.email || '',
          phone: u.phone || '',
          group: u.group_name || '',
          avatar: u.avatar || 'US',
          joinedAt: u.joined_at || '',
          subjects: u.subjects || []
        }));
        DataStore.saveUsers(mappedUsers);
        changed = true;
      }

      if (!assignmentsRes.error && Array.isArray(assignmentsRes.data) && assignmentsRes.data.length > 0) {
        const mappedAssignments = assignmentsRes.data.map(a => ({
          id: a.id,
          subject: a.subject,
          subjectBadgeClass: a.subject_badge_class || 'badge-role',
          targetGroup: a.target_group || 'Barcha guruhlar',
          title: a.title,
          description: a.description,
          deadline: a.deadline || '',
          deadlineDisplay: a.deadline_display || '',
          maxScore: a.max_score || 100,
          difficulty: a.difficulty || "Boshlang'ich",
          criteria: a.criteria || '',
          sampleSolution: a.sample_solution || '',
          createdAt: a.created_at || ''
        }));
        DataStore.saveAssignments(mappedAssignments);
        changed = true;
      }

      if (!submissionsRes.error && Array.isArray(submissionsRes.data)) {
        const mappedSubmissions = submissionsRes.data.map(s => ({
          id: s.id,
          assignmentId: s.assignment_id,
          studentId: s.student_id,
          studentName: s.student_name,
          studentAvatar: s.student_avatar || 'AI',
          studentGroup: s.student_group || '',
          submittedAt: s.submitted_at || '',
          answerText: s.answer_text,
          attachedFile: s.attached_file,
          externalLink: s.external_link,
          status: s.status || 'graded',
          aiReport: s.ai_report || {},
          teacherNote: s.teacher_note || '',
          teacherApproved: s.teacher_approved ?? true
        }));
        DataStore.saveSubmissions(mappedSubmissions);
        changed = true;
      }

      const now = new Date().toLocaleTimeString('uz-UZ');
      localStorage.setItem(SUPABASE_STORAGE_KEYS.LAST_SYNC, now);
      this.updateStatusUI();

      if (changed && window.App) {
        window.App.populateRoleSwitcher();
        window.App.refreshAll();
      }

      if (!silent && window.UIRenderer) {
        window.UIRenderer.showToast("Supabase bulutidan so'nggi ma'lumotlar yuklandi!", 'success');
      }
      return true;
    } catch (err) {
      console.error('Supabase pull error:', err);
      if (!silent && window.UIRenderer) {
        window.UIRenderer.showToast('Yuklab olishda xatolik: ' + err.message, 'warning');
      }
      return false;
    } finally {
      this.isSyncing = false;
    }
  },

  async pushToCloud() {
    if (!this.client || !this.isConnected) {
      throw new Error("Supabase ulanmagan. Avval URL va Anon kalitni kiritib ulaning.");
    }

    const groups = DataStore.getGroups().map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      schedule: g.schedule,
      created_at: g.createdAt || new Date().toISOString()
    }));

    const users = DataStore.getUsers().map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      title: u.title,
      email: u.email,
      phone: u.phone,
      group_name: u.group,
      avatar: u.avatar,
      joined_at: u.joinedAt,
      subjects: u.subjects || []
    }));

    const assignments = DataStore.getAssignments().map(a => ({
      id: a.id,
      subject: a.subject,
      subject_badge_class: a.subjectBadgeClass,
      target_group: a.targetGroup,
      title: a.title,
      description: a.description,
      deadline: a.deadline,
      deadline_display: a.deadlineDisplay,
      max_score: a.maxScore,
      difficulty: a.difficulty,
      criteria: a.criteria,
      sample_solution: a.sampleSolution,
      created_at: a.createdAt || new Date().toISOString()
    }));

    const submissions = DataStore.getSubmissions().map(s => ({
      id: s.id,
      assignment_id: s.assignmentId,
      student_id: s.studentId,
      student_name: s.studentName,
      student_avatar: s.studentAvatar,
      student_group: s.studentGroup,
      submitted_at: s.submittedAt,
      answer_text: s.answerText,
      attached_file: s.attachedFile,
      external_link: s.externalLink,
      status: s.status,
      ai_report: s.aiReport,
      teacher_note: s.teacherNote,
      teacher_approved: s.teacherApproved
    }));

    const results = await Promise.all([
      groups.length ? this.client.from('groups').upsert(groups, { onConflict: 'id' }) : { error: null },
      users.length ? this.client.from('users').upsert(users, { onConflict: 'id' }) : { error: null },
      assignments.length ? this.client.from('assignments').upsert(assignments, { onConflict: 'id' }) : { error: null },
      submissions.length ? this.client.from('submissions').upsert(submissions, { onConflict: 'id' }) : { error: null }
    ]);

    const errors = results.map(r => r.error).filter(Boolean);
    if (errors.length > 0) {
      throw new Error(errors[0].message);
    }

    const now = new Date().toLocaleTimeString('uz-UZ');
    localStorage.setItem(SUPABASE_STORAGE_KEYS.LAST_SYNC, now);
    this.updateStatusUI();
    return true;
  },

  // Orqa fonda bajariladigan individual amallar
  async upsertGroup(g) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.from('groups').upsert({
        id: g.id,
        name: g.name,
        description: g.description,
        schedule: g.schedule,
        created_at: g.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Supabase upsertGroup error:', e); }
  },

  async deleteGroup(id) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.from('groups').delete().eq('id', id);
    } catch (e) { console.warn('Supabase deleteGroup error:', e); }
  },

  async upsertUser(u) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.from('users').upsert({
        id: u.id,
        name: u.name,
        role: u.role,
        title: u.title,
        email: u.email,
        phone: u.phone,
        group_name: u.group,
        avatar: u.avatar,
        joined_at: u.joinedAt,
        subjects: u.subjects || []
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Supabase upsertUser error:', e); }
  },

  async deleteUser(id) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.from('users').delete().eq('id', id);
    } catch (e) { console.warn('Supabase deleteUser error:', e); }
  },

  async upsertAssignment(a) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.from('assignments').upsert({
        id: a.id,
        subject: a.subject,
        subject_badge_class: a.subjectBadgeClass,
        target_group: a.targetGroup,
        title: a.title,
        description: a.description,
        deadline: a.deadline,
        deadline_display: a.deadlineDisplay,
        max_score: a.maxScore,
        difficulty: a.difficulty,
        criteria: a.criteria,
        sample_solution: a.sampleSolution,
        created_at: a.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Supabase upsertAssignment error:', e); }
  },

  async deleteAssignment(id) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.from('assignments').delete().eq('id', id);
    } catch (e) { console.warn('Supabase deleteAssignment error:', e); }
  },

  async upsertSubmission(s) {
    if (!this.client || !this.isConnected) return;
    try {
      await this.client.from('submissions').upsert({
        id: s.id,
        assignment_id: s.assignmentId,
        student_id: s.studentId,
        student_name: s.studentName,
        student_avatar: s.studentAvatar,
        student_group: s.studentGroup,
        submitted_at: s.submittedAt,
        answer_text: s.answerText,
        attached_file: s.attachedFile,
        external_link: s.externalLink,
        status: s.status,
        ai_report: s.aiReport,
        teacher_note: s.teacherNote,
        teacher_approved: s.teacherApproved
      }, { onConflict: 'id' });
    } catch (e) { console.warn('Supabase upsertSubmission error:', e); }
  }
};

