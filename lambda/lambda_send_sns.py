
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
    # sns client
    sns_client = boto3.client('sns')

    # time stamp
    time_stamp = int(datetime.datetime.now().timestamp()*1000)

    # write to sns
    sns_client.publish(
        TopicArn="arn:aws:sns:ap-southeast-1:392194582387:SnsTopicIcaDemo",
        Message=f'lambda send a message to sns {time_stamp}'
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
