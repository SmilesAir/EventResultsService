/* eslint-disable no-loop-func */
/* eslint-disable func-style */
/* eslint-disable no-nested-ternary */
"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")

require("./index.less")

let testStr = "start pools 234-234\nround 1\npool A\n1 id1 id2 123.45\n2 id3 id4 80.34\nround 2\npool A\n1 id1 id2 123.45\npool B\n1 id3 id4 80.34\nend"

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()

        this.parseEventResults(testStr)
    }

    parseEventResults(inputStr) {
        let lines = inputStr.split("\n")
        if (lines < 2) {
            // return error
        } else if (lines[0].includes("pools")) {
            this.parsePools(lines)
        } else if (lines[0].includes("bracket")) {
        }
    }

    parsePools(lines) {
        let info = lines[0].split(" ")
        if (info.length != 3) {
            // error
        }

        let resultsData = {
            eventId: info[2]
        }
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

        console.log(resultsData)
    }

    render() {
        return (
            <div>
                Starter Project
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
