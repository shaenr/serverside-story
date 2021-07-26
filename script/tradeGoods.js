(function() {

    let TradeGoods = window.TradeGoods = {
        'scales': {
            type: 'good',
            cost: function () {
                return { fur: 150 };
            },
            audio: AudioLibrary.BUY_SCALES
        },
        'teeth': {
            type: 'good',
            cost: function () {
                return { fur: 300 };
            },
            audio: AudioLibrary.BUY_TEETH
        },
        'iron': {
            type: 'good',
            cost: function () {
                return {
                    'fur': 150,
                    'scales': 50
                };
            },
            audio: AudioLibrary.BUY_IRON
        },
        'coal': {
            type: 'good',
            cost: function () {
                return {
                    'fur': 200,
                    'teeth': 50
                };
            },
            audio: AudioLibrary.BUY_COAL
        },
        'steel': {
            type: 'good',
            cost: function () {
                return {
                    'fur': 300,
                    'scales': 50,
                    'teeth': 50
                };
            },
            audio: AudioLibrary.BUY_STEEL
        },
        'medicine': {
            type: 'good',
            cost: function () {
                return {
                    'scales': 50, 'teeth': 30
                };
            },
            audio: AudioLibrary.BUY_MEDICINE
        },
        'bullets': {
            type: 'good',
            cost: function () {
                return {
                    'scales': 10
                };
            },
            audio: AudioLibrary.BUY_BULLETS
        },
        'energy cell': {
            type: 'good',
            cost: function () {
                return {
                    'scales': 10,
                    'teeth': 10
                };
            },
            audio: AudioLibrary.BUY_ENERGY_CELL
        },
        'bolas': {
            type: 'weapon',
            cost: function () {
                return {
                    'teeth': 10
                };
            },
            audio: AudioLibrary.BUY_BOLAS
        },
        'grenade': {
            type: 'weapon',
            cost: function () {
                return {
                    'scales': 100,
                    'teeth': 50
                };
            },
            audio: AudioLibrary.BUY_GRENADES
        },
        'bayonet': {
            type: 'weapon',
            cost: function () {
                return {
                    'scales': 500,
                    'teeth': 250
                };
            },
            audio: AudioLibrary.BUY_BAYONET
        },
        'alien alloy': {
            type: 'good',
            cost: function () {
                return {
                    'fur': 1500,
                    'scales': 750,
                    'teeth': 300
                };
            },
            audio: AudioLibrary.BUY_ALIEN_ALLOY
        },
        'compass': {
            type: 'special',
            maximum: 1,
            cost: function () {
                return {
                    fur: 400,
                    scales: 20,
                    teeth: 10
                };
            },
            audio: AudioLibrary.BUY_COMPASS
        }
    }

})();