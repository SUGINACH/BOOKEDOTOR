/* ==========================================================================
   app.js - ניהול ממשק משתמש, סרגל צד, קבצים ואתחול
   ========================================================================== */

const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
let isResizing = false;

resizer.addEventListener('mousedown', () => {
  isResizing = true;
  resizer.classList.add('resizing');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

window.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const newWidth = document.body.clientWidth - e.clientX;
  if (newWidth >= 360 && newWidth <= 800) {
    sidebar.style.width = newWidth + 'px';
  }
});

window.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

function toggleCbgSubRows(role, mode) {
  const rowColor = document.getElementById('row-cbg-' + role + '-color');
  const rowImg = document.getElementById('row-cbg-' + role + '-img');
  const rowOp = document.getElementById('row-cbg-' + role + '-op');
  if (rowColor) rowColor.style.display = (mode === 'color') ? 'flex' : 'none';
  if (rowImg) rowImg.style.display = (mode === 'image') ? 'flex' : 'none';
  if (rowOp) rowOp.style.display = (mode === 'image') ? 'flex' : 'none';
}

function togglePanelBody(bodyId) {
  const body = document.getElementById(bodyId);
  if (body) {
    body.style.display = (body.style.display === 'none') ? 'block' : 'none';
  }
}

/* ==========================================================================
   ניהול ערכות נושא מותאמות אישית
   ========================================================================== */
let customThemes = [];

function addNewCustomTheme() {
  const nameInput = document.getElementById('builder-theme-name');
  const name = nameInput.value.trim();
  if (!name) {
    alert('אנא הזן שם לערכת הנושא.');
    return;
  }

  const mainSvg = document.getElementById('data-builder-main-svg').value;
  const backSvg = document.getElementById('data-builder-back-svg').value;
  const subSvg = document.getElementById('data-builder-sub-svg').value;

  const themeObj = {
    id: 'theme_' + Date.now(),
    name: name,
    mainShaar: {
      svgData: mainSvg || '',
      top: parseFloat(document.getElementById('builder-main-top').value) || 20,
      bottom: parseFloat(document.getElementById('builder-main-bottom').value) || 16,
      right: parseFloat(document.getElementById('builder-main-right').value) || 15,
      left: parseFloat(document.getElementById('builder-main-left').value) || 15
    },
    backShaar: {
      svgData: backSvg || '',
      top: parseFloat(document.getElementById('builder-back-top').value) || 22,
      bottom: parseFloat(document.getElementById('builder-back-bottom').value) || 18,
      right: parseFloat(document.getElementById('builder-back-right').value) || 15,
      left: parseFloat(document.getElementById('builder-back-left').value) || 95
    },
    subShaar: {
      svgData: subSvg || '',
      top: parseFloat(document.getElementById('builder-sub-top').value) || 20,
      bottom: parseFloat(document.getElementById('builder-sub-bottom').value) || 20,
      right: parseFloat(document.getElementById('builder-sub-right').value) || 95,
      left: parseFloat(document.getElementById('builder-sub-left').value) || 15
    }
  };

  customThemes.push(themeObj);
  refreshCustomThemesUI();

  const select = document.getElementById('active-theme-select');
  if (select) {
    select.value = themeObj.id;
  }

  alert(`ערכת הנושא "${name}" הוטמעה בהצלחה!`);
  typesetDocument();
}

function deleteCustomTheme(themeId) {
  if (!confirm('האם ברצונך למחוק ערכת נושא זו?')) return;
  customThemes = customThemes.filter(t => t.id !== themeId);
  refreshCustomThemesUI();
  typesetDocument();
}

function refreshCustomThemesUI() {
  const optgroup = document.getElementById('custom-themes-optgroup');
  const listContainer = document.getElementById('custom-themes-list');
  const select = document.getElementById('active-theme-select');
  const currentVal = select ? select.value : '';

  if (optgroup) {
    optgroup.innerHTML = '';
    customThemes.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      optgroup.appendChild(opt);
    });
  }

  if (listContainer) {
    if (customThemes.length === 0) {
      listContainer.innerHTML = '<div style="font-size:7.5pt; color:#888;">עדיין לא הוטמעו ערכות מותאמות אישית.</div>';
    } else {
      let html = '<div style="font-size:8pt; font-weight:700; margin-bottom:4px; color:#333;">ערכות שהוטמעו בקובץ:</div>';
      customThemes.forEach(t => {
        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #ddd; padding:3px 6px; border-radius:3px; margin-bottom:3px; font-size:8pt;">
            <span>🏷️ ${t.name}</span>
            <span style="color:#dc2626; cursor:pointer; font-weight:bold;" onclick="deleteCustomTheme('${t.id}')">🗑️ מחק</span>
          </div>
        `;
      });
      listContainer.innerHTML = html;
    }
  }

  if (select && currentVal) {
    select.value = currentVal;
  }
}

/* ==========================================================================
   ניהול תוספים (Extensions)
   ========================================================================== */
let importedPageTypes = [];
let importedTextStyles = [];
let importedImagePages = [];
let extImportCounter = 0;
let nextSyntheticLevel = 8;

function validateExtJSON(def, expectedKind) {
  if (!def || typeof def !== 'object') return 'קובץ לא תקין (לא JSON תקין).';
  if (def.kind !== expectedKind) return 'הקובץ אינו מסוג ' + (expectedKind === 'pageType' ? 'סוג עמוד' : 'סגנון טקסט') + ' (kind=' + def.kind + ').';
  if (!def.name) return 'להגדרה שיובאה אין שם (name).';
  return null;
}

function handlePageTypeImportFile(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    let def;
    try { def = JSON.parse(e.target.result); } catch(err) { alert('קובץ JSON לא תקין.'); return; }
    const errMsg = validateExtJSON(def, 'pageType');
    if (errMsg) { alert(errMsg); return; }
    const instanceId = 'ext-pt-' + (extImportCounter++);
    importedPageTypes.push({ instanceId, def, anchor: def.insertionAnchor || 'afterAll', repeatMode: def.repeatMode || 'once' });
    buildExtPanel('pageType', instanceId, def.name, def);
    typesetDocument();
  };
  reader.readAsText(file);
  event.target.value = '';
}

function handleTextStyleImportFile(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    let def;
    try { def = JSON.parse(e.target.result); } catch(err) { alert('קובץ JSON לא תקין.'); return; }
    const errMsg = validateExtJSON(def, 'textStyle');
    if (errMsg) { alert(errMsg); return; }
    const instanceId = 'ext-ts-' + (extImportCounter++);
    const syntheticLevel = (def.trigger && def.trigger.type === 'linePrefix') ? (nextSyntheticLevel++) : null;
    importedTextStyles.push({ instanceId, def, syntheticLevel });
    buildExtPanel('textStyle', instanceId, def.name, def);
    typesetDocument();
  };
  reader.readAsText(file);
  event.target.value = '';
}

function handleImagePageImportFile(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const instanceId = 'ext-img-' + (extImportCounter++);
    importedImagePages.push({ instanceId, name: file.name, dataUrl: e.target.result, anchor: 'afterAll' });
    buildExtPanel('imagePage', instanceId, 'תמונה: ' + file.name, null);
    typesetDocument();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

const EXT_ANCHOR_OPTIONS = [
  ['beforeAll','לפני הכל'], ['afterMainShaar','אחרי השער הראשי'], ['afterGeneralToc','אחרי תוכן העניינים הכללי'],
  ['beforeEachPart','לפני כל שער-חלק'], ['afterEachPart','מיד אחרי כל שער-חלק'], ['endOfEachPart','בסוף כל חלק'], ['afterAll','אחרי הכל']
];

function buildExtPanel(kind, instanceId, name, def) {
  const panel = document.createElement('div');
  panel.className = 'panel-static';
  panel.id = instanceId + '-panel';
  const icon = kind === 'pageType' ? '📄' : kind === 'textStyle' ? '🅰️' : '🖼️';
  let triggerInfo = '';
  if (kind === 'textStyle' && def && def.trigger) {
    triggerInfo = (def.trigger.type === 'delimiterPair')
      ? `<div style="font-size:7.5pt;color:#888;">טריגר: בין "${def.trigger.open}" ל-"${def.trigger.close}"</div>`
      : `<div style="font-size:7.5pt;color:#888;">קידומת: "${def.trigger.prefix}"</div>`;
  }
  const anchorRow = (kind !== 'textStyle')
    ? `<div class="inline-cfg-row"><label>מיקום:</label><select id="${instanceId}-anchor" onchange="updateExtAnchor('${kind}','${instanceId}', this.value)">${EXT_ANCHOR_OPTIONS.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div>`
    : '';
  panel.innerHTML = `
    <div class="panel-header" style="display:flex;justify-content:space-between;align-items:center;">
      <span>${icon} ${name}</span>
      <span style="cursor:pointer;color:#a33;font-weight:700;" onclick="removeExtInstance('${kind}','${instanceId}')">✕ הסר</span>
    </div>
    ${triggerInfo}
    ${anchorRow}
  `;
  document.getElementById('ext-imports-container').appendChild(panel);
  if (kind !== 'textStyle') {
    const store = kind === 'pageType' ? importedPageTypes : importedImagePages;
    const inst = store.find(x => x.instanceId === instanceId);
    const sel = document.getElementById(instanceId + '-anchor');
    if (sel && inst) sel.value = inst.anchor;
  }
}

function updateExtAnchor(kind, instanceId, val) {
  const store = kind === 'pageType' ? importedPageTypes : importedImagePages;
  const inst = store.find(x => x.instanceId === instanceId);
  if (inst) inst.anchor = val;
  typesetDocument();
}

function removeExtInstance(kind, instanceId) {
  if (kind === 'pageType') importedPageTypes = importedPageTypes.filter(x => x.instanceId !== instanceId);
  else if (kind === 'textStyle') importedTextStyles = importedTextStyles.filter(x => x.instanceId !== instanceId);
  else importedImagePages = importedImagePages.filter(x => x.instanceId !== instanceId);
  const p = document.getElementById(instanceId + '-panel');
  if (p) p.remove();
  typesetDocument();
}

function findPrefixLineInSource(rawText, prefix) {
  if (!prefix) return null;
  const lines = rawText.split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith(prefix)) return t.slice(prefix.length).replace(/^[:\-–—]\s*/, '').trim();
  }
  return null;
}

const EXT_V_MAP = { top:'14mm', upperMid:'25%', center:'50%', lowerMid:'75%' };

function applyExtStyleToNode(node, style, hostFontSizePt) {
  if (!style) return;
  if (style.family) node.style.fontFamily = style.family;
  if (typeof style.size === 'number') node.style.fontSize = style.size + 'pt';
  if (typeof style.sizeDelta === 'number') node.style.fontSize = ((hostFontSizePt||12) + style.sizeDelta) + 'pt';
  if (style.weight) node.style.fontWeight = style.weight;
  if (style.color) node.style.color = style.color;
  if (style.align) node.style.textAlign = style.align;
  if (style.border) {
    node.style.border = style.border.width + 'px solid ' + style.border.color;
    node.style.borderRadius = style.border.radius + 'px';
    node.style.padding = '2px 8px';
  }
}

function renderImportedPage(container, inst, rawSourceText) {
  const def = inst.def;
  const page = document.createElement('div');
  page.className = 'a4-page';
  if (def.background && def.background.mode === 'fixed') {
    const bs = def.background.style;
    if (bs === 'color' && def.background.color) page.style.background = def.background.color;
    else if (bs === 'texture') { page.style.background = '#fdfcf6 url("'+CBG_TEXTURE_SVG+'") repeat'; }
    else if (bs === 'image' && def.background.image) {
      const fade = 1 - (def.background.opacity != null ? def.background.opacity : 0.15);
      page.style.backgroundImage = `linear-gradient(rgba(244,241,232,${fade}),rgba(244,241,232,${fade})),url("${def.background.image}")`;
      page.style.backgroundSize = 'cover'; page.style.backgroundPosition = 'center';
    }
  } else {
    applyContentBg(page, 'regular');
  }
  (def.elements || []).forEach(elDef => {
    const matched = findPrefixLineInSource(rawSourceText, elDef.prefix);
    const text = matched || elDef.defaultText || '';
    if (!text) return;
    const el = document.createElement('div');
    el.style.position = 'absolute';
    el.textContent = text;
    const pos = elDef.position || {};
    const va = pos.vAnchor || 'center', ha = pos.hAlign || 'center', off = pos.offsetY || 0;
    if (va === 'bottom') { el.style.bottom = (18 - off) + 'mm'; }
    else {
      el.style.top = `calc(${EXT_V_MAP[va] || '50%'} + ${off}px)`;
      if (va === 'center' || va === 'upperMid' || va === 'lowerMid') el.style.transform = 'translateY(-50%)';
    }
    if (ha === 'right' || ha === 'rightMid') { el.style.right = (ha === 'right' ? '15mm' : '25%'); }
    else if (ha === 'left' || ha === 'leftMid') { el.style.left = (ha === 'left' ? '15mm' : '25%'); }
    else { el.style.right = '0'; el.style.left = '0'; el.style.textAlign = 'center'; }
    applyExtStyleToNode(el, elDef.style, 12);
    page.appendChild(el);
  });
  container.appendChild(page);
}

function renderImportedImagePage(container, inst) {
  const page = document.createElement('div');
  page.className = 'a4-page';
  page.style.backgroundImage = `url("${inst.dataUrl}")`;
  page.style.backgroundSize = 'cover';
  page.style.backgroundPosition = 'center';
  container.appendChild(page);
}

function renderExtAnchor(container, anchorKey, rawSourceText) {
  importedPageTypes.filter(p => p.anchor === anchorKey).forEach(inst => renderImportedPage(container, inst, rawSourceText));
  importedImagePages.filter(p => p.anchor === anchorKey).forEach(inst => renderImportedImagePage(container, inst));
}

function findExtTextStyle(instanceId) {
  return importedTextStyles.find(x => x.instanceId === instanceId);
}

/* ==========================================================================
   העלאת קבצי תמונה ו-SVG
   ========================================================================== */
function handleImageUpload(event, targetInputId) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
    reader.onload = function(e) {
      let svgText = e.target.result;
      if (svgText.includes('preserveAspectRatio')) {
        svgText = svgText.replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="none"');
      } else {
        svgText = svgText.replace(/<svg\b/, '<svg preserveAspectRatio="none"');
      }
      const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
      const targetInput = document.getElementById(targetInputId);
      if (targetInput) {
        targetInput.value = dataUrl;
        targetInput.setAttribute('value', dataUrl);
        typesetDocument();
      }
    };
    reader.readAsText(file);
  } else {
    reader.onload = function(e) {
      const targetInput = document.getElementById(targetInputId);
      if (targetInput) {
        targetInput.value = e.target.result;
        targetInput.setAttribute('value', e.target.result);
        typesetDocument();
      }
    };
    reader.readAsDataURL(file);
  }
}

/* ==========================================================================
   שמירת תבנית מלאה (Save Template)
   ========================================================================== */
function saveAsDefaultTemplate() {
  let dataIsland = document.getElementById('ext-imports-data');
  if (!dataIsland) {
    dataIsland = document.createElement('script');
    dataIsland.type = 'application/json';
    dataIsland.id = 'ext-imports-data';
    document.head.appendChild(dataIsland);
  }
  dataIsland.textContent = JSON.stringify({
    pageTypes: importedPageTypes,
    textStyles: importedTextStyles,
    imagePages: importedImagePages,
    customThemes: customThemes
  });

  document.querySelectorAll('input[type="text"], input[type="number"], input[type="hidden"], input[type="color"], input[type="range"]').forEach(input => {
    input.setAttribute('value', input.value);
  });
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked) cb.setAttribute('checked', 'checked');
    else cb.removeAttribute('checked');
  });
  document.querySelectorAll('select').forEach(sel => {
    Array.from(sel.options).forEach(opt => {
      if (opt.value === sel.value) opt.setAttribute('selected', 'selected');
      else opt.removeAttribute('selected');
    });
  });

  const rawInputElem = document.getElementById('raw-input');
  const prevVal = rawInputElem.value;
  rawInputElem.innerHTML = '';
  rawInputElem.value = '';

  const fullHtml = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  rawInputElem.value = prevVal;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'torani-typesetting-template.html';
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ==========================================================================
   טעינת גופני Windows מקומיים
   ========================================================================== */
async function loadSystemFonts() {
  if ('queryLocalFonts' in window) {
    try {
      const availableFonts = await window.queryLocalFonts();
      const fontFamilies = [...new Set(availableFonts.map(f => f.family))].sort((a, b) => a.localeCompare(b, 'he'));
      
      if (fontFamilies.length > 0) {
        document.querySelectorAll('.font-picker').forEach(select => {
          const currentVal = select.value;
          select.innerHTML = '';
          
          const sysGroup = document.createElement('optgroup');
          sysGroup.label = `גופני מחשב (${fontFamilies.length} נמצאו)`;
          
          fontFamilies.forEach(family => {
            const opt = document.createElement('option');
            opt.value = `'${family}', serif`;
            opt.textContent = family;
            if (currentVal.includes(family)) opt.selected = true;
            sysGroup.appendChild(opt);
          });
          
          select.appendChild(sysGroup);
        });
        alert(`נטענו בהצלחה ${fontFamilies.length} גופנים מהמחשב!`);
      }
    } catch (err) {
      alert('לא ניתנה הרשאה לגישה לגופני המחשב.');
    }
  } else {
    alert('הדפדפן אינו תומך בגישה ישירה לגופני המערכת. מומלץ להשתמש ב-Chrome או Edge.');
  }
}

/* ==========================================================================
   סנכרון סמן עריכה לתצוגה המקדימה
   ========================================================================== */
const textarea = document.getElementById('raw-input');

function syncCursorToPreview() {
  const cursorPos = textarea.selectionStart;
  const textBefore = textarea.value.substring(0, cursorPos);
  const currentLineIdx = textBefore.split('\n').length - 1;

  if (lineToTokenMap && lineToTokenMap[currentLineIdx] !== undefined) {
    let tokenId = lineToTokenMap[currentLineIdx];
    if (tokenId === null) {
      for (let k = currentLineIdx - 1; k >= 0; k--) {
        if (lineToTokenMap[k] !== null && lineToTokenMap[k] !== undefined) {
          tokenId = lineToTokenMap[k];
          break;
        }
      }
    }

    if (tokenId !== null && tokenId !== undefined) {
      const targetEl = document.querySelector(`[data-token-id="${tokenId}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
}

textarea.addEventListener('click', syncCursorToPreview);
textarea.addEventListener('keyup', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
    syncCursorToPreview();
  }
});

/* ==========================================================================
   שחזור הגדרות תוספים ואירוע טעינה ראשוני (Bootstrap)
   ========================================================================== */
function rehydrateExtImports() {
  const island = document.getElementById('ext-imports-data');
  if (!island || !island.textContent.trim()) return;
  let data;
  try { data = JSON.parse(island.textContent); } catch(e) { return; }
  (data.pageTypes || []).forEach(inst => {
    importedPageTypes.push(inst);
    buildExtPanel('pageType', inst.instanceId, inst.def.name, inst.def);
  });
  (data.textStyles || []).forEach(inst => {
    importedTextStyles.push(inst);
    buildExtPanel('textStyle', inst.instanceId, inst.def.name, inst.def);
  });
  (data.imagePages || []).forEach(inst => {
    importedImagePages.push(inst);
    buildExtPanel('imagePage', inst.instanceId, 'תמונה: ' + inst.name, null);
  });
  if (data.customThemes && Array.isArray(data.customThemes)) {
    customThemes = data.customThemes;
    refreshCustomThemesUI();
  }
  let maxCounter = 0;
  let maxSynth = 7;
  [...importedPageTypes, ...importedTextStyles, ...importedImagePages].forEach(inst => {
    const n = parseInt((inst.instanceId.match(/-(\d+)$/) || [0,0])[1], 10);
    if (n >= maxCounter) maxCounter = n + 1;
    if (typeof inst.syntheticLevel === 'number' && inst.syntheticLevel > maxSynth) maxSynth = inst.syntheticLevel;
  });
  extImportCounter = maxCounter;
  nextSyntheticLevel = maxSynth + 1;
}

/* ==========================================================================
   טעינה אוטומטית של קובצי JSON ופונטים מתיקיית fonts
   ========================================================================== */

async function loadExternalJSONAssets() {
  const assetsToLoad = [
    { file: 'shaar_main.json', type: 'shaar_main' },
    { file: 'shaar_sub.json', type: 'shaar_sub' },
    { file: 'shaar_back.json', type: 'shaar_back' },
    { file: 'header_ornaments.json', type: 'header' },
    { file: 'section_dividers.json', type: 'divider' },
    { file: 'note_rules.json', type: 'note_rule' }
  ];

  for (const asset of assetsToLoad) {
    try {
      const response = await fetch(asset.file);
      if (!response.ok) continue; // הקובץ אינו קיים, ממשיכים הלאה
      const items = await response.json();
      if (!Array.isArray(items)) continue;

      items.forEach(item => {
        if (asset.type === 'shaar_main') {
          registerExternalShaar('main', item.id, item.name, item.svg);
          appendOptionToSelect('active-theme-select', item.id, item.name, 'שערים ראשיים שנטענו');
        } else if (asset.type === 'shaar_sub') {
          registerExternalShaar('sub', item.id, item.name, item.svg);
          appendOptionToSelect('active-theme-select', item.id, item.name, 'שערי משנה שנטענו');
        } else if (asset.type === 'shaar_back') {
          registerExternalShaar('back', item.id, item.name, item.svg);
          appendOptionToSelect('active-theme-select', item.id, item.name, 'שערים אחוריים שנטענו');
        } else if (asset.type === 'header') {
          registerExternalHeader(item.id, item.svg);
          appendOptionToSelect('hdr-c-type', item.id, item.name, 'עיטורי כותרת (JSON)');
          appendOptionToSelect('hdr-r-type', item.id, item.name, 'עיטורי כותרת (JSON)');
          appendOptionToSelect('hdr-l-type', item.id, item.name, 'עיטורי כותרת (JSON)');
        } else if (asset.type === 'divider') {
          registerExternalDivider(item.id, item.svg);
          appendOptionToSelect('section-divider-style', item.id, item.name, 'עיטורי סיום פרק (JSON)');
        } else if (asset.type === 'note_rule') {
          registerExternalNoteRule(item.id, item.svg);
          appendOptionToSelect('note-rule-style', item.id, item.name, 'מפרידי הערות (JSON)');
        }
      });
      console.log(`נטענו בהצלחה ${items.length} פריטים מתוך ${asset.file}`);
    } catch (e) {
      // שקט - הקובץ פשוט לא נמצא
    }
  }
}

function appendOptionToSelect(selectId, value, text, groupLabel) {
  const select = document.getElementById(selectId);
  if (!select) return;

  // מניעת כפילויות
  if (select.querySelector(`option[value="${value}"]`)) return;

  let optgroup = select.querySelector(`optgroup[label="${groupLabel}"]`);
  if (!optgroup) {
    optgroup = document.createElement('optgroup');
    optgroup.label = groupLabel;
    select.appendChild(optgroup);
  }

  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = text;
  optgroup.appendChild(opt);
}

/* ==========================================================================
   טעינה אוטומטית של פונטים מתוך fonts/fonts.json
   ========================================================================== */
async function loadExternalFonts() {
  try {
    const res = await fetch('fonts/fonts.json');
    if (!res.ok) return;
    const fonts = await res.json();
    if (!Array.isArray(fonts)) return;

    for (const font of fonts) {
      try {
        const fontFace = new FontFace(font.family, `url(fonts/${encodeURIComponent(font.file)})`);
        await fontFace.load();
        document.fonts.add(fontFace);

        // הוספה לכל תיבות בחירת הגופנים בסרגל הצד
        document.querySelectorAll('.font-picker').forEach(select => {
          let grp = select.querySelector('optgroup[label="גופנים מקומיים (תיקיית fonts)"]');
          if (!grp) {
            grp = document.createElement('optgroup');
            grp.label = 'גופנים מקומיים (תיקיית fonts)';
            select.prepend(grp);
          }
          const opt = document.createElement('option');
          opt.value = `'${font.family}', serif`;
          opt.textContent = font.family;
          grp.appendChild(opt);
        });
      } catch (err) {
        console.warn('שגיאה בטעינת גופן:', font.file, err);
      }
    }
    console.log(`נטענו בהצלחה ${fonts.length} פונטים מתיקיית fonts!`);
  } catch (e) {
    // fonts.json לא קיים
  }
}

// עדכון פונקציית הטעינה הראשית של הדף
window.onload = async function() {
  refreshCustomThemesUI();
  rehydrateExtImports();

  // 1. טעינת ה-JSON-ים של ה-SVG והפונטים
  await loadExternalJSONAssets();
  await loadExternalFonts();

  if (document.getElementById('section-divider-style').value === 'custom_img') {
    document.getElementById('row-sec-div-img').style.display = 'flex';
  }
  if (document.getElementById('hdr-c-type').value === 'custom_img') {
    document.getElementById('row-hdr-c-img').style.display = 'flex';
  }

  textarea.value = `שם הספר - ספר מלכי המלוכה
נושא - ביאורים וחידושים עמוקים על מסכתות הש"ס
נושא מפורט - בירור שיטות הראשונים והאחרונים ובירורי הלכות למעשה
פרטי מהדורא - מהדורה שניה ומורחבת בסייעתא דשמיא
שם המחבר - הצעיר ידידיה בר אבא הלוי
מקום ושנת הוצאה - ירושלים עיה"ק תובב"א שנת ה'תשפ"ו

כותרת 0 - הקדמת המחבר
גוף הטקסט בעימוד של טור אחד נרחב, המשתרע לרוחב כל עמוד ההקדמה. עימוד זה מיועד בדרך כלל להקדמות ופתיחות, שבהן הסגנון הספרותי מורחב ומשתרע כרציף.

כותרת 1 - חלק ראשון - ענייני תפילה וקריאת שמע
כותרת 2 - סימן א - דיני תפילת השחר וזמנה
גוף הטקסט בעימוד שני טורים מסודרים ומפולסים כהלכתם. כאן יבוא הביאור השלם בבירור גבולות הזמן של תפילת השחר עד חצות היום או עד ארבע שעות של היום [כאן הערת שוליים בתחתית העמוד הנלמדת מדברי הראשונים].
דין זה של קביעת זמן ארבע שעות נלמד בעיקרו מדברי חז"ל והוא הבסיס לכל דיני תפילה של שחרית.
הערת סיום - כאן הערת סיום מורחבת המרוכזת בסוף החלק.

כותרת 3 - ענף א: שיטת הרמב"ם בדין אונס ועבר זמן תפילה
גוף הטקסט בטורים המיושרים באופן מושלם. פסקאות אלו מדגימות את מנגנון האיזון המדויק המופעל בכל חיתוך.
כאשר טור אחד ימני מתמלא הוא מעביר שורות שלמות בלבד אל הטור השמאלי כדי שלא תיווצר מילה בודדת קטועה.
העימוד התורני מקפיד מאוד על שלמות הפסקאות והשורות כך שהקריאה תהיה רציפה ונעימה לעין הלומד.

כותרת 4 - סעיף א: בירור דעת בעל השאילתות
גוף הטקסט הבא תחת סעיף א מיועד לבאר את דברי הראשונים. כל פסקה מקבלת חלון מילה ראשונה רק אם היא מחזיקה שתי שורות ומעלה. פסקאות קצרות של שורה אחת אינן מקבלות חלון מילה ראשונה כדי למנוע שיבושים בעימוד הפסקאות הבאות אחריהן.
פיסקה קצרה.

כותרת 5 - סעיף ב: יישוב קושיית הנודע ביהודה
גוף הטקסט ממשיך לזרום בטורים שווים.

כותרת 7 - הערה נחוצה בצד העמוד
גוף הטקסט המכיל הערות צד בשולי הדף. הערות אלו ממוקמות בדיוק מול הפסקה אליה הן מתייחסות, ובכך מאפשרות ללומד לעיין במקורות תוך כדי לימודו הרציף בגוף הספר.`;

  typesetDocument();
};