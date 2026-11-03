(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userMotionEnabled = true;
  let motionEnabled = !reduced.matches;
  let pageActive = true;
  let motionContext = null;
  let heroIntroPlayed = false;
  document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off';
  const canAnimate = () => motionEnabled && pageActive && typeof window.gsap !== 'undefined';
  const refresh = () => window.ScrollTrigger?.refresh();

  // The menu never hides the separate contact action.
  const menu = $('.menu-toggle');
  const nav = $('#main-nav');
  const closeMenu = () => {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Открыть меню');
    nav.classList.remove('is-open');
  };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav.classList.toggle('is-open', open);
  });
  function followHeaderLink(link) {
    closeMenu();
    const destination = document.getElementById(link.hash.slice(1));
    const heading = destination?.querySelector('h1, h2');
    if (heading) requestAnimationFrame(() => {
      heading.setAttribute('tabindex', '-1');
      heading.focus({preventScroll:true});
    });
  }
  $$('.nav a').forEach(link => link.addEventListener('click', () => followHeaderLink(link)));
  $('.header-contact').addEventListener('click', event => followHeaderLink(event.currentTarget));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menu.focus();
    }
  });
  window.matchMedia('(min-width: 641px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  const header = $('.site-header');
  document.addEventListener('pointerdown', event => {
    if (menu.getAttribute('aria-expanded') === 'true' && !header.contains(event.target)) closeMenu();
  }, {passive:true});
  header.addEventListener('focusout', () => requestAnimationFrame(() => {
    if (!header.contains(document.activeElement)) closeMenu();
  }));

  // Pointer motion is limited to decorative layers. Buttons and text never move.
  const pointerStates = new Map();
  let pointerFrame = 0;
  function renderPointer() {
    pointerFrame = 0;
    if (!motionEnabled || !pageActive || document.hidden) return;
    let unfinished = false;
    for (const [section, state] of pointerStates) {
      const dx = state.tx - state.x, dy = state.ty - state.y;
      state.x += dx * .16; state.y += dy * .16;
      if (Math.abs(dx) + Math.abs(dy) > .002) unfinished = true;
      section.style.setProperty('--px', state.x.toFixed(4));
      section.style.setProperty('--py', state.y.toFixed(4));
      section.style.setProperty('--light-x', `${50 + state.x * 42}%`);
      section.style.setProperty('--light-y', `${50 + state.y * 42}%`);
    }
    if (unfinished && !document.hidden && motionEnabled) pointerFrame = requestAnimationFrame(renderPointer);
  }
  function schedulePointer() { if (!pointerFrame && !document.hidden && motionEnabled && pageActive) pointerFrame = requestAnimationFrame(renderPointer); }
  $$('.pointer-scene').forEach(section => {
    const state = {x:0,y:0,tx:0,ty:0,rect:null}; pointerStates.set(section, state);
    const move = event => {
      if (!motionEnabled || !pageActive) return;
      state.rect ||= section.getBoundingClientRect();
      state.tx = Math.max(-1, Math.min(1, ((event.clientX - state.rect.left) / state.rect.width - .5) * 2));
      state.ty = Math.max(-1, Math.min(1, ((event.clientY - state.rect.top) / state.rect.height - .5) * 2));
      schedulePointer();
    };
    section.addEventListener('pointerenter', event => {state.rect = section.getBoundingClientRect(); move(event);}, {passive:true});
    section.addEventListener('pointermove', move, {passive:true});
    section.addEventListener('pointerdown', move, {passive:true});
    section.addEventListener('pointerleave', () => {state.tx = 0; state.ty = 0; schedulePointer();}, {passive:true});
    section.addEventListener('focusin', () => {if (motionEnabled && pageActive) {state.tx = .23; state.ty = -.15; schedulePointer();}});
    section.addEventListener('focusout', () => {state.tx = 0;state.ty = 0;schedulePointer();});
  });
  const invalidateRects = () => pointerStates.forEach(state => {state.rect = null;});
  window.addEventListener('scroll', invalidateRects, {passive:true});
  window.addEventListener('resize', invalidateRects, {passive:true});
  function resetPointer() {
    cancelAnimationFrame(pointerFrame); pointerFrame = 0;
    pointerStates.forEach((state, section) => {
      state.x=state.y=state.tx=state.ty=0;
      section.style.setProperty('--px','0');section.style.setProperty('--py','0');
      section.style.setProperty('--light-x','50%');section.style.setProperty('--light-y','50%');
    });
  }

  // Roving keyboard focus for product categories.
  const tastes = {
    nuts: {title:'Всё начинается с хруста',description:'Миндаль, фисташки, кешью — попробуйте собрать сочетание, в котором каждый ингредиент слышен.',ingredients:['almond','pistachio','cashew'],color:'#efedc9'},
    fruit: {title:'Сладость в своём ритме',description:'Курага, финики, изюм — мягкие оттенки вкуса, которые интересно сочетать с хрустящей основой.',ingredients:['apricot','date','raisin'],color:'#f4d8ae'},
    snacks: {title:'Пауза с характером',description:'Небольшое дополнение к большому дню. Какие снеки сейчас на витрине, подскажут в магазине.',ingredients:['pistachio','almond','cashew'],color:'#dce5b2'}
  };
  function setTaste(key) {
    const data = tastes[key];
    $$('.taste-tab').forEach(tab => {
      const active = tab.dataset.taste === key;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    });
    $('#taste-panel').setAttribute('aria-labelledby', `tab-${key}`);
    $('#taste-name').textContent = data.title; $('#taste-description').textContent = data.description;
    $$('.taste-item').forEach((item, index) => { $('use', item).setAttribute('href', `#nut-${data.ingredients[index]}`); });
    $('#taste-panel').style.backgroundColor = data.color;
    if (canAnimate()) {
      gsap.fromTo('.taste-item', {scale:.55,rotation:-12,opacity:.4}, {scale:1,rotation:0,opacity:1,duration:.55,stagger:.07,ease:'back.out(1.4)',overwrite:true});
      gsap.fromTo('.taste-copy', {opacity:.5,y:10}, {opacity:1,y:0,duration:.3,overwrite:true});
    }
  }
  $$('.taste-tab').forEach((tab, index, tabs) => {
    tab.addEventListener('click', () => setTaste(tab.dataset.taste));
    tab.addEventListener('keydown', event => {
      let next;
      if (['ArrowRight','ArrowDown'].includes(event.key)) next=(index+1)%tabs.length;
      if (['ArrowLeft','ArrowUp'].includes(event.key)) next=(index+tabs.length-1)%tabs.length;
      if (event.key==='Home') next=0;
      if (event.key==='End') next=tabs.length-1;
      if (next!==undefined) {event.preventDefault();tabs[next].focus();setTaste(tabs[next].dataset.taste);}
    });
  });

  // Four choices, an immediate result, and reversible selection; no timers or storage.
  const ingredientData = {
    almond:{name:'миндаль',group:'nut'},pistachio:{name:'фисташка',group:'nut'},cashew:{name:'кешью',group:'nut'},
    apricot:{name:'курага',group:'fruit'},date:{name:'финик',group:'fruit'},raisin:{name:'изюм',group:'fruit'}
  };
  let selected = [];
  const bowlItems = $('#bowl-items');
  const stage = $('.mix-stage');
  const initialTitle = 'Начните с любимого.';
  const initialDescription = 'Нажимайте на ингредиенты справа. Повторное нажатие убирает выбранный вкус.';
  function drawMix(added, sourceButton) {
    const existing = new Map($$('.bowl-ingredient', bowlItems).map(item => [item.dataset.key, item]));
    existing.forEach((element, key) => {if (!selected.includes(key)) {if (window.gsap) gsap.killTweensOf(element);element.remove();}});
    selected.forEach(key => {
      let item = existing.get(key);
      if (!item) {
        item=document.createElement('div');item.className='bowl-ingredient';item.dataset.key=key;
        item.innerHTML=`<svg viewBox="0 0 240 260" aria-hidden="true"><use href="#nut-${key}" width="240" height="260"/></svg>`;
      }
      bowlItems.appendChild(item);
      if (key===added && sourceButton && canAnimate()) {
        const origin=$('.ingredient-art',sourceButton).getBoundingClientRect();
        const destination=item.getBoundingClientRect();
        gsap.fromTo(item,{x:origin.left+origin.width/2-destination.left-destination.width/2,y:origin.top+origin.height/2-destination.top-destination.height/2,scale:.65,rotation:65},{x:0,y:0,scale:1,rotation:0,duration:.65,ease:'power3.out',overwrite:true});
      }
    });
    $$('.ingredient').forEach(button=>button.setAttribute('aria-pressed',String(selected.includes(button.dataset.ingredient))));
    $('#mix-count').textContent=String(selected.length);
    stage.classList.toggle('is-complete',selected.length===4);
    const title=$('#mix-result-title'),description=$('#mix-result-description');
    if (selected.length===4) {
      const nuts=selected.filter(key=>ingredientData[key].group==='nut').length;
      title.textContent=nuts===2?'Ваш микс: солнечный баланс':nuts>2?'Ваш микс: хрустящий день':'Ваш микс: сладкий полдень';
      description.textContent=selected.map(key=>ingredientData[key].name).join(', ')+'. Сочетание готово — сохраните идею в памяти или попробуйте другое.';
      $('#mix-feedback').textContent='Готово! Все 4 ингредиента в чаше. Можно заменить любой или начать заново.';
      if (added&&canAnimate()) gsap.fromTo('.mix-count',{scale:.85},{scale:1,duration:.45,ease:'back.out(2)',overwrite:true});
    } else {
      title.textContent=selected.length?`Ещё ${4-selected.length} ${selected.length===3?'ингредиент':'ингредиента'} до вашего микса.`:initialTitle;
      description.textContent=selected.length?selected.map(key=>ingredientData[key].name).join(', ')+'. Выберите следующий вкус.':initialDescription;
      $('#mix-feedback').textContent=`Выбрано ${selected.length} из 4. Все сочетания — ваши.`;
    }
    requestAnimationFrame(refresh);
  }
  $$('.ingredient').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.ingredient;
    if (selected.includes(key)) {selected=selected.filter(item=>item!==key);drawMix();return;}
    if (selected.length===4) {$('#mix-feedback').textContent='В чаше уже 4 ингредиента. Нажмите на выбранный, чтобы убрать его и добавить новый.';return;}
    selected.push(key);drawMix(key,button);
  }));
  $('#mix-reset').addEventListener('click',()=>{selected=[];drawMix();});

  const moments={
    walk:{title:'Пауза на скамейке',text:'Небольшой микс из орехов и сухофруктов — идея для неспешного маршрута по городу.',bag:'Солнце<br>в кармане.'},
    evening:{title:'Разговор подольше',text:'Поставьте на стол несколько разных вкусов. Пусть каждый найдёт своё сочетание для уютного вечера.',bag:'Для тёплых<br>разговоров.'},
    gift:{title:'Маленький знак внимания',text:'Подумайте о любимых вкусах близкого человека. Возможность подарочной упаковки уточните в магазине.',bag:'Поделиться<br>солнцем.'}
  };
  $$('.moment-button').forEach(button=>button.addEventListener('click',()=>{
    const data=moments[button.dataset.moment];
    $$('.moment-button').forEach(item=>{const active=item===button;item.classList.toggle('is-active',active);item.setAttribute('aria-pressed',String(active));});
    $('#moment-title').textContent=data.title;$('#moment-text').textContent=data.text;$('#bag-message').innerHTML=data.bag;
    if(canAnimate()) {
      gsap.fromTo('.paper-bag',{rotation:-10,y:20},{rotation:0,y:0,duration:.6,ease:'back.out(1.6)',overwrite:true});
      gsap.fromTo('.bag-fruit',{scale:.75,rotation:-20},{scale:1,rotation:0,duration:.6,stagger:.06,ease:'back.out(1.7)',overwrite:true});
    }
  }));

  // Honest browser-only demonstration. Input values never leave this closure or persist.
  const form=$('#contact-form'),success=$('#form-success');
  const nameInput=$('#contact-name'),phoneInput=$('#contact-phone');
  function clearError(input) {input.removeAttribute('aria-invalid');$(`#${input.name}-error`).textContent='';}
  [nameInput,phoneInput].forEach(input=>input.addEventListener('input',()=>clearError(input)));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const name=nameInput.value.trim(),phone=phoneInput.value.trim(),digits=phone.replace(/\D/g,'');
    const errors=[];
    clearError(nameInput);clearError(phoneInput);
    if((name.match(/\p{L}/gu)||[]).length<2) errors.push([nameInput,'Введите имя — хотя бы 2 буквы.']);
    if(!/^\+?[()\d\s-]+$/.test(phone)||digits.length<10||digits.length>15) errors.push([phoneInput,'Введите телефон: от 10 до 15 цифр.']);
    errors.forEach(([input,message])=>{input.setAttribute('aria-invalid','true');$(`#${input.name}-error`).textContent=message;});
    if(errors.length){errors[0][0].focus();refresh();return;}
    form.reset();form.hidden=true;success.hidden=false;success.focus({preventScroll:true});refresh();
  });
  // Enable only after the privacy-preserving submit handler is installed.
  $('.form-submit', form).disabled = false;
  $('#form-reset').addEventListener('click',()=>{success.hidden=true;form.hidden=false;form.reset();nameInput.focus({preventScroll:true});refresh();});
  $$('.faq-list details').forEach(details=>details.addEventListener('toggle',refresh));

  // One reversible context owns the SVG scenes, scroll triggers and idle loops.
  function createMotionScenes() {
    if (!canAnimate() || !window.ScrollTrigger || motionContext) return;
    motionContext = gsap.context(() => {
      const mobile=window.matchMedia('(max-width: 640px)').matches;
      const distance=mobile?45:120;
      let heroIntro = null;
      if (!heroIntroPlayed) {
        heroIntroPlayed = true;
        heroIntro = gsap.timeline({defaults:{ease:'power3.out'}});
        heroIntro.from('.vector-bowl',{scale:.88,y:40,duration:1.2,transformOrigin:'50% 80%'},0)
        .from('.hero-nut',{x:i=>(i%2?-1:1)*40,y:i=>-45-(i%3)*15,rotation:i=>(i%2?-1:1)*16,duration:1.1,stagger:.018,transformOrigin:'center center'},.1)
        .from('.hero-float',{scale:.6,y:80,rotation:15,duration:1.3,stagger:.07,transformOrigin:'center'},.2)
        .from('.hero-orbits i',{scale:.6,opacity:0,duration:1.4,stagger:.12},.1);
      }
      gsap.to('.hero-sun>svg',{rotation:60,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:1}});
      gsap.to('.hero-float',{y:i=>(i%2?-1:1)*(mobile?28:65),x:i=>(i%2?-1:1)*(mobile?18:45),rotation:i=>(i%2?-1:1)*18,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.8}});
      gsap.to('.hero-orbits',{rotation:45,ease:'none',scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.8}});
      gsap.fromTo('.ribbon-track',{x:60},{x:-150,ease:'none',scrollTrigger:{trigger:'.ribbon',start:'top bottom',end:'bottom top',scrub:1}});
      gsap.from('.taste-item',{x:i=>(i%2?-1:1)*distance,y:i=>i===1?-80:60,rotation:i=>(i%2?-1:1)*30,scale:.7,scrollTrigger:{trigger:'.tastes',start:'top bottom',end:'center 65%',scrub:.8},ease:'none'});
      gsap.fromTo('.taste-circle',{scale:.65},{scale:1,ease:'none',scrollTrigger:{trigger:'.tastes',start:'top bottom',end:'center center',scrub:.8}});
      gsap.fromTo('.mix-orbit',{rotation:-70,scale:.65},{rotation:15,scale:1,ease:'none',scrollTrigger:{trigger:'.mix-section',start:'top bottom',end:'center center',scrub:.8}});
      gsap.fromTo('.mix-bowl',{rotation:-25,scale:.82},{rotation:0,scale:1,ease:'none',scrollTrigger:{trigger:'.mix-section',start:'top bottom',end:'center 70%',scrub:.8}});
      gsap.from('.balance-orb',{x:i=>(i-1)*distance*1.4,y:i=>i===1?-95:80,rotation:i=>(i-1)*40,scale:.65,ease:'none',scrollTrigger:{trigger:'.balance',start:'top bottom',end:'center 65%',scrub:.8}});
      const path=$('.balance-path path'),length=path.getTotalLength();
      gsap.fromTo(path,{strokeDasharray:length,strokeDashoffset:length},{strokeDashoffset:0,ease:'none',scrollTrigger:{trigger:'.balance',start:'top bottom',end:'center center',scrub:.8}});
      gsap.from('.paper-bag',{x:distance,y:70,rotation:25,scale:.8,ease:'none',scrollTrigger:{trigger:'.moments',start:'top bottom',end:'center 70%',scrub:.8}});
      gsap.from('.bag-fruit',{x:i=>(i%2?-1:1)*distance,y:i=>(i%2?-1:1)*85,rotation:30,scale:.7,ease:'none',scrollTrigger:{trigger:'.moments',start:'top bottom',end:'center 65%',scrub:.8}});
      gsap.to('.moment-sun',{rotation:90,ease:'none',scrollTrigger:{trigger:'.moments',start:'top bottom',end:'bottom top',scrub:1}});
      gsap.from('.address-ticket',{x:-distance,y:40,rotation:-15,ease:'none',scrollTrigger:{trigger:'.visit',start:'top bottom',end:'center 60%',scrub:.8}});
      gsap.from('.location-marker',{y:-100,scale:.45,transformOrigin:'50% 100%',ease:'none',scrollTrigger:{trigger:'.visit',start:'top bottom',end:'center 70%',scrub:.8}});
      gsap.from('.location-ring',{scale:.5,opacity:.3,stagger:.1,ease:'none',scrollTrigger:{trigger:'.visit',start:'top bottom',end:'center center',scrub:.8}});
      gsap.to('.faq-sun',{rotation:110,ease:'none',scrollTrigger:{trigger:'.faq-section',start:'top bottom',end:'bottom top',scrub:1}});
      gsap.fromTo('.contact-art>svg',{rotation:-80,scale:.6},{rotation:45,scale:1,ease:'none',scrollTrigger:{trigger:'.contact-section',start:'top bottom',end:'center 65%',scrub:.8}});
      // Short organic idle movement pauses when the hero is not visible or the document is hidden.
      const floating=gsap.to('.float-inner',{y:i=>i%2?-9:10,rotation:i=>i%2?3:-3,duration:2.6,stagger:.19,repeat:-1,yoyo:true,ease:'sine.inOut',transformOrigin:'center',paused:true});
      let heroVisible=true;
      const updateIdle=()=>{if(heroVisible&&!document.hidden&&motionEnabled&&pageActive)floating.play();else floating.pause();};
      const observer=new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;updateIdle();},{threshold:0});
      observer.observe($('.hero'));document.addEventListener('visibilitychange',updateIdle);
      return()=>{observer.disconnect();document.removeEventListener('visibilitychange',updateIdle);floating.kill();heroIntro?.kill();};
    });
    refresh();
  }

  // Interaction tweens are event-driven and therefore settled separately on pause.
  function stopMotionScenes() {
    motionContext?.revert();
    motionContext = null;
    if (window.gsap) {
      const interactiveArt = $$('.taste-item, .taste-copy, .bowl-ingredient, .mix-count, .paper-bag, .bag-fruit');
      gsap.killTweensOf(interactiveArt);
      gsap.set(interactiveArt, {clearProps:'transform,opacity'});
    }
    resetPointer();
  }

  const motionButton = $('#motion-toggle');
  const motionStatus = $('#motion-status');
  $('#motion-controls').hidden = false;
  function syncMotion() {
    motionEnabled = userMotionEnabled && !reduced.matches;
    document.documentElement.dataset.motion = motionEnabled ? 'on' : 'off';
    document.documentElement.dataset.motionReason = reduced.matches ? 'system' : userMotionEnabled ? 'enabled' : 'user';
    motionButton.textContent = motionEnabled ? 'Анимация: вкл.' : 'Анимация: выкл.';
    motionButton.setAttribute('aria-pressed', String(motionEnabled));
    motionButton.setAttribute('aria-disabled', String(reduced.matches));
    motionStatus.textContent = reduced.matches
      ? 'Движение отключено настройкой устройства «Уменьшение движения».'
      : motionEnabled ? 'Можно выключить всё движение на этой странице.' : 'Движение выключено. Все разделы и интерактивы работают.';
    if (motionEnabled && pageActive) createMotionScenes(); else stopMotionScenes();
  }
  motionButton.addEventListener('click', () => {
    if (reduced.matches) return;
    userMotionEnabled = !userMotionEnabled;
    syncMotion();
  });
  reduced.addEventListener('change', syncMotion);
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  syncMotion();
  document.fonts?.ready.then(refresh);
  window.addEventListener('load', refresh, {once:true});
  window.addEventListener('pagehide', () => {
    pageActive = false;
    stopMotionScenes();
  });
  window.addEventListener('pageshow', event => {
    pageActive = true;
    if (event.persisted) syncMotion();
  });
})();
