const menuScreen = document.getElementById('menu-screen');
const exerciseScreen = document.getElementById('exercise-screen');
const startBtn = document.getElementById('start-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const clefSelect = document.getElementById('clef');
const clefLineContainer = document.getElementById('clef-line-container');
const staffContainer = document.getElementById('staff-container');
const answerSection = document.getElementById('answer-section');
const feedbackSection = document.getElementById('feedback-section');
const checkBtn = document.getElementById('check-btn');
const nextBtn = document.getElementById('next-btn');
const timerEl = document.getElementById('timer');
const totalTimeEl = document.getElementById('total-time');
const exerciseTitleEl = document.getElementById('exercise-title');


let currentExercise = {};
let exerciseSettings = {};
let timerInterval;
let startTime;
let totalTime = 0;


const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ACCIDENTAL_NAMES = { '#': 'Sustenido', 'b': 'Bemol' };
const INTERVAL_NAMES = {
	0: 'Uníssono Justo', 1: 'Segunda Menor', 2: 'Segunda Maior', 3: 'Terça Menor',
	4: 'Terça Maior', 5: 'Quarta Justa', 6: 'Quarta aumentada/Quinta diminuta', 7: 'Quinta Justa',
	8: 'Sexta Menor', 9: 'Sexta Maior', 10: 'Sétima Menor', 11: 'Sétima Maior', 12: 'Oitava Justa', 
	13: 'Intervalo desconhecido'
};


const noteToValue = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };


const CLEF_INFO = {
	g: {
		2: { baseNoteName: 'B', baseNoteOctave: 3 }
	},
	f: {
		4: { baseNoteName: 'D', baseNoteOctave: 2 },
		3: { baseNoteName: 'F', baseNoteOctave: 2 }
	},
	c: {
		1: { baseNoteName: 'G', baseNoteOctave: 3 },
		2: { baseNoteName: 'E', baseNoteOctave: 3 },
		3: { baseNoteName: 'C', baseNoteOctave: 3 },
		4: { baseNoteName: 'A', baseNoteOctave: 2 }
	}
};

const CLEF_LINES = {
	g: { label: 'Linha da Clave de Sol', lines: { 2: 'Linha 2 (Padrão)' } },
	f: { label: 'Linha da Clave de Fá', lines: { 4: 'Linha 4 (Padrão)', 3: 'Linha 3' } },
	c: { label: 'Linha da Clave de Dó', lines: { 3: 'Linha 3 (Contralto)', 4: 'Linha 4 (Tenor)', 1: 'Linha 1 (Soprano)', 2: 'Linha 2 (Mezzo-soprano)' } }
};



function updateClefLines() {
	const clef = clefSelect.value;
	const info = CLEF_LINES[clef];
	let html = `<label class="block mb-2 font-medium">${info.label}:</label><div class="flex flex-wrap gap-2">`;
	let first = true;
	for (const line in info.lines) {
		html += `
			<input type="radio" name="clefLine" value="${line}" id="line-${line}" class="clef-line-option" ${first ? 'checked' : ''}>
			<label for="line-${line}" class="clef-line-label">${info.lines[line]}</label>
		`;
		first = false;
	}
	html += `</div>`;
	clefLineContainer.innerHTML = html;
}


function startExercise() {
	exerciseSettings = {
		type: document.querySelector('input[name="exerciseType"]:checked').value,
		clef: clefSelect.value,
		clefLine: document.querySelector('input[name="clefLine"]:checked').value,
		allowLedger: document.getElementById('allow-ledger').checked,
		allowAccidentals: document.getElementById('allow-accidentals').checked
	};
	menuScreen.classList.add('hidden');
	exerciseScreen.classList.remove('hidden');
	totalTime = 0;
	totalTimeEl.textContent = '0.0s';
	generateNewExercise();
}

function generateNewExercise() {
	feedbackSection.innerHTML = '';
	checkBtn.classList.remove('hidden');
	nextBtn.classList.add('hidden');
	drawStaff();

	if (exerciseSettings.type === 'note') {
		exerciseTitleEl.textContent = 'Qual é a nota?';
		generateNoteNameExercise();
	} else {
		exerciseTitleEl.textContent = 'Qual é o intervalo?';
		generateIntervalExercise();
	}
	startTimer();
}

function generateNoteNameExercise() {
	currentExercise.note1 = generateRandomNote();
	drawNote(currentExercise.note1, 120);
	setupNoteNameAnswerUI();
}

function generateIntervalExercise() {
	currentExercise.note1 = generateRandomNote(false);
	currentExercise.note2 = generateRandomNote(true);
	
	while (getMidiValue(currentExercise.note2) === getMidiValue(currentExercise.note1)) {
		currentExercise.note2 = generateRandomNote(true);
	}

	if (getMidiValue(currentExercise.note1) > getMidiValue(currentExercise.note2)) {
		[currentExercise.note1, currentExercise.note2] = [currentExercise.note2, currentExercise.note1];
	}

	drawNote(currentExercise.note1, 100);
	drawNote(currentExercise.note2, 180);

	const midiDiff = getMidiValue(currentExercise.note2) - getMidiValue(currentExercise.note1);
	currentExercise.correctAnswer = INTERVAL_NAMES[midiDiff] || 'Intervalo desconhecido';
	
	setupIntervalAnswerUI();
}

function generateRandomNote(canHaveAccidentals = true) {
	let minPosition = -5; 
	let maxPosition = 9;  
	if (!exerciseSettings.allowLedger) {
		minPosition = -4; 
		maxPosition = 4;  
	}

	const position = Math.floor(Math.random() * (maxPosition - minPosition + 1)) + minPosition;
	const { name, octave } = getNoteFromPosition(position, exerciseSettings);
	
	let accidental = 'natural';
	if (exerciseSettings.allowAccidentals && canHaveAccidentals) {
		const rand = Math.random();
		if (rand < 0.15) { accidental = '#'; } 
		else if (rand < 0.3) { accidental = 'b'; }
	}
	
	return { name, octave, accidental, position };
}

function checkAnswer() {
	stopTimer();
	let isCorrect = false;
	let correctAnswerText = '';

	if (exerciseSettings.type === 'note') {
		const userNote = document.getElementById('note-name-select').value;
		// --- Início da Alteração ---
        // Busca o valor do botão de rádio de altura que está selecionado
		const userOctave = document.querySelector('input[name="note-octave"]:checked').value;
        // --- Fim da Alteração ---
		const userAccidental = document.getElementById('note-accidental-select').value;
		
		const note = currentExercise.note1;
		isCorrect = userNote === note.name && parseInt(userOctave) === note.octave && userAccidental === note.accidental;
		
		let accidentalText = '';
		if(note.accidental === '#') accidentalText = ' sustenido';
		if(note.accidental === 'b') accidentalText = ' bemol';
		correctAnswerText = `A resposta é ${note.name}${note.octave}${accidentalText}.`;

	} else {
		const userAnswer = document.getElementById('interval-select').value;
		isCorrect = userAnswer === currentExercise.correctAnswer;
		correctAnswerText = `A resposta é ${currentExercise.correctAnswer}.`;
	}

	if (isCorrect) {
		feedbackSection.innerHTML = '<span class="feedback-correct">Correto!</span>';
	} else {
		feedbackSection.innerHTML = `<span class="feedback-incorrect">Incorreto.</span> <span class="text-gray-600">${correctAnswerText}</span>`;
	}

	checkBtn.classList.add('hidden');
	nextBtn.classList.remove('hidden');
}




function setupNoteNameAnswerUI() {
	let noteOptions = NOTE_NAMES.map(n => `<option value="${n}">${n}</option>`).join('');
	let accidentalOptions = `
		<option value="natural">Natural</option>
		<option value="#">Sustenido (#)</option>
		<option value="b">Bemol (b)</option>
	`;

    // --- Início da Alteração ---
	// Gera os botões clicáveis para a seleção da altura
	let octaveButtons = '';
	const startOctave = 2;
	const endOctave = 6;
	for (let i = startOctave; i <= endOctave; i++) {
        // O botão para a oitava 4 já virá selecionado por padrão
		const isChecked = (i === 4) ? 'checked' : '';
		octaveButtons += `
			<div class="flex-1">
				<input type="radio" name="note-octave" value="${i}" id="octave-${i}" class="octave-option" ${isChecked}>
				<label for="octave-${i}" class="octave-label block">${i}</label>
			</div>
		`;
	}
    // --- Fim da Alteração ---

	answerSection.innerHTML = `
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
			<div>
				<label class="block mb-2 font-medium">Nota:</label>
				<select id="note-name-select" class="w-full p-2 border rounded-lg">${noteOptions}</select>
			</div>
			<div>
				<label class="block mb-2 font-medium">Acidente:</label>
				<select id="note-accidental-select" class="w-full p-2 border rounded-lg" ${!exerciseSettings.allowAccidentals ? 'disabled' : ''}>
					${accidentalOptions}
				</select>
			</div>
		</div>
		<div class="mt-4">
			<label class="block mb-2 font-medium">Altura:</label>
			<div class="flex flex-wrap gap-2">
				${octaveButtons}
			</div>
		</div>
		`;
}



function setupIntervalAnswerUI() {
	let intervalOptions = Object.values(INTERVAL_NAMES).map(name => `<option value="${name}">${name}</option>`).join('');
	answerSection.innerHTML = `
		<div>
			<label for="interval-select" class="block mb-1 font-medium">Intervalo:</label>
			<select id="interval-select" class="w-full p-2 border rounded-lg">${intervalOptions}</select>
		</div>`;
}

function drawStaff() {
	const staffHeight = 80;
	const lineSpacing = staffHeight / 4;
	const staffWidth = staffContainer.clientWidth - 40;
	let svg = `<svg width="100%" height="100%" viewBox="0 0 ${staffContainer.clientWidth} 120">`;
	for (let i = 0; i < 5; i++) {
		const y = 20 + i * lineSpacing;
		svg += `<line x1="20" y1="${y}" x2="${staffWidth + 20}" y2="${y}" stroke="black" stroke-width="1.5"/>`;
	}
	const clefInfo = CLEF_INFO[exerciseSettings.clef][exerciseSettings.clefLine];
	let clefUrl, clefY, clefHeight, clefWidth;
	if (exerciseSettings.clef === 'g') {
		clefUrl = 'https://codeberg.org/diegoperesmarques/img-tutoriais/raw/branch/main/notas/claveSol.png';
		clefY = 20 - lineSpacing * 1.5;
		clefHeight = staffHeight * 1.8;
		clefWidth = clefHeight * 0.4;
	} else if (exerciseSettings.clef === 'f') {
		clefUrl = 'https://codeberg.org/diegoperesmarques/img-tutoriais/raw/branch/main/notas/claveFa.png';
		clefY = 20;
		clefHeight = staffHeight;
		clefWidth = clefHeight * 0.5;
	} else {
		clefUrl = 'https://codeberg.org/diegoperesmarques/img-tutoriais/raw/branch/main/notas/222746.png';
		const baseLine = 4 - (Object.keys(CLEF_INFO.c).indexOf(exerciseSettings.clefLine) * 2 + 2);
		const lineY = 20 + (4 - baseLine) * lineSpacing;
		clefY = lineY - (staffHeight / 2);
		clefHeight = staffHeight;
		clefWidth = clefHeight * 0.5;
	}
	svg += `<image href="${clefUrl}" x="30" y="${clefY}" height="${clefHeight}" width="${clefWidth}" />`;
	staffContainer.innerHTML = svg + '</svg>';
}

function drawNote(note, x) {
	const svg = staffContainer.querySelector('svg');
	const staffHeight = 80;
	const lineSpacing = staffHeight / 4;
	const step = lineSpacing / 2;
	const noteRadius = step * 0.9;
	const y = 60 - note.position * step;
	
	if (note.position <= -5) { svg.innerHTML += `<line x1="${x - noteRadius * 1.8}" y1="${y}" x2="${x + noteRadius * 1.8}" y2="${y}" stroke="black" stroke-width="1.5"/>`; }
	if (note.position <= -7) { svg.innerHTML += `<line x1="${x - noteRadius * 1.8}" y1="${y + lineSpacing}" x2="${x + noteRadius * 1.8}" y2="${y + lineSpacing}" stroke="black" stroke-width="1.5"/>`; }
	if (note.position >= 5) { svg.innerHTML += `<line x1="${x - noteRadius * 1.8}" y1="${y}" x2="${x + noteRadius * 1.8}" y2="${y}" stroke="black" stroke-width="1.5"/>`; }
	if (note.position >= 7) { svg.innerHTML += `<line x1="${x - noteRadius * 1.8}" y1="${y - lineSpacing}" x2="${x + noteRadius * 1.8}" y2="${y - lineSpacing}" stroke="black" stroke-width="1.5"/>`; }
	if (note.position >= 9) { svg.innerHTML += `<line x1="${x - noteRadius * 1.8}" y1="${y - lineSpacing * 2}" x2="${x + noteRadius * 1.8}" y2="${y - lineSpacing * 2}" stroke="black" stroke-width="1.5"/>`; }

	svg.innerHTML += `<circle cx="${x}" cy="${y}" r="${noteRadius}" fill="black" />`;
	
	const stemDirection = note.position >= 0 ? -1 : 1;
	const stemHeight = lineSpacing * 3;
	const stemX = x + (stemDirection === 1 ? -noteRadius : noteRadius);
	svg.innerHTML += `<line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${y + stemHeight * stemDirection}" stroke="black" stroke-width="2"/>`;

	if (note.accidental !== 'natural') {
		const accidentalX = x - noteRadius * 3.5;
		let accidentalSymbol = '';
		if (note.accidental === '#') {
			accidentalSymbol = `<g transform="translate(${accidentalX}, ${y})" stroke="black" stroke-width="1.5"><line x1="-4" y1="-10" x2="-4" y2="10" /><line x1="4" y1="-10" x2="4" y2="10" /><line x1="-7" y1="-3" x2="7" y2="1" stroke-width="2.5" /><line x1="-7" y1="3" x2="7" y2="7" stroke-width="2.5" /></g>`;
		} else if (note.accidental === 'b') {
			accidentalSymbol = `<g transform="translate(${accidentalX}, ${y})" stroke="black" stroke-width="1.5" fill="black"><line x1="0" y1="-12" x2="0" y2="5" /><path d="M 0 5 C 10 5, 10 -5, 0 -5 Z" stroke-width="1" /></g>`;
		}
		svg.innerHTML += accidentalSymbol;
	}
}


function getNoteFromPosition(position, clefSettings) {
	const baseNoteInfo = CLEF_INFO[clefSettings.clef][clefSettings.clefLine];
	const baseNoteName = baseNoteInfo.baseNoteName;
	let currentOctave = baseNoteInfo.baseNoteOctave;
	let currentNoteIndex = NOTE_NAMES.indexOf(baseNoteName);

	if (position > 0) {
		for (let i = 0; i < position; i++) {
			if (currentNoteIndex === 6) { currentOctave++; } 
			currentNoteIndex = (currentNoteIndex + 1) % 7;
		}
	} else if (position < 0) {
		for (let i = 0; i > position; i--) {
			if (currentNoteIndex === 0) { currentOctave--; } 
			currentNoteIndex = (currentNoteIndex - 1 + 7) % 7;
		}
	}
	return { name: NOTE_NAMES[currentNoteIndex], octave: currentOctave };
}

function getMidiValue({ name, octave, accidental }) {
	let value = 12 * (octave + 1) + noteToValue[name];
	if (accidental === '#') value++;
	if (accidental === 'b') value--;
	return value;
}


function startTimer() {
	startTime = Date.now();
	timerInterval = setInterval(() => {
		const elapsedTime = (Date.now() - startTime) / 1000;
		timerEl.textContent = elapsedTime.toFixed(1) + 's';
	}, 100);
}

function stopTimer() {
	clearInterval(timerInterval);
	const elapsedTime = (Date.now() - startTime) / 1000;
	timerEl.textContent = elapsedTime.toFixed(1) + 's';
	totalTime += elapsedTime;
	totalTimeEl.textContent = totalTime.toFixed(1) + 's';
}


function goBackToMenu() {
	exerciseScreen.classList.add('hidden');
	menuScreen.classList.remove('hidden');
	clearInterval(timerInterval);
}

clefSelect.addEventListener('change', updateClefLines);
startBtn.addEventListener('click', startExercise);
backToMenuBtn.addEventListener('click', goBackToMenu);
checkBtn.addEventListener('click', checkAnswer);
nextBtn.addEventListener('click', generateNewExercise);

updateClefLines();