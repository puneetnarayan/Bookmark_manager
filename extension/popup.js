const NEW_COLLECTION_VALUE = "__new__";

const unconfiguredEl = document.getElementById("unconfigured");
const mainEl = document.getElementById("main");
const tabCountEl = document.getElementById("tabCount");
const spaceSelect = document.getElementById("space");
const collectionSelect = document.getElementById("collection");
const newCollectionInput = document.getElementById("newCollectionName");
const saveButton = document.getElementById("save");
const statusEl = document.getElementById("status");

let config = null;
let collectionsBySpace = new Map();

function setStatus(message, variant) {
  statusEl.textContent = message || "";
  statusEl.className = variant || "";
}

function getScope() {
  return document.querySelector('input[name="scope"]:checked').value;
}

async function getTabsForScope(scope) {
  if (scope === "current") {
    return chrome.tabs.query({ active: true, currentWindow: true });
  }
  if (scope === "selected") {
    return chrome.tabs.query({ currentWindow: true, highlighted: true });
  }
  return chrome.tabs.query({ currentWindow: true });
}

function httpUrlsFrom(tabs) {
  return tabs.map((t) => t.url).filter((url) => url && /^https?:\/\//i.test(url));
}

async function refreshTabCount() {
  const tabs = await getTabsForScope(getScope());
  const urls = httpUrlsFrom(tabs);
  tabCountEl.textContent = `${urls.length} tab(s) will be saved`;
}

function renderCollectionsForSpace(spaceId) {
  const options = collectionsBySpace.get(spaceId) || [];
  collectionSelect.innerHTML = "";
  for (const c of options) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    collectionSelect.appendChild(opt);
  }
  const newOpt = document.createElement("option");
  newOpt.value = NEW_COLLECTION_VALUE;
  newOpt.textContent = "+ New collection…";
  collectionSelect.appendChild(newOpt);

  newCollectionInput.hidden = collectionSelect.value !== NEW_COLLECTION_VALUE;
}

async function init() {
  config = await getConfig();
  if (!config.appUrl) {
    unconfiguredEl.hidden = false;
    document.getElementById("openOptions").addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  mainEl.hidden = false;

  try {
    const [{ spaces }, { collections }] = await Promise.all([
      apiFetch(config, "/api/spaces"),
      apiFetch(config, "/api/collections"),
    ]);

    const activeSpaces = spaces.filter((s) => !s.deletedAt && !s.archived);
    spaceSelect.innerHTML = "";
    for (const s of activeSpaces) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      spaceSelect.appendChild(opt);
    }

    collectionsBySpace = new Map();
    for (const c of collections.filter((c) => !c.deletedAt && !c.archived)) {
      const list = collectionsBySpace.get(c.spaceId) || [];
      list.push(c);
      collectionsBySpace.set(c.spaceId, list);
    }

    if (activeSpaces.length === 0) {
      setStatus("Create a Space in your workspace app first.", "error");
      saveButton.disabled = true;
      return;
    }

    renderCollectionsForSpace(spaceSelect.value);
    await refreshTabCount();
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Could not load your Spaces/Collections.", "error");
    saveButton.disabled = true;
  }
}

spaceSelect.addEventListener("change", () => renderCollectionsForSpace(spaceSelect.value));
collectionSelect.addEventListener("change", () => {
  newCollectionInput.hidden = collectionSelect.value !== NEW_COLLECTION_VALUE;
});
document.querySelectorAll('input[name="scope"]').forEach((el) => el.addEventListener("change", refreshTabCount));

saveButton.addEventListener("click", async () => {
  setStatus("");
  const tabs = await getTabsForScope(getScope());
  const urls = httpUrlsFrom(tabs);

  if (urls.length === 0) {
    setStatus("No savable tabs in this selection.", "error");
    return;
  }
  if (!spaceSelect.value) {
    setStatus("Choose a Space.", "error");
    return;
  }

  const isNewCollection = collectionSelect.value === NEW_COLLECTION_VALUE;
  if (isNewCollection && !newCollectionInput.value.trim()) {
    setStatus("Name the new collection.", "error");
    return;
  }

  saveButton.disabled = true;
  setStatus("Saving…");
  try {
    const result = await apiFetch(config, "/api/sessions/save", {
      method: "POST",
      body: JSON.stringify({
        spaceId: spaceSelect.value,
        collectionId: isNewCollection ? undefined : collectionSelect.value,
        newCollectionName: isNewCollection ? newCollectionInput.value.trim() : undefined,
        urls,
      }),
    });
    setStatus(`Saved ${result.savedCount} tab(s).`, "success");
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Could not save tabs.", "error");
  } finally {
    saveButton.disabled = false;
  }
});

init();
