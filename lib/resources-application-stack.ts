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
        billingMode: dynamodb.BillingMode.PROVISIONED,
        readCapacity: 3,
        writeCapacity: 2,
      }
    );

    singleTable.addGlobalSecondaryIndex({
      indexName: "orderStatusIdx",
      partitionKey: {
        name: "orderStatus",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
      readCapacity: 1,
      writeCapacity: 1,
    });

    const readScaling = singleTable.autoScaleReadCapacity({
      maxCapacity: 40,
      minCapacity: 1,
    });
    readScaling.scaleOnUtilization({
        targetUtilizationPercent: 50, // from what % of usage the table starts to react
        scaleInCooldown: Duration.seconds(30), // time it waits to upscale capacity
        scaleOutCooldown: Duration.seconds(60), // time it waits to downscale capacity
    });

    const writeScaling = singleTable.autoScaleWriteCapacity({
        maxCapacity: 20,
        minCapacity: 1,
    });
    writeScaling.scaleOnUtilization({
        targetUtilizationPercent: 50,
        scaleInCooldown: Duration.seconds(15),
        scaleOutCooldown: Duration.seconds(45),
    });

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
