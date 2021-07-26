/**
 * Module that registers the notification box and handles messages
 */
var Notifications = {
	
	init: function(options) {
		this.options = $.extend(
			this.options,
			options
		);
		
		// Create the notifications box
		elem = $('<div>').attr({
			id: 'notifications',
			className: 'notifications'
		});
		elem.addClass('fakeScreen')
		// Create the transparency gradient
		$('<div>').attr('id', 'notifyGradient').appendTo(elem);
		
		elem.appendTo('div#wrapper');

		$('#notifications').on('click', function(e) { 
			$('#notifications').toggleClass('notif-greater-width'); 
			e.preventDefault(); 
		})
	},
	
	options: {}, // Nothing for now
	
	elem: null,
	
	notifyQueue: {},
	
	// Allow notification to the player
	notify: function(module, text, noQueue) {
		if (typeof text == 'undefined') return;
		text = text[0].toUpperCase() + text.slice(1)
		if (text.slice(-1) != "." && text.slice(-1) != '"') text += ".";
		if (module != null && Engine.activeModule != module) {
			if (!noQueue) {
				if (typeof this.notifyQueue[module] == 'undefined') {
					this.notifyQueue[module] = [];
				}
				this.notifyQueue[module].push(text);
			}
		} else {
			Notifications.printMessage(text);
		}
		Engine.saveGame();
	},
	
	clearHidden: function () {
		// To fix some memory usage issues, we clear notifications that have been hidden.
		// We use position().top here, because we know that the parent will be the same, so the position will be the same.
		var bottom = $('#notifyGradient').position().top + $('#notifyGradient').outerHeight(true) * 2;
		$('.notification').each(function() {
			if ( $(this).position().top > bottom ) {
				$(this).remove();
			}
		});
	},
	

	getRandomCssTextLineEffect: function() {
		let roll = Engine._rollDice(1, 4).toString()
		return 'line' + roll

	},

	printMessage: function(t) {
		var text = $('<div>')
			.addClass('notification')
			.css('opacity', '0')
			.addClass(Notifications.getRandomCssTextLineEffect())
			.text(t)
			.prependTo('div#notifications');
		
		text.animate({opacity: 1}, 500, 'linear', function() {
			// Do this every time we add a new message, this way we never have a large backlog to iterate through. Keeps things faster.
			Notifications.clearHidden();
		});
	},
	
	printQueue: function(module) {
		if (typeof this.notifyQueue[module] != 'undefined') {
			while (this.notifyQueue[module].length > 0) {
				setTimeout(Notifications.printMessage(this.notifyQueue[module].shift()), 10000)
			}
		}
	}
};
