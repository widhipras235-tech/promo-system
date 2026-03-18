let DB=[]
let SKU_INDEX={}
let ARTICLE_INDEX={}

const result=document.getElementById("result")
const searchInput=document.getElementById("search")

/* =========================
LOAD DATABASE + INDEX
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

/* BUILD INDEX (AMAN) */
DB.forEach((item,i)=>{

let sku=String(item.sku||"").toLowerCase()
let art=String(item.article||"").toLowerCase()

if(sku){
if(!SKU_INDEX[sku]) SKU_INDEX[sku]=[]
SKU_INDEX[sku].push(i)
}

if(art){
if(!ARTICLE_INDEX[art]) ARTICLE_INDEX[art]=[]
ARTICLE_INDEX[art].push(i)
}

})

console.log("TOTAL DATA:",DB.length)

result.innerHTML=""

}catch(e){

console.error(e)
result.innerHTML="Database gagal dimuat"

}

}

window.onload=loadDatabase


/* =========================
FORMAT RUPIAH
========================= */

function rupiah(n){

if(!n) return ""

let num=Number(String(n).replace(/[^\d]/g,""))

if(!num) return n

return "Rp "+num.toLocaleString("id-ID")

}


/* =========================
PARSE DATE
========================= */

function parseDate(v){

if(!v) return null

let str=String(v).trim()

if(str.includes("/")){
let p=str.split("/")
return new Date(p[2],p[1]-1,p[0])
}

if(str.includes("-")){
let p=str.split("-")

if(p[0].length==4)
return new Date(p[0],p[1]-1,p[2])

return new Date(p[2],p[1]-1,p[0])
}

let d=new Date(str)
if(!isNaN(d)) return d

return null

}


/* =========================
STATUS
========================= */

function getStatus(item){

if(!item.berlaku) return ""

let p=item.berlaku.split("-")
if(p.length<2) return ""

let start=parseDate(p[0])
let end=parseDate(p[1])

if(!start||!end) return ""

let today=new Date()

today.setHours(0,0,0,0)
start.setHours(0,0,0,0)
end.setHours(23,59,59,999)

if(today<start) return "BELUM AKTIF"
if(today>end) return "BERAKHIR"

return "AKTIF"

}


/* =========================
SEARCH V13 (INDEX + FALLBACK)
========================= */

function search(q){

q=String(q).toLowerCase().trim()

if(!q) return []

/* 1. SKU EXACT */
if(SKU_INDEX[q]){
return SKU_INDEX[q].map(i=>DB[i])
}

/* 2. ARTICLE EXACT */
if(ARTICLE_INDEX[q]){
return ARTICLE_INDEX[q].map(i=>DB[i])
}

/* 3. FALLBACK KE DB */
return DB.filter(item=>

String(item.sku||"").toLowerCase().includes(q) ||

String(item.article||"").toLowerCase().includes(q) ||

String(item.deskripsi||"").toLowerCase().includes(q) ||

String(item.brand||"").toLowerCase().includes(q)

)

}


/* =========================
EVENT SEARCH
========================= */

searchInput.addEventListener("input",function(){

let data=search(this.value)

render(data