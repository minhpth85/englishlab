/* Danh sách chunk muốn ôn.
   - Bản đệm nằm trong localStorage của trình duyệt (để giao diện đọc nhanh).
   - Bản chính nằm trên server theo tài khoản Gmail, qua /api/chunks.
   Dùng chung cho các trang bài học và trang chunks.html. */
(function () {
  const KEY = "6me-chunks-v1";
  const BASE_KEY = "6me-chunks-base";         // bản đã đồng bộ với server, dùng để tính phần thay đổi
  const DIRTY_KEY = "6me-chunks-dirty";       // "1" = còn thay đổi chưa gửi lên server
  const MIGRATED_KEY = "6me-chunks-migrated"; // "1" = đã đồng bộ lần đầu với tài khoản
  const REMOTE = "/api/chunks";

  function parse(raw) {
    try {
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }
  const load = () => parse(localStorage.getItem(KEY));
  const base = () => parse(localStorage.getItem(BASE_KEY));

  // Phần khác nhau giữa bản đã đồng bộ (old) và bản hiện tại (cur)
  function diff(old, cur) {
    const upsert = {};
    const remove = [];
    Object.keys(cur).forEach((id) => {
      if (JSON.stringify(old[id]) !== JSON.stringify(cur[id])) upsert[id] = cur[id];
    });
    Object.keys(old).forEach((id) => {
      if (!(id in cur)) remove.push(id);
    });
    return { upsert, remove };
  }

  // Ghi đệm trên máy, rồi gửi phần thay đổi lên tài khoản
  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
    pushRemote();
  }

  // Gửi lần lượt để các thay đổi không ghi đè lên nhau
  let chain = Promise.resolve();
  function pushRemote() {
    localStorage.setItem(DIRTY_KEY, "1");
    chain = chain
      .then(async () => {
        const cur = load();
        const { upsert, remove } = diff(base(), cur);
        if (!Object.keys(upsert).length && !remove.length) {
          localStorage.removeItem(DIRTY_KEY);
          return true;
        }
        const res = await fetch(REMOTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ upsert, remove })
        });
        if (!res.ok) return false;
        localStorage.setItem(BASE_KEY, JSON.stringify(cur));
        if (JSON.stringify(load()) === JSON.stringify(cur)) localStorage.removeItem(DIRTY_KEY);
        return true;
      })
      .catch(() => false);
    return chain;
  }

  async function fetchRemote() {
    const res = await fetch(REMOTE);
    return res.ok ? res.json() : null;
  }

  // Đồng bộ với tài khoản: đẩy thay đổi trên máy lên (nếu có), rồi lấy bản mới nhất từ server.
  // Chưa đăng nhập thì giữ nguyên dữ liệu trên máy.
  async function sync() {
    let remote;
    try {
      remote = await fetchRemote();
    } catch (e) {
      return false;
    }
    if (!remote) return false;

    if (localStorage.getItem(MIGRATED_KEY) !== "1" && Object.keys(load()).length) {
      // Lần đầu dùng tài khoản: đưa toàn bộ dữ liệu cũ trên máy lên
      localStorage.setItem(DIRTY_KEY, "1");
    }

    if (localStorage.getItem(DIRTY_KEY) === "1") {
      if (!(await pushRemote())) return false; // chưa gửi được: giữ dữ liệu trên máy
      try {
        remote = await fetchRemote();
      } catch (e) {
        return false;
      }
      if (!remote) return false;
    }

    localStorage.setItem(KEY, JSON.stringify(remote));
    localStorage.setItem(BASE_KEY, JSON.stringify(remote));
    localStorage.setItem(MIGRATED_KEY, "1");
    window.dispatchEvent(new Event("chunklist:synced"));
    return true;
  }

  function currentFile() {
    return decodeURIComponent(location.pathname.split("/").pop() || "");
  }

  window.ChunkList = { KEY, load, save, sync };

  const ready = sync();

  // Phần dưới chỉ chạy trên trang bài học (có phrasesData và selectPhrase)
  if (typeof phrasesData === "undefined" || typeof selectPhrase !== "function") return;

  const BTN_ID = "chunkSaveBtn";

  const lessonTitle = () =>
    (document.querySelector("h1") && document.querySelector("h1").textContent.trim()) || document.title;

  const itemId = (phraseId) => currentFile() + "|" + phraseId;

  // Toàn bộ thông tin của một chunk, dùng cho thẻ flashcard trên trang chunks
  function snapshot(phraseId) {
    const p = phrasesData[phraseId];
    return {
      phrase: p.phrase,
      type: p.type,
      level: p.level || "",
      ipa: p.ipa,
      vi: p.vietnamese,
      en: p.english,
      structures: p.structures || [],
      pronunciation: p.pronunciation || "",
      sample: p.sample,
      speakingTip: p.speakingTip || "",
      daily: p.daily || null
    };
  }

  // Cập nhật các chunk đã lưu từ bài này (để thẻ có đủ thông tin mới nhất)
  function refreshSaved() {
    const data = load();
    let changed = false;
    Object.values(data).forEach((item) => {
      if (item.file !== currentFile() || !phrasesData[item.phraseId]) return;
      Object.assign(item, snapshot(item.phraseId), { lesson: lessonTitle() });
      changed = true;
    });
    if (changed) save(data);
  }

  // Dùng style inline thay vì class Tailwind: bài mới theo template không tải Tailwind
  function paint(btn, phraseId) {
    const saved = !!load()[itemId(phraseId)];
    const base =
      "width:100%;margin-bottom:16px;padding:8px 12px;border-radius:12px;border:1.5px solid;" +
      "display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;" +
      "font:600 13px/20px 'Work Sans',system-ui,-apple-system,'Segoe UI',sans-serif;";
    btn.removeAttribute("class");
    btn.style.cssText = base + (saved
      ? "background:#317345;color:#fff;border-color:#317345;"
      : "background:#EBF6EE;color:#317345;border-color:#84968a;");
    btn.innerHTML = saved
      ? '<i class="fa-solid fa-check"></i> Đã lưu để ôn (bấm để bỏ)'
      : '<i class="fa-solid fa-bookmark"></i> Lưu để ôn';
  }

  function toggle(btn) {
    const phraseId = btn.dataset.phraseId;
    const data = load();
    const id = itemId(phraseId);

    if (data[id]) {
      delete data[id];
    } else {
      data[id] = Object.assign(
        { id: id, file: currentFile(), lesson: lessonTitle(), phraseId: phraseId, status: "review", savedAt: Date.now() },
        snapshot(phraseId)
      );
    }
    save(data);
    paint(btn, phraseId);
  }

  function render(phraseId) {
    if (!phrasesData[phraseId]) return;
    const container = document.getElementById("phraseDetailContent");
    if (!container) return;

    let btn = document.getElementById(BTN_ID);
    if (!btn) {
      btn = document.createElement("button");
      btn.id = BTN_ID;
      btn.type = "button";
      // Đặt ngay sau phần tiêu đề (phần tử đầu tiên là header của cụm từ)
      container.insertBefore(btn, container.children[1] || null);
      btn.addEventListener("click", () => toggle(btn));
    }
    btn.dataset.phraseId = phraseId;
    paint(btn, phraseId);
  }

  // Khi đồng bộ xong, vẽ lại nút theo dữ liệu mới nhất
  window.addEventListener("chunklist:synced", () => {
    const btn = document.getElementById(BTN_ID);
    if (btn && btn.dataset.phraseId) paint(btn, btn.dataset.phraseId);
  });

  // Chỉ cập nhật dữ liệu bài sau khi đã đồng bộ với tài khoản, tránh ghi đè bản trên server bằng bản cũ
  ready.then(refreshSaved);

  // Bọc selectPhrase để mỗi lần đổi cụm từ, nút được cập nhật theo
  const originalSelect = window.selectPhrase;
  window.selectPhrase = function (phraseId) {
    originalSelect(phraseId);
    render(phraseId);
  };

  // Cụm đầu tiên được chọn trước khi script này chạy
  if (currentActivePhraseId) render(currentActivePhraseId);

  // Mở từ trang chunks.html: bài.html?phrase=id
  const requested = new URLSearchParams(location.search).get("phrase");
  if (requested && phrasesData[requested]) {
    window.selectPhrase(requested);
  }
})();
