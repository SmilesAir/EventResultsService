const React = require("react")
const MobxReact = require("mobx-react")
const ReactSelect = require("react-select").default
const { runInAction } = require("mobx")

const MainStore = require("mainStore.js")
const Common = require("common.js")
const PlayerPicker = require("./playerPicker.js")

require("./enterResultsWidget.less")

module.exports = @MobxReact.observer class EnterResultsWidget extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            selectedEvent: null,
            selectedDivision: null,
            resultsData: undefined,
            isPlayerPickerEnabled: false,
            playerPickerData: undefined
        }

        setTimeout(() => {
            this.state.selectedEvent = { value: "6f3940a9-95ca-461c-84fe-ce0ce4ae7b9f", label: "VirginiaStates2025" }
            this.state.selectedDivision = { value: "Open Pairs", label: "Open Pairs" }
            this.fillResultsData()
        }, 1000)

        Common.downloadPlayerAndEventData()
        Common.downloadEventResultsData()
    }

    onSelectEvent(selected) {
        this.state.selectedEvent = selected
        this.fillResultsData()

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

    onSelectDivision(selected) {
        this.state.selectedDivision = selected
        this.fillResultsData()

        this.setState(this.state)
    }

    fillResultsData() {
        this.state.resultsData = undefined

        if (this.state.selectedEvent !== null && this.state.selectedDivision !== null) {
            for (let resultsData of Object.values(MainStore.resultsData)) {
                if (resultsData.eventId === this.state.selectedEvent.value &&
                    resultsData.divisionName === this.state.selectedDivision.value) {
                    this.state.resultsData = resultsData.resultsData

                    console.log(JSON.parse(JSON.stringify(this.state.resultsData)))
                }
            }
        }

        this.setState(this.state)
    }

    getDivisionList() {
        let options = [
            { value: "Open Pairs", label: "Open Pairs" },
            { value: "Open Co-op", label: "Open Co-op" },
            { value: "Mixed Pairs", label: "Mixed Pairs" },
            { value: "Women Pairs", label: "Women Pairs" }
        ]

        return <ReactSelect value={this.state.selectedDivision} onChange={(e) => this.onSelectDivision(e)} options={options} placeholder="Choose Division" isLoading={MainStore.isFetchingEventData} />
    }

    onPickPlayer(teamData, playerIndex) {
        this.state.playerPickerData = {
            playerIndex: playerIndex,
            teamData: teamData
        }

        this.state.isPlayerPickerEnabled = true
        this.setState(this.state)
    }

    removePlayer(teamData, playerIndex) {
        teamData.players.splice(playerIndex, 1)
        this.setState(this.state)
    }

    getPlayerWidget(playerIndex, playerKey, teamData) {
        let playerName = Common.getFullNameFromPlayerKey(playerKey)
        let buttonText = playerName || "Click to Search"
        let playerButtonStyle = playerName !== undefined ? {} : { backgroundColor: "lightpink" }

        return (
            <div key={playerIndex} className="player">
                <button style={playerButtonStyle} onClick={() => this.onPickPlayer(teamData, playerIndex)}>{buttonText}</button>
                <button onClick={() => this.removePlayer(teamData, playerIndex)}>X</button>
            </div>
        )
    }

    moveTeam(poolData, teamIndex, direction) {
        let newIndex = teamIndex + direction
        if (newIndex < 0 || newIndex >= poolData.teamData.length) {
            return
        }

        let removedTeamData = poolData.teamData.splice(teamIndex, 1)[0]
        poolData.teamData.splice(newIndex, 0, removedTeamData)

        this.setState(this.state)
    }

    onAddPlayer(teamData) {
        teamData.players.push([])

        this.setState(this.state)
    }

    removeTeam(poolData, teamIndex) {
        poolData.teamData.splice(teamIndex, 1)

        this.setState(this.state)
    }

    onScoreChange(teamData, e) {
        teamData.points = parseFloat(e.target.value)
        this.setState(this.state)
    }

    onPlaceChange(teamData, e) {
        teamData.place = parseFloat(e.target.value)
        this.setState(this.state)
    }

    getTeamWidget(teamIndex, teamData, poolData) {
        let players = teamData.players.map((data, index) => {
            return this.getPlayerWidget(index, data, teamData)
        })

        return (
            <div key={teamIndex} className="team">
                <button disabled={teamIndex <= 0} onClick={() => this.moveTeam(poolData, teamIndex, -1)}>&#x2191;</button>
                <button disabled={teamIndex >= poolData.teamData.length - 1} onClick={() => this.moveTeam(poolData, teamIndex, 1)}>&#x2193;</button>
                <button onClick={() => this.removeTeam(poolData, teamIndex)}>X</button>
                {`Team ${teamIndex + 1}`}
                <div className="inputs">
                    <div className="players">
                        {players}
                        <button onClick={() => this.onAddPlayer(teamData)}>Add Player</button>
                    </div>
                    <div className="scoreAndPlace">
                        <input className="score" type="number" step="0.1" onChange={(e) => this.onScoreChange(teamData, e)} value={teamData.points}/>
                        <input className="place" type="number" onChange={(e) => this.onPlaceChange(teamData, e)} value={teamData.place}/>
                    </div>
                </div>
            </div>
        )
    }

    addTeam(poolData) {
        poolData.teamData.push({
            place: poolData.teamData.length,
            players: [],
            points: 0
        })

        this.setState(this.state)
    }

    onRemovePool(roundData, poolName) {
        delete roundData[poolName]

        this.setState(this.state)
    }

    getPoolWidget(poolName, poolData, roundData) {
        let teams = poolData.teamData.map((data, index) => {
            return this.getTeamWidget(index, data, poolData)
        })

        return (
            <div key={poolName} className="pool">
                <div className="title">
                    <div>{`Pool ${poolName.slice(4)}`}</div>
                    <button onClick={() => this.onRemovePool(roundData, poolName)}>X</button>
                </div>
                {teams}
                <button onClick={() => this.addTeam(poolData)}>Add Team</button>
            </div>
        )
    }

    onAddPool(roundData) {
        let poolCount = 0
        for (let key of Object.keys(roundData)) {
            if (key.startsWith("pool")) {
                ++poolCount
            }
        }

        let poolId = "pool" + String.fromCharCode("A".charCodeAt(0) + poolCount)
        roundData[poolId] = {
            poolId: poolId,
            teamData: []
        }

        this.setState(this.state)
    }

    getRoundNumberFromRoundKey(roundKey) {
        return parseInt(roundKey.slice(5), 10)
    }

    getRoundNameFromNumber(num) {
        switch(num) {
        case 1:
            return "Finals"
        case 2:
            return "Semifinals"
        case 3:
            return "Quaterfinals"
        case 4:
            return "Preliminaries"
        }

        return num
    }

    onRemoveRound(roundNum) {
        delete this.state.resultsData[`round${roundNum}`]
        this.setState(this.state)
    }

    getRoundWidget(roundNum, roundData) {
        let pools = []
        for (let key of Object.keys(roundData)) {
            if (key.startsWith("pool")) {
                pools.push(this.getPoolWidget(key, roundData[key], roundData))
            }
        }

        return (
            <div key={roundNum} className="round">
                <div className="title">
                    <div>{`Round ${this.getRoundNameFromNumber(roundNum)}`}</div>
                    <button onClick={() => this.onRemoveRound(roundNum)}>X</button>
                </div>
                {pools}
                <button onClick={() => this.onAddPool(roundData)}>Add Pool</button>
            </div>
        )
    }

    getResultsWidget() {
        if (this.state.resultsData === undefined) {
            return (
                <div>Select Event and Division above</div>
            )
        }

        let rounds = []
        for (let key of Object.keys(this.state.resultsData)) {
            if (key.startsWith("round")) {
                let roundNum = this.getRoundNumberFromRoundKey(key)
                if (!isNaN(roundNum)) {
                    rounds.push(this.getRoundWidget(roundNum, this.state.resultsData[key]))
                }
            }
        }

        return (
            <div className="resultsWidget">
                {rounds}
            </div>
        )
    }

    onPlayerSelected(playerKey, isNew) {
        console.log(playerKey, isNew)

        if (playerKey !== undefined) {
            this.state.playerPickerData.teamData.players[this.state.playerPickerData.playerIndex] = playerKey
            console.log(this.state.playerPickerData)
        }

        this.state.isPlayerPickerEnabled = false
        this.setState(this.state)
    }

    onAddRound() {
        let roundCount = 0
        for (let key of Object.keys(this.state.resultsData)) {
            if (key.startsWith("round")) {
                ++roundCount
            }
        }

        this.state.resultsData[`round${roundCount + 1}`] = {
            id: roundCount + 1
        }

        this.setState(this.state)
    }

    isValidGuid(str) {
        let re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        return re.test(str)
    }

    validateAll() {
        let errorList = []

        let resultsData = this.state.resultsData
        if (resultsData === undefined) {
            return [ "No Results Data" ]
        }

        let roundCount = 0
        for (let roundKey of Object.keys(resultsData)) {
            if (roundKey.startsWith("round")) {
                let roundName = this.getRoundNameFromNumber(this.getRoundNumberFromRoundKey(roundKey))
                ++roundCount
                let roundData = resultsData[roundKey]
                let poolCount = 0
                for (let poolKey of Object.keys(roundData)) {
                    if (poolKey.startsWith("pool")) {
                        let poolName = "Pool " + poolKey.slice(4)
                        ++poolCount
                        let poolData = roundData[poolKey]
                        for (let [ teamIndex, teamData ] of poolData.teamData.entries()) {
                            for (let playerKey of teamData.players) {
                                if (!this.isValidGuid(playerKey)) {
                                    errorList.push(`Unassigned Player on Team [${roundName}, ${poolName}, Team ${teamIndex + 1}]`)
                                }
                            }

                            if (teamData.players.length === 0) {
                                errorList.push(`Team with no Players [${roundName}, ${poolName}, Team ${teamIndex + 1}]`)
                            }
                        }

                        let sortedTeamList = poolData.teamData.slice(0).sort((a, b) => a.place - b.place)
                        let currentPlace = 0
                        let nextPlace = 1
                        for (let teamData of sortedTeamList) {
                            let place = teamData.place
                            if (place === nextPlace) {
                                currentPlace = place
                                ++nextPlace
                            } else if (place === currentPlace) {
                                ++nextPlace
                            } else {
                                errorList.push(`Incorrect Place Inputs [${roundName}, ${poolName}]`)
                                break
                            }
                        }
                    }
                }

                if (poolCount === 0) {
                    errorList.push(`Round with no Pools [${roundName}]`)
                }
            }
        }

        if (roundCount === 0) {
            errorList.push("No Rounds")
        }

        console.log(errorList)

        return errorList
    }

    render() {
        let errorList = this.validateAll()
        let errorCount = errorList.length
        let uploadButtonText = `Upload${errorCount > 0 ? ` (Errors ${errorCount})` : ""}`
        return (
            <div className="enterResultsWidget">
                <h2>Results Tool</h2>
                <div className="header">
                    {this.getEventList()}
                    <button>Create Event</button>
                    {this.getDivisionList()}
                    <button>Remove Division</button>
                    <button onClick={() => this.onAddRound()}>Add Round</button>
                    <button disabled={errorCount > 0}>{uploadButtonText}</button>
                </div>
                {this.getResultsWidget()}
                {this.state.isPlayerPickerEnabled ? <PlayerPicker onSelect={(playerKey, isNew) => this.onPlayerSelected(playerKey, isNew)} playerData={MainStore.playerData}/> : null}
            </div>
        )
    }
}
