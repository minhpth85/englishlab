/* Danh sách chunk muốn ôn, lưu trong localStorage của trình duyệt.
   Dùng chung cho các trang bài học và trang chunks.html. */
(function () {
  const KEY = "6me-chunks-v1";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function currentFile() {
    return decodeURIComponent(location.pathname.split("/").pop() || "");
  }

  window.ChunkList = { KEY, load, save };

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

  refreshSaved();

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
