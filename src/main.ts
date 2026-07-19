import { createClient } from '@supabase/supabase-js';
import { Database } from './types/supabase';
import Sortable from 'sortablejs';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env.VITE_SUPABASE_PROJECT_ID ? `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co` : '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabaseの環境変数が設定されていません');
}

const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM elements
const authSection = document.getElementById('auth-section')!;
const taskSection = document.getElementById('task-section')!;
const userInfo = document.getElementById('user-info')!;
const authEmail = document.getElementById('auth-email') as HTMLInputElement;
const authPassword = document.getElementById('auth-password') as HTMLInputElement;

const taskList = document.getElementById('task-list')!;
const taskForm = document.getElementById('task-form')!;

// Date navigation elements
const btnPrevDay = document.getElementById('btn-prev-day')!;
const btnNextDay = document.getElementById('btn-next-day')!;
const btnCalendar = document.getElementById('btn-calendar')!;
const currentDateDisplay = document.getElementById('current-date-display')!;
const datePicker = document.getElementById('date-picker') as HTMLInputElement;

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskLog = Database['public']['Tables']['task_logs']['Row'];

interface TaskWithLogs extends Task {
  task_logs: TaskLog[];
}

let currentTasks: TaskWithLogs[] = [];
let currentUser: any = null;
let defaultSectionGroupId: number | null = null;
let selectedDate = new Date(); // Default is today

// Helper: Format Date to YYYY-MM-DD
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: Update Date Display
function updateDateDisplay() {
  currentDateDisplay.textContent = selectedDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
  datePicker.value = formatDate(selectedDate);
}

// Helper: Parse time inputs like "0123", "01:23", "01:23:45" to local timestamp ISO
function parseTimeInput(val: string, dateStr: string): string | null {
  if (!val) return null;
  let hh: string, mm: string, ss = '00';

  if (val.includes(':')) {
    const parts = val.split(':');
    hh = parts[0].padStart(2, '0');
    mm = (parts[1] || '0').padStart(2, '0');
    if (parts[2]) ss = parts[2].padStart(2, '0');
  } else {
    const digits = val.replace(/\D/g, '');
    if (digits.length === 4) {
      hh = digits.substring(0, 2);
      mm = digits.substring(2, 4);
    } else if (digits.length === 6) {
      hh = digits.substring(0, 2);
      mm = digits.substring(2, 4);
      ss = digits.substring(4, 6);
    } else {
      return null;
    }
  }

  const h = parseInt(hh, 10);
  const m = parseInt(mm, 10);
  const s = parseInt(ss, 10);
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;

  // Combine with date and timezone to ISO
  const localIso = `${dateStr}T${hh}:${mm}:${ss}+09:00`;
  return new Date(localIso).toISOString();
}

// Helper: ISO back to HH:mm:ss format
function formatTimeForInput(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo'
  });
}

// ==========================================
// 1. Authentication and Synchronization
// ==========================================

async function ensureUserRecord(userId: string, email: string) {
  const { data: existing } = await client
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await client
      .from('users')
      .insert({
        id: userId,
        email: email,
        password_hash: 'managed-by-supabase-auth'
      });
    if (error) {
      console.error('Failed to create user record in public.users:', error);
    }
  }
}

async function ensureDefaultSectionGroup(userId: string): Promise<number | null> {
  const { data: existing } = await client
    .from('section_groups')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Create default section group
  const { data: inserted, error } = await client
    .from('section_groups')
    .insert({
      user_id: userId,
      name: 'Default Section Group',
      is_default: true
    })
    .select('id')
    .maybeSingle();

  if (error || !inserted) {
    console.error('Failed to create default section group:', error);
    // fallback to any section group if exists
    const { data: fallbackSg } = await client
      .from('section_groups')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    return fallbackSg ? fallbackSg.id : null;
  }

  return inserted.id;
}

async function updateUI(session: any) {
  if (session) {
    currentUser = session.user;
    (authSection as HTMLElement).style.display = 'none';
    (taskSection as HTMLElement).style.display = 'block';
    const logoutBtn = document.getElementById('btn-logout')!;
    logoutBtn.style.display = 'block';
    userInfo.textContent = `${currentUser.email} でログイン中`;

    // Ensure both users table and section_groups default records exist
    await ensureUserRecord(currentUser.id, currentUser.email || '');
    const sgId = await ensureDefaultSectionGroup(currentUser.id);
    defaultSectionGroupId = sgId;

    fetchTasks();
  } else {
    currentUser = null;
    defaultSectionGroupId = null;
    (authSection as HTMLElement).style.display = 'block';
    (taskSection as HTMLElement).style.display = 'none';
    const logoutBtn = document.getElementById('btn-logout')!;
    logoutBtn.style.display = 'none';
    taskList.innerHTML = '';
    userInfo.textContent = '';
  }
}

async function checkSession() {
  const { data: { session } } = await client.auth.getSession();
  updateUI(session);
}
checkSession();

client.auth.onAuthStateChange((_event: any, session: any) => {
  updateUI(session);
});

document.getElementById('btn-signup')!.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) return alert('メールアドレスとパスワードを入力してください');

  const { data, error } = await client.auth.signUp({ email, password });
  if (error) {
    alert('新規登録エラー: ' + error.message);
  } else {
    alert('登録成功！ログインします。');
    if (data?.user) {
      await ensureUserRecord(data.user.id, email);
    }
  }
});

document.getElementById('btn-login')!.addEventListener('click', async () => {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  if (!email || !password) return alert('メールアドレスとパスワードを入力してください');

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    alert('ログインエラー: ' + error.message);
  }
});

document.getElementById('btn-logout')!.addEventListener('click', async () => {
  await client.auth.signOut();
});

// ==========================================
// 日付ナビゲーションのイベント
// ==========================================

btnPrevDay.addEventListener('click', () => {
  selectedDate.setDate(selectedDate.getDate() - 1);
  fetchTasks();
});

btnNextDay.addEventListener('click', () => {
  selectedDate.setDate(selectedDate.getDate() + 1);
  fetchTasks();
});

btnCalendar.addEventListener('click', () => {
  if (typeof (datePicker as any).showPicker === 'function') {
    (datePicker as any).showPicker();
  } else {
    datePicker.focus();
    datePicker.click();
  }
});

datePicker.addEventListener('change', (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.value) {
    const [year, month, day] = target.value.split('-').map(Number);
    selectedDate = new Date(year, month - 1, day);
    fetchTasks();
  }
});

// ==========================================
// 2. タスク管理・CRUD関連
// ==========================================

async function fetchTasks() {
  if (!currentUser) return;

  updateDateDisplay();

  const { data: tasks, error } = await client
    .from('tasks')
    .select('*, task_logs(*)')
    .eq('target_date', formatDate(selectedDate))
    .order('sort_order', { ascending: true });

  if (error) return console.error('取得エラー:', error);

  currentTasks = (tasks || []) as TaskWithLogs[];
  taskList.innerHTML = '';

  currentTasks.forEach(task => {
    const li = document.createElement('li');
    li.dataset.id = String(task.id);

    // Apply class according to state
    li.className = `task-item task-${task.status}`;

    // Compute start_time and end_time from logs
    let start_time_iso: string | null = null;
    let end_time_iso: string | null = null;

    if (task.task_logs && task.task_logs.length > 0) {
      const sortedLogs = [...task.task_logs].sort((a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      );
      start_time_iso = sortedLogs[0].started_at;
      // Get ended_at of the last completed log, or if the last log is still running, it is null
      const lastLog = sortedLogs[sortedLogs.length - 1];
      end_time_iso = lastLog.ended_at;
    }

    let btnHtml = '';
    if (task.status === 'unstarted') {
      btnHtml = `<button class="task-btn start-btn" data-action="start"><i class="fas fa-play"></i></button>`;
    } else if (task.status === 'started') {
      btnHtml = `<button class="task-btn end-btn" data-action="end"><i class="fas fa-stop"></i></button>`;
    } else {
      btnHtml = `
        <div class="task-btn-container">
          <button class="task-btn completed-btn"><i class="fas fa-check"></i></button>
          <button class="task-btn duplicate-btn" data-action="duplicate"><i class="fas fa-rotate-left"></i></button>
        </div>
      `;
    }

    const startTimeVal = formatTimeForInput(start_time_iso);
    const endTimeVal = formatTimeForInput(end_time_iso);

    li.innerHTML = `
      ${btnHtml}
      <div class="task-content">
        <input type="text" class="inline-edit-title" value="">
        <div class="task-times">
          <input type="text" class="inline-edit-time start-time-input" placeholder="開始" value="${startTimeVal}">
          <span class="time-separator">~</span>
          <input type="text" class="inline-edit-time end-time-input" placeholder="終了" value="${endTimeVal}">
        </div>
      </div>
      <button class="edit-btn" data-action="edit"><i class="fas fa-edit"></i></button>
    `;

    const titleInput = li.querySelector('.inline-edit-title') as HTMLInputElement;
    titleInput.value = task.title;
    titleInput.addEventListener('blur', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const newVal = target.value.trim();
      if (newVal !== task.title && newVal !== "") {
        updateTaskInline(task.id, { title: newVal });
      } else {
        target.value = task.title;
      }
    });
    titleInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    });

    const startInput = li.querySelector('.start-time-input') as HTMLInputElement;
    startInput.addEventListener('blur', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const val = target.value.trim();

      if (val === "") {
        // Clear all logs for this task and set to unstarted
        await client.from('task_logs').delete().eq('task_id', task.id);
        await client.from('tasks').update({ status: 'unstarted' }).eq('id', task.id);
        fetchTasks();
        return;
      }

      const iso = parseTimeInput(val, task.target_date);
      if (!iso) {
        alert('時間の形式が正しくありません (例: 0123, 01:23, 01:23:45)');
        target.value = startTimeVal;
        return;
      }

      // Upsert start time
      if (task.task_logs && task.task_logs.length > 0) {
        const sortedLogs = [...task.task_logs].sort((a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        );
        const earliest = sortedLogs[0];
        await client.from('task_logs').update({ started_at: iso }).eq('id', earliest.id);
      } else {
        await client.from('task_logs').insert({
          task_id: task.id,
          started_at: iso
        });
        await client.from('tasks').update({ status: 'started' }).eq('id', task.id);
      }
      fetchTasks();
    });
    startInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    });

    const endInput = li.querySelector('.end-time-input') as HTMLInputElement;
    endInput.addEventListener('blur', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const val = target.value.trim();

      if (val === "") {
        // Clear ending time of latest log
        if (task.task_logs && task.task_logs.length > 0) {
          const sortedLogs = [...task.task_logs].sort((a, b) =>
            new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
          );
          const latest = sortedLogs[sortedLogs.length - 1];
          await client.from('task_logs').update({ ended_at: null, actual_duration: null }).eq('id', latest.id);
          await client.from('tasks').update({ status: 'started' }).eq('id', task.id);
        }
        fetchTasks();
        return;
      }

      const iso = parseTimeInput(val, task.target_date);
      if (!iso) {
        alert('時間の形式が正しくありません (例: 0123, 01:23, 01:23:45)');
        target.value = endTimeVal;
        return;
      }

      if (task.task_logs && task.task_logs.length > 0) {
        const sortedLogs = [...task.task_logs].sort((a, b) =>
          new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
        );
        const latest = sortedLogs[sortedLogs.length - 1];

        // Calculate duration in minutes
        const diffMs = new Date(iso).getTime() - new Date(latest.started_at).getTime();
        const durationMin = Math.max(0, Math.round(diffMs / (1000 * 60)));

        await client.from('task_logs').update({
          ended_at: iso,
          actual_duration: durationMin
        }).eq('id', latest.id);
        await client.from('tasks').update({ status: 'completed' }).eq('id', task.id);
      } else {
        // If no log exists, we insert a completed log where started_at is 1 hour before
        const startIso = new Date(new Date(iso).getTime() - 60 * 60 * 1000).toISOString();
        await client.from('task_logs').insert({
          task_id: task.id,
          started_at: startIso,
          ended_at: iso,
          actual_duration: 60
        });
        await client.from('tasks').update({ status: 'completed' }).eq('id', task.id);
      }
      fetchTasks();
    });
    endInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    });

    taskList.appendChild(li);
  });
}

// Event Delegation for task actions
taskList.addEventListener('click', (e: Event) => {
  const target = e.target as HTMLElement;
  const button = target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  if (!action) return;

  const li = button.closest('li');
  const taskIdStr = li?.dataset.id;
  if (!taskIdStr) return;
  const taskId = parseInt(taskIdStr, 10);

  switch (action) {
    case 'start':
      startTask(taskId);
      break;
    case 'end':
      endTask(taskId);
      break;
    case 'duplicate':
      duplicateTask(taskId);
      break;
    case 'edit':
      openEditModal(taskId);
      break;
  }
});

taskForm.addEventListener('submit', async (e: Event) => {
  e.preventDefault();
  const titleInput = document.getElementById('task-title') as HTMLInputElement;
  if (!titleInput.value.trim() || !currentUser || !defaultSectionGroupId) return;

  // Compute next sort_order
  const nextOrder = currentTasks.length > 0 ? Math.max(...currentTasks.map(t => t.sort_order)) + 1 : 0;

  await client.from('tasks').insert([{
    user_id: currentUser.id,
    title: titleInput.value.trim(),
    target_date: formatDate(selectedDate),
    section_group_id: defaultSectionGroupId,
    sort_order: nextOrder,
    status: 'unstarted'
  }]);

  titleInput.value = '';
  fetchTasks();
});

async function startTask(id: number) {
  const nowStr = new Date().toISOString();
  await client.from('task_logs').insert({
    task_id: id,
    started_at: nowStr
  });
  await client.from('tasks').update({ status: 'started' }).eq('id', id);
  fetchTasks();
}

async function endTask(id: number) {
  const task = currentTasks.find(t => t.id === id);
  if (!task) return;

  const nowStr = new Date().toISOString();

  // Find active log (where ended_at is null)
  const activeLog = task.task_logs?.find(log => !log.ended_at);
  if (activeLog) {
    const diffMs = new Date(nowStr).getTime() - new Date(activeLog.started_at).getTime();
    const durationMin = Math.max(0, Math.round(diffMs / (1000 * 60)));

    await client.from('task_logs').update({
      ended_at: nowStr,
      actual_duration: durationMin
    }).eq('id', activeLog.id);
  }

  await client.from('tasks').update({ status: 'completed' }).eq('id', id);
  fetchTasks();
}

async function updateTaskInline(id: number, updates: Partial<Task>) {
  const { error } = await client.from('tasks').update(updates).eq('id', id);
  if (error) {
    console.error('更新エラー:', error);
    alert('更新に失敗しました');
  }
  fetchTasks();
}

async function duplicateTask(id: number) {
  const task = currentTasks.find(t => t.id === id);
  if (!task || !currentUser) return;

  const nextOrder = currentTasks.length > 0 ? Math.max(...currentTasks.map(t => t.sort_order)) + 1 : 0;

  await client.from('tasks').insert([{
    user_id: currentUser.id,
    title: task.title,
    target_date: formatDate(selectedDate),
    section_group_id: task.section_group_id,
    section_id: task.section_id,
    project_id: task.project_id,
    routine_id: task.routine_id,
    estimated_duration: task.estimated_duration,
    sort_order: nextOrder,
    status: 'unstarted',
    memo: task.memo,
    is_planned: task.is_planned,
    satisfaction_rating: task.satisfaction_rating,
    skip_reason: task.skip_reason
  }]);
  fetchTasks();
}

// ==========================================
// 3. Edit Modal Handlers
// ==========================================

const editModal = document.getElementById('edit-modal')!;
const editTaskForm = document.getElementById('edit-task-form')!;

function openEditModal(id: number) {
  const task = currentTasks.find(t => t.id === id);
  if (!task) return;

  (document.getElementById('edit-id') as HTMLInputElement).value = String(task.id);
  (document.getElementById('edit-title') as HTMLInputElement).value = task.title;
  (document.getElementById('edit-scheduled-at') as HTMLInputElement).value = task.target_date || '';
  (document.getElementById('edit-note') as HTMLTextAreaElement).value = task.memo || '';
  (document.getElementById('edit-estimated-duration') as HTMLInputElement).value = String(task.estimated_duration || 0);
  (document.getElementById('edit-status') as HTMLSelectElement).value = task.status || 'unstarted';
  (document.getElementById('edit-is-planned') as HTMLSelectElement).value = String(task.is_planned);
  (document.getElementById('edit-skip-reason') as HTMLInputElement).value = task.skip_reason || '';
  (document.getElementById('edit-satisfaction-rating') as HTMLSelectElement).value = task.satisfaction_rating ? String(task.satisfaction_rating) : '';

  (document.getElementById('edit-project-id') as HTMLInputElement).value = task.project_id ? String(task.project_id) : '';
  (document.getElementById('edit-mode-id') as HTMLInputElement).value = '';
  (document.getElementById('edit-tag-ids') as HTMLInputElement).value = '';
  (document.getElementById('edit-routine-id') as HTMLInputElement).value = task.routine_id ? String(task.routine_id) : '';

  document.getElementById('display-created-at')!.textContent = task.created_at ? new Date(task.created_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '-';
  document.getElementById('display-updated-at')!.textContent = '-';

  (editModal as HTMLElement).style.display = 'flex';
}

const closeEditModal = () => {
  (editModal as HTMLElement).style.display = 'none';
};

document.querySelectorAll('.btn-cancel').forEach(btn => {
  btn.addEventListener('click', closeEditModal);
});

editTaskForm.addEventListener('submit', async (e: Event) => {
  e.preventDefault();
  const idStr = (document.getElementById('edit-id') as HTMLInputElement).value;
  if (!idStr) return;
  const id = parseInt(idStr, 10);

  const satisfactionVal = (document.getElementById('edit-satisfaction-rating') as HTMLSelectElement).value;

  const updates = {
    title: (document.getElementById('edit-title') as HTMLInputElement).value.trim(),
    target_date: (document.getElementById('edit-scheduled-at') as HTMLInputElement).value,
    memo: (document.getElementById('edit-note') as HTMLTextAreaElement).value.trim() || null,
    estimated_duration: parseInt((document.getElementById('edit-estimated-duration') as HTMLInputElement).value, 10) || 0,
    status: (document.getElementById('edit-status') as HTMLSelectElement).value,
    is_planned: (document.getElementById('edit-is-planned') as HTMLSelectElement).value === 'true',
    skip_reason: (document.getElementById('edit-skip-reason') as HTMLInputElement).value.trim() || null,
    satisfaction_rating: satisfactionVal ? parseInt(satisfactionVal, 10) : null
  };

  const { error } = await client.from('tasks').update(updates).eq('id', id);
  if (error) {
    alert('更新エラー: ' + error.message);
  } else {
    closeEditModal();
    fetchTasks();
  }
});

// Delete Task button inside modal
const btnDeleteTask = document.getElementById('btn-delete-task')!;
btnDeleteTask.addEventListener('click', async () => {
  const idStr = (document.getElementById('edit-id') as HTMLInputElement).value;
  if (!idStr) return;
  const id = parseInt(idStr, 10);

  if (confirm('このタスクを削除しますか？')) {
    // Delete logs first as they reference task_id
    await client.from('task_logs').delete().eq('task_id', id);
    const { error } = await client.from('tasks').delete().eq('id', id);
    if (error) {
      alert('削除エラー: ' + error.message);
    } else {
      closeEditModal();
      fetchTasks();
    }
  }
});

window.addEventListener('click', (e: MouseEvent) => {
  if (e.target === editModal) {
    closeEditModal();
  }
});

// ==========================================
// 4. Drag & Drop Sorting with SortableJS
// ==========================================

new Sortable(taskList, {
  animation: 150,
  ghostClass: 'sortable-ghost',
  onEnd: async () => {
    const items = [...taskList.children] as HTMLElement[];

    // Perform serial updates or promise updates for sort_order
    const updates = items.map((item, index) => {
      const idStr = item.dataset.id;
      if (!idStr) return Promise.resolve();
      const id = parseInt(idStr, 10);
      return client.from('tasks').update({ sort_order: index }).eq('id', id);
    });

    await Promise.all(updates);
    fetchTasks();
  }
});
