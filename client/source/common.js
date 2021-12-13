"use strict"

const MainStore = require("mainStore.js")
const Endpoints = require("endpoints.js")

let Common = module.exports

module.exports.fetchEx = function(key, pathParams, queryParams, options) {
    return fetch(Endpoints.buildUrl(key, pathParams, queryParams), options).then((response) => {
        return response.json()
    })
}

module.exports.downloadPlayerAndEventData = function() {
    Common.fetchEx("GET_PLAYER_DATA", {}, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        MainStore.playerData = data.players

        MainStore.cachedDisplayNames = []
        for (let id in MainStore.playerData) {
            let playerData = MainStore.playerData[id]
            MainStore.cachedDisplayNames.push(playerData.firstName.toLowerCase() + "_" + playerData.lastName.toLowerCase())
        }

        console.log("playerData", data)
    }).catch((error) => {
        console.error(`Failed to download Player data: ${error}`)
    })

    MainStore.isFetchingEventData = true
    Common.fetchEx("GET_EVENT_DATA", {}, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        MainStore.eventData = data.allEventSummaryData
        MainStore.isFetchingEventData = false

        console.log("eventData", data)
    }).catch((error) => {
        console.error(`Failed to download Event data: ${error}`)
    })
}

module.exports.addNewPlayer = function(firstName, lastName) {
    Common.fetchEx("ADD_PLAYER", {
        firstName: firstName,
        lastName: lastName
    }, {}, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        MainStore.playerData[data.addedPlayer.key] = data.addedPlayer
    }).catch((error) => {
        console.error(`Failed to Add New Player: ${error}`)
    })
}
