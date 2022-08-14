
"""
simple lambda function
"""
import datetime
import json


def handler(event, context):
    """
    simple lambda function
    """

    # time stamp
    time_stamp = int(datetime.datetime.now().timestamp()*1000)

    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        'body': json.dumps({
            'message': f'Hello lambda api gatway {time_stamp}'
        })
    }
