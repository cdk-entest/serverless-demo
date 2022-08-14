
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
    # s3 client
    s3_client = boto3.client('s3')

    # time stamp
    time_stamp = int(datetime.datetime.now().timestamp()*1000)

    # write to s3
    s3_client.put_object(
        Body=bytes(f"lambda write message to s3 {time_stamp}",
                   encoding="utf-8"),
        Bucket='haimtran-workspace',
        Key=f'lambda-write-to-s3/hello-message-{time_stamp}',
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
