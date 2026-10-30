// Facebook Unfollow Helper: best-effort UI automation only.
// It does not access Facebook APIs, credentials, or private data.
if (!window.__fbUnfollowHelperInstalled) {
  window.__fbUnfollowHelperInstalled = true;
  let shouldStop = false;
  let running = false;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const norm = s => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== "hidden" && st.display !== "none";
  }

  function label(el) {
    return norm([
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.innerText,
      el.textContent
    ].filter(Boolean).join(" "));
  }

  function getCandidates() {
    const nodes = [...document.querySelectorAll('button, [role="button"], a[role="button"]')]
      .filter(visible);
    // Match only likely current-following states; avoid generic "Follow" buttons.
    return nodes.filter(el => {
      const t = label(el);
      return /^(following|followed|unfollow|unfollow page|unfollow group|following page|following group)$/.test(t)
        || /\bunfollow\b/.test(t)
        || /\bfollowing\b/.test(t);
    }).filter(el => {
      const t = label(el);
      // Avoid clicking a button that merely offers to follow someone.
      return !/^follow(\s|$)/.test(t) && !/\bfollow back\b/.test(t);
    });
  }

  function setStatus(text) {
    let box = document.getElementById("__fb_unfollow_helper_status");
    if (!box) {
      box = document.createElement("div");
      box.id = "__fb_unfollow_helper_status";
      Object.assign(box.style, {
        position: "fixed", zIndex: "2147483647", right: "18px", bottom: "18px",
        background: "#1c1e21", color: "#fff", padding: "12px 14px",
        borderRadius: "10px", font: "13px Arial,sans-serif", maxWidth: "320px",
        boxShadow: "0 3px 14px rgba(0,0,0,.3)"
      });
      document.body.appendChild(box);
    }
    box.textContent = text;
  }

  async function scan() {
    const candidates = getCandidates();
    setStatus(`Found ${candidates.length} possible following/unfollow controls on this page. Check the list before starting.`);
    return {message: `Found ${candidates.length} possible controls on this page. Scroll/load more items and scan again if needed.`};
  }

  async function start() {
    if (running) return {message: "Already running. Use Stop to cancel."};
    shouldStop = false;
    running = true;
    let count = 0;
    try {
      while (!shouldStop) {
        const candidates = getCandidates();
        const next = candidates.find(el => {
          if (el.dataset.fbUnfollowHelperClicked === "1") return false;
          return true;
        });
        if (!next) break;
        next.dataset.fbUnfollowHelperClicked = "1";
        next.scrollIntoView({block: "center", behavior: "instant"});
        await sleep(350);
        if (shouldStop) break;
        next.click();
        count++;
        setStatus(`Clicked ${count} possible unfollow control(s). Stop anytime. Keep this tab open.`);
        // Give Facebook time to update its interface; avoid rapid repeated clicks.
        await sleep(1400);
        if (count >= 100) {
          setStatus(`Paused after ${count} clicks as a safety limit. Run again after reviewing the page.`);
          break;
        }
      }
      if (shouldStop) setStatus(`Stopped. Clicked ${count} possible control(s).`);
      else setStatus(`Finished this page. Clicked ${count} possible control(s). Review results before running on another list.`);
      return {message: `Finished or stopped after ${count} click(s). Check the Facebook page.`};
    } finally {
      running = false;
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "scan") {
      scan().then(sendResponse);
      return true;
    }
    if (msg.action === "start") {
      start().then(sendResponse);
      return true;
    }
    if (msg.action === "stop") {
      shouldStop = true;
      setStatus("Stopping after the current action…");
      sendResponse({message: "Stop requested."});
    }
  });
}