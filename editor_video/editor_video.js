$(document).ready(function() {
	// --- VARIÁVEIS GLOBAIS ---
	const mediaBin = $('#media-bin');
	const mediaUpload = $('#media-upload');
	const dropZone = $('#drop-zone');
	const timelineContainer = document.getElementById('timeline-container');
	const canvas = document.getElementById('preview-canvas');
	const ctx = canvas.getContext('2d');
	
	let mediaCounter = 0;
	let timeline;
	let items = new vis.DataSet();
	let groups = new vis.DataSet();
	let trackCounter = 1;
	let mediaAssets = {}; // Armazena os elementos de mídia (video, audio, img)

	// --- MÓDULO 1: GERENCIAMENTO DE MÍDIA E LINHA DO TEMPO ---

	function initializeTimeline() {
		groups.add([
			{ id: 'video1', content: 'Vídeo 1 <i class="fas fa-video ml-2 text-indigo-300"></i>', value: 1 },
			{ id: 'audio1', content: 'Áudio 1 <i class="fas fa-volume-up ml-2 text-teal-300"></i>', value: 2 }
		]);

		const options = {
			stack: false,
			start: 0,
			end: 60000, // 1 minuto inicial
			min: 0,
			max: 3600000, // 1 hora de limite
			zoomMin: 1000, // 1 segundo de zoom min
			zoomMax: 3600000,
			editable: {
				add: false,
				updateTime: true,
				updateGroup: true,
				remove: true,
			},
			margin: { item: 10, axis: 5 },
			orientation: 'bottom',
			onMove: function(item, callback) {
				item.start = Math.max(0, item.start);
				item.end = item.start + (item.end - item.start);
				callback(item);
				updateTotalDuration();
			},
			onUpdate: updateTotalDuration,
			onRemove: updateTotalDuration,
		};
		timeline = new vis.Timeline(timelineContainer, items, groups, options);
		// Adiciona a agulha (custom time bar) com um ID específico
		timeline.addCustomTime(0, 'playback-time');
	}
	
	$('#add-track-btn').on('click', function() {
		trackCounter++;
		groups.add([
			{ id: `video${trackCounter}`, content: `Vídeo ${trackCounter} <i class="fas fa-video ml-2 text-indigo-300"></i>`, value: trackCounter * 2 -1 },
			{ id: `audio${trackCounter}`, content: `Áudio ${trackCounter} <i class="fas fa-volume-up ml-2 text-teal-300"></i>`, value: trackCounter * 2 }
		]);
	});
	
	$('#zoom-in-btn').on('click', () => timeline.zoomIn(0.5));
	$('#zoom-out-btn').on('click', () => timeline.zoomOut(0.5));

	mediaUpload.on('change', (event) => handleFiles(event.target.files));
	
	dropZone.on('dragover dragenter', (e) => {
		e.preventDefault();
		e.stopPropagation();
		dropZone.addClass('border-indigo-500');
	}).on('dragleave drop', (e) => {
		e.preventDefault();
		e.stopPropagation();
		dropZone.removeClass('border-indigo-500');
	}).on('drop', (e) => {
		handleFiles(e.originalEvent.dataTransfer.files);
	});
	
	function handleFiles(files) {
		for(const file of files) {
			addMediaToBin(file);
		}
	}

	function addMediaToBin(file) {
		const mediaId = `media-${mediaCounter++}`;
		let mediaElement;

		const mediaItemHTML = `
			<div id="${mediaId}" class="media-bin-item bg-gray-700 p-2 rounded-lg flex flex-col space-y-2">
				<div class="flex items-center space-x-3 w-full">
					<div class="w-16 h-10 bg-black rounded flex items-center justify-center text-gray-500 flex-shrink-0 thumbnail-container">
					   <i class="fas fa-film"></i>
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium truncate">${file.name}</p>
						<p class="text-xs text-gray-400">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
					</div>
					<button class="add-to-timeline-btn hidden flex-shrink-0 bg-indigo-500 hover:bg-indigo-600 p-2 rounded" title="Adicionar à timeline">
						<i class="fas fa-plus"></i>
					</button>
				</div>
				<div class="w-full bg-gray-600 rounded-full h-1.5 progress-bar-container">
					<div class="bg-indigo-500 h-1.5 rounded-full progress-bar" style="width: 0%"></div>
				</div>
			</div>
		`;
		mediaBin.append(mediaItemHTML);
		const mediaDiv = $(`#${mediaId}`);
		const progressBarContainer = mediaDiv.find('.progress-bar-container');
		const progressBar = mediaDiv.find('.progress-bar');
		const thumbnailContainer = mediaDiv.find('.thumbnail-container');

		const reader = new FileReader();

		reader.onprogress = function(event) {
			if (event.lengthComputable) {
				const percentLoaded = Math.round((event.loaded / event.total) * 100);
				progressBar.css('width', percentLoaded + '%');
			}
		};

		reader.onload = function(event) {
			progressBarContainer.hide();
			const objectURL = event.target.result;

			const onMediaLoaded = (duration) => {
				mediaAssets[mediaId] = {
					element: mediaElement,
					type: file.type,
					duration: duration,
					name: file.name
				};
				mediaDiv.find('.add-to-timeline-btn').removeClass('hidden');
			};

			if (file.type.startsWith('video/')) {
				mediaElement = document.createElement('video');
				mediaElement.preload = 'metadata';
				mediaElement.muted = true;
				mediaElement.onloadedmetadata = () => {
					onMediaLoaded(mediaElement.duration * 1000);
					generateVideoThumbnail(mediaElement, mediaId);
				};
			} else if (file.type.startsWith('image/')) {
				mediaElement = document.createElement('img');
				mediaElement.onload = () => {
					const thumbnailImg = `<img src="${objectURL}" class="w-full h-full object-cover rounded">`;
					thumbnailContainer.html(thumbnailImg);
					onMediaLoaded(5000); // Imagens têm duração padrão de 5s
				};
			} else if (file.type.startsWith('audio/')) {
				mediaElement = document.createElement('audio');
				mediaElement.preload = 'metadata';
				mediaElement.onloadedmetadata = () => {
					thumbnailContainer.html(`<i class="fas fa-volume-up fa-2x text-teal-300"></i>`);
					onMediaLoaded(mediaElement.duration * 1000);
				};
			}

			if (mediaElement) {
				mediaElement.src = objectURL;
			}
		};

		reader.onerror = function() {
			console.error("O arquivo não pôde ser lido.");
			mediaDiv.remove();
		};

		reader.readAsDataURL(file);
	}
	
	function generateVideoThumbnail(video, mediaId) {
		const thumbCanvas = document.createElement('canvas');
		video.onseeked = () => {
			thumbCanvas.width = video.videoWidth;
			thumbCanvas.height = video.videoHeight;
			const thumbCtx = thumbCanvas.getContext('2d');
			thumbCtx.drawImage(video, 0, 0, thumbCanvas.width, thumbCanvas.height);
			const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg');
			const thumbnailImg = `<img src="${thumbnailUrl}" class="w-full h-full object-cover rounded">`;
			$(`#${mediaId}`).find('.thumbnail-container').html(thumbnailImg);
			video.currentTime = 0;
		};
		// Busca um frame no início do vídeo para o thumbnail
		video.currentTime = Math.min(1, video.duration / 2);
	}

	mediaBin.on('click', '.add-to-timeline-btn', function() {
		const mediaDiv = $(this).closest('.media-bin-item');
		const mediaId = mediaDiv.attr('id');
		const asset = mediaAssets[mediaId];

		if (!asset || isNaN(asset.duration) || asset.duration <= 0) {
			console.error("Duração de mídia inválida para:", asset.name);
			alert("Não foi possível adicionar a mídia: duração inválida ou zero.");
			return;
		}

		let targetGroup;
		if (asset.type.startsWith('video/') || asset.type.startsWith('image/')) {
			targetGroup = 'video1';
		} else if (asset.type.startsWith('audio/')) {
			targetGroup = 'audio1';
		}

		if (!targetGroup) return;

		const itemsInGroup = items.get({ filter: item => item.group === targetGroup });
		const lastItem = itemsInGroup.reduce((last, current) => (current.end > (last ? last.end : 0) ? current : last), null);
		const startTime = lastItem ? lastItem.end : 0;

		const newItem = {
			id: new Date().getTime(),
			group: targetGroup,
			content: asset.name,
			start: startTime,
			end: startTime + asset.duration,
			mediaId: mediaId,
			type: 'range'
		};
		items.add(newItem);
		timeline.focus(newItem.id);
		updateTotalDuration();
	});

	// --- MÓDULO 2: MOTOR DE PRÉ-VISUALIZAÇÃO (PLAYBACK) ---
	
	let isPlaying = false;
	let currentTime = 0;
	let lastFrameTime = 0;
	let animationFrameId;
	let totalDuration = 0;

	const playPauseBtn = $('#play-pause-btn');
	const currentTimeEl = $('#current-time');
	const totalDurationEl = $('#total-duration');
	const playbackProgress = $('#playback-progress');

	function formatTime(ms) {
		if (isNaN(ms) || ms < 0) {
			return '00:00';
		}
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
	}

	function updateTotalDuration() {
		const allItems = items.get();
		let newTotalDuration = 0;
		if (allItems.length > 0) {
			const validEnds = allItems.map(item => item.end).filter(end => typeof end === 'number' && !isNaN(end));
			if (validEnds.length > 0) {
				newTotalDuration = Math.max(...validEnds);
			}
		}
		totalDuration = newTotalDuration;
		totalDurationEl.text(formatTime(totalDuration));

		const currentWindow = timeline.getWindow();
		if (totalDuration > currentWindow.end || allItems.length === 0) {
			timeline.setWindow(0, Math.max(totalDuration, 60000));
		}
	}

	function togglePlayPause() {
		if (totalDuration <= 0) return; // Não inicia se não houver conteúdo
		isPlaying = !isPlaying;
		if (isPlaying) {
			if (currentTime >= totalDuration) {
				currentTime = 0;
			}
			playPauseBtn.find('i').removeClass('fa-play').addClass('fa-pause');
			lastFrameTime = performance.now();
			
			// --- CORREÇÃO PRINCIPAL ---
			// A função renderLoop precisa ser iniciada com requestAnimationFrame
			// para receber o timestamp inicial. A chamada direta `renderLoop()`
			// passava 'undefined' como tempo, quebrando o cálculo do delta.
			animationFrameId = requestAnimationFrame(renderLoop);
			
			playActiveAudio();
		} else {
			playPauseBtn.find('i').removeClass('fa-pause').addClass('fa-play');
			cancelAnimationFrame(animationFrameId);
			pauseAllAudio();
		}
	}

	function renderLoop(now) {
		if (!isPlaying) return;

		const delta = now - lastFrameTime;
		lastFrameTime = now;
		currentTime += delta;

		if (currentTime >= totalDuration) {
			currentTime = totalDuration;
			togglePlayPause(); // Para a reprodução no final
		}

		// Atualiza a posição da agulha na timeline
		timeline.setCustomTime(currentTime, 'playback-time');
		
		// Atualiza a UI de tempo e progresso
		currentTimeEl.text(formatTime(currentTime));
		const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
		playbackProgress.css('width', `${progressPercentage}%`);
		
		// Desenha o frame atual no canvas
		drawFrame();
		
		// Continua o loop na próxima atualização de tela
		animationFrameId = requestAnimationFrame(renderLoop);
	}
	
	function drawFrame() {
		const activeItems = items.get({
			filter: item => item.start <= currentTime && item.end > currentTime
		});

		// Encontra o item visual (vídeo ou imagem) na trilha mais alta
		const visualItem = activeItems
			.filter(item => mediaAssets[item.mediaId]?.type.startsWith('video/') || mediaAssets[item.mediaId]?.type.startsWith('image/'))
			.sort((a,b) => groups.get(b.group).value - groups.get(a.group).value)[0];

		if (visualItem) {
			const asset = mediaAssets[visualItem.mediaId];
			const element = asset.element;

			if (asset.type.startsWith('video/')) {
				// Ajusta o tamanho do canvas para o tamanho do vídeo
				if (canvas.width !== element.videoWidth || canvas.height !== element.videoHeight) {
					canvas.width = element.videoWidth;
					canvas.height = element.videoHeight;
				}
				const videoTime = (currentTime - visualItem.start) / 1000;
				// Tolerância para evitar seeks desnecessários que causam "engasgos"
				if (Math.abs(element.currentTime - videoTime) > 0.1) { 
					element.currentTime = videoTime;
				}
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
			} else if (asset.type.startsWith('image/')) {
				// Ajusta o tamanho do canvas para o tamanho da imagem
				if (canvas.width !== element.naturalWidth || canvas.height !== element.naturalHeight) {
					canvas.width = element.naturalWidth;
					canvas.height = element.naturalHeight;
				}
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
			}
		} else {
			// Limpa o canvas se não houver item visual
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}
	
	function playActiveAudio() {
		// Pausa todos para evitar sobreposição ao dar play
		pauseAllAudio();
		
		const activeAudioItems = items.get({
			filter: item => mediaAssets[item.mediaId]?.type.startsWith('audio/') && item.start <= currentTime && item.end > currentTime
		});

		activeAudioItems.forEach(item => {
			const asset = mediaAssets[item.mediaId];
			const element = asset.element;
			const audioTime = (currentTime - item.start) / 1000;
			element.currentTime = audioTime;
			element.play();
		});
	}

	function pauseAllAudio() {
		Object.values(mediaAssets).forEach(asset => {
			if (asset.type.startsWith('audio/') && asset.element) {
				asset.element.pause();
			}
		});
	}

	playPauseBtn.on('click', togglePlayPause);

	// Inicializa a aplicação
	initializeTimeline();
	updateTotalDuration();
});
