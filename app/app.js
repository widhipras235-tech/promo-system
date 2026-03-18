let DB=[]

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

/* =========================
LOAD DATABASE AUTO
========================= */

async function loadDatabase(){

result.innerHTML="Memuat database..."

try{

let i=1
let all=[]

while(true){

try{
let res=await fetch(`../db/promo_${i}.json`)
if(!res.ok) break

let data=await res.json()
all=all.concat(data)

i++

}catch(e){
break
}

}

DB=all

console.log("TOTAL DATA:",DB.length)

result.innerHTML=""

}catch(e){

console.error(e)
result.innerHTML="Database gagal dimuat"

}

}

window.onload=loadDatabase


/* =========================
FORMAT (MINIMAL)
========================= */

function rupiah(n){

if(!n) return ""

let num=Number(String(n).replace(/[^\d]/g,""))

if(!num) return n

return "Rp "+num.toLocaleString("id-ID")

}


/* =========================
SEARCH (FULL FLEXIBLE)
========================= */

function search(q){

q=String(q).toLowerCase().trim()

if(!q) return []

return DB.filter(item=>

Object.values(item).some(val =>
String(val).toLowerCase().includes(q)
)

)

}


/* =========================
EVENT SEARCH
========================= */

searchInput.addEventListener("input",function(){

let data=search(this.value)

render(data.slice(0,100))

})


/* =========================
RENDER RAW (APA ADANYA)
========================= */

function render(data){

if(data.length===0){

result.innerHTML="Data tidak ditemukan"
return

}

let html=""

data.forEach(item=>{

let rows=""

/* tampilkan semua field tanpa filter */
for(let key in item){

let val=item[key]

/* format harga jika terdeteksi angka */
if(
key.toLowerCase().includes("harga") ||
key.toLowerCase().includes("price")
){
val=rupiah(val)
}

rows+=`
<div class="row">
<span class="label">${key}</span>
<span class="value">${val||"-"}</span>
</div>
`
}

/* CARD */
html+=`

<div class="card">

${rows}

</div>

`

})

result.innerHTML=html

}