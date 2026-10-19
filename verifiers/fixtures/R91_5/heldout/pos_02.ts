import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { RestApi, Integration, IntegrationType, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';

export class NotesStack extends Stack {
  constructor(scope: Construct, id: string, notesFn: IFunction, uri: string) {
    super(scope, id);
    const api = new RestApi(this, 'NotesApi', {
      defaultIntegration: new LambdaIntegration(notesFn),
    });
    const notes = api.root.addResource('notes');
    notes.addMethod('GET');
    notes.addMethod('PUT', new Integration({
      type: IntegrationType.AWS_PROXY,
      integrationHttpMethod: 'POST',
      uri,
    }));
  }
}
