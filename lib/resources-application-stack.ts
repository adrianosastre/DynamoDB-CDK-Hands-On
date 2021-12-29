import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import { RemovalPolicy, Duration } from "aws-cdk-lib";

export class ResourcesApplicationStack extends Stack {
  readonly ordersFunction: lambdaNodeJs.NodejsFunction;
  readonly usersFunction: lambdaNodeJs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const singleTable: dynamodb.Table = new dynamodb.Table(
      this,
      "DynamoDB-CDK-Hands-On-Single-Table",
      {
        tableName: "DynamoDB-CDK-Hands-On-Single-Table",
        removalPolicy: RemovalPolicy.DESTROY,
        partitionKey: {
          name: "pk",
          type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "sk",
          type: dynamodb.AttributeType.STRING,
        },
        timeToLiveAttribute: "ttl",
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      }
    );

    this.ordersFunction = new lambdaNodeJs.NodejsFunction(
      this,
      "DynamoDB-CDK-Hands-On-Orders-Lambda",
      {
        functionName: "DynamoDB-CDK-Hands-On-Orders-Lambda",
        entry: "lambda/orders.js",
        handler: "handler",
        bundling: {
          minify: false,
          sourceMap: false,
        },
        tracing: lambda.Tracing.ACTIVE,
        memorySize: 128,
        timeout: Duration.seconds(30),
        environment: {
          SINGLE_TABLE_DDB: singleTable.tableName,
        },
      }
    );

    singleTable.grantReadWriteData(this.ordersFunction);

    this.usersFunction = new lambdaNodeJs.NodejsFunction(
      this,
      "DynamoDB-CDK-Hands-On-Users-Lambda",
      {
        functionName: "DynamoDB-CDK-Hands-On-Users-Lambda",
        entry: "lambda/users.js",
        handler: "handler",
        bundling: {
          minify: false,
          sourceMap: false,
        },
        tracing: lambda.Tracing.ACTIVE,
        memorySize: 128,
        timeout: Duration.seconds(30),
        environment: {
          SINGLE_TABLE_DDB: singleTable.tableName,
        },
      }
    );

    singleTable.grantReadWriteData(this.usersFunction);
  }
}
