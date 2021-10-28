const AWS = require("aws-sdk")
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("./common.js")

module.exports.setEventResults = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let key = decodeURIComponent(event.pathParameters.key)
    let request = JSON.parse(event.body) || {}
    let eventName = request.eventName
    let startDate = request.startDate
    let endDate = request.endDate

    let eventResultsData = {
        key: key,
        eventName: eventName,
        createdAt: Date.now()
    }

    let putParams = {
        TableName : process.env.EVENT_RESULTS_TABLE,
        Item: eventResultsData
    }
    await docClient.put(putParams).promise().catch((error) => {
        throw error
    })

    return {
        eventResultsData: eventResultsData
    }
})}
