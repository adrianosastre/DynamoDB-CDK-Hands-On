#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ResourcesApplicationStack } from "../lib/resources-application-stack";
import { ApiGatewayStack } from "../lib/api-gateway-stack";

const app = new cdk.App();

const resourcesStack = new ResourcesApplicationStack(
  app,
  "DynamoDB-CDK-Hands-On-Resources-Stack",
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  }
);

const apiGatewayStack = new ApiGatewayStack(
  app,
  "DynamoDB-CDK-Hands-On-API-Gateway-Stack",
  resourcesStack.ordersFunction,
  resourcesStack.usersFunction,
  {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
  }
);
apiGatewayStack.addDependency(resourcesStack);
