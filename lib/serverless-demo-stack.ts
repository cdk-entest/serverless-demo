// aws sqs send-message --message-body "Hello Hai" --queue-url $QUEUE_URL
// curl https://$API_URL/queue?message='Hello'

import {
  aws_apigateway,
  aws_dynamodb,
  aws_iam,
  aws_lambda,
  aws_lambda_event_sources,
  aws_s3,
  aws_s3_notifications,
  aws_sns,
  aws_sqs,
  aws_sns_subscriptions,
  Duration,
  Stack,
  StackProps,
  CfnOutput,
} from "aws-cdk-lib";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import * as path from "path";

// sns topic name
const snsTopicName = "SnsTopicIcaDemo";

// email subscription
const haiEmail = "hai@entest.io";

export class ServerlessDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // role for lambda
    const role = new aws_iam.Role(this, "RoleForLambdaIcaServerlessDemo", {
      assumedBy: new aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: "RoleForLambdaIcaServerlessDemo",
    });

    // inline policies
    role.attachInlinePolicy(
      new aws_iam.Policy(this, "PolicyForLambdaIcaServerlessDemo", {
        policyName: "PolicyForLambdaIcaServerlessDemo",
        statements: [
          // acces s3
          new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ["s3:*", "s3-object-lambda:*"],
            resources: ["arn:aws:s3:::haimtran-workspace/*"],
          }),

          // write to dynamo db
          new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ["dynamodb:*"],
            resources: ["*"],
          }),

          // send sns
          new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ["sns:*"],
            resources: ["*"],
          }),
        ],
      })
    );

    // create a lambda function
    const func = new aws_lambda.Function(this, "CdkLambdaIcaDemo", {
      functionName: "CdkLambdaIcaDemo",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      memorySize: 512,
      timeout: Duration.seconds(15),
      code: aws_lambda.Code.fromAsset(path.join(__dirname, "./../lambda")),
      handler: "lambda_write_ddb.handler",
      role: role,
    });

    // lambda send sns
    const lambda_sns = new aws_lambda.Function(this, "IcaLambdaSnsDemo", {
      functionName: "LambdaSnsIcaDemo",
      code: aws_lambda.Code.fromAsset(path.join(__dirname, "./../lambda")),
      handler: "lambda_send_sns.handler",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      role: role,
    });

    // an existed s3 trigger a lambda
    const bucket = aws_s3.Bucket.fromBucketName(
      this,
      "haimtran-bucket-id",
      "haimtran-workspace"
    );

    bucket.addEventNotification(
      aws_s3.EventType.OBJECT_CREATED,
      new aws_s3_notifications.LambdaDestination(func),
      {
        prefix: "notify-lambda/",
      }
    );

    // dynamo db table
    const table = new aws_dynamodb.Table(this, "S3LambdaEventTable", {
      tableName: "S3LambdaEventTable",
      partitionKey: {
        name: "id",
        type: aws_dynamodb.AttributeType.STRING,
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: aws_dynamodb.StreamViewType.NEW_IMAGE,
    });

    // dynamo db trigger lambda
    lambda_sns.addEventSource(
      new aws_lambda_event_sources.DynamoEventSource(table, {
        startingPosition: aws_lambda.StartingPosition.LATEST,
        batchSize: 1,
        retryAttempts: 2,
      })
    );

    // create a sns topic
    const topic = new aws_sns.Topic(this, "SnsTopicIcaDemo", {
      topicName: snsTopicName,
    });

    // subscript
    topic.addSubscription(
      new aws_sns_subscriptions.EmailSubscription(haiEmail)
    );
  }
}

export class LambdaApiGatewayIcaDemo extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // create a lambda
    const func = new aws_lambda.Function(this, "LambdaApiGwIcaDemo", {
      functionName: "LambdaApiGwIcaDemo",
      code: aws_lambda.Code.fromAsset(path.join(__dirname, "./../lambda")),
      handler: "lambda_api_gw.handler",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      memorySize: 512,
      timeout: Duration.seconds(15),
    });

    // create a api gateway
    const api_gw = new aws_apigateway.RestApi(this, "ApiGwIcaDemo", {
      restApiName: "lambda-api-demo",
    });

    // api resource
    const api_resource = api_gw.root.addResource("books");

    // add method
    api_resource.addMethod("GET", new aws_apigateway.LambdaIntegration(func));
  }
}

export class ApiGatewaySqsIcaDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // role for lambda
    const lambda_role = new aws_iam.Role(
      this,
      "RoleForLambdaSqsIcaServerlessDemo",
      {
        assumedBy: new aws_iam.ServicePrincipal("lambda.amazonaws.com"),
        roleName: "RoleForLambdaSqsIcaServerlessDemo",
      }
    );

    // inline policies
    lambda_role.attachInlinePolicy(
      new aws_iam.Policy(this, "PolicyForLambdaSqsIcaServerlessDemox", {
        policyName: "PolicyForLambdaSqsIcaServerlessDemo",
        statements: [
          // send sns
          new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ["sns:*"],
            resources: ["*"],
          }),
        ],
      })
    );

    // lambda to consume the message from queue
    const fn = new aws_lambda.Function(this, "LambdaConsumeSqsMessageDemo", {
      functionName: "LambdaConsumeSqsMessageDemo",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      code: aws_lambda.Code.fromAsset(path.join(__dirname, "./../lambda")),
      handler: "lambda_sqs.handler",
    });

    // create sqs
    const queue = new aws_sqs.Queue(this, "sqsApiGatewayDemo", {
      queueName: "sqsQueueApiGatewayDemo",
      visibilityTimeout: Duration.seconds(20),
    });

    // role to allow api gateway write message to sqs queue
    const role = new aws_iam.Role(this, "apiGatewayWriteToSqsRole", {
      assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    role.attachInlinePolicy(
      new aws_iam.Policy(this, "writeToSqsPolicy", {
        statements: [
          new aws_iam.PolicyStatement({
            effect: aws_iam.Effect.ALLOW,
            actions: ["sqs:SendMessage"],
            resources: [queue.queueArn],
          }),
        ],
      })
    );

    // create an api gateway
    const api_gw = new aws_apigateway.RestApi(this, "apiGatewaySqsDemo", {
      restApiName: "api-gateway-sqs-demo",
    });

    // api gateway aws integration
    const integration = new aws_apigateway.AwsIntegration({
      service: "sqs",
      path: "sqsQueueApiGatewayDemo",
      integrationHttpMethod: "POST",
      options: {
        credentialsRole: role,
        requestParameters: {
          "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
        },
        requestTemplates: {
          "application/json": `Action=SendMessage&MessageBody=$util.urlEncode("$method.request.querystring.message")`,
        },
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": `{'done': true}`,
            },
          },
        ],
      },
    });

    // api gateway resource
    const resource = api_gw.root.addResource("queue");

    // add method integration with sqs
    resource.addMethod("GET", integration, {
      methodResponses: [{ statusCode: "200" }],
    });

    // lambda process message from queue
    fn.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 1,
        maxBatchingWindow: Duration.minutes(1),
        reportBatchItemFailures: true,
      })
    );

    // sns topic
    const topic = aws_sns.Topic.fromTopicArn(
      this,
      "lambdaSendMessageToSnsDemo",
      `arn:aws:sns:${this.region}:${this.account}:${snsTopicName}`
    );

    // grant publish to lambda
    topic.grantPublish(fn);

    // cfnoutput
    new CfnOutput(this, "queueName", {
      value: queue.queueArn,
    });
  }
}
