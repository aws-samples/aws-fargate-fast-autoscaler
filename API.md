# API Reference

**Classes**

Name|Description
----|-----------
[FargateFastAutoscaler](#cdk-fargate-fastautoscaler-fargatefastautoscaler)|*No description*


**Structs**

Name|Description
----|-----------
[FargateFastAutoscalerProps](#cdk-fargate-fastautoscaler-fargatefastautoscalerprops)|*No description*



## class FargateFastAutoscaler  <a id="cdk-fargate-fastautoscaler-fargatefastautoscaler"></a>



__Implements__: [IConstruct](#constructs-iconstruct), [IDependable](#constructs-idependable)
__Extends__: [Construct](#constructs-construct)

### Initializer




```ts
new FargateFastAutoscaler(scope: Construct, id: string, props: FargateFastAutoscalerProps)
```

* **scope** (<code>[Construct](#constructs-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[FargateFastAutoscalerProps](#cdk-fargate-fastautoscaler-fargatefastautoscalerprops)</code>)  *No description*
  * **backendContainer** (<code>[aws_ecs.ContainerDefinitionOptions](#aws-cdk-lib-aws-ecs-containerdefinitionoptions)</code>)  backend container. 
  * **backendContainerPortMapping** (<code>Array<[aws_ecs.PortMapping](#aws-cdk-lib-aws-ecs-portmapping)></code>)  container port for the backend container. 
  * **vpc** (<code>[aws_ec2.IVpc](#aws-cdk-lib-aws-ec2-ivpc)</code>)  The VPC for the stack. 
  * **awsCliLayerArn** (<code>string</code>)  AWS CLI Lambda layer ARN in Serverless App Repository. __*Default*__: 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli'
  * **awsCliLayerVersion** (<code>string</code>)  The version of the Serverless App for AWS CLI Lambda layer. __*Default*__: AWSCLI_LAYER_VERSION
  * **disableScaleIn** (<code>boolean</code>)  disable scale in. __*Default*__: true
  * **initialTaskNumber** (<code>number</code>)  initial number of tasks for the service. __*Default*__: 2
  * **snsTopic** (<code>[aws_sns.ITopic](#aws-cdk-lib-aws-sns-itopic)</code>)  SNS Topic to publish the notification. __*Default*__: do not publish to SNS



### Properties


Name | Type | Description 
-----|------|-------------
**fargateService** | <code>[aws_ecs.FargateService](#aws-cdk-lib-aws-ecs-fargateservice)</code> | <span></span>
**fargateTaskDef** | <code>[aws_ecs.FargateTaskDefinition](#aws-cdk-lib-aws-ecs-fargatetaskdefinition)</code> | <span></span>
**fargateWatcherFuncArn** | <code>string</code> | <span></span>
**layerVersionArn** | <code>string</code> | <span></span>
**region** | <code>string</code> | <span></span>
**vpc** | <code>[aws_ec2.IVpc](#aws-cdk-lib-aws-ec2-ivpc)</code> | <span></span>



## struct FargateFastAutoscalerProps  <a id="cdk-fargate-fastautoscaler-fargatefastautoscalerprops"></a>






Name | Type | Description 
-----|------|-------------
**backendContainer** | <code>[aws_ecs.ContainerDefinitionOptions](#aws-cdk-lib-aws-ecs-containerdefinitionoptions)</code> | backend container.
**backendContainerPortMapping** | <code>Array<[aws_ecs.PortMapping](#aws-cdk-lib-aws-ecs-portmapping)></code> | container port for the backend container.
**vpc** | <code>[aws_ec2.IVpc](#aws-cdk-lib-aws-ec2-ivpc)</code> | The VPC for the stack.
**awsCliLayerArn**? | <code>string</code> | AWS CLI Lambda layer ARN in Serverless App Repository.<br/>__*Default*__: 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli'
**awsCliLayerVersion**? | <code>string</code> | The version of the Serverless App for AWS CLI Lambda layer.<br/>__*Default*__: AWSCLI_LAYER_VERSION
**disableScaleIn**? | <code>boolean</code> | disable scale in.<br/>__*Default*__: true
**initialTaskNumber**? | <code>number</code> | initial number of tasks for the service.<br/>__*Default*__: 2
**snsTopic**? | <code>[aws_sns.ITopic](#aws-cdk-lib-aws-sns-itopic)</code> | SNS Topic to publish the notification.<br/>__*Default*__: do not publish to SNS



