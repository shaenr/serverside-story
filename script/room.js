/**
 * Module that registers the simple room functionality
 */

const nameForRoom = {
	0: "an abandoned place",
	1: "a makeshift squat"
}

var Room = {
	// times in (minutes * seconds * milliseconds)
	_ROOM_ENTROPY_DELAY: 5 * 60 * 1000, // time after a stoke before the fire cools
	_ROOM_WARM_DELAY: 30 * 1000, // time between room temperature updates
	_BUILDER_STATE_DELAY: 0.25 * 60 * 1000, // time between fixer state updates
	_OBSERVE_COOLDOWN: 10, // cooldown to stoke the fire
	_NEED_OCTOGONS_DELAY: 15 * 1000, // from when the stranger shows up, to when you need water
	_POWER_OFF_BRIGHTNESS: 6,
	_POWER_ON_BRIGHTNESS: 12,

	buttons: {},

	Craftables: window.Craftables,
	TradeGoods: window.TradeGoods,
	MiscItems: {},

	hue: 330,

	name: _("Room"),
	init: function (options) {
		this.options = $.extend(
			this.options,
			options
		);

		Room.pathDiscovery = Boolean($SM.get('stores["compass"]'));

		if (Engine._debug) {
			this._ROOM_WARM_DELAY = 5000;
			this._BUILDER_STATE_DELAY = 5000;
			this._OBSERVE_COOLDOWN = 0;
			this._NEED_OCTOGONS_DELAY = 5000;
		}

		if (typeof $SM.get('features.location.room') == 'undefined') {
			$SM.set('features.location.room', true);
			$SM.set('game.fixer.level', -1);

			Engine.log(`game.fixer.level: ${$SM.get('game.fixer.level')}`)

			$SM.set('features.powered', false)
			$SM.set('game.stability', Room.StabilityEnum.Unsustainable)

			Engine.log(`game.stability: ${$SM.get('game.stability.value')}`)
		}

		// If this is the first time playing, the electricity, network, and server are dead. 
		// Otherwise grab past save state temp and levels.
		$SM.set('game.electricity', $SM.get('game.electricity.value') === undefined ? this.ElectricEnum.Off : $SM.get('game.electricity'));
		$SM.set('game.stability', $SM.get('game.stability.value') === undefined ? this.StabilityEnum.Unsustainable : $SM.get('game.stability'));
		$SM.set('game.entropy', $SM.get('game.entropy.value') === undefined ? this.EntropyEnum.Dead : $SM.get('game.entropy'));

		// Create the room tab
		this.tab = Header.addLocation(_(nameForRoom), "room", Room);

		// Create the Room panel
		this.panel = $('<div>')
			.attr('id', "roomPanel")
			.addClass('location')
			.appendTo('div#locationSlider');

		Engine.updateSlider();


		this.panel.attr('style', `
			background: url(${this.backgroundUrl});
			background-size: cover;
			opacity: 0.75;
		`)

		// Room.updateMainButtonView();

		// Create the observe button
		let staySharpBtn = Room.staySharpBtn = new Button.Button({
			id: 'staySharpBtn',
			text: _("stay sharp"),
			click: Room.staySharp,
			cooldown: Room._OBSERVE_COOLDOWN,
			width: '160px',
			cost: { 'octogons': 1 }
		})

		// Create the power button
		let powerOnBtn = Room.powerOnBtn = new Button.Button({
			id: 'turnPowerOn',
			text: _('find circuit breaker'),
			click: Room.turnPowerOn,
			cooldown: 0,
			width: '160px'
		})
		if (!$SM.get('features.powered')) {
			powerOnBtn.appendTo('div#roomPanel');
		}

		// Create the update server button
		let updateServerBtn = Room.updateServerBtn = new Button.Button({
			id: 'updateSystemButton',
			text: _("update system"),
			click: Room.updateSystem,
			cooldown: $SM.get('stores.bandwidth') >= this.cost ? Room._OBSERVE_COOLDOWN : 0,
			width: '160px',
			cost: { 'bandwidth': 1 }
		})

		if ($SM.get('features.powered')) {
			staySharpBtn.appendTo('div#roomPanel');
			updateServerBtn.appendTo('div#roomPanel');
		}

		// Create the stores container
		$('<div>').attr('id', 'storesContainer').prependTo('div#roomPanel');

		//subscribe to stateUpdates
		$.Dispatch('stateUpdate').subscribe(Room.handleStateUpdates);

		// Room.updateSystem();
		Room.updateStoresView();
		Room.updateIncomeView();
		Room.updateInstallButtons();

		Room._entropyTimer = Engine.setTimeout(Room.adjustEntropy, Room._ROOM_ENTROPY_DELAY);
		Room._stableTimer = Engine.setTimeout(Room.adjustStability, Room._ROOM_WARM_DELAY);

		/*
		 * Builder states:
		 * 0 - Approaching
		 * 1 - Collapsed
		 * 2 - Shivering
		 * 3 - Sleeping
		 * 4 - Helping
		 */
		if ($SM.get('game.fixer.level') >= 0 && $SM.get('game.fixer.level') < 3) {
			Room._fixerTimer = Engine.setTimeout(Room.updateBuilderState, Room._BUILDER_STATE_DELAY);
		}
		if ($SM.get('game.fixer.level') == 1 && $SM.get('stores.octogons') < 0) {
			Engine.setTimeout(Room.unlockCity, Room._NEED_OCTOGONS_DELAY);
		}
		Engine.setTimeout($SM.collectIncome, 1000);

		// Display room update notifications and optionallt game started notifications
		Notifications.notify(Room, _(Room.StabilityEnum.logString, Room.StabilityEnum.fromInt($SM.get('game.stability.value')).text));
		if (typeof $SM.get('playStats.started') === 'undefined') {
			Notifications.notify(
				Room, _("Right now it's the best option for respite from the sprawling streets that you have."));
		}
		Notifications.notify(Room, _(Room.ElectricEnum.logString, Room.ElectricEnum.fromInt($SM.get('game.electricity.value')).text));
		if (typeof $SM.get('playStats.started') === 'undefined') {
			Notifications.notify(
				Room, _("The memories slowly come back to you as phantasmagoric dream shapes and apparitions appear in the vast darkness")
			)
		}

		// set this state to prevent the intro notifications from printing on refresh
		if (typeof $SM.get('playStats.started') === 'undefined') {
			$SM.set('playStats.started', true)
		}


	},

	options: {}, // Nothing for now

	onArrival: function (transition_diff) {

		Room.updateMainButtonView()

		if (typeof $SM.get('config.savedHue') !== 'undefined') {
			Room.hue = typeof $SM.get('config.savedHue') === 'number' ? $SM.get('config.savedHue') : Room.hue
			Engine.hueUpdate(Room.hue)
		}

		Room.setTitle();

		if (Room.changed) {
			// Notifications.notify(Room, _(Room.ElectricEnum.logString, Room.ElectricEnum.fromInt($SM.get('game.electricity.value')).text));
			Notifications.notify(Room, _(Room.StabilityEnum.logString, Room.StabilityEnum.fromInt($SM.get('game.stability.value')).text));
			Notifications.notify(Room, _(Room.EntropyEnum.logString, Room.EntropyEnum.fromInt($SM.get('game.entropy.value')).text));
			Room.changed = false;
		}

		// Opens up install in original game
		if ($SM.get('game.fixer.level') == 3) {
			$SM.add('game.fixer.level', 1);
			$SM.setIncome('fixer', {
				delay: 10,
				stores: { 'bandwidth': 1, 'octogons': -1 }
			});
			Room.updateIncomeView();
			Notifications.notify(Room, _("The stranger wakes up in a lucid state, says he knows people and is a small time fixer for shadow work."));
		}


		Engine.moveStoresView(null, transition_diff);
		AudioEngine.stopEventMusic();
		// AudioEngine.playEventMusic(AudioLibrary.W96_ACHIEVEMENT)
		Room.setMusic();

	},

	StabilityEnum: {
		fromInt: function (value) {
			for (var k in this) {
				if (typeof this[k].value != 'undefined' && this[k].value == value) {
					return this[k];
				}
			}
			return null;
		},
		logString: "The squat is {0}",
		TrappedOut: { value: 0, text: _('an actual traphouse and might be shut down by CorpSec at any moment.') },
		Unsustainable: { value: 1, text: _('physically insecure, unsustainable, and dangerously verging on collapse.') },
		Insecure: { value: 2, text: _(`losing more than it\'s generating from some vulnerability.`) },
		Secure: { value: 3, text: _('secure enough to take a day off at some point -- maybe.') },
		Protected: { value: 4, text: _('an impregnable fortress.') }
	},

	// This probably doesn't need to be an enum but it was the easiest way to get it working since temperature
	// was an enum.
	ElectricEnum: {
		fromInt: function (value) {
			for (var k in this) {
				if (typeof this[k].value != 'undefined' && this[k].value == value) {
					return this[k];
				}
			}
			return null;
		},
		logString: "The power is {0}",
		Off: { value: 0, text: _('off and the room is dark, filled with junk, and debris.') },
		On: { value: 1, text: _('wastefully on.') },
		NotWasted: { value: 2, text: _('a very available resource.') }
	},


	// Not finished
	EntropyEnum: {
		fromInt: function (value) {
			for (var k in this) {
				if (typeof this[k].value != 'undefined' && this[k].value == value) {
					return this[k];
				}
			}
			return null;
		},
		logString: `You've have {0}`,
		Dead: { value: 0, text: _(`not paid enough attention to what's going on in the squat. Can't focus on anything without an octogon at this point. Stay sharp if you can.`) },
		Net1: { value: 1, text: _(`been up on octogons for several days at this point. You need rest, but there is a lot of work to do. If you just pass out any old place you could wake up with a scar, a missing kidney, and a horrible pain passing urine from that day forward. Trafficking these days in healthy organs to people who can afford them is no joke. You have to stay sharp until you secure this place..`) },
		Net2: { value: 2, text: _(`watched the stranger in the room enough to see that he is struggling with the octogons as well -- possibly more so than you. Like him, you will also have to recover at some point. You can't stay sharp foreer. But if you stop...`) },
		Net3: { value: 3, text: _(`spent many days securing a room to hole up in and are confident you can get some rest. No one is watching. No one knows about this place -- except the two of you.`) },
		Net4: { value: 4, text: _(`been staying more sharp than ever after getting some good rest. Maybe it's time to take a break from eightside sharpness, let your tolerance drop, focus on accumulating octos and not taking them. But pay attention to when you arrive at the squat from the port. There will be signs of things falling apart if you don't stay sharp enough.`) }
	},

	// only supports first title change context
	setTitle: function () {
		var title = $SM.get('game.electricity.value') === 0 ? _(nameForRoom[0]) : _(nameForRoom[1]);
		if (Engine.activeModule == this) {
			document.title = title;
		}
		$('div#location_room').text(title);
	},

	/** Room.staySharp
	 * []
	 * @return {[void]}
	 */
	staySharp: function () {
		var octogons = $SM.get('stores.octogons');
		let cost = 1

		if ($SM.get('playStats.triedToUpdateSystem') === true && $SM.get('playStats.strangerReadyToEnterSquat') !== true) {
			$SM.set('playStats.strangerReadyToEnterSquat', true)
			Room.objectiveRaggedStranger();
		}

		if (octogons < cost) {
			Notifications.notify(Room, _("Was that really the last octogon? There's no more?"));
			Button.clearCooldown(staySharpBtn);
			return;
		}

		if (octogons > cost) {
			$SM.set('stores.octogons', octogons - 1);
		}


		if ($SM.get('game.entropy.value') >= 4) {
			Notifications.notify(Room, _('Relax. You might be taking too much eightside, my guy.'))
			Room.onStabilityChange();
			return
		}

		if ($SM.get('game.stability.value') < 4) {

			$SM.set('game.entropy', Room.EntropyEnum.fromInt($SM.get('game.entropy.value') + 1));
		}
		// AudioEngine.playSound(); //
		Room.onStabilityChange();

	},

	/** Room.onStabilityChange
	 * [does various checks that occur any time a method changes stability/network/fire/entropy (see adjustEntropy and adjustStability); 
	 * Sets fixer level, resets timer before decrease in stability, adjusts brightness of background.]
	 * @return {[void]}
	 */
	onStabilityChange: function () {
		if (Engine.activeModule != Room) {
			Room.changed = true;
		}

		// Start fixer/fixer progression once the first Room.staySharp is called.
		if ($SM.get('game.stability.value') > 1 && $SM.get('game.fixer.level') < 0) {
			$SM.set('game.fixer.level', 0);
			window.Engine.log("Room.onStabilityChange met a debug condition, check code")  // TODO delete later
			Engine.setTimeout(Room.updateBuilderState, Room._BUILDER_STATE_DELAY);
		}

		// Resets the time before squat entropy
		window.clearTimeout(Room._entropyTimer);
		Room._entropyTimer = Engine.setTimeout(Room.adjustEntropy, Room._ROOM_ENTROPY_DELAY);

		// Engine.brightUpdate($SM.get('game.stability.bright'))

		// only update music if in the room
		// if (Engine.activeModule == Room) {
		// 	Room.setMusic();
		// }
	},


	/** Room.adjustStability
	 * [Causes squat stability to increment or decrement based on the value of 'network'
	 * Is called on a timer determined by Room._ROOM_WARM_DELAY]
	 * @return {[void]}
	 */
	adjustStability: function () {
		var old = $SM.get('game.stability.value');

		// Causes stability to decrement, because stability greater than 'network'
		if ($SM.get('game.stability.value') > 0 && $SM.get('game.stability.value') > $SM.get('game.entropy.value')) {
			$SM.set('game.stability', Room.StabilityEnum.fromInt($SM.get('game.stability.value') - 1));
			window.Engine.log(`Stability should Decrement. Is now ${$SM.get('game.stability.value')}, was ${old}`)
		}

		// Causes stability to increment, because stability is not at max and is less that 'network'
		if ($SM.get('game.stability.value') < 4 && $SM.get('game.stability.value') < $SM.get('game.entropy.value')) {
			$SM.set('game.stability', Room.StabilityEnum.fromInt($SM.get('game.stability.value') + 1));
			window.Engine.log(`Stability should Increment. Is now ${$SM.get('game.stability.value')}, was ${old}`)
		}

		// if the stability of Room has changed, then send Notification lines when Room.onArrival is called.
		if ($SM.get('game.stability.value') != old) {
			Room.changed = true;
		}

		// resets timer
		Room._stableTimer = Engine.setTimeout(Room.adjustStability, Room._ROOM_WARM_DELAY);
	},


	adjustEntropy: function () {
		var octogons = $SM.get('stores.octogons');
		if (typeof $SM.get('game.entropy.value') != 'undefined' && $SM.get('game.fixer.level') > 3 && octogons > 25) {
			Notifications.notify(Room, _("fixer is actually handling actual problems in the squat today; they might be using too many octogons though."), true);
			$SM.set('stores.octogons', octogons - 25);
			$SM.set('game.entropy', Room.EntropyEnum.fromInt($SM.get('game.entropy.value') + 1));
			Room._entropyTimer = Engine.setTimeout(Room.adjustEntropy, Room._ROOM_ENTROPY_DELAY);
		}

		if ($SM.get('game.entropy.value') > 0) {
			window.Engine.logFromSM(['game.entropy.value'])
			$SM.set('game.entropy', Room.EntropyEnum.fromInt($SM.get('game.entropy.value') - 1));
			Room._entropyTimer = Engine.setTimeout(Room.adjustEntropy, Room._ROOM_ENTROPY_DELAY);
		}

		window.Engine.logFromSM(['stores.octogons', 'game.entropy.value', 'game.stability.value'])

	},


	updateSystem: function () {
		if ($SM.get('stores.bandwidth') >= 1) {
			if (Room.updateServerBtn.hasClass('disabled')) {
				Notifications.notify(Room, _("No use without a network connection..."))
				Notifications.notify(Room, _(Room.EntropyEnum.logString, Room.EntropyEnum.fromInt($SM.get('game.entropy.value')).text));
				return false
			}
			let bandwidth = $SM.set(
				'stores.bandwidth',
				$SM.get('stores.bandwidth') - 1

				// do something
			);
		} else {
			$SM.set('playStats.triedToUpdateSystem', true)
			Notifications.notify(Room, _("can't update without bandwidth"))
			Notifications.notify(Room, _(Room.EntropyEnum.logString, Room.EntropyEnum.fromInt($SM.get('game.entropy.value')).text));
			Room.updateMainButtonView()
			setTimeout(Room.objectiveNeedNetwork, 500)



		}
	},

	// Layover from the fire/temp system
	_entropyTimer: null,
	_stableTimer: null,

	turnPowerOn: function () {
		if (Engine.activeModule != Room) {
			Room.changed = true;
		}

		Engine.brightUpdate(Room._POWER_ON_BRIGHTNESS)
		$SM.set('features.powered', true)

		Room.staySharpBtn.appendTo('div#roomPanel');
		Room.updateServerBtn.appendTo('div#roomPanel');


		Room.powerOnBtn.css('display', 'none')
		Room.powerOnBtn.remove();

		$SM.set('game.electricity.value', Room.EntropyEnum.On);
		electricity = $SM.get('game.electricity');

		// AudioEngine.playSound(AudioLibrary.LIGHT_FIRE);

		if (electricity && $SM.get('game.fixer.level') < 0) {
			$SM.set('game.fixer.level', 0);
			Engine.setTimeout(Room.updateBuilderState, Room._BUILDER_STATE_DELAY);

			Notifications.notify(Room,
				_("Light bursts out from the window of the room as machines begin to spin up. it's an old server room. could be an interesting spot to squat."), true);
		}

		// window.clearTimeout(Room._entropyTimer);
		// Room._entropyTimer = Engine.setTimeout(Room.adjustEntropy, Room._ROOM_ENTROPY_DELAY);

		Room.setTitle()
		// window.Engine.updateTitleObjective("Stay alert to keep the squathouse safe to live in")

		// only update music if in the room
		if (Engine.activeModule == Room) {
			Room.setMusic();
		}
	},




	unlockCity: function () {
		$SM.set('features.location.outside', true);
		$SM.set('stores.octogons', 4);
		$SM.set('stores.bandwidth', 0);
		Outside.init();
		Notifications.notify(Room, _("police sirens wail from outside the window as CorpsSec drones fly by the install."));
		Notifications.notify(Room, _("pipes scream from the walls when you try turning the sink faucet for water."));

		Engine.event('progress', 'outside');
	},

	objectiveNeedNetwork: function () {

		Events.startEvent({
			title: _('electricity, running water, internet'),
			scenes: {
				'start': {
					text: [
						_('you were lucky that some landlord left the power connected in this install. but there is no water to drink and you are shitting in a corner room down the hall.'),
						_('without some interface to a network, there is no server to update -- no client to any services at all. without water, you will die. without net, you will find access to even water very difficult to come by.'),
						_('time to make runs into the city -- see what you can find.')],
					buttons: {
						'ok': {
							text: _('Ok'),
							nextScene: 'end',
							onChoose: function () { }
						}
					}
				},
				audio: AudioEngine.playEventMusic(AudioLibrary.W96_ALONEARMED)

			}

		})
	},

	objectiveRaggedStranger: function () {

		Events.startEvent({
			title: _('fix from a stranger'),
			scenes: {
				start: {
					text: [
						_(`a ragged stranger stumbles through the door and collapses in the corner. their left arm -- an amputated stump -- appears to be slotted with some type of chrome, maybe?`),
						_(`no. it's automated SurgOps intelligence, with a Deploy&Maintain strategy to administer PIVC: a peripheral intraveinous catheter.`),
						_(`loading six rounds into the arm in less than a second, the stranger cocks one back and fires.`),
						_(`The orgasmic wave that comes over the stranger's eyes could be nothing else but the pink Moderna octogons, a racemic mixture of isotopes for which they own the patent.`)
					],
					notification: _(`a ragged stranger stumbles through the door and collapses in the corner.`),
					blink: true,
					buttons: {
						'ok': {
							text: _('ok.'),
							nextScene: 'end',
							onChoose: function () { }
						}
					}
				}
			},
			audio: AudioEngine.playEventMusic(AudioLibrary.W96_ALONEARMED)

		});

	},

	updateBuilderState: function () {
		var lBuilder = $SM.get('game.fixer.level');
		if (lBuilder === 0) {
			Engine.setTimeout(Room.unlockCity, Room._NEED_OCTOGONS_DELAY);
		}
		else if (lBuilder < 3 && $SM.get('game.stability.value') >= Room.StabilityEnum.Insecure.value) {
			var msg = "";
			switch (lBuilder) {
				case 1:
					msg = _(`the stranger shivers, and mumbles quietly. their words are unintelligible. 
					an s-deck in their pocket chimes with alert every few seconds: \"warning: 
					battery at 5%. disconnection from net violates terms of service and may affect your credit. 
					our policy has been updated.\" `);
					break;
				case 2:
					msg = _(`the stranger crawls to an outlet plug and ports in his s-deck in the fetal position. 
					upon powering on with a familiar start up sound, the device begins to send alerts 
					with such regularity that as the stranger begins snoring where he lie on the ground, 
					it's a relief to hear else but the frequent jingles from a proprietary decks.`);
					break;
			}
		}
	},

	updateBuilderState: function () {
		var lBuilder = $SM.get('game.fixer.level');
		if (lBuilder === 0) {
			lBuilder = $SM.setget('game.fixer.level', 1);
			Engine.setTimeout(Room.unlockCity, Room._NEED_OCTOGONS_DELAY);
		}
		else if (lBuilder < 3 && $SM.get('game.stability.value') >= Room.StabilityEnum.Insecure.value) {
			var msg = "";
			switch (lBuilder) {
				case 1:
					msg = _(`the stranger shivers, and mumbles quietly. their words are unintelligible. 
					an s-deck in their pocket chimes with alert every few seconds: \"warning: 
					battery at 5%. disconnection from net violates terms of service and may affect your credit. 
					our policy has been updated.\" `);
					break;
				case 2:
					msg = _(`the stranger crawls to an outlet plug and ports in his s-deck in the fetal position. 
					upon powering on with a familiar start up sound, the device begins to send alerts 
					with such regularity that as the stranger begins snoring where he lie on the ground, 
					it's a relief to hear else but the frequent jingles from a proprietary decks.`);
					break;
			}
			Notifications.notify(Room, msg);
			if (lBuilder < 3) {
				lBuilder = $SM.setget('game.fixer.level', lBuilder + 1);
			}
		}
		if (lBuilder < 3) {
			Engine.setTimeout(Room.updateBuilderState, Room._BUILDER_STATE_DELAY);
		}
		Engine.saveGame();
	},

	updateStoresView: function () {
		var stores = $('div#stores');
		var resources = $('div#resources');
		var special = $('div#special');
		var weapons = $('div#weapons');
		var needsAppend = false, rNeedsAppend = false, sNeedsAppend = false, wNeedsAppend = false, newRow = false;
		if (stores.length === 0) {
			stores = $('<div>').attr({
				'id': 'stores',
				'data-legend': _('stores')
			}).css('opacity', 0);
			needsAppend = true;
		}
		if (resources.length === 0) {
			resources = $('<div>').attr({
				id: 'resources'
			}).css('opacity', 0);
			rNeedsAppend = true;
		}
		if (special.length === 0) {
			special = $('<div>').attr({
				id: 'special'
			}).css('opacity', 0);
			sNeedsAppend = true;
		}
		if (weapons.length === 0) {
			weapons = $('<div>').attr({
				'id': 'weapons',
				'data-legend': _('weapons')
			}).css('opacity', 0);
			wNeedsAppend = true;
		}
		for (var k in $SM.get('stores')) {

			var type = null;
			if (Room.Craftables[k]) {
				type = Room.Craftables[k].type;
			} else if (Room.TradeGoods[k]) {
				type = Room.TradeGoods[k].type;
			} else if (Room.MiscItems[k]) {
				type = Room.MiscItems[k].type;
			}

			var location;
			switch (type) {
				case 'upgrade':
					// Don't display upgrades on the Room screen
					continue;
				case 'install':
					// Don't display installed either
					continue;
				case 'weapon':
					location = weapons;
					break;
				case 'special':
					location = special;
					break;
				default:
					location = resources;
					break;
			}

			var id = "row_" + k.replace(' ', '-');
			var row = $('div#' + id, location);
			var num = $SM.get('stores["' + k + '"]');

			if (typeof num != 'number' || isNaN(num)) {
				// No idea how counts get corrupted, but I have reason to believe that they occassionally do.
				// Build a little fence around it!
				num = 0;
				$SM.set('stores["' + k + '"]', 0);
			}

			var lk = _(k);

			// thieves?
			if (typeof $SM.get('game.thieves') == 'undefined' && num > 5000 && $SM.get('features.location.world')) {
				$SM.startThieves();
			}

			if (row.length === 0) {
				row = $('<div>').attr('id', id).addClass('storeRow');
				$('<div>').addClass('row_key').text(lk).appendTo(row);
				$('<div>').addClass('row_val').text(Math.floor(num)).appendTo(row);
				$('<div>').addClass('clear').appendTo(row);
				var curPrev = null;
				location.children().each(function (i) {
					var child = $(this);
					var cName = child.children('.row_key').text();
					if (cName < lk) {
						curPrev = child.attr('id');
					}
				});
				if (curPrev == null) {
					row.prependTo(location);
				} else {
					row.insertAfter(location.find('#' + curPrev));
				}
				newRow = true;
			} else {
				$('div#' + row.attr('id') + ' > div.row_val', location).text(Math.floor(num));
			}
		}

		if (rNeedsAppend && resources.children().length > 0) {
			resources.prependTo(stores);
			resources.animate({ opacity: 1 }, 300, 'linear');
		}

		if (sNeedsAppend && special.children().length > 0) {
			special.appendTo(stores);
			special.animate({ opacity: 1 }, 300, 'linear');
		}

		if (needsAppend && stores.find('div.storeRow').length > 0) {
			stores.appendTo('div#storesContainer');
			stores.animate({ opacity: 1 }, 300, 'linear');
		}

		if (wNeedsAppend && weapons.children().length > 0) {
			weapons.appendTo('div#storesContainer');
			weapons.animate({ opacity: 1 }, 300, 'linear');
		}

		if (newRow) {
			Room.updateIncomeView();
		}

		if ($("div#outsidePanel").length) {
			Outside.updateVillage();
		}

		if ($SM.get('stores.compass') && !Room.pathDiscovery) {
			Room.pathDiscovery = true;
			Path.openPath();
		}
	},

	// These commented out functionalities are all for an alter horizontal button bar with optional choices, not sure about it.
	//
	updateMainButtonView: function () {
		// let mainButtonGroup = $('<div>').attr({ 'id': 'mainBtns', 'data-legend': _('test:') }).css('opacity', 0);
		//
		// // append btns to group
		// // Create the dose, rest, watch, data buttons
		// let doseBtn = Room.doseBtn = new Button.Button({
		// 	id: 'doseBtn',
		// 	text: _("dose"),
		// 	click: Room.dose,
		// 	cooldown: 0,
		// 	width: '100px',
		// 	cost: { 'octogons': 1 }
		// }).appendTo(mainButtonGroup)
		//
		// let restBtn = Room.restBtn = new Button.Button({
		// 	id: 'restBtn',
		// 	text: _("rest"),
		// 	click: Room.rest,
		// 	cooldown: 0,
		// 	width: '100px'
		// }).appendTo(mainButtonGroup)
		//
		// let watchBtn = Room.watchBtn = new Button.Button({
		// 	id: 'watchBtn',
		// 	text: _("watch"),
		// 	click: Room.watch,
		// 	cooldown: 0,
		// 	width: '100px'
		// }).appendTo(mainButtonGroup)
		//
		// let dataBtn = Room.dataBtn = new Button.Button({
		// 	id: 'dataBtn',
		// 	text: _("data"),
		// 	click: Room.dataView,
		// 	cooldown: 0,
		// 	width: '100px'
		// }).appendTo(mainButtonGroup)
		//
		// mainButtonGroup.appendTo('div#roomPanel').animate({ opacity: 1 }, 300, 'linear');

		// possible remove
		if ($SM.get('playStats.triedToUpdateSystem')) {
			Room.updateServerBtn.addClass('disabled')
		}
	},
	//
	// disableMainBtnGroup: function (selectedBtnSel) {
	// 	let jqbtn
	// 	let mainBtns = $('#mainBtns')
	// 	for (let btn of mainBtns[0].childNodes) {
	// 		jqbtn = $(`#${btn.id}`)
	// 		Engine.log(`selectedBtn: ${selectedBtnSel}, jqbtn: ${jqbtn.selector}`)
	// 		if (jqbtn.selector !== selectedBtnSel) {
	// 			jqbtn.css('visibility', 'hidden')
	// 		}
	// 	}
	// },
	// dose: function () {
	// 	Room.disableMainBtnGroup('#doseBtn')
	// },
	// rest: function () {
	// 	Room.disableMainBtnGroup('#restBtn')
	// },
	// watch: function () {
	// 	Room.disableMainBtnGroup('#watchBtn')
	// },
	// dataView: function () {
	// 	Room.disableMainBtnGroup('#dataBtn')
	// },

	updateIncomeView: function () {
		var stores = $('div#resources');
		var totalIncome = {};
		if (stores.length === 0 || typeof $SM.get('income') == 'undefined') return;
		$('div.storeRow', stores).each(function (index, el) {
			el = $(el);
			$('div.tooltip', el).remove();
			var ttPos = index > 10 ? 'top right' : 'bottom right';
			var tt = $('<div>').addClass('tooltip ' + ttPos);
			var storeName = el.attr('id').substring(4).replace('-', ' ');
			for (var incomeSource in $SM.get('income')) {
				var income = $SM.get('income["' + incomeSource + '"]');
				for (var store in income.stores) {
					if (store == storeName && income.stores[store] !== 0) {
						$('<div>').addClass('row_key').text(_(incomeSource)).appendTo(tt);
						$('<div>')
							.addClass('row_val')
							.text(Engine.getIncomeMsg(income.stores[store], income.delay))
							.appendTo(tt);
						if (!totalIncome[store] || totalIncome[store].income === undefined) {
							totalIncome[store] = { income: 0 };
						}
						totalIncome[store].income += Number(income.stores[store]);
						totalIncome[store].delay = income.delay;
					}
				}
			}
			if (tt.children().length > 0) {
				var total = totalIncome[storeName].income;
				$('<div>').addClass('total row_key').text(_('total')).appendTo(tt);
				$('<div>').addClass('total row_val').text(Engine.getIncomeMsg(total, totalIncome[storeName].delay)).appendTo(tt);
				tt.appendTo(el);
			}
		});
	},

	buy: function (buyBtn) {
		var thing = $(buyBtn).attr('buildThing');
		var good = Room.TradeGoods[thing];
		var numThings = $SM.get('stores["' + thing + '"]', true);
		if (numThings < 0) numThings = 0;
		if (good.maximum <= numThings) {
			return;
		}

		var storeMod = {};
		var cost = good.cost();
		for (var k in cost) {
			var have = $SM.get('stores["' + k + '"]', true);
			if (have < cost[k]) {
				Notifications.notify(Room, _("not enough " + k));
				return false;
			} else {
				storeMod[k] = have - cost[k];
			}
		}
		$SM.setM('stores', storeMod);

		Notifications.notify(Room, good.installMsg);

		$SM.add('stores["' + thing + '"]', 1);

		// audio
		// AudioEngine.playSound(AudioLibrary.BUY);
	},

	build: function (installBtn) {
		var thing = $(installBtn).attr('buildThing');
		if ($SM.get('game.stability.value') <= Room.StabilityEnum.Unsustainable.value) {
			Notifications.notify(Room, _("fixer won't stop staring out the windows; says they're coming, that they're gonna find us. He's been taking a lot of eightside. Better stay sharp till he comes down.."));
			return false;
		}
		var craftable = Room.Craftables[thing];

		var numThings = 0;
		switch (craftable.type) {
			case 'good':
			case 'weapon':
			case 'tool':
			case 'upgrade':
				numThings = $SM.get('stores["' + thing + '"]', true);
				break;
			case 'install':
				numThings = $SM.get('game.installed["' + thing + '"]', true);
				break;
		}

		if (numThings < 0) numThings = 0;
		if (craftable.maximum <= numThings) {
			return;
		}

		var storeMod = {};
		var cost = craftable.cost();
		for (var k in cost) {
			var have = $SM.get('stores["' + k + '"]', true);
			if (have < cost[k]) {
				Notifications.notify(Room, _("not enough " + k));
				return false;
			} else {
				storeMod[k] = have - cost[k];
			}
		}
		$SM.setM('stores', storeMod);

		Notifications.notify(Room, craftable.installMsg);

		switch (craftable.type) {
			case 'good':
			case 'weapon':
			case 'upgrade':
			case 'tool':
				$SM.add('stores["' + thing + '"]', 1);
				break;
			case 'install':
				$SM.add('game.installed["' + thing + '"]', 1);
				break;
		}

		// audio
		switch (craftable.type) {
			case 'weapon':
			case 'upgrade':
			case 'tool':
				// AudioEngine.playSound(AudioLibrary.CRAFT);
				break;
			case 'install':
				// AudioEngine.playSound(AudioLibrary.BUILD);
				break;
		}
	},

	needsWorkshop: function (type) {
		return type == 'weapon' || type == 'upgrade' || type == 'tool';
	},

	craftUnlocked: function (thing) {
		if (Room.buttons[thing]) {
			return true;
		}
		if ($SM.get('game.fixer.level') < 4) return false;
		var craftable = Room.Craftables[thing];
		if (Room.needsWorkshop(craftable.type) && $SM.get('game.installed["' + 'workshop' + '"]', true) === 0) return false;
		var cost = craftable.cost();

		//show button if one has already been built
		if ($SM.get('game.installed["' + thing + '"]') > 0) {
			Room.buttons[thing] = true;
			return true;
		}
		// Show buttons if we have at least 1/2 the octogons, and all other components have been seen.
		if ($SM.get('stores.octogons', true) < cost['octogons'] * 0.5) {
			return false;
		}
		for (var c in cost) {
			if (!$SM.get('stores["' + c + '"]')) {
				return false;
			}
		}

		Room.buttons[thing] = true;
		//don't notify if it has already been built before
		if (!$SM.get('game.installed["' + thing + '"]')) {
			Notifications.notify(Room, craftable.availableMsg);
		}
		return true;
	},

	buyUnlocked: function (thing) {
		if (Room.buttons[thing]) {
			return true;
		} else if ($SM.get('game.installed["trading post"]', true) > 0) {
			if (thing == 'compass' || typeof $SM.get('stores["' + thing + '"]') != 'undefined') {
				// Allow the purchase of stuff once you've seen it
				return true;
			}
		}
		return false;
	},

	updateInstallButtons: function () {
		var buildSection = $('#installBtns');
		var needsAppend = false;
		if (buildSection.length === 0) {
			buildSection = $('<div>').attr({ 'id': 'installBtns', 'data-legend': _('install:') }).css('opacity', 0);
			needsAppend = true;
		}

		var craftSection = $('#craftBtns');
		var cNeedsAppend = false;
		if (craftSection.length === 0 && $SM.get('game.installed["workshop"]', true) > 0) {
			craftSection = $('<div>').attr({ 'id': 'craftBtns', 'data-legend': _('craft:') }).css('opacity', 0);
			cNeedsAppend = true;
		}

		var buySection = $('#buyBtns');
		var bNeedsAppend = false;
		if (buySection.length === 0 && $SM.get('game.installed["trading post"]', true) > 0) {
			buySection = $('<div>').attr({ 'id': 'buyBtns', 'data-legend': _('buy:') }).css('opacity', 0);
			bNeedsAppend = true;
		}

		for (var k in Room.Craftables) {
			craftable = Room.Craftables[k];
			var max = $SM.num(k, craftable) + 1 > craftable.maximum;
			if (craftable.button == null) {
				if (Room.craftUnlocked(k)) {
					var loc = Room.needsWorkshop(craftable.type) ? craftSection : buildSection;
					craftable.button = new Button.Button({
						id: 'build_' + k,
						cost: craftable.cost(),
						text: _(k),
						click: Room.build,
						width: '160px',
						ttPos: loc.children().length > 10 ? 'top right' : 'bottom right'
					}).css('opacity', 0).attr('buildThing', k).appendTo(loc).animate({ opacity: 1 }, 300, 'linear');
				}
			} else {
				// refresh the tooltip
				var costTooltip = $('.tooltip', craftable.button);
				costTooltip.empty();
				var cost = craftable.cost();
				for (var c in cost) {
					$("<div>").addClass('row_key').text(_(c)).appendTo(costTooltip);
					$("<div>").addClass('row_val').text(cost[c]).appendTo(costTooltip);
				}
				if (max && !craftable.button.hasClass('disabled')) {
					Notifications.notify(Room, craftable.maxMsg);
				}
			}
			if (max) {
				Button.setDisabled(craftable.button, true);
			} else {
				Button.setDisabled(craftable.button, false);
			}
		}

		for (var g in Room.TradeGoods) {
			good = Room.TradeGoods[g];
			var goodsMax = $SM.num(g, good) + 1 > good.maximum;
			if (good.button == null) {
				if (Room.buyUnlocked(g)) {
					good.button = new Button.Button({
						id: 'build_' + g,
						cost: good.cost(),
						text: _(g),
						click: Room.buy,
						width: '160px',
						ttPos: buySection.children().length > 10 ? 'top right' : 'bottom right'
					}).css('opacity', 0).attr('buildThing', g).appendTo(buySection).animate({ opacity: 1 }, 300, 'linear');
				}
			} else {
				// refresh the tooltip
				var goodsCostTooltip = $('.tooltip', good.button);
				goodsCostTooltip.empty();
				var goodCost = good.cost();
				for (var gc in goodCost) {
					$("<div>").addClass('row_key').text(_(gc)).appendTo(goodsCostTooltip);
					$("<div>").addClass('row_val').text(goodCost[gc]).appendTo(goodsCostTooltip);
				}
				if (goodsMax && !good.button.hasClass('disabled')) {
					Notifications.notify(Room, good.maxMsg);
				}
			}
			if (goodsMax) {
				Button.setDisabled(good.button, true);
			} else {
				Button.setDisabled(good.button, false);
			}
		}

		if (needsAppend && buildSection.children().length > 0) {
			buildSection.appendTo('div#roomPanel').animate({ opacity: 1 }, 300, 'linear');
		}
		if (cNeedsAppend && craftSection.children().length > 0) {
			craftSection.appendTo('div#roomPanel').animate({ opacity: 1 }, 300, 'linear');
		}
		if (bNeedsAppend && buildSection.children().length > 0) {
			buySection.appendTo('div#roomPanel').animate({ opacity: 1 }, 300, 'linear');
		}
	},

	compassTooltip: function (direction) {
		var ttPos = $('div#resources').children().length > 10 ? 'top right' : 'bottom right';
		var tt = $('<div>').addClass('tooltip ' + ttPos);
		$('<div>').addClass('row_key').text(_('the compass points ' + direction)).appendTo(tt);
		tt.appendTo($('#row_compass'));
	},

	handleStateUpdates: function (e) {
		if (e.category == 'stores') {
			Room.updateStoresView();
			Room.updateInstallButtons();
		} else if (e.category == 'income') {
			Room.updateStoresView();
			Room.updateIncomeView();
		} else if (e.stateName.indexOf('game.installed') === 0) {
			Room.updateInstallButtons();
		}
	},

	setMusic() {
		// set music based on fire level

		// AudioEngine.stopEventMusic();


		// Music based on 'Fire Level"

		// var fireValue = $SM.get('game.entropy.value');
		// switch (fireValue) {
		// 	case 0:
		// 		// AudioEngine.playBackgroundMusic(AudioLibrary.W96_ACHIEVEMENT);
		// 		break;
		// 	case 1:
		// 		// AudioEngine.playBackgroundMusic(AudioLibrary.MUSIC_FIRE_SMOLDERING);
		// 		break;
		// 	case 2:
		// 		// AudioEngine.playBackgroundMusic(AudioLibrary.MUSIC_FIRE_FLICKERING);
		// 		break;
		// 	case 3:
		// 		// AudioEngine.playBackgroundMusic(AudioLibrary.MUSIC_FIRE_BURNING);
		// 		break;
		// 	case 4:
		// 		// AudioEngine.playBackgroundMusic(AudioLibrary.MUSIC_FIRE_ROARING);
		// 		break;
		// }
	}
};
