import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';

export class OrdersStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const ordersFn = new NodejsFunction(this, 'OrdersHandler', {
      entry: 'src/handlers/orders.ts',
    });
    new LambdaRestApi(this, 'OrdersApi', {
      handler: ordersFn,
      proxy: true,
    });
  }
}
