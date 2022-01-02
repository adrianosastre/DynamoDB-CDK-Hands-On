import { Stack, StackProps } from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as awsLogs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { OrderModel } from "./models/OrderModel";
import { UserModel } from "./models/UserModel";

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

    api.addGatewayResponse("ApiBadRequestBodyGtwResponse", {
      type: apigateway.ResponseType.BAD_REQUEST_BODY,
      templates: {
        "application/json":
          '{"message": "$context.error.validationErrorString"}',
      },
    });

    const apiRequestValidator = new apigateway.RequestValidator(
      this,
      "ApiRequestValidator",
      {
        restApi: api,
        requestValidatorName: "ApiRequestValidator",
        validateRequestBody: true,
        validateRequestParameters: true,
      }
    );

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
    userResource.addMethod("POST", usersFunctionIntegration, {
      requestModels: {
        "application/json": new UserModel(this, "UserModelPost", api),
      },
      requestValidator: apiRequestValidator,
    });
    userResource.addMethod("PUT", usersFunctionIntegration, {
      requestModels: {
        "application/json": new UserModel(this, "UserModelPut", api),
      },
      requestValidator: apiRequestValidator,
    });
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
    ordersUsersResource.addMethod("POST", ordersFunctionIntegration, {
      requestModels: {
        "application/json": new OrderModel(this, "OrderModelPost", api),
      },
      requestValidator: apiRequestValidator,
    });

    const ordersUsersStatusResource = ordersUsersResource
      .addResource("status")
      .addResource("{status}");
    ordersUsersStatusResource.addMethod("GET", ordersFunctionIntegration);

    const orderResource = ordersUsersResource
      .addResource("id")
      .addResource("{id}");

    orderResource.addMethod("GET", ordersFunctionIntegration);
    orderResource.addMethod("PUT", ordersFunctionIntegration, {
      requestModels: {
        "application/json": new OrderModel(this, "OrderModelPut", api),
      },
      requestValidator: apiRequestValidator,
    });
    orderResource.addMethod("DELETE", ordersFunctionIntegration);
  }
}
