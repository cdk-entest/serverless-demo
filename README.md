# CDK to deploy a simple serverless architecture 

## S3 event and DynamoDB stream trigger Lambda

![aws_devops-ica drawio](https://user-images.githubusercontent.com/20411077/169110169-d98d09d8-8e48-4d1b-9c9d-bc9f4aa16375.png)


## CDK stack 
Use the same role for two lambdas 
```tsx
const role = new aws_iam.Role(
      this,
      "RoleForLambdaIcaServerlessDemo",
      {
        assumedBy: new aws_iam.ServicePrincipal(
          "lambda.amazonaws.com"
        ),
        roleName: "RoleForLambdaIcaServerlessDemo",
      }
    );

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
```

lambda to write to dynamodb 
```tsx
const func = new aws_lambda.Function(this, "CdkLambdaIcaDemo", {
      functionName: "CdkLambdaIcaDemo",
      runtime: aws_lambda.Runtime.PYTHON_3_8,
      memorySize: 512,
      timeout: Duration.seconds(15),
      code: aws_lambda.Code.fromAsset(
        path.join(__dirname, "./../lambda")
      ),
      handler: "lambda_write_ddb.handler",
      role: role,
    });
```

lambda to send sns 
```tsx 
const lambda_sns = new aws_lambda.Function(
      this,
      "IcaLambdaSnsDemo",
      {
        functionName: "LambdaSnsIcaDemo",
        code: aws_lambda.Code.fromAsset(
          path.join(__dirname, "./../lambda")
        ),
        handler: "lambda_send_sns.handler",
        runtime: aws_lambda.Runtime.PYTHON_3_8,
        role: role,
      }
    );

```
an existed S3 trigger lambda 
```tsx
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

```
dynamodb table enabled stream 
```tsx
const table = new aws_dynamodb.Table(this, "S3LambdaEventTable", {
      tableName: "S3LambdaEventTable",
      partitionKey: {
        name: "id",
        type: aws_dynamodb.AttributeType.STRING,
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: aws_dynamodb.StreamViewType.NEW_IMAGE,
    });
```
dynamodb stream trigger lambda 
```tsx
    lambda_sns.addEventSource(
      new aws_lambda_event_sources.DynamoEventSource(table, {
        startingPosition: aws_lambda.StartingPosition.LATEST,
        batchSize: 1,
        retryAttempts: 2,
      })
    );

```
sns topic and subscription
```tsx
 // create a sns topic
    const topic = new aws_sns.Topic(this, "SnsTopicIcaDemo", {
      topicName: "SnsTopicIcaDemo",
    });

    // subscript
    topic.addSubscription(
      new aws_sns_subscriptions.EmailSubscription("hai@entest.io")
    );
```

## API Gateway Lambda Integration

![aws_devops-ica drawio(1)](https://user-images.githubusercontent.com/20411077/169175151-0531a8dc-7ecb-47ef-9fa7-a5f85dc4473d.png)


create an api gateway 
```tsx 
const api_gw = new aws_apigateway.RestApi(this, "ApiGwIcaDemo", {
  restApiName: "lambda-api-demo",
});
```
create api resource 
```tsx 
const api_resource = api_gw.root.addResource("books");
```
add api GET method 
```tsx 
api_resource.addMethod(
      "GET",
      new aws_apigateway.LambdaIntegration(func)
    );
```

## API Gateway SQS Lambad Integration 

![aws-devops (1)](https://user-images.githubusercontent.com/20411077/155687651-e844b35e-cc84-4c1d-aaa5-c64fef8c55f2.png)

API gateway integerates with SQS queue via **aws_apigateway.AwsIntegration** class and API Gateway need a role or granted to write messages to the queue. **Note** After the message successuflly processed by the lambda, need to return **statusCode: 200** to the SQS queue, so the queue will delete the processed message. Fail/exception messages will be put in a dead letter queue (DLQ)

## Role to enable API Gateway writting messages to the SQS queue 
```tsx
const role = new aws_iam.Role(
      this, 
      "apiGatewayWriteToSqsRole",
      {
        assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com")
      }
    )

    role.attachInlinePolicy(
      new aws_iam.Policy(
        this, 
        "writeToSqsPolicy", {
          statements: [
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: ['sqs:SendMessage'],
              resources: [queue.queueArn]
            })
          ]
        }
      )
    )
```

## API Gateway 
```tsx
const api_gw = new aws_apigateway.RestApi(
      this, 
      "apiGatewaySqsDemo", {
        restApiName: "api-gateway-sqs-demo"
      }
    )
```
API Gateway integration with SQS queue
```tsx
const integration = new aws_apigateway.AwsIntegration({
      service: 'sqs',
      path: 'sqsQueueApiGatewayDemo',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: role,
        requestParameters: {
          "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`
        },
        requestTemplates: {
          "application/json": `Action=SendMessage&MessageBody=$util.urlEncode("$method.request.querystring.message")`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{'done': true}`
            }
          }
        ]
      }
    })

```
API Gateway resource or path 
```tsx 
const resource = api_gw.root.addResource("queue")
```
API Gateway add method
```tsx 
resource.addMethod(
    'GET', 
    integration,
    {
      methodResponses: [{ statusCode: "200"}]
    }
)
```

## Lambda function to process messages from the queue
create a Lambda function 
```tsx 
const fn = new aws_lambda.Function(
  this,
  "lambdaConsumeSqsMessageDemo",
  {
    runtime: aws_lambda.Runtime.PYTHON_3_8,
    code: aws_lambda.Code.fromAsset(
      path.join(__dirname, "lambda")
    ),
    handler: "index.handler"
  }
)
```
lambda resource event to trigger lambda by the queue 
```tsx 
fn.addEventSource(
  new SqsEventSource(
    queue, {
      batchSize: 1,
      maxBatchingWindow: Duration.minutes(1),
      reportBatchItemFailures: true
    }
  )
)
```
grant lambda to publish messages to a SNS topic
```tsx 
// existing topic 
const topic = aws_sns.Topic.fromTopicArn(
      this,
      'lambdaSendMessageToSnsDemo',
      'arn:aws:sns:ap-southeast-1:account_id:CodePipelineNotification'
    )

// grant publish to lambda 
  topic.grantPublish(
    fn
  )
```



