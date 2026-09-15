const area = document.getElementById("rules");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

async function load() {
  const data = await chrome.storage.local.get({ rules: [] });
  area.value = (data.rules || []).join("\n");
}

async function save() {
  const lines = area.value.split(/\r?\n/).map((l) => l.trim());
  const rules = lines.filter((l) => l && !l.startsWith("#"));
  await chrome.storage.local.set({ rules });
  status.textContent = `已保存，${rules.length} 条规则生效`;
  status.classList.add("show");
  clearTimeout(save._t);
  save._t = setTimeout(() => status.classList.remove("show"), 2500);
}

saveBtn.addEventListener("click", save);
load();
