#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import {
  ServerlessDemoStack,
  LambdaApiGatewayIcaDemo,
  ApiGatewaySqsIcaDemoStack,
} from "../lib/serverless-demo-stack";

const app = new cdk.App();

// s3 - lambda -ddb
new ServerlessDemoStack(app, "ServerlessDemoStack", {});

// apigw - lambda
new LambdaApiGatewayIcaDemo(app, "ApiGwLambdaIcaDemo", {});

// api - sqs - lambda
new ApiGatewaySqsIcaDemoStack(app, "ApiGatewaySqsIcaDemoStack", {});
