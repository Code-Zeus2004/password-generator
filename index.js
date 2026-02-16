// ---------- Character sets ----------
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>/?';

// characters often confused (optional removal)
const SIMILAR = '0O1lI|`\'"';

// ---------- DOM ----------
const passwordOutput = document.getElementById('passwordOutput');
const lengthRange = document.getElementById('lengthRange');
const lengthNumber = document.getElementById('lengthNumber');
const lowercase = document.getElementById('lowercase');
const uppercase = document.getElementById('uppercase');
const numbers = document.getElementById('numbers');
const symbols = document.getElementById('symbols');
const excludeSimilar = document.getElementById('excludeSimilar');
const guaranteeEach = document.getElementById('guaranteeEach');
const copyBtn = document.getElementById('copyBtn');
const regenBtn = document.getElementById('regenBtn');
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');

// sync slider and number inputs
lengthRange.addEventListener('input', () => {
  lengthNumber.value = lengthRange.value;
  saveSettings();
  generateAndShow();
});
lengthNumber.addEventListener('input', () => {
  let v = Number(lengthNumber.value);
  if (isNaN(v) || v < Number(lengthNumber.min)) v = Number(lengthNumber.min);
  if (v > Number(lengthNumber.max)) v = Number(lengthNumber.max);
  lengthNumber.value = v;
  lengthRange.value = v;
  saveSettings();
  generateAndShow();
});

// re-generate when options change
[lowercase, uppercase, numbers, symbols, excludeSimilar, guaranteeEach].forEach(el => {
  el.addEventListener('change', generateAndShow, saveSettings);
});

// manual regen and copy
regenBtn.addEventListener('click', generateAndShow, saveSettings);
copyBtn.addEventListener('click', async () => {
  const text = passwordOutput.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = 'Copied';
    setTimeout(() => copyBtn.textContent = 'Copy', 1600);
  } catch (e) {
    // fallback: select + execCommand (legacy)
    passwordOutput.select();
    document.execCommand('copy');
    copyBtn.textContent = 'Copied';
    setTimeout(() => copyBtn.textContent = 'Copy', 1600);
  }
});

function getSettings() {
  return {
    length: Number(lengthRange.value),
    includeLower: lowercase.checked,
    includeUpper: uppercase.checked,
    includeNumbers: numbers.checked,
    includeSymbols: symbols.checked,
    excludeSimilarChars: excludeSimilar.checked,
    guaranteeEachType: guaranteeEach.checked
  };
}


// initial generate
loadSettings();
generateAndShow();

// ---------- main generation function ----------
function generatePassword(options) {
  const {
    length,
    includeLower,
    includeUpper,
    includeNumbers,
    includeSymbols,
    excludeSimilarChars,
    guaranteeEachType
  } = options;

  if (length <= 0) return '';

  let pools = [];
  if (includeLower) pools.push(LOWER);
  if (includeUpper) pools.push(UPPER);
  if (includeNumbers) pools.push(NUMBERS);
  if (includeSymbols) pools.push(SYMBOLS);

  if (pools.length === 0) return '';

  // Build the allowed characters string
  let allowed = pools.join('');
  if (excludeSimilarChars) {
    // remove any similar characters
    const set = new Set(allowed.split('').filter(ch => !SIMILAR.includes(ch)));
    allowed = Array.from(set).join('');
  }

  // If allowed is empty after excluding similar -> fallback to original pools
  if (allowed.length === 0) allowed = pools.join('');

  // If we must guarantee at least one of each chosen type, pick one from each pool first
  const passwordChars = [];

  if (guaranteeEachType) {
    for (const pool of pools) {
      let poolStr = pool;
      if (excludeSimilarChars) poolStr = poolStr.split('').filter(ch => !SIMILAR.includes(ch)).join('');
      if (poolStr.length > 0) {
        const idx = Math.floor(Math.random() * poolStr.length);
        passwordChars.push(poolStr[idx]);
      }
    }
  }

  // Fill the rest randomly
  while (passwordChars.length < length) {
    const idx = Math.floor(Math.random() * allowed.length);
    passwordChars.push(allowed[idx]);
  }

  // Shuffle to avoid predictable guaranteed-chars positions (Fisher-Yates)
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.slice(0, length).join('');
}

// ---------- strength estimator ----------
function estimateStrength(pw) {
  if (!pw) return {score:0, label:'Too short'};

  // crude entropy-ish score based on length and variety of char classes
  let poolSize = 0;
  if (/[a-z]/.test(pw)) poolSize += 26;
  if (/[A-Z]/.test(pw)) poolSize += 26;
  if (/[0-9]/.test(pw)) poolSize += 10;
  if (/[!@#\$%\^&\*\(\)\-\_\=\+\[\]\{\};:,.<>\/\?]/.test(pw)) poolSize += 32;

  // estimate bits: length * log2(poolSize), but keep safe defaults
  const bits = poolSize > 0 ? (pw.length * Math.log2(poolSize)) : 0;

  // convert to simple score 0-4
  let score = 0;
  if (bits > 80) score = 4;
  else if (bits > 60) score = 3;
  else if (bits > 40) score = 2;
  else if (bits > 20) score = 1;
  else score = 0;

  const labels = ['Very weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
  return {score, label: labels[score]};
}

// ---------- helper to generate + update UI ----------
function generateAndShow() {
  const opts = {
    length: Number(lengthRange.value),
    includeLower: lowercase.checked,
    includeUpper: uppercase.checked,
    includeNumbers: numbers.checked,
    includeSymbols: symbols.checked,
    excludeSimilarChars: excludeSimilar.checked,
    guaranteeEachType: guaranteeEach.checked
  };

  // Generate
  const pw = generatePassword(opts);
  passwordOutput.value = pw;

  // Strength
  const st = estimateStrength(pw);
  const percent = (st.score / 4) * 100;
  strengthFill.style.width = percent + '%';

  // Color mapping for the fill (simple)
  if (st.score <= 1) {
    strengthFill.style.background = 'linear-gradient(90deg, #ff6b6b, #ffb86b)'; // red/orange
  } else if (st.score === 2) {
    strengthFill.style.background = 'linear-gradient(90deg, #ffd166, #fef08a)'; // yellow
  } else if (st.score === 3) {
    strengthFill.style.background = 'linear-gradient(90deg, #9be15d, #00e3ae)'; // greenish
  } else {
    strengthFill.style.background = 'linear-gradient(90deg, #7afcff, #9b7bff)'; // strong cyan/purple
  }

  strengthText.textContent = pw ? `${st.label} (${Math.round((st.score/4)*100)}%)` : '—';
}

function saveSettings() {
  const settings = getSettings();
  localStorage.setItem("passwordSettings", JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem("passwordSettings");
  if (!saved) return;

  const settings = JSON.parse(saved);

  lengthRange.value = settings.length;
  lengthNumber.value = settings.length;
  lowercase.checked = settings.includeLower;
  uppercase.checked = settings.includeUpper;
  numbers.checked = settings.includeNumbers;
  symbols.checked = settings.includeSymbols;
  excludeSimilar.checked = settings.excludeSimilarChars;
  guaranteeEach.checked = settings.guaranteeEachType;
}
