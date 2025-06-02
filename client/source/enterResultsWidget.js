const React = require("react")
const MobxReact = require("mobx-react")
const ReactSelect = require("react-select").default
const { runInAction } = require("mobx")

const MainStore = require("mainStore.js")
const Common = require("common.js")
const PlayerPicker = require("./playerPicker.js")

require("./enterResultsWidget.less")

const testData = require("./testVAStates.json")
//let testStr = "start pools \"Saturday Event\" \"Open Pairs\"\nround 1\npool A\n1 ryan_young james pavel 123.45\n2 test_hey id4 80.34\nround 2\npool A\n1 id1 id2 123.45\npool B\n1 id3 id4 80.34\nend"

module.exports = @MobxReact.observer class EnterResultsWidget extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            selectedEvent: null,
            selectedDivision: null,
            resultsData: testData.resultsData,
            isPlayerPickerEnabled: false,
            playerPickerData: undefined
        }

        Common.downloadPlayerAndEventData()

        console.log(testData)
    }

    onSelectEvent(selected) {
        this.state.selectedEvent = selected

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
        let buttonText = Common.getFullNameFromPlayerKey(playerKey) || "Click to Search"

        return (
            <div key={playerIndex} className="player">
                <button onClick={() => this.onPickPlayer(teamData, playerIndex)}>{buttonText}</button>
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

    onScoreChanged(teamData, e) {
        teamData.points = parseFloat(e.target.value)
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
                        <input className="score" type="number" step="0.1" onChange={(e) => this.onScoreChanged(teamData, e)} value={teamData.points}/>
                        <input className="place" type="number" value={teamData.place}/>
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

    getPoolWidget(poolName, poolData) {
        let teams = poolData.teamData.map((data, index) => {
            return this.getTeamWidget(index, data, poolData)
        })

        return (
            <div key={poolName} className="pool">
                <div className="title">
                    <div>{`Pool ${poolName}`}</div>
                    <button>X</button>
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

    getRoundWidget(roundNum, roundData) {
        let pools = []
        for (let key of Object.keys(roundData)) {
            if (key.startsWith("pool")) {
                pools.push(this.getPoolWidget(key, roundData[key]))
            }
        }

        return (
            <div key={roundNum} className="round">
                <div className="title">
                    <div>{`Round ${roundNum}`}</div>
                    <button>X</button>
                </div>
                {pools}
                <button onClick={() => this.onAddPool(roundData)}>Add Pool</button>
            </div>
        )
    }

    getResultsWidget() {
        //if (this.state.selectedEvent !== null)

        let rounds = []
        for (let key of Object.keys(this.state.resultsData)) {
            if (key.startsWith("round")) {
                let roundNum = parseInt(key.slice(5), 10)
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

    render() {
        return (
            <div className="enterResultsWidget">
                <h2>Results Tool</h2>
                <div className="header">
                    {this.getEventList()}
                    <button>Create Event</button>
                    {this.getDivisionList()}
                    <button>Remove Division</button>
                    <button onClick={() => this.onAddRound()}>Add Round</button>
                </div>
                {this.getResultsWidget()}
                {this.state.isPlayerPickerEnabled ? <PlayerPicker onSelect={(playerKey, isNew) => this.onPlayerSelected(playerKey, isNew)} playerData={MainStore.playerData}/> : null}
            </div>
        )
    }
}
