import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

export class OrderModel extends apigateway.Model {
  constructor(scope: Construct, id: string, restApi: apigateway.IRestApi) {
    const schema: apigateway.JsonSchema = {
      type: apigateway.JsonSchemaType.OBJECT,
      properties: {
        orderStatus: {
          type: apigateway.JsonSchemaType.STRING,
          pattern: "CREATED|PENDING|FINISHED",
        },
        items: {
          type: apigateway.JsonSchemaType.ARRAY,
          items: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
              name: {
                type: apigateway.JsonSchemaType.STRING,
                minLength: 1,
              },
              value: {
                type: apigateway.JsonSchemaType.NUMBER,
                minimum: 0.1,
              },
              quantity: {
                type: apigateway.JsonSchemaType.INTEGER,
                minimum: 1,
              },
            },
            required: ["name", "value", "quantity"],
          },
          minItems: 1,
        },
      },
      required: ["orderStatus", "items"],
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
