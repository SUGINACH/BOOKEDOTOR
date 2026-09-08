/* ==========================================================================
   typesetter.js - מנוע העימוד המרכזי לדפי A4
   ========================================================================== */

let noteCounters = { footnote: 0, endnote: 0 };
let noteUidCounter = 0;
let footnoteQueueForPage = [];
let endnoteQueueForPart = [];
let lineToTokenMap = [];
let globalTokens = [];

/* ==========================================================================
   סינון הערות עריכה (##...##) מהמסמך המעומד
   ========================================================================== */
function stripEditorialNotes(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/##[\s\S]*?##/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();
}

function toGematria(num) {
  num = parseInt(num, 10);
  if (isNaN(num) || num <= 0) return "";
  if (num === 15) return "טו";
  if (num === 16) return "טז";
  const hundreds = ["", "ק", "ר", "ש", "ת", "תק", "תר", "תש", "תת", "תתק"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  let str = "";
  let h = Math.floor(num / 100);
  if (h > 0) {
    if (h <= 4) str += ["", "ק", "ר", "ש", "ת"][h];
    else if (h < hundreds.length) str += hundreds[h];
    num %= 100;
  }
  let t = Math.floor(num / 10);
  let o = num % 10;
  if (t === 1 && (o === 5 || o === 6)) {
    str += (o === 5) ? "טו" : "טז";
  } else {
    str += tens[t] + ones[o];
  }
  return str;
}

function updateGrid() {
  const root = document.documentElement;
  const rawCol = parseFloat(document.getElementById('prop-col').value) || 0;
  const rawMargin = parseFloat(document.getElementById('prop-margin').value) || 0;
  const rawGutter = parseFloat(document.getElementById('prop-gutter').value) || 0;
  const rawGap = parseFloat(document.getElementById('prop-gap').value) || 0;
  const total = 2 * rawCol + 2 * rawMargin + rawGutter + 2 * rawGap;
  const scale = total > 0 ? 100 / total : 1;
  root.style.setProperty('--w-col', (rawCol * scale) + '%');
  root.style.setProperty('--w-margin', (rawMargin * scale) + '%');
  root.style.setProperty('--w-gutter', (rawGutter * scale) + '%');
  root.style.setProperty('--w-gap', (rawGap * scale) + '%');
  root.style.setProperty('--flow-mt', document.getElementById('prop-mt').value + 'px');
  root.style.setProperty('--flow-mb', document.getElementById('prop-mb').value + 'px');
}

function updateStyles() {
  const root = document.documentElement;
  root.style.setProperty('--fn-header-r', document.getElementById('f-hdr-r').value);
  root.style.setProperty('--sz-header-r', document.getElementById('s-hdr-r').value + 'pt');
  root.style.setProperty('--fn-header-c', document.getElementById('f-hdr-c').value);
  root.style.setProperty('--sz-header-c', document.getElementById('s-hdr-c').value + 'pt');
  root.style.setProperty('--fn-header-l', document.getElementById('f-hdr-l').value);
  root.style.setProperty('--sz-header-l', document.getElementById('s-hdr-l').value + 'pt');

  root.style.setProperty('--fn-h0', document.getElementById('f-h0').value);
  root.style.setProperty('--sz-h0', document.getElementById('s-h0').value + 'pt');
  root.style.setProperty('--fn-h0-body', document.getElementById('f-h0-body').value);
  root.style.setProperty('--sz-h0-body', document.getElementById('s-h0-body').value + 'pt');

  root.style.setProperty('--fn-h1', document.getElementById('f-h1').value);
  root.style.setProperty('--sz-h1', document.getElementById('s-h1').value + 'pt');
  root.style.setProperty('--fn-h2', document.getElementById('f-h2').value);
  root.style.setProperty('--sz-h2', document.getElementById('s-h2').value + 'pt');
  root.style.setProperty('--fn-h3', document.getElementById('f-h3').value);
  root.style.setProperty('--sz-h3', document.getElementById('s-h3').value + 'pt');
  root.style.setProperty('--fn-h4', document.getElementById('f-h4').value);
  root.style.setProperty('--sz-h4', document.getElementById('s-h4').value + 'pt');
  root.style.setProperty('--fn-h5', document.getElementById('f-h5').value);
  root.style.setProperty('--sz-h5', document.getElementById('s-h5').value + 'pt');
  root.style.setProperty('--fn-h6', document.getElementById('f-h6').value);
  root.style.setProperty('--sz-h6', document.getElementById('s-h6').value + 'pt');
  root.style.setProperty('--fn-h7', document.getElementById('f-h7').value);
  root.style.setProperty('--sz-h7', document.getElementById('s-h7').value + 'pt');

  root.style.setProperty('--fn-sh-title', document.getElementById('f-sh-title').value);
  root.style.setProperty('--sz-sh-title', document.getElementById('s-sh-title').value + 'pt');
  root.style.setProperty('--fn-sh-sub', document.getElementById('f-sh-sub').value);
  root.style.setProperty('--sz-sh-sub', document.getElementById('s-sh-sub').value + 'pt');
  root.style.setProperty('--fn-sh-desc', document.getElementById('f-sh-desc').value);
  root.style.setProperty('--sz-sh-desc', document.getElementById('s-sh-desc').value + 'pt');
  root.style.setProperty('--fn-sh-sec', document.getElementById('f-sh-sec').value);
  root.style.setProperty('--sz-sh-sec', document.getElementById('s-sh-sec').value + 'pt');
  root.style.setProperty('--fn-sh-author', document.getElementById('f-sh-author').value);
  root.style.setProperty('--sz-sh-author', document.getElementById('s-sh-author').value + 'pt');
  root.style.setProperty('--fn-sh-year', document.getElementById('f-sh-year').value);
  root.style.setProperty('--sz-sh-year', document.getElementById('s-sh-year').value + 'pt');

  root.style.setProperty('--fn-first-word', document.getElementById('font-first-word').value);
  root.style.setProperty('--sz-first-word', document.getElementById('size-first-word').value + 'em');
  root.style.setProperty('--fn-body', document.getElementById('font-body').value);
  root.style.setProperty('--sz-body', document.getElementById('size-body').value + 'pt');

  // גופן וגודל שורת סימן לכותרת 2
  const fSiman = document.getElementById('f-siman')?.value;
  const sSiman = document.getElementById('s-siman')?.value;
  if (fSiman) root.style.setProperty('--fn-siman', fSiman);
  if (sSiman) root.style.setProperty('--sz-siman', sSiman + 'pt');
}

function createDropWord(text, isContinuation, isSingleLine) {
  if (isContinuation) return text;
  text = text.trim();
  const firstSpace = text.indexOf(' ');
  if (firstSpace === -1) {
    return `<span class="${isSingleLine ? 'first-word-inline' : 'first-word-window'}">${text}</span>`;
  }
  const firstWord = text.substring(0, firstSpace);
  const rest = text.substring(firstSpace + 1);
  return `<span class="${isSingleLine ? 'first-word-inline' : 'first-word-window'}">${firstWord}</span> ${rest}`;
}

function createPageLayout(container, h2Text, h2TokenId, pNum, h1Title, h2Title, h3Title, bookTitle, customR, customC, customL, pageRole) {
  const page = document.createElement('div');
  page.className = 'a4-page';
  page.setAttribute('data-page-index', String(pNum));
  applyContentBg(page, pageRole || 'regular');

  const hdrRType = document.getElementById('hdr-r-type').value;
  const hdrRAlign = document.getElementById('hdr-r-align').value;
  const hdrRHTML = renderHeaderSectionHTML(hdrRType, customR, h1Title, h2Title, h3Title, bookTitle);

  const hdrCType = document.getElementById('hdr-c-type').value;
  const hdrCAlign = document.getElementById('hdr-c-align').value;
  const hdrCHTML = renderHeaderSectionHTML(hdrCType, customC, h1Title, h2Title, h3Title, bookTitle);

  const hdrLType = document.getElementById('hdr-l-type').value;
  const hdrLAlign = document.getElementById('hdr-l-align').value;
  const hdrLHTML = renderHeaderSectionHTML(hdrLType, customL, h1Title, h2Title, h3Title, bookTitle);

  page.innerHTML = `
    <div class="page-content-wrapper">
      <div class="top-header-grid">
        <div class="header-col-r" style="text-align:${hdrRAlign};">${hdrRHTML}</div>
        <div class="header-col-c" style="text-align:${hdrCAlign};">${hdrCHTML}</div>
        <div class="header-col-l" style="text-align:${hdrLAlign};">${hdrLHTML}</div>
      </div>
      <div class="page-body-flow">
        ${h2Text ? `<div class="h2-spacer"></div><div class="title-level-2-standalone" ${h2TokenId !== undefined ? `data-token-id="${h2TokenId}" id="heading-tok-${h2TokenId}"` : ''}>${h2Text}</div>` : ''}
      </div>
      <div class="page-number-footer">${toGematria(pNum)}</div>
    </div>
  `;

  container.appendChild(page);
  const bodyFlow = page.querySelector('.page-body-flow');
  return { page, bodyFlow };
}

function parseMetadataFromText(rawText) {
  const lines = rawText.split('\n');
  const cleanLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    let match = false;

    if (/^(?:שם הספר[:\s]*)?שם הספר\s*[-–—:]\s*(.*)$/i.test(trimmed)) {
      document.getElementById('inp-book-title').value = trimmed.replace(/^(?:שם הספר[:\s]*)?שם הספר\s*[-–—:]\s*/i, '').trim();
      match = true;
    } else if (/^(?:נושא(?:\\|\/)כותרת משנה[:\s]*)?נושא\s*[-–—:]\s*(.*)$/i.test(trimmed)) {
      document.getElementById('inp-book-subtitle').value = trimmed.replace(/^(?:נושא(?:\\|\/)כותרת משנה[:\s]*)?נושא\s*[-–—:]\s*/i, '').trim();
      match = true;
    } else if (/^(?:נושא מפורט\s*(?:\\|\/)\s*תיאור[:\s]*)?נושא מפורט\s*[-–—:]\s*(.*)$/i.test(trimmed)) {
      document.getElementById('inp-book-desc').value = trimmed.replace(/^(?:נושא מפורט\s*(?:\\|\/)\s*תיאור[:\s]*)?נושא מפורט\s*[-–—:]\s*/i, '').trim();
      match = true;
    } else if (/^(?:פרטי מהדורא\s*(?:\\|\/)\s*חלקים[:\s]*)?פרטי מהדורא\s*[-–—:]\s*(.*)$/i.test(trimmed)) {
      document.getElementById('inp-book-sections').value = trimmed.replace(/^(?:פרטי מהדורא\s*(?:\\|\/)\s*חלקים[:\s]*)?פרטי מהדורא\s*[-–—:]\s*/i, '').trim();
      match = true;
    } else if (/^(?:שם המחבר[:\s]*)?שם המחבר\s*[-–—:]\s*(.*)$/i.test(trimmed)) {
      document.getElementById('inp-book-author').value = trimmed.replace(/^(?:שם המחבר[:\s]*)?שם המחבר\s*[-–—:]\s*/i, '').trim();
      match = true;
    } else if (/^(?:מקום ושנת הוצאה[:\s]*)?מקום ושנת הוצאה\s*[-–—:]\s*(.*)$/i.test(trimmed)) {
      document.getElementById('inp-book-year').value = trimmed.replace(/^(?:מקום ושנת הוצאה[:\s]*)?מקום ושנת הוצאה\s*[-–—:]\s*/i, '').trim();
      match = true;
    }

    if (!match) {
      cleanLines.push(line);
    }
  }
  return cleanLines.join('\n');
}

function estimateSectionFillRatio(tokens) {
  const sampleFlow = document.querySelector('.page-body-flow');
  const perPageCapacity = (sampleFlow ? sampleFlow.clientHeight : 900) * 2;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;width:580px;';
  probe.className = 'page-body-flow';
  document.body.appendChild(probe);
  let totalHeight = 0;
  tokens.forEach(t => {
    if (t.type === 'p') {
      const p = document.createElement('p');
      p.innerHTML = createDropWord(t.text, false, true);
      probe.appendChild(p);
      totalHeight += p.getBoundingClientRect().height;
      probe.removeChild(p);
    } else if (t.type.startsWith('h')) {
      const h = document.createElement('div');
      h.className = t.customStyleId ? 'title-level-custom' : `title-level-${t.level}`;
      h.textContent = t.text;
      probe.appendChild(h);
      totalHeight += h.getBoundingClientRect().height;
      const hStyle = window.getComputedStyle(h);
      totalHeight += parseFloat(hStyle.marginTop) + parseFloat(hStyle.marginBottom);
      probe.removeChild(h);
    }
  });
  document.body.removeChild(probe);
  if (totalHeight <= 0) return 1;
  const naivePages = Math.ceil(totalHeight / perPageCapacity);
  if (naivePages <= 1) return 1;
  const ratio = totalHeight / (naivePages * perPageCapacity);
  return Math.max(0.3, Math.min(1, ratio));
}

function getLinesFromParagraph(text, colWidth, styleObj, useWindowIfMultipleLines) {
  const measureContainer = document.getElementById('measuring-box');
  measureContainer.style.width = colWidth + 'px';
  measureContainer.style.fontFamily = styleObj.fontFamily;
  measureContainer.style.fontSize = styleObj.fontSize;
  measureContainer.style.lineHeight = styleObj.lineHeight;
  measureContainer.style.textAlign = 'justify';
  measureContainer.style.textJustify = 'inter-word';
  measureContainer.style.direction = 'rtl';
  measureContainer.innerHTML = '';
  
  const pMeasure = document.createElement('p');
  pMeasure.style.margin = '0';
  pMeasure.style.padding = '0';
  
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return { lines: [], hasWindow: false };

  pMeasure.textContent = text;
  measureContainer.appendChild(pMeasure);
  const singleLineHeight = pMeasure.offsetHeight;
  pMeasure.textContent = "א";
  const oneLineH = pMeasure.offsetHeight;
  const hasMultipleLines = (singleLineHeight / oneLineH) > 1.5;
  const shouldApplyWindow = useWindowIfMultipleLines && hasMultipleLines;
  
  let html = '';
  if (shouldApplyWindow) {
    html += `<span class="first-word-window" id="mw-0">${words[0]}</span> `;
    for (let i = 1; i < words.length; i++) {
      html += `<span id="mw-${i}">${words[i]}</span> `;
    }
  } else {
    for (let i = 0; i < words.length; i++) {
      html += `<span id="mw-${i}">${words[i]}</span> `;
    }
  }
  
  pMeasure.innerHTML = html;
  
  const lines = [];
  let currentLine = [];
  let currentTop = -1;
  
  for (let i = 0; i < words.length; i++) {
    const span = document.getElementById(`mw-${i}`);
    if (!span) continue;
    const top = span.offsetTop;
    if (currentTop === -1) currentTop = top;
    if (Math.abs(top - currentTop) > 8 && currentLine.length > 0) {
      lines.push(currentLine.join(' '));
      currentLine = [words[i]];
      currentTop = top;
    } else {
      currentLine.push(words[i]);
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine.join(' '));
  }
  
  measureContainer.innerHTML = '';
  return { lines, hasWindow: shouldApplyWindow };
}

function justifyColumnVertically(col, targetHeight, styleObj) {
  const currentH = col.scrollHeight;
  const diff = targetHeight - currentH;
  if (diff > 2 && diff <= 60) {
    let pElements = Array.from(col.querySelectorAll('p'));
    if (pElements.length > 1) {
       let extraSpacing = diff / (pElements.length - 1);
       pElements.slice(0, -1).forEach(p => {
         let currentMargin = parseFloat(window.getComputedStyle(p).marginBottom) || 7;
         p.style.marginBottom = (currentMargin + extraSpacing) + 'px';
       });
    } else if (pElements.length === 1) {
       let p = pElements[0];
       let currentLineHeight = parseFloat(styleObj.lineHeight) || 1.34;
       let linesInfo = getLinesFromParagraph(p.getAttribute('data-raw-text') || p.textContent, col.offsetWidth, styleObj, false);
       let numLines = linesInfo.lines.length;
       if (numLines > 1) {
           let fontSizePx = parseFloat(styleObj.fontSize) * 1.333;
           let extraLh = (diff / numLines) / fontSizePx;
           p.style.lineHeight = (currentLineHeight + extraLh).toString();
       }
    }
  }
}

function balanceColumns(block, colWidth, styleObj, snapshot, availableHeight = Infinity) {
  if (snapshot) {
    footnoteQueueForPage.length = snapshot.footnoteQueueLen;
    endnoteQueueForPart.length = snapshot.endnoteQueueLen;
    noteCounters.footnote = snapshot.footnoteCounter;
    noteCounters.endnote = snapshot.endnoteCounter;
    noteUidCounter = snapshot.noteUid;
  }

  const rCol = block.querySelector('.right-col');
  const lCol = block.querySelector('.left-col');
  const allChildren = [...Array.from(rCol.children), ...Array.from(lCol.children)];
  if (allChildren.length === 0) return;

  let mergedItems = [];
  for (let child of allChildren) {
    if (child.tagName === 'P') {
      let id = child.getAttribute('data-token-id');
      let text = child.getAttribute('data-raw-text');
      let isCont = child.getAttribute('data-is-cont') === 'true';
      let sideNote = child.getAttribute('data-side-note');
      let endNote = child.getAttribute('data-end-note');
      let sideNoteStyleId = child.getAttribute('data-note-style-id');
      let lastItem = mergedItems[mergedItems.length - 1];
      if (lastItem && lastItem.type === 'p' && lastItem.id === id) {
         lastItem.rawText += ' ' + text;
         if (sideNote && !lastItem.sideNote) { lastItem.sideNote = sideNote; lastItem.sideNoteStyleId = sideNoteStyleId; }
         if (endNote && !lastItem.endNote) lastItem.endNote = endNote;
      } else {
         mergedItems.push({ type: 'p', id: id, rawText: text, isCont: isCont, sideNote: sideNote, endNote: endNote, sideNoteStyleId: sideNoteStyleId });
      }
    } else {
      mergedItems.push({ type: 'h', id: child.getAttribute('data-token-id'), html: child.outerHTML, level: child.className.match(/title-level-(\d+)/)?.[1] });
    }
  }

  const items = mergedItems.map(item => {
    if (item.type === 'p') {
      let linesInfo = getLinesFromParagraph(item.rawText, colWidth, styleObj, !item.isCont);
      return { ...item, lines: linesInfo.lines, isSingleLine: linesInfo.lines.length <= 1, hasWindow: linesInfo.hasWindow, noteSpans: findDelimiterMatches(item.rawText, 'body') };
    }
    return item;
  });

  const splitPoints = [];
  for (let i = 0; i <= items.length; i++) {
    if (i < items.length && items[i].type === 'p') {
      let lines = items[i].lines;
      splitPoints.push({ itemIndex: i, lineIndex: 0 });
      for (let l = 1; l < lines.length; l++) {
        splitPoints.push({ itemIndex: i, lineIndex: l, lines: lines });
      }
    } else {
      splitPoints.push({ itemIndex: i, lineIndex: 0 });
    }
  }

  // מניעת חיתוך בתוך טווח הערה (delimiter)
  const validSplitPoints = splitPoints.filter(sp => {
    if (sp.lineIndex > 0) {
      const item = items[sp.itemIndex];
      if (item && item.noteSpans && item.noteSpans.length) {
        const offset = sp.lines.slice(0, sp.lineIndex).join(' ').length;
        const cutsSpan = item.noteSpans.some(m => offset > m.start && offset < m.end);
        if (cutsSpan) return false;
      }
      return true;
    }
    if (sp.itemIndex > 0 && items[sp.itemIndex - 1].type === 'h') return false;
    return true;
  });

  let pointsToEvaluate = validSplitPoints.length > 0 ? validSplitPoints : splitPoints;
  if (pointsToEvaluate.length === 0) return;

  function renderSingleItemFast(col, item) {
    if (item.type === 'h') {
      col.insertAdjacentHTML('beforeend', item.html);
    } else {
      const p = document.createElement('p');
      p.className = 'p-end';
      p.innerHTML = createDropWord(item.rawText, item.isCont, item.isSingleLine);
      applyDelimiterStyles(p, 'body', getBodySizePt(), true);
      col.appendChild(p);
    }
  }

  let bestSplit = pointsToEvaluate[0];
  let minAbsDiff = Infinity;

  for (let sp of pointsToEvaluate) {
    rCol.innerHTML = '';
    for (let i = 0; i < sp.itemIndex; i++) renderSingleItemFast(rCol, items[i]);
    if (sp.lineIndex > 0) {
      let item = items[sp.itemIndex];
      let pRight = document.createElement('p');
      pRight.className = 'p-cut';
      let rightText = sp.lines.slice(0, sp.lineIndex).join(' ');
      pRight.innerHTML = createDropWord(rightText, item.isCont, false);
      rCol.appendChild(pRight);
    }
    let rHeight = rCol.scrollHeight;

    lCol.innerHTML = '';
    if (sp.lineIndex > 0) {
      let item = items[sp.itemIndex];
      let pLeft = document.createElement('p');
      pLeft.className = 'p-end';
      let leftText = sp.lines.slice(bestSplit.lineIndex).join(' ');
      pLeft.innerHTML = createDropWord(leftText, true, false);
      lCol.appendChild(pLeft);
    }
    for (let i = sp.lineIndex > 0 ? sp.itemIndex + 1 : sp.itemIndex; i < items.length; i++) renderSingleItemFast(lCol, items[i]);
    let lHeight = lCol.scrollHeight;
    let diff = rHeight - lHeight;
    let absDiff = Math.abs(diff);
    
    if (absDiff < minAbsDiff || (absDiff === minAbsDiff && diff >= 0)) {
        minAbsDiff = absDiff;
        bestSplit = sp;
    }
  }

  rCol.innerHTML = '';
  lCol.innerHTML = '';
  const rMargin = block.querySelector('.right-margin');
  const lMargin = block.querySelector('.left-margin');
  rMargin.innerHTML = '';
  lMargin.innerHTML = '';
  const finalNotes = [];

  function appendItemFinal(col, margin, item, isRight, isPartial, partialText, isCont) {
    if (item.type === 'h') {
      col.insertAdjacentHTML('beforeend', item.html);
    } else {
      const p = document.createElement('p');
      p.className = isPartial && isRight ? 'p-cut' : 'p-end';
      p.setAttribute('data-token-id', item.id);
      
      let textToRender = isPartial ? partialText : item.rawText;
      p.setAttribute('data-raw-text', textToRender);
      p.setAttribute('data-is-cont', isCont ? 'true' : 'false');
      if (item.sideNote) p.setAttribute('data-side-note', item.sideNote);
      if (item.endNote) p.setAttribute('data-end-note', item.endNote);
      if (item.sideNoteStyleId) p.setAttribute('data-note-style-id', item.sideNoteStyleId);
      
      let isSingleLine = false;
      if (!isPartial) {
          isSingleLine = item.isSingleLine;
      } else {
          let linesInfo = getLinesFromParagraph(textToRender, colWidth, styleObj, !isCont);
          isSingleLine = linesInfo.lines.length <= 1;
      }
      
      p.innerHTML = createDropWord(textToRender, isCont, isSingleLine);
      applyDelimiterStyles(p, 'body', getBodySizePt(), false);

      if (item.endNote && !isCont) {
        const marker = createNoteMarkerAndQueue(item.endNote, null, 'endnote');
        p.appendChild(marker);
      }

      col.appendChild(p);

      if (item.sideNote && !isCont) {
        const noteElem = document.createElement('div');
        noteElem.className = 'side-note-anchor';
        noteElem.textContent = item.sideNote;
        if (item.sideNoteStyleId) {
          const inst = findExtTextStyle(item.sideNoteStyleId);
          if (inst) applyExtStyleToNode(noteElem, inst.def.style, 6);
        }
        margin.appendChild(noteElem);
        finalNotes.push({ elem: noteElem, pElem: p });
      }
    }
  }

  for (let i = 0; i < bestSplit.itemIndex; i++) appendItemFinal(rCol, rMargin, items[i], true, false, null, items[i].isCont);
  if (bestSplit.lineIndex > 0) {
    let item = items[bestSplit.itemIndex];
    let rightText = bestSplit.lines.slice(0, bestSplit.lineIndex).join(' ');
    appendItemFinal(rCol, rMargin, item, true, true, rightText, item.isCont);
    let leftText = bestSplit.lines.slice(bestSplit.lineIndex).join(' ');
    appendItemFinal(lCol, lMargin, item, false, true, leftText, true);
  }
  for (let i = bestSplit.lineIndex > 0 ? bestSplit.itemIndex + 1 : bestSplit.itemIndex; i < items.length; i++) {
    appendItemFinal(lCol, lMargin, items[i], false, false, null, items[i].isCont);
  }

  let finalDiff = rCol.scrollHeight - lCol.scrollHeight;
  if (Math.max(rCol.scrollHeight, lCol.scrollHeight) <= availableHeight) {
    if (finalDiff > 2 && finalDiff <= 60) {
        justifyColumnVertically(lCol, rCol.scrollHeight, styleObj);
    } else if (finalDiff < -2 && Math.abs(finalDiff) <= 60) {
        justifyColumnVertically(rCol, lCol.scrollHeight, styleObj);
    }
  }

  finalizeNotePositions(finalNotes, Math.max(rCol.scrollHeight, lCol.scrollHeight));
}

function finalizeNotePositions(notesList, columnBoundaryHeight) {
  const byMargin = new Map();
  notesList.forEach(item => {
    if (!item.elem || !item.pElem) return;
    const marg = item.elem.parentElement;
    if (!marg) return;
    if (!byMargin.has(marg)) byMargin.set(marg, []);
    byMargin.get(marg).push(item);
  });
  byMargin.forEach(group => {
    group.sort((a, b) => a.pElem.offsetTop - b.pElem.offsetTop);
    group.forEach((item, idx) => {
      const noteHeight = item.elem.getBoundingClientRect().height || item.elem.offsetHeight || 0;
      let top = item.pElem.offsetTop;
      if (top + noteHeight > columnBoundaryHeight) {
        const prev = idx > 0 ? group[idx - 1] : null;
        const prevBottom = prev ? (parseFloat(prev.elem.style.top || 0) + (prev.elem.getBoundingClientRect().height || 0)) : 0;
        const minTop = prev ? prevBottom + 6 : 0;
        const raisedTop = columnBoundaryHeight - noteHeight;
        if (raisedTop >= minTop) {
          top = raisedTop;
        } else {
          const tokenId = item.pElem.getAttribute('data-token-id');
          const contElem = tokenId ? document.querySelector('p[data-token-id="' + tokenId + '"][data-is-cont="true"]') : null;
          if (contElem && contElem !== item.pElem) {
            const page = contElem.closest('.a4-page');
            const isRightCol = !!contElem.closest('.right-col');
            const destMargin = page ? page.querySelector(isRightCol ? '.right-margin' : '.left-margin') : null;
            if (destMargin) {
              const next = idx < group.length - 1 ? group[idx + 1] : null;
              const maxTop = next ? (parseFloat(next.elem.style.top || Infinity) - noteHeight - 6) : Infinity;
              const contTop = contElem.offsetTop;
              if (contTop <= maxTop) {
                destMargin.appendChild(item.elem);
                top = contTop;
              }
            }
          }
        }
      }
      item.elem.style.top = top + 'px';
    });
  });
}

function findDelimiterMatches(text, hostContextKey) {
  const activeStyles = [];

  const fnOpen = document.getElementById('fn-delim-open')?.value?.trim();
  const fnClose = document.getElementById('fn-delim-close')?.value?.trim();
  if (fnOpen && fnClose) {
    activeStyles.push({
      def: { trigger: { type: 'delimiterPair', open: fnOpen, close: fnClose }, target: 'footnote' },
      instanceId: 'builtin-footnote'
    });
  }

  if (typeof importedTextStyles !== 'undefined') {
    importedTextStyles.forEach(inst => {
      const trig = inst.def && inst.def.trigger;
      if (!trig || trig.type !== 'delimiterPair' || !trig.open || !trig.close) return;
      const scope = trig.appliesWithin;
      if (scope && scope.textStyles && scope.textStyles.length && scope.textStyles.indexOf(hostContextKey) === -1) return;
      activeStyles.push(inst);
    });
  }

  if (!activeStyles.length) return [];

  let matches = [];
  activeStyles.forEach(inst => {
    const trig = inst.def.trigger;
    let searchFrom = 0;
    while (true) {
      const oIdx = text.indexOf(trig.open, searchFrom);
      if (oIdx === -1) break;
      const cIdx = text.indexOf(trig.close, oIdx + trig.open.length);
      if (cIdx === -1) break;
      matches.push({ start: oIdx, end: cIdx + trig.close.length, inst });
      searchFrom = cIdx + trig.close.length;
    }
  });
  matches.sort((a, b) => a.start - b.start);
  const dedup = [];
  let lastEnd = -1;
  matches.forEach(m => { if (m.start >= lastEnd) { dedup.push(m); lastEnd = m.end; } });
  return dedup;
}

function applyDelimiterStyles(containerEl, hostContextKey, hostSizePt, isDryRun = false) {
  const effHostSize = hostSizePt || 12;

  const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let n;
  while (n = walker.nextNode()) textNodes.push(n);

  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    const dedup = findDelimiterMatches(text, hostContextKey);
    if (!dedup.length) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    dedup.forEach(m => {
      if (m.start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
      if (m.inst.def.target === 'footnote' || m.inst.def.target === 'endnote') {
        const openLen = m.inst.def.trigger.open.length, closeLen = m.inst.def.trigger.close.length;
        const innerText = text.slice(m.start + openLen, m.end - closeLen);
        
        if (isDryRun) {
          const dummyMarker = document.createElement('a');
          dummyMarker.className = 'note-marker';
          dummyMarker.textContent = 'א';
          applyNoteMarkerStyle(dummyMarker, false);
          frag.appendChild(dummyMarker);
        } else {
          const marker = createNoteMarkerAndQueue(innerText, m.inst.instanceId, m.inst.def.target);
          frag.appendChild(marker);
        }
      } else {
        const span = document.createElement('span');
        span.textContent = text.slice(m.start, m.end);
        applyExtStyleToNode(span, m.inst.def.style, effHostSize);
        frag.appendChild(span);
      }
      cursor = m.end;
    });
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.parentNode.replaceChild(frag, textNode);
  });
}

function getHostSizePt(level, customStyleId) {
  if (customStyleId && typeof findExtTextStyle === 'function') {
    const inst = findExtTextStyle(customStyleId);
    if (inst && inst.def.style && typeof inst.def.style.size === 'number') return inst.def.style.size;
    return 12;
  }
  const el = document.getElementById('s-h' + level);
  return el ? parseFloat(el.value) : 12;
}

function getBodySizePt() {
  const el = document.getElementById('size-body');
  return el ? parseFloat(el.value) : 12;
}

function getNoteConfig(styleId) {
  const inst = (typeof findExtTextStyle === 'function') ? findExtTextStyle(styleId) : null;
  return (inst && inst.def.noteConfig) || {};
}

function formatNoteMarker(n, styleId) {
  const cfg = getNoteConfig(styleId);
  const globalNumStyle = document.getElementById('note-numbering-style')?.value || 'gematria';
  const numStyle = cfg.numberingStyle || globalNumStyle;
  if (numStyle === 'decimal' || numStyle === 'numeric') {
    return String(n);
  }
  return toGematria(n) || String(n);
}

function resetNoteCounterIfNeeded(target, trigger) {
  let shouldReset = false;
  if (target === 'footnote' && trigger === 'page') shouldReset = true;
  if (target === 'endnote' && trigger === 'part') shouldReset = true;

  if (typeof importedTextStyles !== 'undefined') {
    importedTextStyles.forEach(inst => {
      if (inst.def && inst.def.target === target) {
        const resetAt = (inst.def.noteConfig && inst.def.noteConfig.resetAt) || (target === 'footnote' ? 'page' : 'part');
        if (resetAt === trigger) shouldReset = true;
      }
    });
  }

  if (shouldReset) {
    noteCounters[target] = 0;
  }
}

function applyNoteMarkerStyle(el, isBacklink) {
  const typeEl = document.getElementById('note-marker-type');
  const sizeEl = isBacklink ? document.getElementById('note-listing-num-size') : document.getElementById('note-marker-size');
  const type = (!isBacklink && typeEl) ? typeEl.value : 'normal';
  const size = sizeEl ? parseFloat(sizeEl.value) : 8;
  el.style.fontSize = size + 'pt';
  el.style.fontWeight = '700';
  el.style.textDecoration = 'none';
  el.style.color = 'inherit';
  el.style.cursor = 'pointer';
  if (type === 'super') { el.style.verticalAlign = 'super'; el.style.lineHeight = '0'; }
  else if (type === 'sub') { el.style.verticalAlign = 'sub'; el.style.lineHeight = '0'; }
  else { el.style.verticalAlign = 'baseline'; }
  if (!isBacklink && type === 'brackets') { el.textContent = '[' + el.textContent + ']'; }
}

function createNoteMarkerAndQueue(text, styleId, target) {
  noteCounters[target] = (noteCounters[target] || 0) + 1;
  const num = noteCounters[target];
  const markerText = formatNoteMarker(num, styleId);
  const uid = 'n' + (noteUidCounter++);
  const marker = document.createElement('a');
  marker.className = 'note-marker';
  marker.href = '#note-' + uid;
  marker.id = 'noteref-' + uid;
  marker.textContent = markerText;
  applyNoteMarkerStyle(marker, false);
  const item = { number: markerText, text: text, styleId: styleId, uid: uid };
  if (target === 'footnote') footnoteQueueForPage.push(item);
  else endnoteQueueForPart.push(item);
  return marker;
}

function buildNoteBlockElement(queue, columns) {
  const wrap = document.createElement('div');
  wrap.className = 'note-block';
  if (columns === 2) wrap.style.columnCount = '2';
  const sepEl = document.getElementById('note-num-separator');
  const globalSep = sepEl ? sepEl.value : '.';
  queue.forEach(item => {
    const line = document.createElement('div');
    line.className = 'note-line';
    line.id = 'note-' + item.uid;
    const num = document.createElement('a');
    num.className = 'note-line-num';
    num.href = '#noteref-' + item.uid;
    num.textContent = item.number + globalSep + ' ';
    applyNoteMarkerStyle(num, true);
    const body = document.createElement('span');
    body.textContent = item.text;
    const inst = (typeof findExtTextStyle === 'function') ? findExtTextStyle(item.styleId) : null;
    if (inst && inst.def.style) applyExtStyleToNode(body, inst.def.style, 10);
    line.appendChild(num); line.appendChild(body);
    wrap.appendChild(line);
  });
  return wrap;
}

function flushFootnotesInto(pageEl) {
  if (!footnoteQueueForPage.length) { 
    resetNoteCounterIfNeeded('footnote', 'page'); 
    return; 
  }
  const cfg0 = getNoteConfig(footnoteQueueForPage[0].styleId);
  const rule = buildNoteRuleElement();
  const block = buildNoteBlockElement(footnoteQueueForPage, cfg0.columns || 1);
  const area = document.createElement('div');
  area.className = 'footnote-area';
  area.appendChild(rule);
  area.appendChild(block);

  const wrapper = pageEl.querySelector('.page-content-wrapper');
  const footer = pageEl.querySelector('.page-number-footer');
  if (wrapper && footer) {
    wrapper.insertBefore(area, footer);
  } else {
    pageEl.appendChild(area);
  }

  footnoteQueueForPage = [];
  resetNoteCounterIfNeeded('footnote', 'page');
}

function flushEndnotesForPart(container, pIdx) {
  if (!endnoteQueueForPart.length) { resetNoteCounterIfNeeded('endnote', 'part'); return 0; }
  const cfg0 = getNoteConfig(endnoteQueueForPart[0].styleId);
  const columns = cfg0.columns || 1;
  let pagesUsed = 0;
  let remaining = endnoteQueueForPart.slice();
  while (remaining.length) {
    const page = document.createElement('div');
    page.className = 'a4-page';
    applyContentBg(page, 'regular');
    const title = document.createElement('div');
    title.className = 'title-level-2-standalone';
    title.textContent = pagesUsed === 0 ? 'הערות' : 'הערות (המשך)';
    page.appendChild(title);
    const wrap = document.createElement('div');
    wrap.className = 'note-block endnote-page-block';
    if (columns === 2) wrap.style.columnCount = '2';
    page.appendChild(wrap);
    container.appendChild(page);
    let fit = 0;
    for (let i = 0; i < remaining.length; i++) {
      const testBlock = buildNoteBlockElement(remaining.slice(0, i + 1), columns);
      wrap.innerHTML = ''; wrap.appendChild(testBlock);
      if (wrap.scrollHeight > page.clientHeight - 60 && i > 0) { break; }
      fit = i + 1;
    }
    remaining = remaining.slice(fit);
    pagesUsed++;
    if (pagesUsed > 200) break;
  }
  endnoteQueueForPart = [];
  resetNoteCounterIfNeeded('endnote', 'part');
  return pagesUsed;
}

function measureNoteBlockHeight(queue, columns) {
  if (!queue.length) return 0;
  const probe = buildNoteBlockElement(queue, columns);
  probe.style.position = 'absolute'; probe.style.visibility = 'hidden';
  // רוחב המדידה מותאם בדיוק לרוחב גוף הטקסט (ללא הערות הצד)
  const wMargin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-margin')) || 7.5;
  const wGap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-gap')) || 2;
  const pct = 100 - 2 * (wMargin + wGap);
  probe.style.width = `calc(180mm * ${pct / 100})`;
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  document.body.removeChild(probe);
  return h;
}

function appendMainSubParts(hostElem, mainText, subText, def) {
  const mainPart = document.createElement('div');
  mainPart.textContent = mainText.trim();
  applyExtStyleToNode(mainPart, def.style, 14);
  hostElem.appendChild(mainPart);
  if (subText && subText.trim()) {
    const subPart = document.createElement('div');
    subPart.textContent = subText.trim();
    subPart.style.fontSize = '0.68em'; subPart.style.opacity = '0.78'; subPart.style.marginTop = '3px';
    hostElem.appendChild(subPart);
  }
}

function renderCustomHeadingInto(hostElem, inst, text) {
  const def = inst.def;
  hostElem.innerHTML = '';

  if (def.parseMode === 'splitFirstDash' && /[-–—]/.test(text)) {
    appendMainSubParts(hostElem, text.split(/[-–—]/)[0], text.split(/[-–—]/).slice(1).join(' - '), def);
    return;
  }

  if (def.parseMode === 'splitCustomDelimiter' && def.parseDelimiter && text.indexOf(def.parseDelimiter) > -1) {
    const idx = text.indexOf(def.parseDelimiter);
    appendMainSubParts(hostElem, text.slice(0, idx), text.slice(idx + def.parseDelimiter.length), def);
    return;
  }

  if (def.parseMode === 'regexGroups' && def.parseRegex) {
    let match = null;
    try {
      match = text.match(new RegExp(def.parseRegex));
    } catch (e) {
      console.warn('סגנון "' + def.name + '": ביטוי רגולרי לא תקין (' + def.parseRegex + ') — ' + e.message);
    }
    if (match && match.groups && Object.keys(match.groups).length) {
      const vals = Object.values(match.groups).filter(v => v !== undefined);
      if (vals.length) {
        appendMainSubParts(hostElem, vals[0], vals.slice(1).join(' '), def);
        return;
      }
    }
  }

  hostElem.textContent = text;
  applyExtStyleToNode(hostElem, def.style, 12);
}

function buildStructuredTOC(tokenList, showLevels, groupLevels) {
  const entries = [];
  const minGroupLevel = groupLevels.length > 0 ? Math.min(...groupLevels) : 99;
  let currentGroupItems = [];

  function flushGroup() {
    if (currentGroupItems.length > 0) {
      entries.push({ isGroup: true, items: currentGroupItems.slice() });
      currentGroupItems = [];
    }
  }

  tokenList.forEach(t => {
    const lvl = t.type.startsWith('h') ? t.level : (t.sideNote ? 7 : null);
    const txt = t.type.startsWith('h') ? t.text : t.sideNote;
    if (lvl === null || !txt) return;
    if (!showLevels.includes(lvl)) return;

    if (lvl >= minGroupLevel) {
      currentGroupItems.push({ id: t.id, level: lvl, text: txt });
    } else {
      flushGroup();
      entries.push({ id: t.id, level: lvl, text: txt, isGroup: false });
    }
  });

  flushGroup();
  return entries;
}
function renderPaginatedTOC(container, entries, titleText, bookTitle, h1Title, pageIndex, curH1, curH2, tocPrefix) {
  if (entries.length === 0) return 0;

  let pagesCount = 0;
  let currentEntryIdx = 0;
  let lastRenderedGrid = null;
  let lastRenderedPage = null;

  const hdrRType = document.getElementById('hdr-r-type').value;
  const hdrCType = document.getElementById('hdr-c-type').value;
  const hdrLType = document.getElementById('hdr-l-type').value;
  const hdrRAlign = document.getElementById('hdr-r-align').value;
  const hdrCAlign = document.getElementById('hdr-c-align').value;
  const hdrLAlign = document.getElementById('hdr-l-align').value;
  
  const customR = document.getElementById('hdr-r-custom') ? document.getElementById('hdr-r-custom').value : '';
  const customC = document.getElementById('hdr-c-custom') ? document.getElementById('hdr-c-custom').value : '';
  const customL = document.getElementById('hdr-l-custom') ? document.getElementById('hdr-l-custom').value : '';

  const hdrRHTML = renderHeaderSectionHTML(hdrRType, customR, curH1 || titleText, curH2 || titleText, '', bookTitle, titleText);
  const hdrCHTML = renderHeaderSectionHTML(hdrCType, customC, curH1 || titleText, curH2 || titleText, '', bookTitle, titleText);
  const hdrLHTML = renderHeaderSectionHTML(hdrLType, customL, curH1 || titleText, curH2 || titleText, '', bookTitle, titleText);

  function getTocStyle(level) {
    const f = document.getElementById(`f-${tocPrefix}-${level}`);
    const s = document.getElementById(`s-${tocPrefix}-${level}`);
    if(f && s) return `font-family: ${f.value}; font-size: ${s.value}pt;`;
    return '';
  }

  while (currentEntryIdx < entries.length) {
    const isFirstTOCPage = (pagesCount === 0);
    pagesCount++;

    const page = document.createElement('div');
    page.className = 'a4-page toc-page';
    page.setAttribute('data-page-index', String(pageIndex + pagesCount - 1));
    applyContentBg(page, isFirstTOCPage ? 'tocFirst' : 'tocRegular');
    lastRenderedPage = page;
    
    page.innerHTML = `
      <div class="page-content-wrapper">
        <div class="top-header-grid">
          <div class="header-col-r" style="text-align:${hdrRAlign};">${hdrRHTML}</div>
          <div class="header-col-c" style="text-align:${hdrCAlign};">${hdrCHTML}</div>
          <div class="header-col-l" style="text-align:${hdrLAlign};">${hdrLHTML}</div>
        </div>
        <div class="page-body-flow">
          ${isFirstTOCPage ? `<div class="h2-spacer"></div><div class="title-level-2-standalone" style="margin-top: 0; margin-bottom: 25px;">${titleText}</div>` : ''}
          <div class="toc-grid-full"></div>
        </div>
        <div class="page-number-footer">${toGematria(pageIndex + pagesCount - 1)}</div>
      </div>
    `;
    container.appendChild(page);

    const gridFull = page.querySelector('.toc-grid-full');
    lastRenderedGrid = gridFull;

    const bodyFlow = page.querySelector('.page-body-flow');
    const maxH = bodyFlow.clientHeight || 870;

    let pageStartIndex = currentEntryIdx;
    let lastSubjectIdx = currentEntryIdx; 

    while (currentEntryIdx < entries.length) {
      const it = entries[currentEntryIdx];
      
      if (!it.isGroup && (it.level === 1 || it.level === 2)) {
         lastSubjectIdx = currentEntryIdx;
      }

      let itemHTML = '';
      
      if (it.isGroup) {
        const inlineSpans = it.items.map(grp => 
          `<span class="grp-item grp-lvl-${grp.level}" style="${getTocStyle(grp.level)}"><a href="#heading-tok-${grp.id}" style="text-decoration: none; color: inherit; outline: none;"><span class="grp-title">${grp.text}</span> - <span class="grp-page" data-target-id="${grp.id}"></span></a></span>`
        ).join('<span class="grp-sep">|</span>');
        itemHTML = `<div class="toc-entry-group"><div class="toc-grouped-block">${inlineSpans}</div></div>`;
      } else {
        itemHTML = `
          <div class="toc-entry-group" style="${getTocStyle(it.level)}">
            <a href="#heading-tok-${it.id}" class="toc-item toc-lvl-${it.level}" style="text-decoration: none; color: inherit; outline: none;">
              <span class="toc-title">${it.text}</span>
              <span class="toc-dots"></span>
              <span class="toc-page-num" data-target-id="${it.id}"></span>
            </a>
          </div>
        `;
      }

      gridFull.insertAdjacentHTML('beforeend', itemHTML);
      
      if (bodyFlow.scrollHeight > maxH) {
        gridFull.lastElementChild.remove();
        
        if (gridFull.children.length > 0) {
            if (lastSubjectIdx > pageStartIndex) {
                const itemsToRemove = currentEntryIdx - lastSubjectIdx;
                for (let k = 0; k < itemsToRemove; k++) {
                    gridFull.lastElementChild.remove();
                }
                currentEntryIdx = lastSubjectIdx;
            }
            break;
        } else {
            gridFull.insertAdjacentHTML('beforeend', itemHTML);
            currentEntryIdx++;
            break;
        }
      }
      
      currentEntryIdx++;
    }
  }

  if (lastRenderedGrid) {
    lastRenderedGrid.style.justifyContent = 'flex-start';
  }
  if (lastRenderedPage) {
    applyContentBg(lastRenderedPage, 'tocLast');
  }

  return pagesCount;
}

/* ==========================================================================
   7. מנוע העימוד המלא (Main Typesetting Function)
   ========================================================================== */
function typesetDocument() {
  updateGrid();
  updateStyles();

  noteCounters = { footnote: 0, endnote: 0 };
  noteUidCounter = 0;
  footnoteQueueForPage = [];
  endnoteQueueForPart = [];

  const pageBreaks = [];
  const recordedBreakLines = new Set();

  function recordPageBreak(pNum, lineIdx) {
    if (lineIdx === undefined || lineIdx === null || lineIdx < 0) return;
    if (pNum <= 1 || recordedBreakLines.has(lineIdx)) return;
    recordedBreakLines.add(lineIdx);
    pageBreaks.push({
      pageNum: pNum,
      gematria: toGematria(pNum),
      lineIdx: lineIdx
    });
  }

  let rawText = document.getElementById('raw-input').value;
  if (!rawText.trim()) return;

  // 1. סינון הערות עריכה (##...##) מכלל המסמך
  rawText = stripEditorialNotes(rawText);
  rawText = parseMetadataFromText(rawText);

  // 2. פקדי מיספור סימנים לכותרת 2 ועיטורי כותרות מורחבים
  const autoSimanH2 = document.getElementById('h2-auto-siman')?.checked ?? false;
  const resetSimanOnH1 = document.getElementById('h2-reset-siman')?.checked ?? true;
  let simanCounter = 0;

  const h2OrnTopStyle = document.getElementById('h2-ornament-top-style')?.value || 'none';
  const h2OrnBtmStyle = document.getElementById('h2-ornament-bottom-style')?.value || 'none';
  const h3OrnR = document.getElementById('h3-ornament-r')?.value || 'none';
  const h3OrnL = document.getElementById('h3-ornament-l')?.value || 'none';

  const container = document.getElementById('book-container');
  container.innerHTML = '';

  const enLinePrefix = document.getElementById('en-line-prefix')?.value?.trim() || 'הערת סיום -';

  const lines = rawText.split('\n');
  const tokens = [];
  globalTokens = tokens;
  let pendingSideNote = null;
  let pendingSideNoteStyleId = null;
  let pendingEndNote = null;
  lineToTokenMap = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line) {
      lineToTokenMap[lineIdx] = null;
      continue;
    }

    if (enLinePrefix && line.startsWith(enLinePrefix)) {
      pendingEndNote = line.slice(enLinePrefix.length).replace(/^[:\-–—]\s*/, '').trim();
      lineToTokenMap[lineIdx] = null;
      continue;
    }

    const hMatch = line.match(/^כותרת\s*(\d+).*?[-–—]\s*(.*)$/);
    if (hMatch) {
      const lvl = parseInt(hMatch[1], 10);
      const txt = hMatch[2].trim();
      if (lvl === 7) {
        pendingSideNote = txt;
        pendingSideNoteStyleId = null;
        lineToTokenMap[lineIdx] = null;
      } else {
        const tokenObj = { id: tokens.length, type: 'h' + lvl, level: lvl, text: txt, lineIdx: lineIdx };
        tokens.push(tokenObj);
        lineToTokenMap[lineIdx] = tokenObj.id;
      }
    } else {
      let customMatch = null;
      if (typeof importedTextStyles !== 'undefined') {
        for (const inst of importedTextStyles) {
          const trig = inst.def && inst.def.trigger;
          if (trig && trig.type === 'linePrefix' && trig.prefix && line.startsWith(trig.prefix)) {
            customMatch = { inst, text: line.slice(trig.prefix.length).replace(/^[:\-–—]\s*/, '').trim() };
            break;
          }
        }
      }
      if (customMatch) {
        if (customMatch.inst.def.target === 'endnote') {
          pendingEndNote = customMatch.text;
          lineToTokenMap[lineIdx] = null;
        } else if (customMatch.inst.def.layoutMode === 'side_note') {
          pendingSideNote = customMatch.text;
          pendingSideNoteStyleId = customMatch.inst.instanceId;
          lineToTokenMap[lineIdx] = null;
        } else {
          const lvl = customMatch.inst.syntheticLevel;
          const tokenObj = { id: tokens.length, type: 'h' + lvl, level: lvl, text: customMatch.text, lineIdx: lineIdx, customStyleId: customMatch.inst.instanceId };
          tokens.push(tokenObj);
          lineToTokenMap[lineIdx] = tokenObj.id;
        }
      } else {
        const tokenObj = {
          id: tokens.length,
          type: 'p',
          text: line,
          sideNote: pendingSideNote,
          sideNoteStyleId: pendingSideNoteStyleId,
          endNote: pendingEndNote,
          lineIdx: lineIdx
        };
        tokens.push(tokenObj);
        lineToTokenMap[lineIdx] = tokenObj.id;
        pendingSideNote = null;
        pendingSideNoteStyleId = null;
        pendingEndNote = null;
      }
    }
  }

  const headingModes = {
    0: document.getElementById('mode-h0').value,
    1: document.getElementById('mode-h1').value,
    2: document.getElementById('mode-h2').value,
    3: document.getElementById('mode-h3').value,
    4: document.getElementById('mode-h4').value,
    5: document.getElementById('mode-h5').value,
    6: document.getElementById('mode-h6').value,
    7: document.getElementById('mode-h7').value
  };
  if (typeof importedTextStyles !== 'undefined') {
    importedTextStyles.forEach(inst => {
      if (inst.syntheticLevel != null) headingModes[inst.syntheticLevel] = inst.def.layoutMode;
    });
  }

  const oddPageRequired = {
    0: document.getElementById('odd-h0').checked,
    1: document.getElementById('odd-h1').checked,
    2: document.getElementById('odd-h2').checked
  };
  if (typeof importedTextStyles !== 'undefined') {
    importedTextStyles.forEach(inst => {
      if (inst.syntheticLevel != null) oddPageRequired[inst.syntheticLevel] = !!inst.def.startOnOddPage;
    });
  }

  function ensureOddPageStart(level) {
    if (!oddPageRequired[level]) return;
    if (pageIndex % 2 === 0) {
      const blank = document.createElement('div');
      blank.className = 'a4-page blank-page';
      container.appendChild(blank);
      pageIndex++;
    }
  }

  const sections = [];
  let currentSection = { type: 'body', tokens: [] };

  tokens.forEach(t => {
    const mode = t.type.startsWith('h') ? headingModes[t.level] : 'inline_2col';
    if (mode === 'sub_shaar') {
      if (currentSection.tokens.length > 0) sections.push(currentSection);
      sections.push({ type: 'sub_shaar', token: t, tokens: [] });
      currentSection = { type: 'body', tokens: [] };
    } else if (mode === 'new_page_1col') {
      if (currentSection.tokens.length > 0) sections.push(currentSection);
      currentSection = { type: 'body', isNewPage: true, hToken: t, tokens: [] };
    } else {
      currentSection.tokens.push(t);
    }
  });
  if (currentSection.tokens.length > 0 || currentSection.type === 'sub_shaar' || currentSection.isNewPage) {
    sections.push(currentSection);
  }

  const gtocShows = Array.from(document.querySelectorAll('.gtoc-show:checked')).map(cb => parseInt(cb.value, 10));
  const gtocGroups = Array.from(document.querySelectorAll('.gtoc-grp:checked')).map(cb => parseInt(cb.value, 10));
  if (typeof importedTextStyles !== 'undefined') {
    importedTextStyles.forEach(inst => {
      if (inst.syntheticLevel != null && inst.def.toc && inst.def.toc.include) {
        gtocShows.push(inst.syntheticLevel);
        if (inst.def.toc.grouping) gtocGroups.push(inst.syntheticLevel);
      }
    });
  }

  const headingPageMap = {};
  let pageIndex = 1;
  let currentH1Title = '';
  let currentH2Title = '';
  let currentH3Title = '';

  const bookTitle = document.getElementById('inp-book-title').value || "ספר";
  const showMainShaar = document.getElementById('show-main-shaar').checked;
  const showBackShaar = document.getElementById('show-back-shaar').checked;
  const activeThemeId = document.getElementById('active-theme-select').value;
  const secDivStyle = document.getElementById('section-divider-style').value;
  const enableGeneralTOC = document.getElementById('enable-general-toc').checked;
  const enableDetailedTOC = document.getElementById('enable-detailed-toc').checked;

  const customR = document.getElementById('hdr-r-custom') ? document.getElementById('hdr-r-custom').value : '';
  const customC = document.getElementById('hdr-c-custom') ? document.getElementById('hdr-c-custom').value : '';
  const customL = document.getElementById('hdr-l-custom') ? document.getElementById('hdr-l-custom').value : '';

  if (showMainShaar) {
    renderExtAnchor(container, 'beforeAll', rawText);
    renderMainShaar(container, activeThemeId);
    renderExtAnchor(container, 'afterMainShaar', rawText);
  } else {
    renderExtAnchor(container, 'beforeAll', rawText);
  }

  if (showBackShaar) {
    renderBackShaar(container, activeThemeId);
  }

  if (enableGeneralTOC) {
    const generalTocEntries = buildStructuredTOC(tokens, gtocShows, gtocGroups);
    const pagesRendered = renderPaginatedTOC(
      container, 
      generalTocEntries, 
      "תוכן העניינים הכללי", 
      bookTitle, 
      "תוכן העניינים הכללי", 
      pageIndex,
      "תוכן העניינים הכללי", "תוכן העניינים הכללי",
      "gtoc"
    );
    pageIndex += pagesRendered;
  }
  renderExtAnchor(container, 'afterGeneralToc', rawText);

  const styleObj = {
    fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--fn-body'),
    fontSize: getComputedStyle(document.documentElement).getPropertyValue('--sz-body'),
    lineHeight: '1.34'
  };

  function getFootnotesReservedHeight() {
    if (!footnoteQueueForPage.length) return 0;
    const cfg0 = getNoteConfig(footnoteQueueForPage[0].styleId);
    return measureNoteBlockHeight(footnoteQueueForPage, cfg0.columns || 1) + 24;
  }

  let hasOpenPart = false;
  let prevPageEl = null;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];

    if (sec.type === 'sub_shaar') {
      if (prevPageEl) { flushFootnotesInto(prevPageEl); prevPageEl = null; }
      if (hasOpenPart) { flushEndnotesForPart(container, pageIndex); renderExtAnchor(container, 'endOfEachPart', rawText); }
      renderExtAnchor(container, 'beforeEachPart', rawText);
      hasOpenPart = true;

      // איפוס מונה הסימנים בעת מעבר לחלק חדש
      if (resetSimanOnH1) simanCounter = 0;

      ensureOddPageStart(sec.token.level);
      renderSubShaar(container, sec.token, activeThemeId);
      const subShaarPage = container.lastElementChild;
      if (subShaarPage) {
        subShaarPage.setAttribute('data-page-index', String(pageIndex));
        subShaarPage.setAttribute('data-first-line-idx', String(sec.token.lineIdx));
      }
      recordPageBreak(pageIndex, sec.token.lineIdx);
      if (sec.token.customStyleId) {
        const inst = findExtTextStyle(sec.token.customStyleId);
        const justRendered = container.lastElementChild;
        if (inst && justRendered) {
          const tEl = justRendered.querySelector('.book-title-main');
          const sEl = justRendered.querySelector('.book-subtitle');
          if (tEl) applyExtStyleToNode(tEl, inst.def.style, 36);
          if (sEl) applyExtStyleToNode(sEl, inst.def.style, 21);
        }
      }
      currentH1Title = sec.token.text.split(/[-–—]/)[0].trim();
      headingPageMap[sec.token.id] = toGematria(pageIndex);

      if (enableDetailedTOC) {
        let inThisH1 = false;
        const thisH1Tokens = [];

        for (let t of tokens) {
          if (t.id === sec.token.id) { inThisH1 = true; continue; }
          if (inThisH1 && t.type.startsWith('h') && headingModes[t.level] === 'sub_shaar') break;
          if (inThisH1) thisH1Tokens.push(t);
        }

        const dtocShows = Array.from(document.querySelectorAll('.dtoc-show:checked')).map(cb => parseInt(cb.value, 10));
        const dtocGroups = Array.from(document.querySelectorAll('.dtoc-grp:checked')).map(cb => parseInt(cb.value, 10));
        if (typeof importedTextStyles !== 'undefined') {
          importedTextStyles.forEach(inst => {
            if (inst.syntheticLevel != null && inst.def.toc && inst.def.toc.include) {
              dtocShows.push(inst.syntheticLevel);
              if (inst.def.toc.grouping) dtocGroups.push(inst.syntheticLevel);
            }
          });
        }
        const detailedTocEntries = buildStructuredTOC(thisH1Tokens, dtocShows, dtocGroups);
        const dtocPages = renderPaginatedTOC(
          container, 
          detailedTocEntries, 
          "מפתח ולוח עניינים מפורט", 
          currentH1Title, 
          "תוכן העניינים המפורט", 
          pageIndex,
          currentH1Title, "תוכן העניינים המפורט",
          "dtoc"
        );
        pageIndex += dtocPages;
      }
      renderExtAnchor(container, 'afterEachPart', rawText);
      continue;
    }

    let isFirstPage = true;
    let rawH2Text = sec.isNewPage ? sec.hToken.text : '';
    let h2Id = sec.isNewPage ? sec.hToken.id : undefined;
    let isH0 = sec.isNewPage && sec.hToken.level === 0;

    let simanLabel = '';
    let displayH2Text = rawH2Text;
    let h2Text = rawH2Text;

    // חישוב מיספור סימנים אוטומטי לכותרת 2
    if (autoSimanH2 && sec.isNewPage && sec.hToken && sec.hToken.level === 2) {
      simanCounter++;
      simanLabel = 'סימן ' + toGematria(simanCounter);
      displayH2Text = rawH2Text.replace(/^סימן\s+[א-ת]+[:\-–—\s]*/i, '').trim();
      h2Text = simanLabel + (displayH2Text ? ' - ' + displayH2Text : '');
    }

    if (h2Text) {
      currentH2Title = h2Text;
      headingPageMap[h2Id] = toGematria(pageIndex);
    }

    let secTokens = sec.tokens.slice();
    let tokenIndex = 0;
    let pendingWordTokens = null;

    while (tokenIndex < secTokens.length || pendingWordTokens) {
      if (prevPageEl) flushFootnotesInto(prevPageEl);
      if (isFirstPage && h2Text && sec.hToken) ensureOddPageStart(sec.hToken.level);
      const pageRole = isFirstPage ? (isH0 ? 'h0Open' : (h2Text ? 'h2Open' : 'regular')) : 'regular';
      let pageLayout = createPageLayout(
        container, 
        isFirstPage ? h2Text : '', 
        isFirstPage ? h2Id : undefined, 
        pageIndex, 
        currentH1Title, 
        currentH2Title,
        currentH3Title,
        bookTitle,
        customR, customC, customL,
        pageRole
      );
      pageIndex++;
      prevPageEl = pageLayout.page;

      const firstLineIdxOnPage = (isFirstPage && h2Text && sec.hToken)
        ? sec.hToken.lineIdx
        : (pendingWordTokens ? pendingWordTokens.token.lineIdx : (secTokens[tokenIndex] ? secTokens[tokenIndex].lineIdx : null));

      if (firstLineIdxOnPage !== null && firstLineIdxOnPage !== undefined) {
        pageLayout.page.setAttribute('data-first-line-idx', String(firstLineIdxOnPage));
        recordPageBreak(pageIndex - 1, firstLineIdxOnPage);
      }
      
      // תיקון: גובה העמוד הזמין מחושב במלואו עד לתחתית הדף (ללא קיטום מלאכותי)
      let totalFlowH = pageLayout.bodyFlow.clientHeight || 870;
      let used = 0;
      if (isFirstPage && h2Text) {
         const spacer = pageLayout.bodyFlow.querySelector('.h2-spacer');
         const title = pageLayout.bodyFlow.querySelector('.title-level-2-standalone');
         if (title) {
            if (sec.hToken.customStyleId) {
               const inst = findExtTextStyle(sec.hToken.customStyleId);
               if (inst) renderCustomHeadingInto(title, inst, displayH2Text || h2Text);
            } else if (displayH2Text) {
               title.textContent = displayH2Text;
            }

            // הוספת שורת סימן מעל כותרת 2
            if (simanLabel) {
               const simanElem = document.createElement('div');
               simanElem.className = 'h2-siman-badge';
               simanElem.textContent = simanLabel;
               title.parentNode.insertBefore(simanElem, title);
            }

            // עיטור עליון לכותרת 2 (נבחר בנפרד)
            if (h2OrnTopStyle && h2OrnTopStyle !== 'none') {
               const topOrnHTML = getHeadingOrnamentHTML(h2OrnTopStyle);
               if (topOrnHTML) {
                  const ornWrap = document.createElement('div');
                  ornWrap.className = 'h2-ornament-top';
                  ornWrap.innerHTML = topOrnHTML;
                  const insertBeforeEl = title.previousElementSibling?.classList.contains('h2-siman-badge')
                     ? title.previousElementSibling : title;
                  insertBeforeEl.parentNode.insertBefore(ornWrap, insertBeforeEl);
               }
            }

            // עיטור תחתון לכותרת 2 (נבחר בנפרד)
            if (h2OrnBtmStyle && h2OrnBtmStyle !== 'none') {
               const btmOrnHTML = getHeadingOrnamentHTML(h2OrnBtmStyle);
               if (btmOrnHTML) {
                  const ornWrap = document.createElement('div');
                  ornWrap.className = 'h2-ornament-bottom';
                  ornWrap.innerHTML = btmOrnHTML;
                  title.parentNode.insertBefore(ornWrap, title.nextSibling);
               }
            }
         }

         if (spacer) used += spacer.getBoundingClientRect().height;
         const headerEls = pageLayout.bodyFlow.querySelectorAll('.h2-ornament-top, .h2-siman-badge, .title-level-2-standalone, .h2-ornament-bottom');
         headerEls.forEach(el => {
            used += el.getBoundingClientRect().height;
            const st = window.getComputedStyle(el);
            used += (parseFloat(st.marginTop) || 0) + (parseFloat(st.marginBottom) || 0);
         });
      }

      // הגובה הנותר ממלא בדיוק את כל אורך הדף עד למרחק הקבוע מהתחתית
      let remPageHeight = isFirstPage ? (totalFlowH - used) : totalFlowH;
      isFirstPage = false;

      if (isH0) {
        const singleBlock = document.createElement('div');
        singleBlock.className = 'block-single-col';
        singleBlock.innerHTML = `<div class="single-wide-col"></div>`;
        pageLayout.bodyFlow.appendChild(singleBlock);
        const targetCol = singleBlock.querySelector('.single-wide-col');
        let pageHasContent = false;

        while (tokenIndex < secTokens.length || pendingWordTokens) {
          const currentAvailH = remPageHeight - getFootnotesReservedHeight();
          if (targetCol.scrollHeight >= currentAvailH - 10 && targetCol.children.length > 0) {
            break;
          }

          let currentTok = pendingWordTokens ? pendingWordTokens.token : secTokens[tokenIndex];

          if (currentTok.type.startsWith('h')) {
            if (currentTok.level === 3) currentH3Title = currentTok.text;
            const hElem = document.createElement('div');
            hElem.className = currentTok.customStyleId ? 'title-level-custom' : `title-level-${currentTok.level}`;
            hElem.setAttribute('data-token-id', currentTok.id);
            if (currentTok.customStyleId) {
              const inst = findExtTextStyle(currentTok.customStyleId);
              if (inst) renderCustomHeadingInto(hElem, inst, currentTok.text); else hElem.textContent = currentTok.text;
            } else {
              hElem.textContent = currentTok.text;
            }
            applyDelimiterStyles(hElem, 'h' + currentTok.level, getHostSizePt(currentTok.level, currentTok.customStyleId), false);
            targetCol.appendChild(hElem);
            
            if (targetCol.scrollHeight > (remPageHeight - getFootnotesReservedHeight()) && targetCol.children.length > 1) {
              targetCol.removeChild(hElem);
              break;
            }

            if (document.getElementById('avoid-widows-select').value === 'yes'
                && (tokenIndex + 1 < secTokens.length)
                && ((remPageHeight - getFootnotesReservedHeight()) - targetCol.scrollHeight < 30)
                && targetCol.children.length > 1) {
              targetCol.removeChild(hElem);
              break;
            }
            
            headingPageMap[currentTok.id] = toGematria(pageIndex - 1);
            tokenIndex++;
            continue;
          }

          if (currentTok.type === 'p') {
            let linesInfo = getLinesFromParagraph(currentTok.text, 580, styleObj, true);
            let lines = pendingWordTokens ? pendingWordTokens.remainingLines : linesInfo.lines;
            let isContinuation = !!pendingWordTokens;
            let hasWindow = pendingWordTokens ? false : linesInfo.hasWindow;

            const pElem = document.createElement('p');
            pElem.setAttribute('data-token-id', currentTok.id);
            targetCol.appendChild(pElem);

            let bestFitLine = 0;
            for (let i = 1; i <= lines.length; i++) {
              let testText = lines.slice(0, i).join(' ');
              pElem.className = (i === lines.length) ? 'p-end' : 'p-cut';
              pElem.innerHTML = createDropWord(testText, isContinuation, !hasWindow);
              
              const availH = remPageHeight - getFootnotesReservedHeight();
              if (targetCol.scrollHeight <= availH) {
                bestFitLine = i;
              } else {
                break;
              }
            }

            if (bestFitLine === 0) {
              targetCol.removeChild(pElem);
              if (targetCol.children.length > 0) {
                let lastEl = targetCol.lastElementChild;
                while (lastEl && lastEl.className.startsWith('title-level-')) {
                  targetCol.removeChild(lastEl);
                  tokenIndex--;
                  lastEl = targetCol.lastElementChild;
                }
                break;
              } else {
                if (!pageHasContent) {
                    bestFitLine = 1;
                } else {
                    break;
                }
              }
            }

            if (bestFitLine > 0 && bestFitLine < lines.length && document.getElementById('avoid-widows-select').value === 'yes') {
              const remainingAfterSplit = lines.length - bestFitLine;
              if (bestFitLine === 1 && pageHasContent) {
                targetCol.removeChild(pElem);
                break;
              } else if (remainingAfterSplit === 1) {
                if (bestFitLine > 1) {
                  bestFitLine -= 1;
                } else if (pageHasContent) {
                  targetCol.removeChild(pElem);
                  break;
                }
              }
            }

            if (bestFitLine > 0) pageHasContent = true;

            const chunk = lines.slice(0, bestFitLine).join(' ');
            const isEndOfP = (bestFitLine === lines.length);
            pElem.className = isEndOfP ? 'p-end' : 'p-cut';
            pElem.setAttribute('data-raw-text', chunk);
            pElem.innerHTML = createDropWord(chunk, isContinuation, !hasWindow);
            applyDelimiterStyles(pElem, 'body', getBodySizePt(), false);

            if (isEndOfP) {
              pendingWordTokens = null;
              tokenIndex++;
            } else {
              pendingWordTokens = { token: currentTok, remainingLines: lines.slice(bestFitLine) };
              break;
            }
          }
        }
        continue;
      }

      let pagePendingNotes = [];

      while ((tokenIndex < secTokens.length || pendingWordTokens) && (remPageHeight - getFootnotesReservedHeight()) > 45) {
        let peekTok = pendingWordTokens ? pendingWordTokens.token : secTokens[tokenIndex];
        const peekMode = peekTok && peekTok.type.startsWith('h') ? headingModes[peekTok.level] : 'inline_2col';

        if (peekMode === 'span_1col' && !pendingWordTokens) {
          const currentAvailH = remPageHeight - getFootnotesReservedHeight();
          if (currentAvailH < 60) {
            break;
          }
          if (peekTok.level === 3) currentH3Title = peekTok.text;
          const spanBlock = document.createElement('div');
          spanBlock.className = 'block-h3-span';

          // עיטור צד ימין (ב-RTL יופיע ראשון מימין, צמוד לכותרת)
          const ornRHTML = renderSideOrnamentHTML(h3OrnR, false);
          if (ornRHTML) {
            const ornR = document.createElement('div');
            ornR.className = 'h3-ornament-right';
            ornR.innerHTML = ornRHTML;
            spanBlock.appendChild(ornR);
          }

          // טקסט הכותרת במרכז
          const spanTitle = document.createElement('div');
          spanTitle.className = 'h3-title-text';
          spanTitle.setAttribute('data-token-id', peekTok.id);
          spanTitle.id = `heading-tok-${peekTok.id}`;
          if (peekTok.customStyleId) {
            const inst = findExtTextStyle(peekTok.customStyleId);
            if (inst) renderCustomHeadingInto(spanTitle, inst, peekTok.text); else spanTitle.textContent = peekTok.text;
          } else {
            spanTitle.textContent = peekTok.text;
          }
          applyDelimiterStyles(spanTitle, 'h' + peekTok.level, getHostSizePt(peekTok.level, peekTok.customStyleId), false);
          spanBlock.appendChild(spanTitle);

          // עיטור צד שמאל (ב-RTL יופיע משמאל, צמוד לכותרת)
          const ornLHTML = renderSideOrnamentHTML(h3OrnL, true);
          if (ornLHTML) {
            const ornL = document.createElement('div');
            ornL.className = 'h3-ornament-left';
            ornL.innerHTML = ornLHTML;
            spanBlock.appendChild(ornL);
          }

          pageLayout.bodyFlow.appendChild(spanBlock);

          const spanHeight = spanBlock.getBoundingClientRect().height + 4;
          if (spanHeight > (remPageHeight - getFootnotesReservedHeight())) {
            pageLayout.bodyFlow.removeChild(spanBlock);
            break;
          }
          if (document.getElementById('avoid-widows-select').value === 'yes'
              && (tokenIndex + 1 < secTokens.length)
              && ((remPageHeight - getFootnotesReservedHeight()) - spanHeight < 30)) {
            pageLayout.bodyFlow.removeChild(spanBlock);
            break;
          }

          headingPageMap[peekTok.id] = toGematria(pageIndex - 1);
          remPageHeight -= spanHeight;
          tokenIndex++;
          continue;
        }

        const block2Col = document.createElement('div');
        block2Col.className = 'block-2col';
        block2Col.innerHTML = `
          <div class="margin-notes-column right-margin"></div>
          <div></div>
          <div class="main-column right-col"></div>
          <div></div>
          <div class="main-column left-col"></div>
          <div></div>
          <div class="margin-notes-column left-margin"></div>
        `;
        pageLayout.bodyFlow.appendChild(block2Col);

        const blockNoteSnapshot = {
          footnoteQueueLen: footnoteQueueForPage.length,
          endnoteQueueLen: endnoteQueueForPart.length,
          footnoteCounter: noteCounters.footnote || 0,
          endnoteCounter: noteCounters.endnote || 0,
          noteUid: noteUidCounter
        };

        const rCol = block2Col.querySelector('.right-col');
        const lCol = block2Col.querySelector('.left-col');
        const rMargin = block2Col.querySelector('.right-margin');
        const lMargin = block2Col.querySelector('.left-margin');
        const colWidth = rCol.offsetWidth || 272;
        let pageHasContent = false;

        ['right', 'left'].forEach((colName) => {
          let targetCol = colName === 'right' ? rCol : lCol;
          let targetMargin = colName === 'right' ? rMargin : lMargin;

          while (tokenIndex < secTokens.length || pendingWordTokens) {
            let currentTok = pendingWordTokens ? pendingWordTokens.token : secTokens[tokenIndex];
            const curMode = currentTok.type.startsWith('h') ? headingModes[currentTok.level] : 'inline_2col';

            if (curMode === 'span_1col' && !pendingWordTokens) {
              break;
            }

            const currentAvailH = remPageHeight - getFootnotesReservedHeight();
            if (targetCol.scrollHeight >= currentAvailH - 10 && targetCol.children.length > 0) {
              break;
            }

            if (currentTok.type.startsWith('h')) {
              if (currentTok.level === 3) currentH3Title = currentTok.text;
              const hElem = document.createElement('div');
              hElem.className = currentTok.customStyleId ? 'title-level-custom' : `title-level-${currentTok.level}`;
              hElem.setAttribute('data-token-id', currentTok.id);
              hElem.id = `heading-tok-${currentTok.id}`;
              if (currentTok.customStyleId) {
                const inst = findExtTextStyle(currentTok.customStyleId);
                if (inst) renderCustomHeadingInto(hElem, inst, currentTok.text); else hElem.textContent = currentTok.text;
              } else {
                hElem.textContent = currentTok.text;
              }
              applyDelimiterStyles(hElem, 'h' + currentTok.level, getHostSizePt(currentTok.level, currentTok.customStyleId), false);
              targetCol.appendChild(hElem);

              if (targetCol.scrollHeight > (remPageHeight - getFootnotesReservedHeight()) && targetCol.children.length > 1) {
                targetCol.removeChild(hElem);
                break;
              }

              if (document.getElementById('avoid-widows-select').value === 'yes'
                  && (tokenIndex + 1 < secTokens.length)
                  && ((remPageHeight - getFootnotesReservedHeight()) - targetCol.scrollHeight < 30)
                  && targetCol.children.length > 1) {
                targetCol.removeChild(hElem);
                break;
              }

              if (!headingPageMap[currentTok.id]) {
                headingPageMap[currentTok.id] = toGematria(pageIndex - 1);
              }

              tokenIndex++;
              continue;
            }

            if (currentTok.type === 'p') {
              let linesInfo = getLinesFromParagraph(currentTok.text, colWidth, styleObj, true);
              let lines = pendingWordTokens ? pendingWordTokens.remainingLines : linesInfo.lines;
              let isContinuation = !!pendingWordTokens;
              let hasWindow = pendingWordTokens ? false : linesInfo.hasWindow;

              const pElem = document.createElement('p');
              pElem.setAttribute('data-token-id', currentTok.id);
              pElem.setAttribute('data-is-cont', isContinuation ? 'true' : 'false');
              if (currentTok.endNote) pElem.setAttribute('data-end-note', currentTok.endNote);
              targetCol.appendChild(pElem);

              if (currentTok.sideNote && !headingPageMap[currentTok.id]) {
                headingPageMap[currentTok.id] = toGematria(pageIndex - 1);
              }

              let bestFitLine = 0;
              for (let i = 1; i <= lines.length; i++) {
                let testText = lines.slice(0, i).join(' ');
                pElem.className = (i === lines.length) ? 'p-end' : 'p-cut';
                pElem.innerHTML = createDropWord(testText, isContinuation, !hasWindow);
                
                const availH = remPageHeight - getFootnotesReservedHeight();
                if (targetCol.scrollHeight <= availH) {
                  bestFitLine = i;
                } else {
                  break;
                }
              }

              if (bestFitLine === 0) {
                targetCol.removeChild(pElem);
                if (targetCol.children.length > 0) {
                  let lastEl = targetCol.lastElementChild;
                  while (lastEl && lastEl.className.startsWith('title-level-')) {
                    targetCol.removeChild(lastEl);
                    tokenIndex--;
                    lastEl = targetCol.lastElementChild;
                  }
                  break;
                } else {
                  if (!pageHasContent) {
                      bestFitLine = 1;
                  } else {
                      break;
                  }
                }
              }

              if (bestFitLine > 0 && bestFitLine < lines.length && document.getElementById('avoid-widows-select').value === 'yes') {
                const remainingAfterSplit = lines.length - bestFitLine;
                if (bestFitLine === 1 && pageHasContent) {
                  targetCol.removeChild(pElem);
                  break;
                } else if (remainingAfterSplit === 1) {
                  if (bestFitLine > 1) {
                    bestFitLine -= 1;
                  } else if (pageHasContent) {
                    targetCol.removeChild(pElem);
                    break;
                  }
                }
              }

              if (bestFitLine > 0) pageHasContent = true;

              const chunk = lines.slice(0, bestFitLine).join(' ');
              const isEndOfP = (bestFitLine === lines.length);
              pElem.className = isEndOfP ? 'p-end' : 'p-cut';
              pElem.setAttribute('data-raw-text', chunk);
              pElem.innerHTML = createDropWord(chunk, isContinuation, !hasWindow);
              applyDelimiterStyles(pElem, 'body', getBodySizePt(), false);

              if (currentTok.endNote && isEndOfP) {
                const marker = createNoteMarkerAndQueue(currentTok.endNote, null, 'endnote');
                pElem.appendChild(marker);
              }

              if (!isContinuation && currentTok.sideNote) {
                pElem.setAttribute('data-side-note', currentTok.sideNote);
                if (currentTok.sideNoteStyleId) pElem.setAttribute('data-note-style-id', currentTok.sideNoteStyleId);
                const noteElem = document.createElement('div');
                noteElem.className = 'side-note-anchor';
                noteElem.textContent = currentTok.sideNote;
                if (currentTok.sideNoteStyleId) {
                  const inst = findExtTextStyle(currentTok.sideNoteStyleId);
                  if (inst) applyExtStyleToNode(noteElem, inst.def.style, 6);
                }
                targetMargin.appendChild(noteElem);
                pagePendingNotes.push({ elem: noteElem, pElem: pElem });
              }

              if (isEndOfP) {
                pendingWordTokens = null;
                tokenIndex++;
              } else {
                pendingWordTokens = { token: currentTok, remainingLines: lines.slice(bestFitLine) };
                break;
              }
            }
          }
        });

        if (rCol.children.length === 0 && lCol.children.length === 0) {
            if (blockNoteSnapshot) {
              footnoteQueueForPage.length = blockNoteSnapshot.footnoteQueueLen;
              endnoteQueueForPart.length = blockNoteSnapshot.endnoteQueueLen;
              noteCounters.footnote = blockNoteSnapshot.footnoteCounter;
              noteCounters.endnote = blockNoteSnapshot.endnoteCounter;
              noteUidCounter = blockNoteSnapshot.noteUid;
            }
            pageLayout.bodyFlow.removeChild(block2Col);
            let lastFlowEl = pageLayout.bodyFlow.lastElementChild;
            while (lastFlowEl && lastFlowEl.classList.contains('block-h3-span')) {
                pageLayout.bodyFlow.removeChild(lastFlowEl);
                tokenIndex--;
                lastFlowEl = pageLayout.bodyFlow.lastElementChild;
            }
            break;
        }

        if (tokenIndex >= secTokens.length && !pendingWordTokens) {
          balanceColumns(block2Col, colWidth, styleObj, blockNoteSnapshot, remPageHeight);
          const divHTML = getSectionDividerHTML(secDivStyle);
          if (divHTML) {
            const divContainer = document.createElement('div');
            divContainer.innerHTML = divHTML;
            pageLayout.bodyFlow.appendChild(divContainer.firstElementChild);
          }
          break;
        } else {
          let nextPeekTok = pendingWordTokens ? pendingWordTokens.token : secTokens[tokenIndex];
          const nextPeekMode = nextPeekTok && nextPeekTok.type.startsWith('h') ? headingModes[nextPeekTok.level] : 'inline_2col';
          if (nextPeekMode === 'span_1col' && !pendingWordTokens) {
            balanceColumns(block2Col, colWidth, styleObj, blockNoteSnapshot, remPageHeight);
          } else {
            let usedBlockH = Math.max(rCol.scrollHeight, lCol.scrollHeight);
            let finalDiff = rCol.scrollHeight - lCol.scrollHeight;
            if (usedBlockH <= remPageHeight) {
              if (finalDiff > 2 && finalDiff <= 60) {
                  justifyColumnVertically(lCol, rCol.scrollHeight, styleObj);
              } else if (finalDiff < -2 && Math.abs(finalDiff) <= 60) {
                  justifyColumnVertically(rCol, lCol.scrollHeight, styleObj);
              }
            }
          }
        }
        
        remPageHeight -= Math.max(rCol.scrollHeight, lCol.scrollHeight);
        finalizeNotePositions(pagePendingNotes, Math.max(rCol.scrollHeight, lCol.scrollHeight));
      }
    }
  }

  if (prevPageEl) { flushFootnotesInto(prevPageEl); prevPageEl = null; }
  if (hasOpenPart) { flushEndnotesForPart(container, pageIndex); renderExtAnchor(container, 'endOfEachPart', rawText); }
  else if (endnoteQueueForPart.length) { flushEndnotesForPart(container, pageIndex); }
  renderExtAnchor(container, 'afterAll', rawText);

  document.querySelectorAll('.toc-page-num[data-target-id], .grp-page[data-target-id]').forEach(span => {
    const targetId = span.getAttribute('data-target-id');
    if (targetId && headingPageMap[targetId]) {
      span.textContent = headingPageMap[targetId];
    }
  });

  if (typeof updateEditorWithPageBreaks === 'function') {
    updateEditorWithPageBreaks(pageBreaks);
  }

  if (typeof updatePreviewScale === 'function') {
    updatePreviewScale();
  }
}