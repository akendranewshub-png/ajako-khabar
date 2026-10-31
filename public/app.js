const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fallbackImage = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" font-size="34" text-anchor="middle" fill="#6b7280" font-family="sans-serif">आजको खबर</text></svg>');
function dateNepal(s){try{return new Date(s.replace(' ','T')+'Z').toLocaleDateString('ne-NP',{year:'numeric',month:'short',day:'numeric'})}catch{return s||''}}
function card(a){return `<article class="newscard"><a href="/news/${encodeURIComponent(a.slug)}"><img loading="lazy" src="${esc(a.image||fallbackImage)}" onerror="this.src='${fallbackImage}'" alt=""><div class="cardbody"><span class="badge">${esc(a.category)}</span><h3>${esc(a.title)}</h3><p class="summary">${esc(a.summary||'समाचारको पूरा विवरण पढ्नुहोस्।')}</p><span class="muted">${dateNepal(a.created_at)}</span></div></a></article>`}
function mini(a){return `<article class="mini"><a href="/news/${encodeURIComponent(a.slug)}"><img loading="lazy" src="${esc(a.image||fallbackImage)}" onerror="this.src='${fallbackImage}'" alt=""></a><div><span class="badge">${esc(a.category)}</span><a href="/news/${encodeURIComponent(a.slug)}"><h3>${esc(a.title)}</h3></a><span class="muted">${dateNepal(a.created_at)}</span></div></article>`}
async function init(){
 $('#year').textContent = new Date().getFullYear();
 $('#today').textContent = new Date().toLocaleDateString('ne-NP',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
 const settings = await fetch('/api/settings').then(r=>r.json()).catch(()=>({}));
 $('#siteName').textContent=settings.siteName||'आजको खबर'; $('#footName').textContent=settings.siteName||'आजको खबर';
 $('#tagline').textContent=settings.tagline||'एकेन्द्र मिडिया द्वारा सञ्चालित'; $('#footTagline').textContent=settings.tagline||'एकेन्द्र मिडिया द्वारा सञ्चालित';
 $('#breakingText').textContent=settings.breakingText||'ताजा समाचारका लागि आजको खबरसँग जोडिनुहोस्।';
 if(settings.liveUrl){$('#liveBox').hidden=false;$('#liveLink').href=settings.liveUrl;}
 const params=new URLSearchParams(location.search), category=params.get('category'), q=params.get('q')||'';
 if(category){$('#heading').textContent=category+' समाचार';}
 if(q){$('#search').value=q;$('#heading').textContent='खोजी नतिजा';}
 $('#searchForm').addEventListener('submit',e=>{e.preventDefault();const v=$('#search').value.trim();location.href='/?q='+encodeURIComponent(v)});
 const url='/api/articles?limit=40'+(category?'&category='+encodeURIComponent(category):'')+(q?'&q='+encodeURIComponent(q):'');
 const articles=await fetch(url).then(r=>r.json()).catch(()=>[]);
 const featured=$('#featured'), grid=$('#newsGrid');
 if(!articles.length){featured.innerHTML='';grid.innerHTML='<div class="empty">अहिलेसम्म प्रकाशित समाचार छैन। Admin Panel मा लगइन गरेर समाचार प्रकाशित गर्नुहोस्।</div>';return}
 const first=articles[0];
 featured.innerHTML=`<article class="featurecard"><a href="/news/${encodeURIComponent(first.slug)}"><img src="${esc(first.image||fallbackImage)}" onerror="this.src='${fallbackImage}'" alt=""><div class="featuretext"><span class="badge">${first.is_breaking?'ब्रेकिङ समाचार':esc(first.category)}</span><h2>${esc(first.title)}</h2><p class="summary">${esc(first.summary||'समाचारको पूरा विवरण पढ्नुहोस्।')}</p><span class="muted">${dateNepal(first.created_at)} · ${esc(first.author)}</span></div></a></article><div class="featurelist">${articles.slice(1,4).map(mini).join('')||'<div class="empty">थप समाचार छिट्टै।</div>'}</div>`;
 grid.innerHTML=articles.slice(4).map(card).join('')||articles.slice(0,Math.min(articles.length,6)).map(card).join('');
}
init();