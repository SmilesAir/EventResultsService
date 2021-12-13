"use strict"

let urls = {
    GET_PLAYER_DATA: "https://tkhmiv70u9.execute-api.us-west-2.amazonaws.com/development/getAllPlayers",
    ADD_PLAYER: "https://tkhmiv70u9.execute-api.us-west-2.amazonaws.com/development/addPlayer/<firstName>/lastName/<lastName>",
    GET_EVENT_DATA: "https://gg6pefz3i3.execute-api.us-west-2.amazonaws.com/development/getAllEvents"
}

module.exports.buildUrl = function(key, pathParams, queryParams) {
    let path = __STAGE__ === "DEVELOPMENT" ? "https://0uzw9x3t5g.execute-api.us-west-2.amazonaws.com" : "https://w0wkbj0dd9.execute-api.us-west-2.amazonaws.com"
    path += `/${__STAGE__.toLowerCase()}`

    let pathReplaceData = {
        "path": path,
        "stage": __STAGE__.toLowerCase()
    }

    Object.assign(pathReplaceData, pathParams)

    let url = urls[key]
    for (let wildName in pathReplaceData) {
        url = url.replace(`<${wildName}>`, pathReplaceData[wildName])
    }

    let firstQueryParam = true
    for (let paramName in queryParams) {
        let prefix = firstQueryParam ? "?" : "&"
        firstQueryParam = false

        url += `${prefix}${paramName}=${queryParams[paramName]}`
    }

    return url
}
