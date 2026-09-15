const kw = document.getElementById("kw");
const addBtn = document.getElementById("add");
const openBtn = document.getElementById("open");
const msg = document.getElementById("msg");

function flash(text) {
  msg.textContent = text;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => (msg.textContent = ""), 2000);
}

async function addKeyword() {
  const word = kw.value.trim();
  if (!word) return;
  const data = await chrome.storage.local.get({ rules: [] });
  const rules = data.rules || [];
  if (!rules.includes(word)) {
    rules.push(word);
    await chrome.storage.local.set({ rules });
    flash(`已添加："${word}"`);
  } else {
    flash("该词已在屏蔽列表中");
  }
  kw.value = "";
}

addBtn.addEventListener("click", addKeyword);
kw.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addKeyword();
});
openBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
