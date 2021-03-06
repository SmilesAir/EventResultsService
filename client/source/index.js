/* eslint-disable no-warning-comments */
/* eslint-disable no-loop-func */
/* eslint-disable func-style */
/* eslint-disable no-nested-ternary */
"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")
const Fuzzysort = require("fuzzysort")
import ReactSelect from "react-select"
import mainStore from "./mainStore"

const MainStore = require("mainStore.js")
const Common = require("common.js")

require("./index.less")

//let testStr = "start pools \"Saturday Event\" \"Open Pairs\"\nround 1\npool A\n1 ryan_young james pavel 123.45\n2 test_hey id4 80.34\nround 2\npool A\n1 id1 id2 123.45\npool B\n1 id3 id4 80.34\nend"
//let testStr = "start bracket 123-123 \"Open Pro\"\nround 1\nmatch A\nid1 3\nid2 2\nround 2\nmatch A\nid3 2\nid4 1\nround 3\nmatch A\nid1 2\nid3 1\nmatch B\nid2 2\nid4 0\nend"

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()

        this.state = {
            inputText: "",
            resultsData: undefined,
            uniquePlayers: [],
            isHumanReadable: true,
            selectedEvent: null,
            newPlayerFirstName: "",
            newPlayerLastName: ""
        }

        Common.downloadPlayerAndEventData()
    }

    parseEventResults(inputStr) {
        this.state.uniquePlayers = []

        let lines = inputStr.split("\n")
        if (lines < 2) {
            // return error
        } else if (lines[0].includes("pools")) {
            this.parsePools(lines)
        } else if (lines[0].includes("bracket")) {
            this.parseBraket(lines)
        }

        this.setState(this.state)
    }

    parsePools(lines) {
        let resultsData = this.parseInfo(lines[0])

        for (let i = 1; i < lines.length; ++i) {
            let line = lines[i]
            if (line.includes("round")) {
                let roundData = {
                    id: parseInt(line.replace("round", "").trim(), 10)
                }

                let poolData = undefined
                for (++i; i < lines.length; ++i) {
                    line = lines[i]
                    if (line.includes("end") || line.includes("round")) {
                        if (poolData !== undefined) {
                            --i
                        }
                        break
                    }

                    if (line.includes("pool")) {
                        poolData = {
                            poolId: line.replace("pool", "").trim(),
                            teamData: []
                        }

                        for (++i; i < lines.length; ++i) {
                            line = lines[i]
                            if (line.includes("end") || line.includes("round") || line.includes("pool")) {
                                roundData[`pool${poolData.poolId}`] = poolData
                                --i
                                break
                            }

                            if (line.length > 0) {
                                let teamParts = line.split(" ")
                                let teamData = {
                                    place: parseInt(teamParts[0], 10),
                                    points: parseFloat(teamParts[teamParts.length - 1])
                                }
                                teamData.players = []
                                for (let partIndex = 1; partIndex < teamParts.length - 1; ++partIndex) {
                                    this.parsePlayer(teamParts[partIndex])
                                    teamData.players.push(teamParts[partIndex])
                                }
                                poolData.teamData.push(teamData)
                            }
                        }
                    }
                }

                resultsData[`round${roundData.id}`] = roundData
            }
        }

        this.state.resultsData = resultsData
        this.setState(this.state)
    }

    parseBraket(lines) {
        let resultsData = this.parseInfo(lines[0])

        for (let i = 1; i < lines.length; ++i) {
            let line = lines[i]
            if (line.includes("round")) {
                let roundData = {
                    id: parseInt(line.replace("round", "").trim(), 10)
                }

                let matchData = undefined
                for (++i; i < lines.length; ++i) {
                    line = lines[i]
                    if (line.includes("end") || line.includes("round")) {
                        if (matchData !== undefined) {
                            --i
                        }
                        break
                    }

                    if (line.includes("match")) {
                        matchData = {
                            matchId: line.replace("match", "").trim(),
                            playerData: []
                        }

                        for (++i; i < lines.length; ++i) {
                            line = lines[i]
                            if (line.includes("end") || line.includes("round") || line.includes("match")) {
                                roundData[`match${matchData.matchId}`] = matchData
                                --i
                                break
                            }

                            if (line.length > 0) {
                                let playerParts = line.split(" ")
                                if (playerParts.length >= 2) {
                                    // TODO: Handle teams in bracket format
                                    this.parsePlayer(playerParts[0])

                                    matchData.playerData.push({
                                        id: playerParts[0],
                                        score: parseInt(playerParts[1], 10)
                                    })
                                }
                            }
                        }
                    }
                }

                resultsData[`round${roundData.id}`] = roundData
            }
        }

        this.state.resultsData = resultsData
        this.setState(this.state)
    }

    parseInfo(line) {
        let info = this.splitWithQuotes(line)
        if (info.length !== 4) {
            // error
        }

        if (info.length > 2) {
            let eventData = undefined
            for (let eventId in MainStore.eventData) {
                let data = MainStore.eventData[eventId]
                if (info[2] === data.eventName || info[2] === data.id) {
                    eventData = data
                    break
                }
            }

            if (eventData !== undefined) {
                this.state.selectedEvent = {
                    value: eventData.id,
                    label: eventData.eventName
                }
                this.setState(this.state)
            }
        }

        return {
            eventId: info[2],
            divisionName: info[3]
        }
    }

    splitWithQuotes(str) {
        //The parenthesis in the regex creates a captured group within the quotes
        let myRegexp = /[^\s"]+|"([^"]*)"/gi
        let myArray = []

        let match = null
        do {
            //Each call to exec returns the next regex match as an array
            match = myRegexp.exec(str)
            if (match !== null) {
                //Index 1 in the array is the captured group if it exists
                //Index 0 is the matched text, which we use if no captured group exists
                myArray.push(match[1] ? match[1] : match[0])
            }
        } while (match !== null)

        return myArray
    }

    onInputTextChanged(event) {
        this.state.inputText = event.target.value
        this.setState(this.state)

        this.parseEventResults(this.state.inputText)
    }

    onSubmit(event) {
        event.preventDefault()

        this.submitToAws()
    }

    submitToAws() {
        // Need to double parse because the first pass it to find all the uniqueNames
        this.parseEventResults(this.state.inputText)
        this.parseEventResults(this.covertReadableState(this.state.inputText, false))

        console.log(this.state.resultsData)

        this.postData(`https://pkbxpw400j.execute-api.us-west-2.amazonaws.com/development/setEventResults/${this.state.resultsData.eventId}/divisionName/${this.state.resultsData.divisionName}`, {
            resultsData: this.state.resultsData,
            rawText: this.state.inputText,
            eventName: MainStore.eventData[this.state.resultsData.eventId].eventName
        }).then((response) => {
            console.log(response)
        }).catch((error) => {
            console.error(error)
        })
    }

    postData(url, data) {
        return fetch(url, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }).then((response) => {
            return response.json()
        })
    }

    getData(url) {
        return fetch(url, {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        })
    }

    getDisplayNameFromGuid(guid) {
        let playerData = MainStore.playerData[guid]
        if (playerData === undefined) {
            return undefined
        }

        return playerData.firstName.toLowerCase() + "_" + playerData.lastName.toLowerCase()
    }

    isGuidString(str) {
        const isGuidRegEx = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return str.match(isGuidRegEx)
    }

    parsePlayer(str) {
        let rawStr = str.trim()
        let isGuid = this.isGuidString(rawStr)
        let displayName = undefined
        let id = undefined
        if (!isGuid && rawStr.includes("_")) {
            for (let playerId in MainStore.playerData) {
                let playerData = MainStore.playerData[playerId]
                let playerDisplayName = playerData.firstName.toLowerCase() + "_" + playerData.lastName.toLowerCase()
                if (playerDisplayName === rawStr) {
                    displayName = rawStr
                    id = playerId

                    break
                }
            }
        }

        if (this.state.uniquePlayers.find((player) => player.rawName === rawStr) === undefined) {
            this.state.uniquePlayers.push({
                id: id || (isGuid ? rawStr : undefined),
                displayName: displayName || this.getDisplayNameFromGuid(rawStr),
                rawName: rawStr
            })
        }

        this.setState(this.state)
    }

    copyToClipboard(str) {
        navigator.clipboard.writeText(str)
    }

    getNameHelperElements() {
        let foundPlayers = []
        let fuzzyResults = []
        for (let player of this.state.uniquePlayers) {
            if (player.id !== undefined) {
                foundPlayers.push(player)
            } else {
                let results = Fuzzysort.go(player.rawName, MainStore.cachedDisplayNames)
                for (let result of results) {
                    let foundIndex = fuzzyResults.findIndex((data) => data.target === result.target)
                    if (foundIndex >= 0) {
                        if (result.score > fuzzyResults[foundIndex].score) {
                            fuzzyResults.splice(foundIndex, 1, result)
                        }
                    } else {
                        fuzzyResults.push(result)
                    }
                }
            }
        }

        let retElements = foundPlayers.map((data, i) => {
            return (
                <div key={i}>
                    {data.displayName !== undefined ? <button onClick={() => this.copyToClipboard(data.displayName)}>{data.displayName}</button> : null}
                    {data.id !== undefined ? <button onClick={() => this.copyToClipboard(data.id)}>{data.id}</button> : null}
                </div>
            )
        })

        fuzzyResults = fuzzyResults.sort((a, b) => {
            return b.score - a.score
        })

        retElements = retElements.concat(fuzzyResults.map((data, i) => {
            let displayName = undefined
            let id = undefined
            let dataDisplayName = data.target
            for (let playerId in MainStore.playerData) {
                let playerData = MainStore.playerData[playerId]
                let playerDisplayName = playerData.firstName.toLowerCase() + "_" + playerData.lastName.toLowerCase()
                if (playerDisplayName === dataDisplayName) {
                    displayName = dataDisplayName
                    id = playerId

                    break
                }
            }
            return (
                <div key={i + foundPlayers.length}>
                    <button onClick={() => this.copyToClipboard(displayName)}>{displayName}</button>
                    <button onClick={() => this.copyToClipboard(id)}>{id}</button>
                </div>
            )
        }))

        retElements.splice(0, 0,
            <div key="addPlayer" className="addPlayerContainer">
                <div>
                    First
                </div>
                <input type="text" value={this.state.newPlayerFirstName} onChange={(e) => this.onNewPlayerFirstNameChanged(e)} />
                <div>
                    Last
                </div>
                <input type="text" value={this.state.newPlayerLastName} onChange={(e) => this.onNewPlayerLastNameChanged(e)} />
                <button onClick={(e) => this.onAddNewPlayer(e)}>Add New Player</button>
            </div>
        )

        return retElements
    }

    onNewPlayerFirstNameChanged(e) {
        this.state.newPlayerFirstName = e.target.value
        this.setState(this.state)
    }

    onNewPlayerLastNameChanged(e) {
        this.state.newPlayerLastName = e.target.value
        this.setState(this.state)
    }

    onAddNewPlayer(e) {
        e.preventDefault()

        Common.addNewPlayer(this.state.newPlayerFirstName, this.state.newPlayerLastName)
    }

    onToggleHumanReadable() {
        this.state.isHumanReadable = !this.state.isHumanReadable
        this.state.inputText = this.covertReadableState(this.state.inputText, this.state.isHumanReadable)

        this.setState(this.state)
    }

    getHumanEventName(eventName) {
        if (eventName.includes(" ")) {
            return `"${eventName}"`
        } else {
            return eventName
        }
    }

    covertReadableState(inputStr, isHumanReadable) {
        let newStateText = inputStr.slice()
        for (let player of this.state.uniquePlayers) {
            if (player.id !== undefined) {
                if (isHumanReadable) {
                    newStateText = newStateText.replaceAll(player.id, player.displayName)
                } else {
                    newStateText = newStateText.replaceAll(player.displayName, player.id)
                }
            }
        }

        for (let eventId in MainStore.eventData) {
            let eventName = MainStore.eventData[eventId].eventName
            let firstNewLineIndex = newStateText.indexOf("\n")
            let infoLine = newStateText
            let bodyText = ""
            if (firstNewLineIndex > 0) {
                infoLine = newStateText.substring(0, firstNewLineIndex)
                bodyText = newStateText.slice(firstNewLineIndex)
            }
            if (isHumanReadable) {
                infoLine = infoLine.replace(eventId, this.getHumanEventName(eventName))
            } else {
                infoLine = infoLine.replace(this.getHumanEventName(eventName), eventId)
            }

            newStateText = infoLine + bodyText
        }

        return newStateText
    }

    onSelectEvent(selected) {
        this.state.selectedEvent = selected

        let lines = this.state.inputText.split("\n")
        if (lines.length > 0) {
            let infoParts = this.splitWithQuotes(lines[0])
            if (infoParts.length >= 4) {
                if (this.state.isHumanReadable) {
                    this.state.inputText = this.state.inputText.replace(this.getHumanEventName(infoParts[2]), this.getHumanEventName(MainStore.eventData[selected.value].eventName))
                } else {
                    this.state.inputText = this.state.inputText.replace(infoParts[2], selected.value)
                }
            }
        }

        this.setState(this.state)
    }

    getEventList() {
        let options = []
        if (!MainStore.isFetchingEventData) {
            for (let key in MainStore.eventData) {
                let eventData = mainStore.eventData[key]
                options.push({
                    value: key,
                    label: eventData.eventName
                })
            }
        }
        return <ReactSelect value={this.state.selectedEvent} onChange={(e) => this.onSelectEvent(e)} options={options} placeholder="Choose Event" isLoading={MainStore.isFetchingEventData} />
    }

    onSubmitMultiple(e) {
        for (let file of e.target.files) {
            let fr = new FileReader()
            fr.onloadend = (ev) => this.onTextLoaded(ev)
            fr.readAsText(file)
        }
    }

    onTextLoaded(e) {
        console.log(e.target.result)
        this.state.inputText = e.target.result
        this.submitToAws()
    }

    render() {
        return (
            <div className="mainContainer">
                <div>
                    <h1>
                        Event Data
                    </h1>
                    <div>
                        {this.getEventList()}
                        <a href="https://forms.gle/W2TVSaUhnirAq6cj7" target="_blank" rel="noopener noreferrer">Create New Event</a>
                    </div>
                    <h1>
                    Enter Results
                    </h1>
                    <form onSubmit={(e) => this.onSubmit(e)}>
                        <textarea value={this.state.inputText} onChange={(e) => this.onInputTextChanged(e)} cols="50" rows="15" />
                        <br />
                        <input type="submit" value="Submit" />
                    </form>
                    <button onClick={(e) => this.onToggleHumanReadable(e)}>Toggle</button>
                    <br />
                    <br />
                    <br />
                    <input type="file"onChange={(e) => this.onSubmitMultiple(e)} multiple/>
                    <br />
                    <button onClick={() => Common.uploadToRds()}>Upload to RDS</button>
                </div>
                <div className="spacer"/>
                <div>
                    <h1>
                        Name Helper
                    </h1>
                    {this.getNameHelperElements()}
                </div>
            </div>
        )
    }
}

function render() {
    ReactDOM.render(
        <Main />,
        document.getElementById("mount")
    )
}

render()
