const appUrlInput = document.getElementById("appUrl");
const accessTokenInput = document.getElementById("accessToken");
const statusEl = document.getElementById("status");
const saveButton = document.getElementById("save");

async function load() {
  const config = await getConfig();
  appUrlInput.value = config.appUrl || "";
  accessTokenInput.value = config.accessToken || "";
}

function setStatus(message, variant) {
  statusEl.textContent = message;
  statusEl.className = variant || "";
}

saveButton.addEventListener("click", async () => {
  const appUrl = normalizeAppUrl(appUrlInput.value);
  const accessToken = accessTokenInput.value.trim();

  if (!appUrl) {
    setStatus("Enter your workspace app's URL first.", "error");
    return;
  }

  saveButton.disabled = true;
  setStatus("Requesting permission…");

  try {
    const pattern = originPatternFor(appUrl);
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) {
      setStatus("Permission was not granted — the extension can't reach your app without it.", "error");
      return;
    }

    await setConfig({ appUrl, accessToken });

    // Verify the connection actually works before declaring success.
    await apiFetch({ appUrl, accessToken }, "/api/github/status");
    setStatus("Saved — connected successfully.", "success");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Could not verify the connection.", "error");
  } finally {
    saveButton.disabled = false;
  }
});

load();
