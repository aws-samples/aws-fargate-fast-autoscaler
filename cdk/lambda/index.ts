const { DynamoDB } = require('aws-sdk');

const client = new DynamoDB.DocumentClient();

const asyncFunction = () => {
    return 'DONE'
}

exports.handler = async function (event: any) {
    console.log(JSON.stringify(event, undefined, 2));
    (async () => {
        console.log(await asyncFunction());
    })()

};

