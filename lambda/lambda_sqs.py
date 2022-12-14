
"""
SQS invokde lambda
"""

import json
import boto3


def handler(event, context):
    """
    lambda sqs
    """

    # sns client
    sns = boto3.client('sns')

    # get records from queue
    records = event.get('Records', [])
    for record in records:
        print(record)

    # publish message to topic
    sns.publish(
        TopicArn='arn:aws:sns:ap-southeast-1:392194582387:SnsTopicIcaDemo',
        Message=f'lambda process message from queue {event}'
    )

    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        'body': json.dumps({
            'message': 'lambda process sqs message'
        })
    }
