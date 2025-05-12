const React = require("react")
const MobxReact = require("mobx-react")
const ReactSelect = require("react-select").default
const { runInAction } = require("mobx")

const MainStore = require("mainStore.js")
const Common = require("common.js")

require("./enterResultsWidget.less")

const testData = require("./testVAStates.json")
//let testStr = "start pools \"Saturday Event\" \"Open Pairs\"\nround 1\npool A\n1 ryan_young james pavel 123.45\n2 test_hey id4 80.34\nround 2\npool A\n1 id1 id2 123.45\npool B\n1 id3 id4 80.34\nend"

module.exports = @MobxReact.observer class EnterResultsWidget extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            selectedEvent: null,
            resultsData: testData.resultsData
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

    getDivisionList() {
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

        return <ReactSelect value={this.state.selectedEvent} onChange={(e) => this.onSelectEvent(e)} options={options} placeholder="Choose Division" isLoading={MainStore.isFetchingEventData} />
    }

    getPlayerWidget(playerIndex, playerKey) {

        return (
            <div key={playerIndex} className="player">
                <input type="text" value={playerKey} />
            </div>
        )
    }

    getTeamWidget(teamIndex, teamData) {
        let players = teamData.players.map((data, index) => {
            return this.getPlayerWidget(index, data)
        })

        return (
            <div key={teamIndex} className="team">
                {`Team ${teamIndex + 1}`}
                <div className="playersAndScore">
                    <div className="players">
                        {players}
                    </div>
                    <input className="score" type="text" value={0}/>
                </div>
            </div>
        )
    }

    getPoolWidget(poolName, poolData) {
        let teams = poolData.teamData.map((data, index) => {
            return this.getTeamWidget(index, data)
        })

        return (
            <div key={poolName} className="pool">
                <div className="title">{`Pool ${poolName}`}</div>
                {teams}
            </div>
        )
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
                <div className="title">{`Round ${roundNum}`}</div>
                {pools}
            </div>
        )
    }

    getResultsWidget() {
        //if (this.state.selectedEvent !== null)

        let rounds = []
        for (let key of Object.keys(this.state.resultsData)) {
            if (key.startsWith("round")) {
                let roundNum = parseInt(key.slice(5))
                if (roundNum !== NaN) {
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

    render() {
        return (
            <div className="enterResultsWidget">
                <h2>Results Tool</h2>
                <div className="header">
                    {this.getEventList()}
                    <button>Create Event</button>
                    {this.getDivisionList()}
                    <button>Add Division</button>
                </div>
                {this.getResultsWidget()}
            </div>
        )
    }
}
