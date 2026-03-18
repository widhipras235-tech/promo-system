let DB = [];

// LOAD DATABASE
async function loadDB(){
  const res = await fetch("index-db.json");
  DB = await res.json();
}

// FORMAT RUPIAH
function formatRupiah(angka){
  if(!angka) return "-";
  return Number(angka).toLocaleString("id-ID");
}

// RENDER ITEM
function renderItem(item){

  let hasPromoPrice = item.harga_promo && item.harga_promo != item.harga_normal;
  let hasDiskon = item.diskon && item.diskon !== "";

  return `
  <div class="card">

    <div class="title">
      ${item.deskripsi || "-"}
    </div>

    <div class="content">

      ${item.brand ? `<div><b>Brand:</b> ${item.brand}</div>` : ""}
      ${item.sku ? `<div><b>SKU:</b> ${item.sku}</div>` : ""}
      ${item.article ? `<div><b>Article:</b> ${item.article}</div>` : ""}

      <!-- HARGA -->
      <div class="price">

        ${hasPromoPrice 
        ? `
          <div class="price-normal" style="text-decoration:line-through;color:#888;">
            Rp ${formatRupiah(item.harga_normal)}
          </div>
          <div class="price-promo" style="color:green;font-weight:bold;">
            Rp ${formatRupiah(item.harga_promo)}
          </div>
        `
        : `
          <div class="price-normal" style="font-weight:bold;">
            Rp ${formatRupiah(item.harga_normal)}
          </div>
        `
        }

      </div>

      ${hasDiskon ? `<div style="color:green;"><b>Diskon:</b> ${item.diskon}</div>` : ""}

      ${item.divisi ? `<div><b>Divisi:</b> ${item.divisi}</div>` : ""}

      ${(item.from_date || item.to_date) 
        ? `<div><b>Berlaku:</b> ${item.from_date || "-"} s/d ${item.to_date || "-"}</div>` 
        : ""
      }

      ${item.file ? `<div><b>Sumber:</b> ${item.file}</div>` : ""}
      ${item.sheet ? `<div><b>Sheet:</b> ${item.sheet}</div>` : ""}

    </div>

  </div>
  `;
}

// SEARCH FUNCTION
function searchData(keyword){

  keyword = keyword.toLowerCase();

  const result = DB.filter(item =>
    (item.deskripsi && item.deskripsi.toLowerCase().includes(keyword)) ||
    (item.sku && item.sku.toString().includes(keyword)) ||
    (item.article && item.article.toLowerCase().includes(keyword))
  );

  renderResult(result);
}

// RENDER RESULT
function renderResult(data){

  const container = document.getElementById("result");

  if(data.length === 0){
    container.innerHTML = `<p style="text-align:center;">Data tidak ditemukan</p>`;
    return;
  }

  container.innerHTML = data.map(item => renderItem(item)).join("");
}

// INIT
loadDB();

// EVENT SEARCH (INPUT)
document.getElementById("search").addEventListener("input", function(){
  searchData(this.value);
});