const AWS = require("aws-sdk")
let docClient = new AWS.DynamoDB.DocumentClient()
const uuid = require("uuid")
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3")
const s3Client = new S3Client({ region: process.region })
const { Pool } = require("pg")
const fetch = require("node-fetch")

const Common = require("./common.js")

const infoKey = "info"
const cachedDataName = "AllResultsData.json"

module.exports.setEventResults = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventId = decodeURIComponent(event.pathParameters.eventKey)
    let divisionName = decodeURIComponent(event.pathParameters.divisionName)
    let request = JSON.parse(event.body) || {}
    let eventName = request.eventName
    let resultsData = request.resultsData
    let rawText = request.rawText

    let currentResults = await getAllResults()
    let key = uuid.v4()
    for (let resultsKey in currentResults) {
        let results = currentResults[resultsKey]
        if (results.eventId === eventId && results.divisionName === divisionName) {
            key = results.key
        }
    }

    let putItem = {
        key: key,
        divisionName: divisionName,
        eventId: eventId,
        eventName: eventName,
        createdAt: Date.now(),
        resultsData, resultsData,
        rawText: rawText
    }

    let putParams = {
        TableName : process.env.EVENT_RESULTS_TABLE,
        Item: putItem
    }
    await docClient.put(putParams).promise().catch((error) => {
        throw error
    })

    await setIsResultsDataDirty(true)

    return {
        eventResultsData: putItem
    }
})}

module.exports.getAllResults = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    return {
        results: await getAllResults()
    }
})}

module.exports.uploadNewResultsToRds = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let results = await getAllResults()
    let summeries
    let players

    let params = {
        method: "GET",
        mode: "cores",
        headers: {"Content-Type":"application/json"},
    }

    await fetch("https://tkhmiv70u9.execute-api.us-west-2.amazonaws.com/development/getAllPlayers").then((response) => {
        return response.json()
    }).then((response) => {
        players = response.players
    }).catch((error) => {
        console.error(error)
    })

    await fetch("https://xyf6qhiwi1.execute-api.us-west-2.amazonaws.com/development/getAllEvents").then((response) => {
        return response.json()
    }).then((response) => {
        summeries = response.allEventSummaryData
    }).catch((error) => {
        console.error(error)
    })

    //console.log(summeries, players)

    let db = await new Pool({
        user: "smilesair",
        password: "rZn68pPkTxVxVzWdNJKgqE4C",
        host: "event-results-development.cgqrdummtjd9.us-west-2.rds.amazonaws.com",
        port: 5432,
        database: "results"
    })

    let client = await db.connect()
    try {
        for (let resultId in results) {
            let result = results[resultId]
            let divisionName = result.resultsData.divisionName
            if (result.uploadedToRdsAt === undefined) {
                for (let roundKey in result.resultsData) {
                    let round = result.resultsData[roundKey]
                    if (roundKey.startsWith("round")) {
                        for (let poolKey in round) {
                            if (poolKey.startsWith("pool")) {
                                let pool = round[poolKey]
                                let teamData = pool.teamData

                                for (let team of teamData) {
                                    let teamId = uuid.v4()
                                    for (let playerId of team.players) {
                                        let fullName = players[playerId].firstName + " " + players[playerId].lastName
                                        fullName = fullName.replace(/'/g, "''")
                                        let queryStr = `insert into results values ('${uuid.v4()}', '${result.eventId}', '${result.eventName.replace(/'/g, "''")}', '${divisionName.replace(/'/g, "''")}', '${teamId}', '${playerId}', '${fullName}', ${round.id}, '${pool.poolId}', ${team.place}, ${team.points})`
                                        console.log(queryStr)
                                        await client.query(queryStr)
                                    }
                                }
                            }
                        }
                    }
                }

                var updateParams = {
                    TableName: process.env.EVENT_RESULTS_TABLE,
                    Key: {
                        key: resultId,
                        divisionName: divisionName
                    },
                    UpdateExpression: "set uploadedToRdsAt=:uploadedAt",
                    ExpressionAttributeValues: {
                        ":uploadedAt": Date.now()
                    },
                    ReturnValues: "NONE"
                }
                await docClient.update(updateParams).promise().catch((error) => {
                    throw error
                })

                await setIsResultsDataDirty(true)
            }
        }
    } catch (error) {
        throw error
    } finally {
        client.end()
    }

    return {
        success: true
    }
})}

module.exports.importFromAllData = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let request = JSON.parse(event.body) || {}
    const allData = request.allData

    if (allData === undefined || allData.resultsData === undefined) {
        throw "Missing resultsData"
    }

    let putRequests = []
    for (let resultDataKey in allData.resultsData) {
        const resultData = allData.resultsData[resultDataKey]
        let putResult = Object.assign({
            key: resultDataKey
        }, resultData)
        putRequests.push({
            PutRequest: {
                Item: putResult
            }
        })
    }

    console.log(putRequests)

    await batchPutItems(process.env.EVENT_RESULTS_TABLE, putRequests)

    return {
        success: true,
        importedResultsCount: putRequests.length
    }
})}

module.exports.convertToResultsData = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventId = decodeURIComponent(event.pathParameters.eventKey)
    let divisionName = decodeURIComponent(event.pathParameters.divisionName)
    let request = event.body

    let resultsData = parseEventResults(request)
    resultsData.divisionName = divisionName
    resultsData.eventId = eventId

    return {
        success: true,
        resultsData: resultsData
    }
})}

function parseEventResults(inputStr) {
    let lines = inputStr.split("\n")
    if (lines < 2) {
        throw "Input string too short"
    } else if (lines[0].includes("pools")) {
        return parsePools(lines)
    } else if (lines[0].includes("bracket")) {
        return parseBracket(lines)
    }

    throw "Invalid results type"
}

function parsePools(lines) {
    let resultsData = {}

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

    return resultsData
}

function parseBracket(lines) {
    let resultsData = {}

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

    return resultsData
}

async function getAllResults() {
    let allResults
    let isResultsDataDirty = true
    let getInfoParams = {
        TableName : process.env.INFO_TABLE,
        Key: {
            key: infoKey
        }
    }
    await docClient.get(getInfoParams).promise().then((response) => {
        isResultsDataDirty = response.Item === undefined || response.Item.isResultsDataDirty
    }).catch((error) => {
        throw error
    })

    if (isResultsDataDirty) {
        allResults = await scanResults()

        let putBucketParams = {
            Bucket: process.env.CACHE_BUCKET,
            Key: cachedDataName,
            Body: JSON.stringify(allResults)
        }

        await s3Client.send(new PutObjectCommand(putBucketParams)).catch((error) => {
            throw error
        })

        await setIsResultsDataDirty(false)
    } else {
        const streamToString = (stream) =>
        new Promise((resolve, reject) => {
        const chunks = []
        stream.on("data", (chunk) => chunks.push(chunk))
        stream.on("error", reject)
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
        })

        let getBucketParams = {
            Bucket: process.env.CACHE_BUCKET,
            Key: cachedDataName
        }
        allResults = await s3Client.send(new GetObjectCommand(getBucketParams)).then((response) => {
            return streamToString(response.Body)
        }).then((dataString) => {
            return allResults = JSON.parse(dataString)
        }).catch((error) => {
            throw error
        })
    }

    return allResults
}

async function scanResults() {
    let allResults = {}

    let scanParams = {
        TableName : process.env.EVENT_RESULTS_TABLE
    }
    let items
    do {
        items = await docClient.scan(scanParams).promise().catch((error) => {
            throw error
        })
        for (let result of items.Items) {
            allResults[result.key] = result
        }

        scanParams.ExclusiveStartKey = items.LastEvaluatedKey;
    } while (items.LastEvaluatedKey !== undefined)

    return allResults
}

async function setIsResultsDataDirty(isDirty) {
    let putInfoParams = {
        TableName : process.env.INFO_TABLE,
        Item: {
            key: infoKey,
            isResultsDataDirty: isDirty
        }
    }
    await docClient.put(putInfoParams).promise().catch((error) => {
        throw error
    })
}

async function batchPutItems(tableName, putRequests) {
    for (let i = 0; i < putRequests.length; i += 25) {
        let params = {
            RequestItems: {
                [tableName]: putRequests.slice(i, i + 25)
            }
        }
        await docClient.batchWrite(params).promise().catch((error) => {
            throw error
        })
    }
}
