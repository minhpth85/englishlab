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

  function paint(btn, phraseId) {
    const saved = !!load()[itemId(phraseId)];
    btn.className =
      "w-full mb-4 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border " +
      (saved
        ? "bg-[#317345] text-white border-[#317345] hover:bg-[#22482b]"
        : "bg-[#EBF6EE] text-[#317345] border-[#84968a] hover:bg-[#d8efdf]");
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
      const p = phrasesData[phraseId];
      data[id] = {
        id: id,
        file: currentFile(),
        lesson: lessonTitle(),
        phraseId: phraseId,
        phrase: p.phrase,
        type: p.type,
        ipa: p.ipa,
        vi: p.vietnamese,
        en: p.english,
        sample: p.sample,
        status: "review",
        savedAt: Date.now()
      };
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
