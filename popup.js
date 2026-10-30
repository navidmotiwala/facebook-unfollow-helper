const statusEl = document.getElementById("status");
async function activeTab() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  return tab;
}
document.getElementById("open").addEventListener("click", async () => {
  await chrome.tabs.create({url: "https://www.facebook.com/settings/?tab=following"});
  statusEl.textContent = "Opened Facebook settings. If this is not the following list, open Feed Preferences manually.";
});
async function runAction(action) {
  const tab = await activeTab();
  if (!tab || !tab.url || !tab.url.startsWith("https://www.facebook.com/")) {
    statusEl.textContent = "Open facebook.com first, then try again.";
    return;
  }
  try {
    const result = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      files: ["content.js"]
    });
    const response = await chrome.tabs.sendMessage(tab.id, {action});
    statusEl.textContent = response?.message || "Command sent.";
  } catch (e) {
    statusEl.textContent = "Could not run here. Refresh the Facebook tab and try again.";
  }
}
document.getElementById("scan").addEventListener("click", () => runAction("scan"));
document.getElementById("start").addEventListener("click", () => {
  if (confirm("This will click visible unfollow controls on the current Facebook page. Continue?")) runAction("start");
});
document.getElementById("stop").addEventListener("click", () => runAction("stop"));