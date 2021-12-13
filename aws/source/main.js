const AWS = require("aws-sdk")
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("./common.js")

module.exports.setEventResults = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventId = decodeURIComponent(event.pathParameters.eventKey)
    let divisionName = decodeURIComponent(event.pathParameters.divisionName)
    let request = JSON.parse(event.body) || {}
    let eventName = request.eventName
    let resultsData = request.resultsData
    let rawText = request.rawText

    let putItem = {
        key: eventId,
        divisionName: divisionName,
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

    return {
        eventResultsData: putItem
    }
})}
