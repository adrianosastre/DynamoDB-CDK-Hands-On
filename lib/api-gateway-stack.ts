import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as awsLogs from "aws-cdk-lib/aws-logs";

export class ApiGatewayStack extends Stack {
  constructor(
    scope: Construct,
    id: string,
    ordersFunction: lambdaNodeJs.NodejsFunction,
    usersFunction: lambdaNodeJs.NodejsFunction,
    props?: StackProps
  ) {
    super(scope, id, props);

    const logGroup = new awsLogs.LogGroup(
      this,
      "DynamoDB-CDK-Hands-On-API-Logs"
    );

    const api = new apigateway.RestApi(this, "DynamoDB-CDK-Hands-On-API", {
      restApiName: "DynamoDB-CDK-Hands-On-API",
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
    });

    const usersFunctionIntegration = new apigateway.LambdaIntegration(
      usersFunction,
      {
        requestTemplates: {
          "application/json": '{"statusCode: 200"}',
        },
      }
    );

    const usersResource = api.root.addResource("users");
    usersResource.addMethod("GET", usersFunctionIntegration);

    const userResource = usersResource
      .addResource("username")
      .addResource("{username}");

    userResource.addMethod("GET", usersFunctionIntegration);
    userResource.addMethod("POST", usersFunctionIntegration);
    userResource.addMethod("PUT", usersFunctionIntegration);
    userResource.addMethod("DELETE", usersFunctionIntegration);

    const ordersFunctionIntegration = new apigateway.LambdaIntegration(
      ordersFunction,
      {
        requestTemplates: {
          "application/json": '{"statusCode: 200"}',
        },
      }
    );

    const ordersUsersResource = api.root
      .addResource("orders")
      .addResource("username")
      .addResource("{username}");
    ordersUsersResource.addMethod("GET", ordersFunctionIntegration);
    ordersUsersResource.addMethod("POST", ordersFunctionIntegration);

    const ordersUsersStatusResource = ordersUsersResource
      .addResource("status")
      .addResource("{status}");
    ordersUsersStatusResource.addMethod("GET", ordersFunctionIntegration);

    const orderResource = ordersUsersResource
      .addResource("id")
      .addResource("{id}");

    orderResource.addMethod("PUT", ordersFunctionIntegration);
    orderResource.addMethod("DELETE", ordersFunctionIntegration);
  }
}
