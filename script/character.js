/**
 * Module that defines characater intro
 */
let Character = {
    // Constants Assignment

    name: 'Character',
    options: {},
    init: function(options) {
        this.options = $.extend(
            this.options,
            options
        );

        // Create the Character Tab
        this.tab = Header.addLocation(_("A Stained Mirror"), "character", Character)

        // Create the Character panel
        this.panel = $('<div>').attr('id', 'pathPanel')
            .addClass('location')
            .appendTo('div#locationSlider')


        // Content of module

        Engine.updateSlider()

    },

    onArrival: function(transition_diff) {
        Engine.log(`Character.onArrival executed. transition_diff param was ${transition_diff}`)


        Character.setTitle()
        AudioEngine.playBackgroundMusic(AudioLibrary.DYSANGELIST_DONTSHOOT)
    },

    setTitle: function() {
        document.title = _('New Character');
    },

}

