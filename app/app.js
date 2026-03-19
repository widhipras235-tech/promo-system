let idx
let store = {}

const searchInput = document.getElementById("search")
const resultEl = document.getElementById("result")
const statusEl = document.getElementById("status")

async function init() {
  statusEl.innerText = "Loading..."

  const [idxRes, storeRes] = await Promise.all([
    fetch("./db/search_index.json"),
    fetch("./db/search_store.json")
  ])

  const idxData = await idxRes.json()
  const storeData = await storeRes.json()

  idx = lunr.Index.load(idxData)

  storeData.forEach(d => {
    store[d.id] = d
  })

  statusEl.innerText = "Siap digunakan ⚡"
}

init()

function searchData(q) {
  if (!q) return []
  try {
    return idx.search(q + "*")
  } catch {
    return []
  }
}