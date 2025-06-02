const MainStore = require("mainStore.js")
const Endpoints = require("endpoints.js")
const { runInAction } = require("mobx")

let Common = module.exports

module.exports.fetchEx = function(key, pathParams, queryParams, options) {
    return fetch(Endpoints.buildUrl(key, pathParams, queryParams), options).then((response) => {
        return response.json()
    })
}

function isValidText(str) {
    return str !== undefined && str !== null && str.length > 0
}

module.exports.getFullNameFromPlayerKey = function(playerKey) {
    let playerData = MainStore.playerData[playerKey]
    if (playerData === undefined) {
        return undefined
    }

    return `${playerData.firstName} ${playerData.lastName}`
}

module.exports.getDisplayNameFromPlayerData = function(playerData) {
    let displayName = ""
    if (isValidText(playerData.firstName) && isValidText(playerData.lastName)) {
        displayName = playerData.firstName.toLowerCase() + "_" + playerData.lastName.toLowerCase()
    } else if (isValidText(playerData.firstName)) {
        displayName = playerData.firstName.toLowerCase()
    }else if (isValidText(playerData.lastName)) {
        displayName = playerData.lastName.toLowerCase()
    }

    return displayName.replaceAll(" ", "_")
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
            MainStore.cachedDisplayNames.push(Common.getDisplayNameFromPlayerData(playerData))
        }

        console.log("playerData", data)
    }).catch((error) => {
        console.error(`Failed to download Player data: ${error}`)
    })

    runInAction(() => {
        MainStore.isFetchingEventData = true
    })

    Common.fetchEx("GET_EVENT_DATA", {}, {}, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        runInAction(() => {
            MainStore.eventData = data.allEventSummaryData
            MainStore.isFetchingEventData = false
        })

        console.log("eventData", data)
    }).catch((error) => {
        console.error(`Failed to download Event data: ${error}`)
    })
}

module.exports.uploadToRds = function() {
    return Common.fetchEx("UPLOAD_TO_RDS", {}, {}, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((data) => {
        console.log(data)
    }).catch((error) => {
        console.error(`Failed to upload to rds: ${error}`)
    })
}

module.exports.convertToResultsData = function(eventKey, divisionName, inputStr) {
    return Common.fetchEx("CONVERT_TO_RESULTS_DATA", {
        eventKey: eventKey,
        divisionName: divisionName
    }, {}, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: inputStr
    }).then((data) => {
        if (data.success) {
            return data.resultsData
        } else {
            throw data.error
        }
    }).catch((error) => {
        console.error(`Failed to Add New Player: ${error}`)
    })
}
