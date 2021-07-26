// const { urlencoded } = require("express");

(function () {
	var Engine = window.Engine = {

		SITE_URL: encodeURIComponent(""),
		VERSION: 1.3,
		MAX_STORE: 99999999999999,
		SAVE_DISPLAY: 30 * 1000,
		GAME_OVER: false,

		//object event types
		topics: {},

		// perks: perks,
		perks: window.perks,

		options: {
			state: null,
			debug: false,
			log: true,
			dropbox: false,
			doubleTime: false,
			allowSelect: false
		},

		init: function (options) {
			this.options = $.extend(
				this.options,
				options
			);
			this._debug = this.options.debug;
			this._log = this.options.log;
			this._allowSelect = this.options.allowSelect
			// this.backgroundUrl = 'img/bg/P0ck.gif';

			this.title = "server side squat"

			// Check for HTML5 support
			if (!Engine.browserValid()) {
				window.location = 'browserWarning.html';
			}

			// Check for mobile
			if (Engine.isMobile()) {
				window.location = 'mobileWarning.html';
			}

			if (!this._allowSelect) {
				Engine.disableSelection();
			}

			if (this.options.state != null) {
				window.State = this.options.state;
			} else {
				Engine.loadGame();
			}

			// start loading music and events early
			for (var key in AudioLibrary) {
				if (
					key.toString().indexOf('MUSIC_') > -1 ||
					key.toString().indexOf('EVENT_') > -1) {
					AudioEngine.loadAudioFile(AudioLibrary[key]);
				}
			}

			$('<div>').attr('id', 'locationSlider').appendTo('#main');

			let menu = $('<div>')
				.addClass('menu')
				.appendTo('body');

			let customSelect = $('<div>')
				.addClass('customSelect')
				.addClass('menuBtn')
				.appendTo(menu);
			let selectOptions = $('<div>')
				.addClass('customSelectOptions')
				.appendTo(customSelect);
			let optionsList = $('<ul>')
				.appendTo(selectOptions);
			$('<li>')
				.addClass('fa fa-bars')
				.attr('style', 'color: var(--fg-color);')
				.attr('aria-hidden', 'true')
				.text(_(' MENU'))
				.appendTo(optionsList);

			$('<li>')
				.addClass('menuBtn')
				.text(_(''))
				.appendTo(optionsList);


			$('<li>')
				.addClass('menuBtn')
				.text(_('Title Screen'))
				.click(Engine.menuTitleScreen)
				.appendTo(optionsList);


			// $('<li>')
			// 	.addClass('volume menuBtn')
			// 	.text(_('sound on'))
			// 	.click(() => Engine.toggleVolume())
			// 	.appendTo(optionsList);

			// $('<li>')
			// 	.addClass('hyper menuBtn')
			// 	.text(_('hyper.'))
			// 	.click(Engine.confirmHyperMode)
			// 	.appendTo(optionsList);


			// $('<li>')
			// 	.addClass('menuBtn')
			// 	.text(_('share.'))
			// 	.click(Engine.share)
			// 	.appendTo(optionsList);

			// $('<li>')
			// 	.addClass('menuBtn')
			// 	.text(_('export save'))
			// 	.click(Engine.exportSaveString)
			// 	.appendTo(optionsList);

			$('<li>')
				.addClass('menuBtn')
				.text(_(''))
				.appendTo(optionsList);
			$('<li>')
				.addClass('menuBtn')
				.text(_(''))
				.appendTo(optionsList);

			// Title
			$('<span>')
				.addClass('headerTitleText')
				.text(this.title)
				.appendTo('#header-title')

			// Register keypress handlers
			$('body').off('keydown').keydown(Engine.keyDown);
			$('body').off('keyup').keyup(Engine.keyUp);

			// Register swipe handlers
			swipeElement = $('#outerSlider');
			swipeElement.on('swipeleft', Engine.swipeLeft);
			swipeElement.on('swiperight', Engine.swipeRight);
			swipeElement.on('swipeup', Engine.swipeUp);
			swipeElement.on('swipedown', Engine.swipeDown);

			// subscribe to stateUpdates
			$.Dispatch('stateUpdate').subscribe(Engine.handleStateUpdates);

			$SM.init();
			AudioEngine.init();

			AudioEngine.playBackgroundMusic(AudioLibrary.BREATHER1_NEONWORLD)

			Notifications.init();
			Events.init();
			Room.init();


			if ($SM.get('features.powered') === true) {
				Engine.brightUpdate(Room._POWER_ON_BRIGHTNESS)
			} else if ($SM.get('features.powered') === false) {
				Engine.brightUpdate(Room._POWER_OFF_BRIGHTNESS)
			}

			if (typeof $SM.get('stores.octogons') != 'undefined') {
				Outside.init();
			}
			if ($SM.get('stores.compass', true) > 0) {
				Path.init();
			}
			if ($SM.get('features.location.spaceShip')) {
				Ship.init();
			}

			if ($SM.get('config.lightsOff', true)) {
				Engine.turnLightsOff();
			}

			if ($SM.get('config.hyperMode', true)) {
				Engine.triggerHyperMode();
			}

			Engine.toggleVolume(Boolean($SM.get('config.soundOn')));
			if (!AudioEngine.isAudioContextRunning()) {
				document.addEventListener('click', Engine.resumeAudioContext, true);
			}


			// huh?
			$SM.set('character.memory', $SM.get('character.memory') === undefined ? {} : $SM.get('character.memory'));

			Engine.saveLanguage();
			Engine.travelTo(Room);

			let titleScreenShown = $SM.get('playStats.titleScreenShown')
			if (typeof titleScreenShown === 'undefined' || titleScreenShown == false) {
				$SM.set('playStats.titleScreenShown', true)
				setTimeout(Engine.menuTitleScreen, 200);
			}

		},
		resumeAudioContext: function () {
			AudioEngine.tryResumingAudioContext();

			// turn on music!
			AudioEngine.setMasterVolume($SM.get('config.soundOn') ? 1.0 : 0.0, 0);

			document.removeEventListener('click', Engine.resumeAudioContext);
		},
		browserValid: function () {
			return (location.search.indexOf('ignorebrowser=true') >= 0 || (typeof Storage != 'undefined' && !oldIE));
		},

		isMobile: function () {
			return (location.search.indexOf('ignorebrowser=true') < 0 && /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent));
		},
		updateTitleObjective: function (newTitle) {
			$SM.set('game.title', newTitle)
			window.Engine.title = newTitle
			let title = $('.headerTitleText')
			title[0].innerHTML = window.Engine.title
		},

		saveGame: function () {
			if (typeof Storage != 'undefined' && localStorage) {
				if (Engine._saveTimer != null) {
					clearTimeout(Engine._saveTimer);
				}
				if (typeof Engine._lastNotify == 'undefined' || Date.now() - Engine._lastNotify > Engine.SAVE_DISPLAY) {
					$('#saveNotify').css('opacity', 1).animate({ opacity: 0 }, 1000, 'linear');
					Engine._lastNotify = Date.now();
				}
				localStorage.gameState = JSON.stringify(State);
			}
		},

		loadGame: function () {
			try {
				var savedState = JSON.parse(localStorage.gameState);
				if (savedState) {
					State = savedState;
					$SM.updateOldState();
					Engine.log("loaded save!");
				}
			} catch (e) {
				State = {};
				$SM.set('version', Engine.VERSION);
				Engine.event('progress', 'new game');
			}
		},

		exportSaveString: function () {
			Events.startEvent({
				title: _('Export / Import'),
				scenes: {
					'start': {
						text: [_('save this.')],
						textarea: Engine.export64(),
						// onLoad: function() { Engine.event('progress', 'export'); },
						readonly: true,
						buttons: {
							'done': {
								text: _('got it'),
								nextScene: 'end',
								onChoose: Engine.disableSelection
							}
						}
					},
					'confirm': {
						text: [
							_('are you sure?'),
							_('if the code is invalid, all data will be lost.'),
							_('this is irreversible.')
						],
						buttons: {
							'yes': {
								text: _('yes'),
								nextScene: { 1: 'inputImport' },
								onChoose: Engine.enableSelection
							},
							'no': {
								text: _('no'),
								nextScene: { 1: 'start' }
							}
						}
					},
					'inputImport': {
						text: [_('put the save code here.')],
						textarea: '',
						buttons: {
							'okay': {
								text: _('import'),
								nextScene: 'end',
								onChoose: Engine.import64
							},
							'cancel': {
								text: _('cancel'),
								nextScene: 'end'
							}
						}
					}
				}
			});
		},

		generateExport64: function () {
			var string64 = Base64.encode(localStorage.gameState);
			string64 = string64.replace(/\s/g, '');
			string64 = string64.replace(/\./g, '');
			string64 = string64.replace(/\n/g, '');

			return string64;
		},

		export64: function () {
			Engine.saveGame();
			Engine.enableSelection();
			return Engine.generateExport64();
		},

		import64: function (string64) {
			Engine.event('progress', 'import');
			Engine.disableSelection();
			string64 = string64.replace(/\s/g, '');
			string64 = string64.replace(/\./g, '');
			string64 = string64.replace(/\n/g, '');
			var decodedSave = Base64.decode(string64);
			localStorage.gameState = decodedSave;
			location.reload();
		},

		event: function (cat, act) {
			if (typeof ga === 'function') {
				Engine.log("WAARNING: Event tried to send something through Google Analytics.")
				// ga('send', 'event', cat, act);
			}
		},

		confirmDelete: function () {
			Events.startEvent({
				title: _('Restart?'),
				scenes: {
					start: {
						text: [_('restart the game?')],
						buttons: {
							'yes': {
								text: _('yes'),
								nextScene: 'end',
								onChoose: Engine.deleteSave()
							},
							'no': {
								text: _('no'),
								nextScene: 'end'
							}
						}
					}
				}
			});
		},

		deleteSave: function (noReload = true) {
			if (typeof Storage != 'undefined' && localStorage) {


				var prestige = Prestige.get();
				window.State = {};
				localStorage.clear();
				Prestige.set(prestige);
			}
			if (!noReload) {
				location.reload();
				$SM.set('playStats.titleScreenShown', false);
			}
		},

		// getApp: function() {
		// 	Events.startEvent({
		// 		title: _('Get the App'),
		// 		scenes: {
		// 			start: {
		// 				text: [_('bring the room with you.')],
		// 				buttons: {
		// 					'ios': {
		// 						text: _('ios'),
		// 						nextScene: 'end',
		// 						onChoose: function () {
		// 							window.open('https://itunes.apple.com/app/apple-store/id736683061?pt=2073437&ct=adrproper&mt=8');
		// 						}
		// 					},
		// 					'android': {
		// 						text: _('android'),
		// 						nextScene: 'end',
		// 						onChoose: function() {
		// 							window.open('https://play.google.com/store/apps/details?id=com.yourcompany.adarkroom');
		// 						}
		// 					},
		// 					'close': {
		// 						text: _('close'),
		// 						nextScene: 'end'
		// 					}
		// 				}
		// 			}
		// 		}
		// 	});
		// },

		// share: function() {
		// 	Events.startEvent({
		// 		title: _('Share'),
		// 		scenes: {
		// 			start: {
		// 				text: [_('bring your friends.')],
		// 				buttons: {
		// 					'facebook': {
		// 						text: _('facebook'),
		// 						nextScene: 'end',
		// 						onChoose: function() {
		// 							window.open('https://www.facebook.com/sharer/sharer.php?u=' + Engine.SITE_URL, 'sharer', 'width=626,height=436,location=no,menubar=no,resizable=no,scrollbars=no,status=no,toolbar=no');
		// 						}
		// 					},
		// 					'google': {
		// 						text:_('google+'),
		// 						nextScene: 'end',
		// 						onChoose: function() {
		// 							window.open('https://plus.google.com/share?url=' + Engine.SITE_URL, 'sharer', 'width=480,height=436,location=no,menubar=no,resizable=no,scrollbars=no,status=no,toolbar=no');
		// 						}
		// 					},
		// 					'twitter': {
		// 						text: _('twitter'),
		// 						nextScene: 'end',
		// 						onChoose: function() {
		// 							window.open('https://twitter.com/intent/tweet?text=A%20Dark%20Room&url=' + Engine.SITE_URL, 'sharer', 'width=660,height=260,location=no,menubar=no,resizable=no,scrollbars=yes,status=no,toolbar=no');
		// 						}
		// 					},
		// 					'reddit': {
		// 						text: _('reddit'),
		// 						nextScene: 'end',
		// 						onChoose: function() {
		// 							window.open('http://www.reddit.com/submit?url=' + Engine.SITE_URL, 'sharer', 'width=960,height=700,location=no,menubar=no,resizable=no,scrollbars=yes,status=no,toolbar=no');
		// 						}
		// 					},
		// 					'close': {
		// 						text: _('close'),
		// 						nextScene: 'end'
		// 					}
		// 				}
		// 			}
		// 		}
		// 	},
		// 	{
		// 		width: '400px'
		// 	});
		// },

		// TODO: what the fuck is this?
		// _prepareIrregularHues: function(bool) {
		// 	let position;
		// 	if (bool == true) {
		// 		position = "absolute"
		// 	} else {
		// 		position = "absolute"
		// 	}
		// 	let irregularElem = document.querySelector('#notifyGradient').style.setProperty("position", position)
		// },

		configSaveHueToState: function () {
			let hueToSave = parseInt(Engine.getColorValues().hue)
			$SM.set('config.savedHue', hueToSave)
		},


		getColorValues: function () {
			let bright = parseInt(document.documentElement.style.getPropertyValue('--bright'))
			let color = {
				'hue': document.documentElement.style.getPropertyValue('--hue'),
				'bright': typeof bright === 'number' ? bright :
					$SM.get('features.powered') == true ? Room._POWER_ON_BRIGHTNESS : Room._POWER_OFF_BRIGHTNESS
			}
			return color;
		},

		hueUpdate: function (newHue) {
			// Engine._prepareIrregularHues(true)
			if (newHue !== 'undefined') {
				document.documentElement.style.setProperty('--hue', parseInt(newHue))
			} else if (typeof newHue == 'undefined') {
				const randHue = Math.floor(Math.random() * 360) + 1
				document.documentElement.style.setProperty(hue, parseInt(randHue))
			}

			if (Engine.activeModule == Room) {
				Engine.configSaveHueToState()
			}

		},

		brightUpdate: function (newBright) {
			if (newBright !== 'undefined') {
				let root = document.documentElement
				root.style.setProperty('--bright', parseInt(newBright).toString() + '%')
			}
		},

		findStylesheet: function (title) {
			for (var i = 0; i < document.styleSheets.length; i++) {
				var sheet = document.styleSheets[i];
				if (sheet.title == title) {
					return sheet;
				}
			}
			return null;
		},

		confirmHyperMode: function () {
			if (!Engine.options.doubleTime) {
				Events.startEvent({
					title: _('Go Hyper?'),
					scenes: {
						start: {
							text: [_('turning hyper mode speeds up the game to x2 speed. do you want to do that?')],
							buttons: {
								'yes': {
									text: _('yes'),
									nextScene: 'end',
									onChoose: Engine.triggerHyperMode
								},
								'no': {
									text: _('no'),
									nextScene: 'end'
								}
							}
						}
					}
				});
			} else {
				Engine.triggerHyperMode();
			}
		},

		triggerHyperMode: function () {
			Engine.options.doubleTime = !Engine.options.doubleTime;
			if (Engine.options.doubleTime)
				$('.hyper').text(_('classic.'));
			else
				$('.hyper').text(_('hyper.'));

			$SM.set('config.hyperMode', Engine.options.doubleTime, false);
		},

		// Gets a guid
		getGuid: function () {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
				var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		},

		activeModule: null,
		hotkeysOn: true,

		travelTo: function (module) {

			if (Engine.activeModule != module) {
				AudioEngine.stopEventMusic()
				var currentIndex = Engine.activeModule ? $('.location').index(Engine.activeModule.panel) : 1;
				$('div.headerButton').removeClass('selected');
				module.tab.addClass('selected');

				var slider = $('#locationSlider');
				var stores = $('#storesContainer');
				var panelIndex = $('.location').index(module.panel);
				var diff = Math.abs(panelIndex - currentIndex);
				slider.animate({ left: -(panelIndex * 700) + 'px' }, 300 * diff);

				if ($SM.get('stores.octogons') !== undefined) {
					// FIXME Why does this work if there's an animation queue...?
					stores.animate({ right: -(panelIndex * 700) + 'px' }, 300 * diff);
				}

				if (Engine.activeModule == Room || Engine.activeModule == Path) {
					// Don't fade out the weapons if we're switching to a module
					// where we're going to keep showing them anyway.
					if (module != Room && module != Path) {
						$('div#weapons').animate({ opacity: 0 }, 300);
					}
				}

				if (module == Room || module == Path) {
					$('div#weapons').animate({ opacity: 1 }, 300);
				}

				Engine.activeModule = module;
				// Engine.hueUpdate(module.hue)
				module.onArrival(diff);
				Engine.hueUpdate(module.hue)
				Notifications.printQueue(module);
			}
		},

		/* Move the stores panel beneath top_container (or to top: 0px if top_container
		 * either hasn't been filled in or is null) using transition_diff to sync with
		 * the animation in Engine.travelTo().
		 */
		moveStoresView: function (top_container, transition_diff) {
			var stores = $('#storesContainer');

			// If we don't have a storesContainer yet, leave.
			if (typeof (stores) === 'undefined') return;

			if (typeof (transition_diff) === 'undefined') transition_diff = 1;

			if (top_container === null) {
				stores.animate({ top: '0px' }, { queue: false, duration: 300 * transition_diff });
			}
			else if (!top_container.length) {
				stores.animate({ top: '0px' }, { queue: false, duration: 300 * transition_diff });
			}
			else {
				stores.animate({
					top: top_container.height() + 26 + 'px'
				},
					{
						queue: false,
						duration: 300 * transition_diff
					});
			}
		},

		log: function (msg) {
			if (this._log) {
				console.log(msg);
			}
		},

		logFromSM: function (stateLocations) {
			let states = {}
			for (let state of stateLocations) {
				if (typeof $SM.get(state) != 'undefined') {
					states[state] = $SM.get(state)
				} else {
					states[state] = 'undefined'
				}
			}

			window.Engine.log(`LOGGING STATES CALLED AT:\n${window.Engine.logFromSM.caller}\n`)

			let key, value, msg
			for (let entry of Object.entries(states)) {
				key = entry[0]
				value = entry[1]
				msg = `${key}: ${value}`
				window.Engine.log(msg)
			}
		},

		updateSlider: function () {
			var slider = $('#locationSlider');
			slider.width((slider.children().length * 700) + 'px');
		},

		updateOuterSlider: function () {
			var slider = $('#outerSlider');
			slider.width((slider.children().length * 700) + 'px');
		},

		getIncomeMsg: function (num, delay) {
			return _("{0} per {1}s", (num > 0 ? "+" : "") + num, delay);
			//return (num > 0 ? "+" : "") + num + " per " + delay + "s";
		},

		keyLock: false,
		tabNavigation: true,
		restoreNavigation: false,

		keyDown: function (e) {
			e = e || window.event;
			if (!Engine.keyPressed && !Engine.keyLock) {
				Engine.pressed = true;
				if (Engine.activeModule.keyDown) {
					Engine.activeModule.keyDown(e);
				}
			}
			return jQuery.inArray(e.keycode, [37, 38, 39, 40]) < 0;
		},

		keyUp: function (e) {
			Engine.pressed = false;
			if (Engine.activeModule.keyUp) {
				Engine.activeModule.keyUp(e);
			} else {
				switch (e.which) {
					case 27:  // ESCAPE
						if (Events.activeEvent() === null) {
							Engine.menuTitleScreen();
						} else if (Events.activeEvent().title === 'Version 0.1 Beta') {
							Events.endEvent()
						};
						break
					case 38: // Up
					case 87:
						if (Engine.activeModule == Outside || Engine.activeModule == Path) {
							Engine.activeModule.scrollSidebar('up');
						}
						if (Engine.activeModule == Room) {
							let color = Engine.getColorValues()
							let currentHue = parseInt(color['hue'])
							let newHue = currentHue + 10
							if (newHue >= 360 || typeof newHue === 'string') {
								newHue = 0
							}
							Engine.log('newHue ' + newHue)
							Engine.hueUpdate(newHue)
						}
						Engine.log('up');
						break;
					case 40: // Down
					case 83:
						if (Engine.activeModule == Outside || Engine.activeModule == Path) {
							Engine.activeModule.scrollSidebar('down');
						}
						if (Engine.activeModule == Room) {
							let color = Engine.getColorValues()
							let currentHue = parseInt(color['hue'])
							let newHue = currentHue - 10
							if (newHue <= 0 || typeof newHue === 'string') {
								newHue = 360
							}
							Engine.log('newHue ' + newHue)
							Engine.hueUpdate(newHue)
						}
						Engine.log('down');
						break;
					case 37: // Left
					case 65:
						if (Engine.tabNavigation) {
							if (Engine.activeModule == Ship && Path.tab)
								Engine.travelTo(Path);
							else if (Engine.activeModule == Path && Outside.tab) {
								Engine.activeModule.scrollSidebar('left', true);
								Engine.travelTo(Outside);

							} else if (Engine.activeModule == Outside && Room.tab) {
								Engine.activeModule.scrollSidebar('left', true);
								Engine.travelTo(Room);
							}
						}
						Engine.log('left');
						break;
					case 39: // Right
					case 68:
						if (Engine.tabNavigation) {
							if (Engine.activeModule == Room && Outside.tab)
								Engine.travelTo(Outside);
							else if (Engine.activeModule == Outside && Path.tab) {
								Engine.activeModule.scrollSidebar('right', true);
								Engine.travelTo(Path);
							} else if (Engine.activeModule == Path && Ship.tab) {
								Engine.activeModule.scrollSidebar('right', true);
								Engine.travelTo(Ship);
							}
						}
						Engine.log('right');
						break;
					case 81: // q
						// if(Engine.activeModule == Room) {
						// 	let color = Engine.getColorValues()
						// 	let currentBright = color['bright']
						// 	let newBright = currentBright + 2
						// 	if (newBright >= 46 || newBright == NaN) {
						// 		newBright = 0
						// 	}
						// 	Engine.log('newBright ' + newBright)
						// 	Engine.brightUpdate(newBright)

						// } 
						// Engine.log('q');
						break;

					case 76: // l
					// if(Engine.activeModule == Room) {
					// 	let color = Engine.getColorValues()
					// 	let currentBright = color['bright']
					// 	let newBright = currentBright - 2
					// 	if (newBright <= 0 || newBright == NaN) {
					// 		newBright = 46
					// 	}
					// 	Engine.log('newBright ' + newBright)
					// 	Engine.brightUpdate(newBright)

					// } 
					// Engine.log('l');

				}
			}
			if (Engine.restoreNavigation) {
				Engine.tabNavigation = true;
				Engine.restoreNavigation = false;
			}
			return false;
		},

		_rollDice: function (min, max) { // min and max included 
			return Math.floor(Math.random() * (max - min + 1) + min)
		},

		rollDiceHue: function () {
			let roll = Engine._rollDice(1, 360);
			typeof roll === 'number' ? Engine.hueUpdate(roll) : Engine.hueUpdate(280)
		},

		swipeLeft: function (e) {
			if (Engine.activeModule.swipeLeft) {
				Engine.activeModule.swipeLeft(e);
			}
		},

		swipeRight: function (e) {
			if (Engine.activeModule.swipeRight) {
				Engine.activeModule.swipeRight(e);
			}
		},

		swipeUp: function (e) {
			if (Engine.activeModule.swipeUp) {
				Engine.activeModule.swipeUp(e);
			}
		},

		swipeDown: function (e) {
			if (Engine.activeModule.swipeDown) {
				Engine.activeModule.swipeDown(e);
			}
		},

		disableSelection: function () {
			document.onselectstart = eventNullifier; // this is for IE
			document.onmousedown = eventNullifier; // this is for the rest
		},

		enableSelection: function () {
			document.onselectstart = eventPassthrough;
			document.onmousedown = eventPassthrough;
		},

		autoSelect: function (selector) {
			$(selector).focus().select();
		},

		handleStateUpdates: function (e) {

		},

		switchLanguage: function (dom) {
			var lang = $(dom).data("language");
			if (document.location.href.search(/[\?\&]lang=[a-z_]+/) != -1) {
				document.location.href = document.location.href.replace(/([\?\&]lang=)([a-z_]+)/gi, "$1" + lang);
			} else {
				document.location.href = document.location.href + ((document.location.href.search(/\?/) != -1) ? "&" : "?") + "lang=" + lang;
			}
		},

		saveLanguage: function () {
			var lang = decodeURIComponent((new RegExp('[?|&]lang=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null;
			if (lang && typeof Storage != 'undefined' && localStorage) {
				localStorage.lang = lang;
			}
		},

		toggleVolume: function (enabled /* optional */) {
			if (enabled == null) {
				enabled = !$SM.get('config.soundOn');
			}
			if (!enabled) {
				$('.volume').text(_('sound on'));
				$SM.set('config.soundOn', false);
				AudioEngine.setMasterVolume(0.0);
			} else {
				$('.volume').text(_('sound off'));
				$SM.set('config.soundOn', true);
				AudioEngine.setMasterVolume(1.0);
			}
		},

		setInterval: function (callback, interval, skipDouble) {
			if (Engine.options.doubleTime && !skipDouble) {
				Engine.log('Double time, cutting interval in half');
				interval /= 2;
			}

			return setInterval(callback, interval);

		},

		setTimeout: function (callback, timeout, skipDouble) {

			if (Engine.options.doubleTime && !skipDouble) {
				Engine.log('Double time, cutting timeout in half');
				timeout /= 2;
			}

			return setTimeout(callback, timeout);

		},

		menuTitleScreen: function () {
			Events.startEvent({
				title: _('Version 0.1 Beta'),
				image: '/img/bg/glitch-horizon.png',
				scenes: {
					'start': {
						text: [
							// _('You could start this life over, back to the very moment'),
							// _('you had nothing to lose; suffering from affective mania,'),
							// _('acute psychosis, and felony-class poverty. You broke out'),
							// _('the nails from the boards over windows into derelict space'),
							// _('and found a way out from the festering sprawl of advanced,'),
							// _('late stage capital plazas, whose promises were like vapor;'),
							_(`You could start this life over, back to the moment\n
					  you had nothing to lose; suffering from affective mania,\n
					  acute psychosis, and felony-class poverty. You broke out\n
					  the nails from the boards over windows into derelict space\n
					  and found a way out from the festering sprawl of advanced,\n
					  late stage capital plazas, whose promises were vapor.\n
					  like server side squat rooms inhabited by high-tech, low-lives.`),

							_(`Some things never change.`),
							_('Hey, are u there???'),
						],
						buttons: {
							'continue': {
								text: _('continue'),
								nextScene: 'end',
							},
							'new game': {
								text: _('start over'),
								nextScene: { 1: 'confirmNewGame' },
							},
							'load': {
								text: _('load'),
								nextScene: { 1: 'inputImport' },
							},
							'save': {
								text: _('save'),
								onChoose: Engine.exportSaveString
							},
							'color': {
								text: _('color'),
								onChoose: Engine.rollDiceHue,
								nextScene: { 1: 'colorKeyTutorial' }
							},
							'sound': {
								text: _('sound'),
								onChoose: notifyAboutSound
							}
						}
					},
					'confirmNewGame': {
						text: [_('Restart the game? Everything in the current game will be lost if it was not exported.')],
						buttons: {
							'yes': {
								text: _('yes'),
								nextScene: 'end',
								onChoose: Engine.deleteSave
							},
							'no': {
								text: _('no'),
								nextScene: 'end'
							}
						}
					},
					'inputImport': {
						text: [_('Paste the save code.')],
						textarea: '',
						buttons: {
							'okay': {
								text: _('import'),
								nextScene: 'end',
								onChoose: Engine.import64
							},
							'cancel': {
								text: _('back'),
								nextScene: { 1: 'start' },
							}
						}
					},
					'colorKeyTutorial': {
						text: [_('Try using the up and down arrow keys to adjust the color of your squat.'), _('This only works on this screen. When you begin to travel into other domains, those places will havae their own colors. This place is yours.')],
						buttons: {
							'okay': {
								text: _('okay'),
								nextScene: { 1: 'start' },
							}
						}
					}
				}
			});
		}
	};

	function eventNullifier(e) {
		return $(e.target).hasClass('menuBtn');
	}

	function eventPassthrough(e) {
		return true;
	}

	function notifyAboutSound() {
		// if ($SM.get('playStats.audioAlertShown')) {
		//   return;
		// }

		// // Tell new users that there's sound now!
		// $SM.set('playStats.audioAlertShown', true);
		Events.startEvent({
			title: _('Sound Available!'),
			scenes: {
				start: {
					text: [
						_('ears flooded with new sensations.'),
						_('perhaps silence is safer?')
					],
					buttons: {
						'yes': {
							text: _('enable audio'),
							nextScene: 'end',
							onChoose: () => Engine.toggleVolume(true)
						},
						'no': {
							text: _('disable audio'),
							nextScene: 'end',
							onChoose: () => Engine.toggleVolume(false)
						}
					}
				}
			}
		});
	}


})();



function inView(dir, elem) {

	var scTop = $('#main').offset().top;
	var scBot = scTop + $('#main').height();

	var elTop = elem.offset().top;
	var elBot = elTop + elem.height();

	if (dir == 'up') {
		// STOP MOVING IF BOTTOM OF ELEMENT IS VISIBLE IN SCREEN
		return (elBot < scBot);
	} else if (dir == 'down') {
		return (elTop > scTop);
	} else {
		return ((elBot <= scBot) && (elTop >= scTop));
	}

}

function scrollByX(elem, x) {

	var elTop = parseInt(elem.css('top'), 10);
	elem.css('top', (elTop + x) + "px");

}


//create jQuery Callbacks() to handle object events
$.Dispatch = function (id) {
	var callbacks, topic = id && Engine.topics[id];
	if (!topic) {
		callbacks = jQuery.Callbacks();
		topic = {
			publish: callbacks.fire,
			subscribe: callbacks.add,
			unsubscribe: callbacks.remove
		};
		if (id) {
			Engine.topics[id] = topic;
		}
	}
	return topic;
};

$(function () {
	Engine.init();
});
