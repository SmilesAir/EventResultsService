const AWS = require("aws-sdk")
let docClient = new AWS.DynamoDB.DocumentClient()
const uuid = require("uuid")
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3")
const s3Client = new S3Client({ region: process.region })

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

    let putItem = {
        key: uuid.v4(),
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
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        });

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

    return {
        results: allResults
    }
})}

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
