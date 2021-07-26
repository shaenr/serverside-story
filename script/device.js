let Device = window.Device = {
	DEFAULT_HDD_SPACE: 10,
	_STORES_OFFSET: 0,
	// Everything not in this list weighs 1
	packageSizes: {
		'bone spear': 2,
		'iron sword': 3,
		'steel sword': 5,
		'rifle': 5,
		'bullets': 0.1,
		'energy cell': 0.2,
		'laser rifle': 5,
		'bolas': 0.5
	},
	hue: 173,
	name: 'Device',
	options: {}, // Nuthin'
	init: function(options) {
		this.options = $.extend(
			this.options,
			options
		);
		
		
		
		// Create the device tab
		this.tab = Header.addLocation(_("Device"), "device", Device);
		
		// Create the Device panel
		this.panel = $('<div>').attr('id', "devicePanel")
			.addClass('location')
			.appendTo('div#locationSlider');
		
		// Add the packagemanager area
		var packagemanager = $('<div>').attr({'id': 'packagemanager', 'data-legend': _('packagemanager:')}).appendTo(this.panel);
		$('<div>').attr('id', 'diskspace').appendTo(packagemanager);
		
		Device.state = $SM.get('device');
		
		Engine.updateSlider();
		
		//subscribe to stateUpdates
		$.Dispatch('stateUpdate').subscribe(Engine.handleStateUpdates);
	},
	
	openDevice: function() {
		Device.init();
		// Engine.event('progress', 'Device');
		Notifications.notify(Room, _('the compass points ' + World.dir));
	},
	
	getPackageSize: function(package) {
		var s = Device.packageSizes[package];
		if(typeof s != 'number') s = 1;
		
		return s;
	},
	
	getMaxStorage: function() {
		return Device.DEFAULT_BAG_SPACE;
	},
	
	getFreeSpace: function() {
		var num = 0;
		if(Device.state) {
			for(var k in Device.state) {
				var n = Device.state[k];
				if(isNaN(n)) {
					// No idea how this happens, but I will fix it here!
					Device.state[k] = n = 0;
				}
				num += n * Device.getPackageSize(k);
			}
		}
		return Device.getMaxStorage() - num;
	},
	
	updateFeatures: function(ignoreStores) {
		if($SM.get('device.features')) {
			var features = $('#features');
			var needsAppend = false;
			if(features.length === 0) {
				needsAppend = true;
				features = $('<div>').attr({'id': 'features', 'data-legend': _('features:')});
			}
			for(var k in $SM.get('device.features')) {
				var id = 'feature_' + k.replace(' ', '-');
				var r = $('#' + id);
				if($SM.get('device.features["'+k+'"]') && r.length === 0) {
					r = $('<div>').attr('id', id).addClass('featureRow').appendTo(features);
					$('<div>').addClass('row_key').text(_(k)).appendTo(r);
					$('<div>').addClass('tooltip bottom right').text(Engine.features[k].desc).appendTo(r);
				}
			}
			
			if(needsAppend && features.children().length > 0) {
				features.prependTo(Device.panel);
			}
			
			if(!ignoreStores && Engine.activeModule === Device) {
				$('#storesContainer').css({top: features.height() + 26 + Device._STORES_OFFSET + 'px'});
			}
		}
	},
	
	updatePackageManager: function() {
		var outfit = $('div#packagemanager');
		
		if(!Device.state) {
			Device.state = {};
		}
		
		// Add the armour row
		var armour = _("none");
		if($SM.get('stores["s armour"]', true) > 0)
			armour = _("steel");
		else if($SM.get('stores["i armour"]', true) > 0)
			armour = _("iron");
		else if($SM.get('stores["l armour"]', true) > 0)
			armour = _("leather");
		var aRow = $('#armourRow');
		if(aRow.length === 0) {
			aRow = $('<div>').attr('id', 'armourRow').addClass('packmanRow').prependTo(outfit);
			$('<div>').addClass('row_key').text(_('armour')).appendTo(aRow);
			$('<div>').addClass('row_val').text(armour).appendTo(aRow);
			$('<div>').addClass('clear').appendTo(aRow);
		} else {
			$('.row_val', aRow).text(armour);
		}
		
		// Add the water row
		var wRow = $('#waterRow');
		if(wRow.length === 0) {
			wRow = $('<div>').attr('id', 'waterRow').addClass('packmanRow').insertAfter(aRow);
			$('<div>').addClass('row_key').text(_('water')).appendTo(wRow);
			$('<div>').addClass('row_val').text(World.getMaxWater()).appendTo(wRow);
			$('<div>').addClass('clear').appendTo(wRow);
		} else {
			$('.row_val', wRow).text(World.getMaxWater());
		}
		
		var space = Device.getFreeSpace();
		var currentBagCapacity = 0;
		// Add the non-craftables to the craftables
		var carryable = $.extend({
			'cured meat': { type: 'tool', desc: _('restores') + ' ' + World.MEAT_HEAL + ' ' + _('hp') },
			'bullets': { type: 'tool', desc: _('use with rifle') },
			'grenade': {type: 'weapon' },
			'bolas': {type: 'weapon' },
			'laser rifle': {type: 'weapon' },
			'energy cell': {type: 'tool', desc: _('emits a soft red glow') },
			'bayonet': {type: 'weapon' },
			'charm': {type: 'tool'},
			'medicine': {type: 'tool', desc: _('restores') + ' ' + World.MEDS_HEAL + ' ' + _('hp') }
		}, Room.Craftables);
		
		for(var k in carryable) {
			var lk = _(k);
			var store = carryable[k];
			var have = $SM.get('stores["'+k+'"]');
			var num = Device.state[k];
			num = typeof num == 'number' ? num : 0;
			if (have !== undefined) {
				if (have < num) { num = have; }
				$SM.set(k, num, true);
			}

			var row = $('div#packman_row_' + k.replace(' ', '-'), outfit);
			if((store.type == 'tool' || store.type == 'weapon') && have > 0) {
				currentBagCapacity += num * Device.getPackageSize(k);
				if(row.length === 0) {
					row = Device.createOutfittingRow(k, num, store, store.name);
					
					var curPrev = null;
					outfit.children().each(function(i) {
						var child = $(this);
						if(child.attr('id').indexOf('packman_row_') === 0) {
							var cName = child.children('.row_key').text();
							if(cName < lk) {
								curPrev = child.attr('id');
							}
						}
					});
					if(curPrev == null) {
						row.insertAfter(wRow);
					} else {
						row.insertAfter(outfit.find('#' + curPrev));
					}
				} else {
					$('div#' + row.attr('id') + ' > div.row_val > span', outfit).text(num);
					$('div#' + row.attr('id') + ' .tooltip .numAvailable', outfit).text(have - num);
				}
				if(num === 0) {
					$('.dnBtn', row).addClass('disabled');
					$('.dnManyBtn', row).addClass('disabled');
				} else {
					$('.dnBtn', row).removeClass('disabled');
					$('.dnManyBtn', row).removeClass('disabled');
				}
				if(num == have || space < Device.getPackageSize(k)) {
					$('.upBtn', row).addClass('disabled');
					$('.upManyBtn', row).addClass('disabled');
				} else {
					$('.upBtn', row).removeClass('disabled');
					$('.upManyBtn', row).removeClass('disabled');
				}
			} else if(have === 0 && row.length > 0) {
				row.remove();
			}
		}

		Device.updateBagSpace(currentBagCapacity);

	},

	updateBagSpace: function(currentBagCapacity) {
		// Update bagspace
		$('#bagspace').text(_('free {0}/{1}', Math.floor(Device.getMaxStorage() - currentBagCapacity) , Device.getMaxStorage()));

		if(Device.state['cured meat'] > 0) {
			Button.setDisabled($('#embarkButton'), false);
		} else {
			Button.setDisabled($('#embarkButton'), true);
		}

	},
	
	createPackageManagerRow: function(key, num, store) {
		if(!store.name) store.name = _(key);
		var row = $('<div>').attr('id', 'packman_row_' + key.replace(' ', '-')).addClass('packmanRow').attr('key',key);
		$('<div>').addClass('row_key').text(store.name).appendTo(row);
		var val = $('<div>').addClass('row_val').appendTo(row);
		
		$('<span>').text(num).appendTo(val);
		$('<div>').addClass('upBtn').appendTo(val).click([1], Device.increaseSupply);
		$('<div>').addClass('dnBtn').appendTo(val).click([1], Device.decreaseSupply);
		$('<div>').addClass('upManyBtn').appendTo(val).click([10], Device.increaseSupply);
		$('<div>').addClass('dnManyBtn').appendTo(val).click([10], Device.decreaseSupply);
		$('<div>').addClass('clear').appendTo(row);
		
		var numAvailable = $SM.get('stores["'+key+'"]', true);
		var tt = $('<div>').addClass('tooltip bottom right').appendTo(row);

		if(store.type == 'weapon') {
			$('<div>').addClass('row_key').text(_('damage')).appendTo(tt);
			$('<div>').addClass('row_val').text(World.getDamage(key)).appendTo(tt);
		} else if(store.type == 'tool' && store.desc != "undefined") {
			$('<div>').addClass('row_key').text(store.desc).appendTo(tt);
		}

		$('<div>').addClass('row_key').text(_('weight')).appendTo(tt);
		$('<div>').addClass('row_val').text(Device.getPackageSize(key)).appendTo(tt);
		$('<div>').addClass('row_key').text(_('available')).appendTo(tt);
		$('<div>').addClass('row_val').addClass('numAvailable').text(numAvailable).appendTo(tt);
		
		return row;
	},
	
	increaseSupply: function(btn) {
		var supply = $(this).closest('.packmanRow').attr('key');
		Engine.log('increasing ' + supply + ' by up to ' + btn.data);
		var cur = Device.state[supply];
		cur = typeof cur == 'number' ? cur : 0;
		if(Device.getFreeSpace() >= Device.getPackageSize(supply) && cur < $SM.get('stores["'+supply+'"]', true)) {
			var maxExtraByWeight = Math.floor(Device.getFreeSpace() / Device.getPackageSize(supply));
			var maxExtraByStore  = $SM.get('stores["'+supply+'"]', true) - cur;
			Device.state[supply] = cur + Math.min(btn.data, maxExtraByWeight, maxExtraByStore);
			$SM.set('outfit['+supply+']', Device.state[supply]);
			Device.updatePackageManager();
		}
	},
	
	decreaseSupply: function(btn) {
		var supply = $(this).closest('.packmanRow').attr('key');
		Engine.log('decreasing ' + supply + ' by up to ' + btn.data);
		var cur = Device.state[supply];
		cur = typeof cur == 'number' ? cur : 0;
		if(cur > 0) {
			Device.state[supply] = Math.max(0, cur - btn.data);
			$SM.set('outfit['+supply+']', Device.state[supply]);
			Device.updatePackageManager();
		}
	},
	
	onArrival: function(transition_diff) {
		Device.setTitle();
		Device.updatePackageManager();
		Device.updateFeatures(true);
		
		AudioEngine.playBackgroundMusic(AudioLibrary.DYSANGELIST_DONTSHOOT);

		Engine.moveStoresView($('#features'), transition_diff);
	},
	
	setTitle: function() {
		document.title = _('A Dusty Device');
	},
	
	embark: function() {
		for(var k in Device.state) {
			$SM.add('stores["'+k+'"]', -Device.state[k]);
		}
		World.onArrival();
		$('#outerSlider').animate({left: '-700px'}, 300);
		Engine.activeModule = World;
		AudioEngine.playSound(AudioLibrary.EMBARK);
	},
	
	handleStateUpdates: function(e){
		if(e.category == 'device' && e.stateName.indexOf('device.features') === 0 && Engine.activeModule == Device){
			Device.updateFeatures();
		} else if(e.category == 'income' && Engine.activeModule == Device){
			Device.updatePackageManager();
		}
	},

	scrollSidebar: function(direction, reset){

		if( typeof reset != "undefined" ){
			$('#features').css('top', '0px');
			$('#storesContainer').css('top', '206px');
			Device._STORES_OFFSET = 0;
			return;
		}
		
		var momentum = 10;

		if( direction == 'up' )
			momentum = momentum * -1;

		if( direction == 'down' && inView( direction, $('#features') ) ){

			return false;

		}else if( direction == 'up' && inView( direction, $('#storesContainer') ) ){

			return false;

		}

		scrollByX( $('#features'), momentum );
		scrollByX( $('#storesContainer'), momentum );
		Device._STORES_OFFSET += momentum;

	}
};
