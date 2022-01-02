import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class UserModel extends apigateway.Model {
  constructor(scope: Construct, id: string, restApi: apigateway.IRestApi) {
    const schema: apigateway.JsonSchema = {
      type: apigateway.JsonSchemaType.OBJECT,
      properties: {
        username: {
          type: apigateway.JsonSchemaType.STRING,
          minLength: 3,
        },
        fullName: {
          type: apigateway.JsonSchemaType.STRING,
          minLength: 3,
        },
        email: {
          type: apigateway.JsonSchemaType.STRING,
          pattern: "^[a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$",
        },
        addresses: {
          type: apigateway.JsonSchemaType.ARRAY,
          items: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              home: {
                type: apigateway.JsonSchemaType.STRING,
                minLength: 10,
              },
            },
            required: ["home"],
          },
          minItems: 1,
        },
      },
      required: ["fullName", "email", "addresses"],
    };

    const props: apigateway.ModelProps = {
      restApi: restApi,
      contentType: "application/json",
      modelName: id,
      schema: schema,
    };

    super(scope, id, props);
  }
}
