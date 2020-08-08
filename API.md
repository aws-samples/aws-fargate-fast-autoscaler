# API Reference

**Classes**

Name|Description
----|-----------
[FargateFastAutoscaler](#cdk-fargate-fastautlscaler-fargatefastautoscaler)|*No description*


**Structs**

Name|Description
----|-----------
[FargateFastAutoscalerProps](#cdk-fargate-fastautlscaler-fargatefastautoscalerprops)|*No description*



## class FargateFastAutoscaler 🔹 <a id="cdk-fargate-fastautlscaler-fargatefastautoscaler"></a>



__Implements__: [IConstruct](#constructs-iconstruct), [IConstruct](#aws-cdk-core-iconstruct), [IConstruct](#constructs-iconstruct), [IDependable](#aws-cdk-core-idependable)
__Extends__: [Construct](#aws-cdk-core-construct)

### Initializer




```ts
new FargateFastAutoscaler(scope: Construct, id: string, props: FargateFastAutoscalerProps)
```

* **scope** (<code>[Construct](#aws-cdk-core-construct)</code>)  *No description*
* **id** (<code>string</code>)  *No description*
* **props** (<code>[FargateFastAutoscalerProps](#cdk-fargate-fastautlscaler-fargatefastautoscalerprops)</code>)  *No description*
  * **backendContainer** (<code>[ContainerDefinitionOptions](#aws-cdk-aws-ecs-containerdefinitionoptions)</code>)  backend container. 
  * **backendContainerPortMapping** (<code>Array<[PortMapping](#aws-cdk-aws-ecs-portmapping)></code>)  container port for the backend container. 
  * **vpc** (<code>[IVpc](#aws-cdk-aws-ec2-ivpc)</code>)  The VPC for the stack. 
  * **awsCliLayerArn** (<code>string</code>)  AWS CLI Lambda layer ARN in Serverless App Repository. __*Default*__: 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli'
  * **awsCliLayerVersion** (<code>string</code>)  The version of the Serverless App for AWS CLI Lambda layer. __*Default*__: AWSCLI_LAYER_VERSION
  * **disableScaleIn** (<code>boolean</code>)  disable scale in. __*Default*__: true
  * **initialTaskNumber** (<code>number</code>)  initial number of tasks for the service. __*Default*__: 2
  * **snsTopic** (<code>[ITopic](#aws-cdk-aws-sns-itopic)</code>)  SNS Topic to publish the notification. __*Default*__: do not publish to SNS



### Properties


Name | Type | Description 
-----|------|-------------
**fargateService**🔹 | <code>[FargateService](#aws-cdk-aws-ecs-fargateservice)</code> | <span></span>
**fargateTaskDef**🔹 | <code>[FargateTaskDefinition](#aws-cdk-aws-ecs-fargatetaskdefinition)</code> | <span></span>
**fargateWatcherFuncArn**🔹 | <code>string</code> | <span></span>
**layerVersionArn**🔹 | <code>string</code> | <span></span>
**region**🔹 | <code>string</code> | <span></span>
**vpc**🔹 | <code>[IVpc](#aws-cdk-aws-ec2-ivpc)</code> | <span></span>



## struct FargateFastAutoscalerProps 🔹 <a id="cdk-fargate-fastautlscaler-fargatefastautoscalerprops"></a>






Name | Type | Description 
-----|------|-------------
**backendContainer**🔹 | <code>[ContainerDefinitionOptions](#aws-cdk-aws-ecs-containerdefinitionoptions)</code> | backend container.
**backendContainerPortMapping**🔹 | <code>Array<[PortMapping](#aws-cdk-aws-ecs-portmapping)></code> | container port for the backend container.
**vpc**🔹 | <code>[IVpc](#aws-cdk-aws-ec2-ivpc)</code> | The VPC for the stack.
**awsCliLayerArn**?🔹 | <code>string</code> | AWS CLI Lambda layer ARN in Serverless App Repository.<br/>__*Default*__: 'arn:aws:serverlessrepo:us-east-1:903779448426:applications/lambda-layer-awscli'
**awsCliLayerVersion**?🔹 | <code>string</code> | The version of the Serverless App for AWS CLI Lambda layer.<br/>__*Default*__: AWSCLI_LAYER_VERSION
**disableScaleIn**?🔹 | <code>boolean</code> | disable scale in.<br/>__*Default*__: true
**initialTaskNumber**?🔹 | <code>number</code> | initial number of tasks for the service.<br/>__*Default*__: 2
**snsTopic**?🔹 | <code>[ITopic](#aws-cdk-aws-sns-itopic)</code> | SNS Topic to publish the notification.<br/>__*Default*__: do not publish to SNS



