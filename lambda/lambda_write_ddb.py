
"""
simple lambda function
"""
import datetime
import json
import boto3


def handler(event, context):
    """
    simple lambda function
    """
    # ddb client
    db_client = boto3.resource('dynamodb')

    # table
    table = db_client.Table("S3LambdaEventTable")

    # time stamp
    time_stamp = int(datetime.datetime.now().timestamp()*1000)

    # write to ddb
    table.put_item(
        Item={
            "id": str(time_stamp),
            "message": f'lambda write to ddb {time_stamp}'
        }
    )

    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        'body': json.dumps({
            'message': 'Hello lambda'
        })
    }
