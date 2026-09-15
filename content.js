(() => {
  const CLASS_HIDDEN = "xfilter-hidden";
  const state = {
    rules: [],
    hiddenCount: 0,
    overrides: new WeakSet(),
    scanning: false,
  };

  const style = document.createElement("style");
  style.textContent = `
    article.xfilter-hidden { display: none !important; }
    .xfilter-counter {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      background: rgba(0,0,0,.78); color: #fff;
      padding: 8px 14px; border-radius: 999px;
      font: 13px/1.4 system-ui, -apple-system, sans-serif;
      cursor: pointer; display: flex; align-items: center; gap: 6px;
      box-shadow: 0 2px 10px rgba(0,0,0,.4); user-select: none;
    }
    .xfilter-counter:hover { background: rgba(0,0,0,.92); }
  `;
  document.documentElement.appendChild(style);

  function matches(fields) {
    if (!state.rules.length) return false;
    for (const rule of state.rules) {
      if (rule.startsWith("r:")) {
        try {
          if (new RegExp(rule.slice(2), "i").test(fields.all)) return true;
        } catch {}
      } else if (rule.startsWith("u:")) {
        if (fields.name.toLowerCase().includes(rule.slice(2).toLowerCase())) return true;
      } else if (rule.startsWith("t:")) {
        if (fields.text.toLowerCase().includes(rule.slice(2).toLowerCase())) return true;
      } else if (fields.all.toLowerCase().includes(rule.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  function clean(s) {
    return (s || "").replace(/[ \t]+/g, " ").trim();
  }

  function articleFields(article) {
    const textNode = article.querySelector('[data-testid="tweetText"]');
    const nameNode = article.querySelector('[data-testid="User-Name"]');
    let text = clean(textNode ? textNode.innerText || textNode.textContent : "");
    if (!text) {
      const fallback = article.querySelector('div[dir="auto"]');
      text = clean(fallback ? fallback.innerText || fallback.textContent : "");
    }
    if (!text) text = clean(article.innerText);
    const name = clean(nameNode ? nameNode.innerText || nameNode.textContent : "");
    return { text, name, all: text + " " + name };
  }

  function allArticles() {
    return Array.from(document.querySelectorAll("article"));
  }

  function hideArticle(article) {
    if (article.classList.contains(CLASS_HIDDEN)) return;
    article.classList.add(CLASS_HIDDEN);
    state.hiddenCount++;
    updateCounter();
  }

  function scan(article) {
    if (state.overrides.has(article)) return;
    if (matches(articleFields(article))) hideArticle(article);
  }

  function rescan() {
    let count = 0;
    for (const a of allArticles()) {
      if (state.overrides.has(a)) continue;
      const hit = matches(articleFields(a));
      if (hit && !a.classList.contains(CLASS_HIDDEN)) {
        a.classList.add(CLASS_HIDDEN);
        count++;
      } else if (!hit && a.classList.contains(CLASS_HIDDEN)) {
        a.classList.remove(CLASS_HIDDEN);
        if (state.hiddenCount > 0) state.hiddenCount--;
      }
    }
    state.hiddenCount += count;
    updateCounter();
  }

  let counter = null;
  let counterHideTimer = null;
  function ensureCounter() {
    if (counter) return counter;
    counter = document.createElement("div");
    counter.className = "xfilter-counter";
    counter.title = "点击恢复全部已屏蔽的帖子";
    counter.addEventListener("click", () => {
      document.querySelectorAll("article." + CLASS_HIDDEN).forEach((a) => {
        a.classList.remove(CLASS_HIDDEN);
        state.overrides.add(a);
        if (state.hiddenCount > 0) state.hiddenCount--;
      });
      updateCounter();
    });
    document.documentElement.appendChild(counter);
    return counter;
  }

  function updateCounter() {
    const c = ensureCounter();
    const msg = `已屏蔽 ${state.hiddenCount} 条`;
    c.textContent = state.hiddenCount
      ? msg
      : `${msg} · 规则 ${state.rules.length} 条 · 检测到 ${allArticles().length} 个帖子`;
    c.style.display = "flex";
    clearTimeout(counterHideTimer);
    if (!state.hiddenCount) {
      counterHideTimer = setTimeout(() => {
        if (!state.hiddenCount) c.style.display = "none";
      }, 4000);
    }
  }

  const observer = new MutationObserver((mutations) => {
    if (state.scanning) return;
    state.scanning = true;
    requestAnimationFrame(() => {
      state.scanning = false;
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches && node.matches("article")) scan(node);
          else if (node.querySelectorAll) {
            node.querySelectorAll("article").forEach(scan);
          }
        }
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.rules) {
      state.rules = (changes.rules.newValue || []).map((r) => String(r).trim()).filter(Boolean);
      rescan();
    }
  });

  chrome.storage.local.get({ rules: [] }).then((data) => {
    state.rules = (data.rules || []).map((r) => String(r).trim()).filter(Boolean);
    console.log("[XFilter] 已加载规则:", state.rules);
    rescan();
  });
})();
