(function(){
  "use strict";
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const root=document.documentElement,forced=new URLSearchParams(location.search).get("theme"),saved=forced||localStorage.getItem("flowsd-theme");
  if(saved==="dark"||(!saved&&matchMedia("(prefers-color-scheme: dark)").matches))root.classList.add("dark");
  if(saved==="light")root.classList.remove("dark");
  $("#theme-toggle")?.addEventListener("click",()=>{root.classList.toggle("dark");localStorage.setItem("flowsd-theme",root.classList.contains("dark")?"dark":"light")});

  const links=$$(".toc a"),sections=links.map(a=>$(a.hash)).filter(Boolean),progress=$("#progress");
  function scrollState(){const h=document.documentElement,max=h.scrollHeight-h.clientHeight;if(progress)progress.style.width=`${max?h.scrollTop/max*100:0}%`;let active=sections[0];sections.forEach(s=>{if(s.offsetTop<=h.scrollTop+145)active=s});links.forEach(a=>a.classList.toggle("active",active&&a.hash===`#${active.id}`))}
  addEventListener("scroll",scrollState,{passive:true});addEventListener("resize",scrollState);scrollState();

  const eta=$("#eta-slider"),beta=$("#beta-slider"),gate=$("#gate-toggle"),rows=$$(".mass-row");
  function updateMass(){if(!eta||!beta||!gate)return;const e=+eta.value,b=+beta.value,gated=gate.checked,zh=document.body.dataset.lang==="zh";$("#eta-value").textContent=e.toFixed(1);$("#beta-value").textContent=b.toFixed(1);const weights=rows.map(r=>{const ref=+r.dataset.ref,a=+r.dataset.a,g=+r.dataset.g;return ref*Math.exp(e*a+b*g*(gated?Math.sign(a):1))}),z=weights.reduce((x,y)=>x+y,0);rows.forEach((r,i)=>{const p=weights[i]/z;r.querySelector(":scope > span i").style.width=`${p*100}%`;r.querySelector("output").textContent=`${(p*100).toFixed(1)}%`});const failure=weights.reduce((s,w,i)=>s+(+rows[i].dataset.a<0?w:0),0)/z;if(zh){$("#gate-readout").innerHTML=gated?`被拒绝回答获得 <b>${(failure*100).toFixed(1)}%</b> 的概率质量。教师对错误回答的支持已被反转。`:`被拒绝回答获得 <b>${(failure*100).toFixed(1)}%</b> 的概率质量。此时，自信的教师可能会强化错误回答。`}else{$("#gate-readout").innerHTML=gated?`Rejected answers receive <b>${(failure*100).toFixed(1)}%</b> of the mass. Teacher support on a failure is reversed.`:`Rejected answers receive <b>${(failure*100).toFixed(1)}%</b> of the mass. A confident teacher can now reinforce a failure.`}}
  [eta,beta,gate].forEach(x=>x?.addEventListener("input",updateMass));updateMass();

  $$(".theorems details, .inline-theory").forEach(d=>d.addEventListener("toggle",()=>{const i=d.querySelector("summary i");if(i)i.textContent=d.open?"−":"+"}));

  const reveal=$$(".takeaways,.flow-round,.equation-card,.term-grid,.story-callout,.inline-theory,.tb-equation,.tb-logic,.tb-partition,.gate-rule,.mass-explainer,.experiment-prompt,.mass-lab,.paper-results,.diversity-formula,.diversity-paper-figure,.case-study,.scope-note,.closing");reveal.forEach(x=>x.classList.add("reveal"));
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.08});reveal.forEach(x=>io.observe(x));
  if(new URLSearchParams(location.search).get("prefetch-in-view")==="1")reveal.forEach(x=>x.classList.add("in"));

  $("#copy-bib")?.addEventListener("click",async e=>{try{await navigator.clipboard.writeText($("#bibtex-block").textContent.trim());const old=e.target.textContent;e.target.textContent=document.body.dataset.lang==="zh"?"已复制 ✓":"Copied ✓";setTimeout(()=>e.target.textContent=old,1300)}catch(_){}});
})();
