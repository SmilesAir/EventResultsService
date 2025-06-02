
const Mobx = require("mobx")

module.exports = Mobx.observable({
    playerData: {},
    eventData: {},
    resultsData: {},
    cachedDisplayNames: [],
    isFetchingEventData: false
})
