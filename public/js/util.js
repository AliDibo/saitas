/* ==========================================================================
   util.js – Ortak yardımcılar
   Güvenli dosya okuma, localStorage, Türkçe metin işlemleri, mini markdown.
   ========================================================================== */
'use strict';

window.AAUtil = (function () {
  const CFG = window.AA_CONFIG;
  const MAX_TEXT_BYTES = 256 * 1024; // txt dosyaları için üst sınır (256 KB)
  const LETTER_SET = new Set(CFG.GAME.alphabet);

  /* === Türkçe metin =================================================== */

  /** Türkçe kurala göre büyük harf (i→İ, ı→I). */
  function upperTR(text) {
    return String(text).toLocaleUpperCase('tr-TR');
  }

  /** Metin yalnızca 29 Türk harfinden mi oluşuyor? */
  function isTurkishWord(text) {
    if (!text) return false;
    for (const ch of text) {
      if (!LETTER_SET.has(ch)) return false;
    }
    return true;
  }

  /** Kullanıcı girişini temizler: büyük harf, Türk alfabesi dışı her şey atılır. */
  function sanitizeGuess(raw, maxLen) {
    let out = '';
    for (const ch of upperTR(raw)) {
      if (LETTER_SET.has(ch)) out += ch;
      if (out.length >= maxLen) break;
    }
    return out;
  }

  /* === Güvenli dosya okuma =============================================
     - Sadece aynı köken (mode: 'same-origin'), çerez sadece aynı köken.
     - Göreli yol zorunlu: dışarıdan URL verilemez.
     - Content-Type text/plain olmalı (sunucu yanlış tip verirse reddedilir).
     - Boyut sınırı. */
  async function fetchText(path) {
    if (!/^[a-z0-9_\-/.]+\.txt$/.test(path) || path.includes('..')) {
      throw new Error('Geçersiz dosya yolu: ' + path);
    }
    if (location.protocol === 'file:') {
      throw new Error('Sayfa file:// ile açılmış; dosyalar okunamaz.');
    }
    const res = await fetch(path, {
      method: 'GET',
      mode: 'same-origin',
      credentials: 'same-origin',
      cache: 'no-cache',
      redirect: 'error',
      referrerPolicy: 'no-referrer'
    });
    if (!res.ok) throw new Error(path + ' okunamadı (HTTP ' + res.status + ')');

    const type = (res.headers.get('Content-Type') || '').toLowerCase();
    if (!type.startsWith('text/plain')) {
      throw new Error(path + ' beklenmeyen içerik tipi: ' + type);
    }
    const len = Number(res.headers.get('Content-Length') || 0);
    if (len > MAX_TEXT_BYTES) throw new Error(path + ' çok büyük');

    const text = await res.text();
    if (text.length > MAX_TEXT_BYTES) throw new Error(path + ' çok büyük');
    return text.replace(/^﻿/, ''); // BOM temizle
  }

  /* === localStorage (hata toleranslı) ================================== */
  const storage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch (e) { /* gizli mod vb. */ }
    },
    remove(key) {
      try { window.localStorage.removeItem(key); } catch (e) { /* yoksay */ }
    },
    /** JSON okur, doğrulayıcıdan geçmezse null döner (bozuk veri temizlenir). */
    getJSON(key, validate) {
      const raw = this.get(key);
      if (raw === null) return null;
      try {
        const val = JSON.parse(raw);
        if (validate && !validate(val)) throw new Error('şema');
        return val;
      } catch (e) {
        this.remove(key);
        return null;
      }
    },
    setJSON(key, value) {
      this.set(key, JSON.stringify(value));
    }
  };

  /* === Mini markdown → DOM ==============================================
     innerHTML KULLANILMAZ. Desteklenen: # / ## / ### başlık, - veya * liste,
     **kalın**, *italik*, boş satır = paragraf, tek satır sonu = <br>. */
  function appendInline(parent, text) {
    const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      const el = document.createElement(m[2] !== undefined ? 'strong' : 'em');
      el.textContent = m[2] !== undefined ? m[2] : m[3];
      parent.appendChild(el);
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }

  function renderMarkdown(src, container) {
    container.textContent = '';
    const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    let para = null;
    let list = null;

    const closeBlocks = () => { para = null; list = null; };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const heading = /^(#{1,3})\s+(.*)$/.exec(line);
      const item = /^\s*[-*]\s+(.*)$/.exec(line);

      if (!line.trim()) { closeBlocks(); continue; }

      if (heading) {
        closeBlocks();
        const h = document.createElement('h' + (heading[1].length + 2)); // h3–h5
        appendInline(h, heading[2]);
        container.appendChild(h);
      } else if (item) {
        para = null;
        if (!list) { list = document.createElement('ul'); container.appendChild(list); }
        const li = document.createElement('li');
        appendInline(li, item[1]);
        list.appendChild(li);
      } else {
        list = null;
        if (para) {
          para.appendChild(document.createElement('br'));
        } else {
          para = document.createElement('p');
          container.appendChild(para);
        }
        appendInline(para, line);
      }
    }
  }

  /* === Diğer =========================================================== */
  function randomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      window.crypto.getRandomValues(buf);
      return buf[0] % max;
    }
    return Math.floor(Math.random() * max);
  }

  const reducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return { upperTR, isTurkishWord, sanitizeGuess, fetchText, storage, renderMarkdown, randomInt, reducedMotion };
})();
