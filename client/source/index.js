/* eslint-disable no-alert */
/* eslint-disable no-warning-comments */
/* eslint-disable no-loop-func */
/* eslint-disable func-style */
/* eslint-disable no-nested-ternary */
"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")
const StringSimilarity = require("string-similarity")
import ReactSelect from "react-select"

const MainStore = require("mainStore.js")
const Common = require("common.js")

require("./index.less")

let testStr = undefined
//let testStr = "start pools \"Saturday Event\" \"Open Pairs\"\nround 1\npool A\n1 ryan_young james pavel 123.45\n2 test_hey id4 80.34\nround 2\npool A\n1 id1 id2 123.45\npool B\n1 id3 id4 80.34\nend"
//let testStr = "start bracket 123-123 \"Open Pro\"\nround 1\nmatch A\nid1 3\nid2 2\nround 2\nmatch A\nid3 2\nid4 1\nround 3\nmatch A\nid1 2\nid3 1\nmatch B\nid2 2\nid4 0\nend"

const awsPath = __STAGE__ === "DEVELOPMENT" ? " https://pkbxpw400j.execute-api.us-west-2.amazonaws.com/development/" : "https://v869a98rf9.execute-api.us-west-2.amazonaws.com/production/"

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()

        this.state = {
            inputText: testStr || "",
            uniquePlayers: [],
            isHumanReadable: true,
            selectedEvent: null,
            newPlayerFirstName: "",
            newPlayerLastName: "",
            divisionName: undefined,
            updatePlayersRequestId: 0,
            playersElements: []
        }

        Common.downloadPlayerAndEventData()
    }

    parseInfo(inputStr) {
        let lines = inputStr.split("\n")
        if (lines.length < 1) {
            // error
            return
        }

        let info = this.splitWithQuotes(lines[0])
        if (info.length !== 4) {
            // error
            return
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
                    value: eventData.key,
                    label: eventData.eventName
                }
                this.state.divisionName = info[3]
                this.setState(this.state)
            }
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

        this.parseForPlayers(this.state.inputText)
        this.parseInfo(this.state.inputText)

        this.updateNameHelperElements()
    }

    parseForPlayers(str) {
        this.state.uniquePlayers = []
        let lines = str.split("\n")
        for (let line of lines) {
            if (line.includes("start") ||
                line.includes("pool") ||
                line.includes("round") ||
                line.includes("end") ||
                line.includes("match") ||
                line.trim().length < 3) {
                continue
            }

            let parts = line.split(" ")
            for (let part of parts) {
                if (this.isNumeric(part) || part.trim().length < 3) {
                    continue
                }

                this.parsePlayer(part)
            }
        }

        this.setState(this.state)
    }

    onSubmit(event) {
        event.preventDefault()

        this.submitToAws()
    }

    submitToAws() {
        Common.convertToResultsData(this.state.selectedEvent.value, this.state.divisionName, this.covertReadableState(this.state.inputText, false)).then((data) => {
            this.postData(`${awsPath}setEventResults/${data.eventId}/divisionName/${data.divisionName}`, {
                resultsData: data,
                rawText: this.state.inputText,
                eventName: MainStore.eventData[data.eventId].eventName
            }).then((response) => {
                console.log(response)
                alert(`Successfully submitted ${data.divisionName}`)
            }).catch((error) => {
                console.error(error)
                alert(`Error ${error}`)
            })
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

        return Common.getDisplayNameFromPlayerData(playerData)
    }

    isGuidString(str) {
        const isGuidRegEx = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return str.match(isGuidRegEx)
    }

    isNumeric(str) {
        if (typeof str != "string") {
            return false
        } // we only process strings!
        return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
            !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
    }

    parsePlayer(str) {
        if (this.isNumeric(str)) {
            return
        }

        let rawStr = str.trim()
        let isGuid = this.isGuidString(rawStr)
        let displayName = undefined
        let id = undefined
        if (!isGuid && rawStr.includes("_")) {
            for (let playerId in MainStore.playerData) {
                let playerData = MainStore.playerData[playerId]
                let playerDisplayName = Common.getDisplayNameFromPlayerData(playerData)
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

    updateNameHelperElements() {
        setTimeout(() => {
            let maxPartialMatches = 30
            let foundPlayers = []
            let partialMatches = []
            for (let player of this.state.uniquePlayers) {
                if (player.id !== undefined) {
                    foundPlayers.push(player)
                } else {
                    for (let cachedName of MainStore.cachedDisplayNames) {
                        let score = StringSimilarity.compareTwoStrings(player.rawName, cachedName)
                        if (score > 0) {
                            let isFull = partialMatches.length >= maxPartialMatches
                            if (!isFull || partialMatches[partialMatches.length - 1].score < score) {
                                if (isFull) {
                                    partialMatches.pop()
                                }

                                let insertIndex = partialMatches.findIndex((data) => data.score < score)
                                let newPartialMatch = {
                                    score: score,
                                    displayName: cachedName
                                }
                                if (insertIndex >= 0) {
                                    partialMatches.splice(insertIndex, 1, newPartialMatch)
                                } else {
                                    partialMatches.push(newPartialMatch)
                                }
                            }
                        }
                    }
                }
            }

            let retElements = [
                <div key="found">
                    Found Players
                </div>
            ]
            retElements = retElements.concat(foundPlayers.map((data, i) => {
                return (
                    <div key={i}>
                        {data.displayName !== undefined ? <button onClick={() => this.copyToClipboard(data.displayName)}>{data.displayName}</button> : null}
                        {data.id !== undefined ? <button onClick={() => this.copyToClipboard(data.id)}>{data.id}</button> : null}
                    </div>
                )
            }))

            retElements.push(
                <div key="partial">
                    Partial Matches
                </div>
            )

            retElements = retElements.concat(partialMatches.map((data, i) => {
                let displayName = undefined
                let id = undefined
                for (let playerId in MainStore.playerData) {
                    let playerData = MainStore.playerData[playerId]
                    let playerDisplayName = Common.getDisplayNameFromPlayerData(playerData)
                    if (playerDisplayName === data.displayName) {
                        displayName = playerDisplayName
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

            this.state.playersElements = retElements
            this.setState(this.state)
        }, 1)
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
                let eventData = MainStore.eventData[key]
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

    importFromAllData(e) {
        console.log(e.target.value)

        const fileReader = new FileReader()
        fileReader.readAsText(e.target.files[0])
        fileReader.onload = (x) => {
            const jsonData = JSON.parse(x.target.result)
            console.log(jsonData)

            this.postData(`${awsPath}importFromAllData`, {
                allData: jsonData
            }).then((response) => {
                console.log(response)
                alert(`Imported ${response.importedResultsCount} results`)
            }).catch((error) => {
                console.error(error)
            })
        }
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
                        {__STAGE__ === "DEVELOPMENT" ?
                            <a href="https://forms.gle/W2TVSaUhnirAq6cj7" target="_blank" rel="noopener noreferrer">Create New Event Development</a> :
                            <a href="https://forms.gle/JXXsxLmq9WnHEA8XA" target="_blank" rel="noopener noreferrer">Create New Event</a>}
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
                    <button onClick={(e) => this.updateNameHelperElements(e)}>Find Names</button>
                    <br />
                    <br />
                    <br />
                    <input type="file"onChange={(e) => this.onSubmitMultiple(e)} multiple/>
                    <br />
                    <button onClick={() => Common.uploadToRds()}>Upload to RDS</button>
                    <h1>
                        Import From All Data
                    </h1>
                    <div>
                        <input type="file" accept=".json" onChange={(e) => this.importFromAllData(e)}/>
                    </div>
                </div>
                <div className="spacer"/>
                <div>
                    <h1>
                        Name Helper
                    </h1>
                    {this.state.playersElements}
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
