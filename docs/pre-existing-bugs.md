# Pre-existing Bugs

Bugs identified during code review of the Options API → Composition API migration (June 2026).
All were present before the migration and carried over unchanged.

---

## 1. ForecastView: store object aliased directly into local ref

**File:** `client/src/components/forecast/ForecastView.vue`

`onMounted` assigns `input.value = forecastStore.params.input` and `strategy.value = forecastStore.params.strategy`, making the local refs point to the same objects held by the store. Every subsequent `v-model` mutation on income/expenses/networth/etc. writes directly into store state, bypassing `updateForecastParams`.

**Fix:** shallow-clone on restore:
```ts
input.value = { ...forecastStore.params.input };
strategy.value = { ...forecastStore.params.strategy };
```

---

## 2. ForecastView: `timeunit` unconditionally overwritten after store restore

**File:** `client/src/components/forecast/ForecastView.vue`

After restoring from the store, `input.value.timeunit = LocalDate.now().year()` always resets `timeunit` to the current year. Because of bug #1, this also mutates the store object directly, so the persisted `timeunit` is silently discarded on every page open.

**Fix:** remove the unconditional overwrite, or only apply it when no stored value exists:
```ts
if (!forecastStore.params) {
  input.value.timeunit = LocalDate.now().year();
}
```

---

## 3. NewAssetEditor: `error.response.data` accessed without null check

**File:** `client/src/components/NewAssetEditor.vue`

The axios `.catch` handler accesses `error.response.data` directly. On network-level failures (timeout, CORS, offline), `error.response` is `undefined`, causing a `TypeError` inside the catch block. The error notification is never shown.

**Fix:**
```ts
.catch(error => qnotify.error(error.response?.data ?? error.message));
```

---

## 4. NewAssetEditor: `adding` ref is never set to `true`

**File:** `client/src/components/NewAssetEditor.vue`

`adding = ref(false)` is used in the button's loading slot to toggle between two spinners, but `addAsset()` never sets `adding.value = true` before the POST or resets it in `.finally()`. The loading indicator never activates, giving no visual feedback during the async request and allowing duplicate submissions.

**Fix:** toggle `adding` around the axios call:
```ts
function addAsset() {
  const str = assetGainstrack.value;
  if (str) {
    adding.value = true;
    axios.post('/api/post/asset', { str })
      .then(response => {
        qnotify.success(response.data);
        emit('ok', generatedAsset.value);
      })
      .catch(error => qnotify.error(error.response?.data ?? error.message))
      .finally(() => { adding.value = false; });
  }
}
```

---

## 5. AssetDb: double Firestore read and spurious navigation on every mount

**File:** `client/src/pages/AssetDb.vue`

`refresh()` both calls `applyQuery()` directly and sets `params.value`, which triggers `watch(params)` → debounced `doPreview()` → `onSearch()` → `router.push()` → `watch(route)` → another `refresh()`. This produces two Firestore reads on every cold mount (one immediate, one after the 1-second debounce) and adds a spurious entry to browser history when no `args` query param is present.

**Fix:** skip the params watch during the initial `refresh()` load (e.g. a boolean guard), or remove the direct `applyQuery()` call from `refresh()` and let the params watcher be the sole trigger.
