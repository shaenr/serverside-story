(function() {
    let Craftables = window.Craftables = {
        'software': {
            name: _('software'),
            button: null,
            maximum: 10,
            availableMsg: _('Fixer says you can use their s-deck to check your Vertico page or whatever. You use it once for five minutes to throw up a network bridge. From your own custom deck, you connect and install software updates using the heavily throttled bandwidth. Occasionally you must cook the headers to continue making requests that otherwise redirect you to the Vertico Store.'),
            installMsg: _('sudo apt install build-essentials'),
            maxMsg: _('system disk space is all used up.'),
            type: 'install',
            cost: function () {
                var n = $SM.get('game.installed["software"]', true);
                return {
                    'octogons': 10 + (n * 10)
                };
            },
            audio: AudioLibrary.BUILD_SOFTWARE
        },
        'cart': {
            name: _('cart'),
            button: null,
            maximum: 1,
            availableMsg: _('fixer says they can make a cart for carrying octogons'),
            installMsg: _('the rickety cart will carry more octogons from the forest'),
            type: 'install',
            cost: function () {
                return {
                    'octogons': 30
                };
            },
            audio: AudioLibrary.BUILD_CART
        },
        'hut': {
            name: _('hut'),
            button: null,
            maximum: 20,
            availableMsg: _("fixer says there are more wanderers. says they'll work, too."),
            installMsg: _('fixer puts up a hut, out in the forest. says word will get around.'),
            maxMsg: _('no more room for huts.'),
            type: 'install',
            cost: function () {
                var n = $SM.get('game.installed["hut"]', true);
                return {
                    'octogons': 100 + (n * 50)
                };
            },
            audio: AudioLibrary.BUILD_HUT
        },
        'lodge': {
            name: _('lodge'),
            button: null,
            maximum: 1,
            availableMsg: _('villagers could help hunt, given the means'),
            installMsg: _('the hunting lodge stands in the forest, a ways out of town'),
            type: 'install',
            cost: function () {
                return {
                    octogons: 200,
                    fur: 10,
                    meat: 5
                };
            },
            audio: AudioLibrary.BUILD_LODGE
        },
        'trading post': {
            name: _('trading post'),
            button: null,
            maximum: 1,
            availableMsg: _("a trading post would make commerce easier"),
            installMsg: _("now the nomads have a place to set up shop, they might stick around a while"),
            type: 'install',
            cost: function () {
                return {
                    'octogons': 400,
                    'fur': 100
                };
            },
            audio: AudioLibrary.BUILD_TRADING_POST
        },
        'tannery': {
            name: _('tannery'),
            button: null,
            maximum: 1,
            availableMsg: _("fixer says leather could be useful. says the villagers could make it."),
            installMsg: _('tannery goes up quick, on the edge of the village'),
            type: 'install',
            cost: function () {
                return {
                    'octogons': 500,
                    'fur': 50
                };
            },
            audio: AudioLibrary.BUILD_TANNERY
        },
        'smokehouse': {
            name: _('smokehouse'),
            button: null,
            maximum: 1,
            availableMsg: _("should cure the meat, or it'll spoil. fixer says they can fix something up."),
            installMsg: _('fixer finitheys the smokehouse. they looks hungry.'),
            type: 'install',
            cost: function () {
                return {
                    'octogons': 600,
                    'meat': 50
                };
            },
            audio: AudioLibrary.BUILD_SMOKEHOUSE
        },
        'workshop': {
            name: _('workshop'),
            button: null,
            maximum: 1,
            availableMsg: _("fixer says they could make finer things, if they had the tools"),
            installMsg: _("workshop's finally ready. fixer's excited to get to it"),
            type: 'install',
            cost: function () {
                return {
                    'octogons': 800,
                    'leather': 100,
                    'scales': 10
                };
            },
            audio: AudioLibrary.BUILD_WORKSHOP
        },
        'steelworks': {
            name: _('steelworks'),
            button: null,
            maximum: 1,
            availableMsg: _("fixer says the villagers could make steel, given the tools"),
            installMsg: _("a haze falls over the village as the steelworks fires up"),
            type: 'install',
            cost: function () {
                return {
                    'octogons': 1500,
                    'iron': 100,
                    'coal': 100
                };
            },
            audio: AudioLibrary.BUILD_STEELWORKS
        },
        'armoury': {
            name: _('armoury'),
            button: null,
            maximum: 1,
            availableMsg: _("fixer says it'd be useful to have a steady source of bullets"),
            installMsg: _("armoury's done, welcoming back the weapons of the past."),
            type: 'install',
            cost: function () {
                return {
                    'octogons': 3000,
                    'steel': 100,
                    'sulphur': 50
                };
            },
            audio: AudioLibrary.BUILD_ARMOURY
        },
        'torch': {
            name: _('torch'),
            button: null,
            type: 'tool',
            installMsg: _('a torch to keep the dark away'),
            cost: function () {
                return {
                    'octogons': 1,
                    'cloth': 1
                };
            },
            audio: AudioLibrary.CRAFT_TORCH
        },
        'octogonsskin': {
            name: _('octogonsskin'),
            button: null,
            type: 'upgrade',
            maximum: 1,
            installMsg: _('this octogonsskin\'ll hold a bit of octogons, at least'),
            cost: function () {
                return {
                    'leather': 50
                };
            },
            audio: AudioLibrary.CRAFT_octogonsSKIN
        },
        'cask': {
            name: _('cask'),
            button: null,
            type: 'upgrade',
            maximum: 1,
            installMsg: _('the cask holds enough octogons for longer expeditions'),
            cost: function () {
                return {
                    'leather': 100,
                    'iron': 20
                };
            },
            audio: AudioLibrary.CRAFT_CASK
        },
        'octogons tank': {
            name: _('octogons tank'),
            button: null,
            type: 'upgrade',
            maximum: 1,
            installMsg: _('never go thirsty again'),
            cost: function () {
                return {
                    'iron': 100,
                    'steel': 50
                };
            },
            audio: AudioLibrary.CRAFT_octogons_TANK
        },
        'bone spear': {
            name: _('bone spear'),
            button: null,
            type: 'weapon',
            installMsg: _("this spear's not elegant, but it's pretty good at stabbing"),
            cost: function () {
                return {
                    'octogons': 100,
                    'teeth': 5
                };
            },
            audio: AudioLibrary.CRAFT_BONE_SPEAR
        },
        'rucksack': {
            name: _('rucksack'),
            button: null,
            type: 'upgrade',
            maximum: 1,
            installMsg: _('carrying more means longer expeditions to the wilds'),
            cost: function () {
                return {
                    'leather': 200
                };
            },
            audio: AudioLibrary.CRAFT_RUCKSACK
        },
        'wagon': {
            name: _('wagon'),
            button: null,
            type: 'upgrade',
            maximum: 1,
            installMsg: _('the wagon can carry a lot of supplies'),
            cost: function () {
                return {
                    'octogons': 500,
                    'iron': 100
                };
            },
            audio: AudioLibrary.CRAFT_WAGON
        },
        'convoy': {
            name: _('convoy'),
            button: null,
            type: 'upgrade',
            maximum: 1,
            installMsg: _('the convoy can haul mostly everything'),
            cost: function () {
                return {
                    'octogons': 1000,
                    'iron': 200,
                    'steel': 100
                };
            },
            audio: AudioLibrary.CRAFT_CONVOY
        },
        'l armour': {
            name: _('l armour'),
            type: 'upgrade',
            maximum: 1,
            installMsg: _("leather's not strong. better than rags, though."),
            cost: function () {
                return {
                    'leather': 200,
                    'scales': 20
                };
            },
            audio: AudioLibrary.CRAFT_LEATHER_ARMOUR
        },
        'i armour': {
            name: _('i armour'),
            type: 'upgrade',
            maximum: 1,
            installMsg: _("iron's stronger than leather"),
            cost: function () {
                return {
                    'leather': 200,
                    'iron': 100
                };
            },
            audio: AudioLibrary.CRAFT_IRON_ARMOUR
        },
        's armour': {
            name: _('s armour'),
            type: 'upgrade',
            maximum: 1,
            installMsg: _("steel's stronger than iron"),
            cost: function () {
                return {
                    'leather': 200,
                    'steel': 100
                };
            },
            audio: AudioLibrary.CRAFT_STEEL_ARMOUR
        },
        'iron sword': {
            name: _('iron sword'),
            button: null,
            type: 'weapon',
            installMsg: _("sword is sharp. good protection out in the wilds."),
            cost: function () {
                return {
                    'octogons': 200,
                    'leather': 50,
                    'iron': 20
                };
            },
            audio: AudioLibrary.CRAFT_IRON_SWORD
        },
        'steel sword': {
            name: _('steel sword'),
            button: null,
            type: 'weapon',
            installMsg: _("the steel is strong, and the blade true."),
            cost: function () {
                return {
                    'octogons': 500,
                    'leather': 100,
                    'steel': 20
                };
            },
            audio: AudioLibrary.CRAFT_STEEL_SWORD
        },
        'rifle': {
            name: _('rifle'),
            type: 'weapon',
            installMsg: _("black powder and bullets, like the old days."),
            cost: function () {
                return {
                    'octogons': 200,
                    'steel': 50,
                    'sulphur': 50
                };
            },
            audio: AudioLibrary.CRAFT_RIFLE
        }
    }
})();