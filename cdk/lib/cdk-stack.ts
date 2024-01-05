import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import {Construct} from "constructs";
import {ApplicationLoadBalancedFargateService} from "aws-cdk-lib/aws-ecs-patterns";
import {Stack} from "aws-cdk-lib";
import {Effect, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

      const REPOSITORY = '537920200235.dkr.ecr.eu-central-1.amazonaws.com/mystory-repository';
      const IMAGE_TAG = '1.0.0';
      const CONTAINER_PORT = 80
      const taskRole = new Role(this, "fargate-task-role", {
          assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com")
      });

      const taskDefinition = new ecs.FargateTaskDefinition(
        this,
        "fargate-task-definition",
          {
              memoryLimitMiB: 1024,
              cpu: 512,
          }
      );

      taskDefinition.addToExecutionRolePolicy(new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['ecr:GetDownloadUrlForLayer', 'ecr:BatchGetImage', "ecr:GetAuthorizationToken"],
          resources: ['*'], // Use '*' to grant permissions to all ECR repositories; TODO: restrict to specific repositories for better security
      }));

      taskDefinition.addContainer("mystory-fargate-container", {
          containerName: "mystory-ecs-container",
          image: ecs.ContainerImage.fromRegistry(REPOSITORY + ':' + IMAGE_TAG),
          logging: new ecs.AwsLogDriver({
              streamPrefix: "fargate-task-log-prefix"
          }),
          portMappings: [
              {
                  containerPort: CONTAINER_PORT,
                  hostPort: CONTAINER_PORT,
                  protocol: ecs.Protocol.TCP,
              },
          ],
      });

    const vpc = new ec2.Vpc(this, "fargate-vpc", {
      maxAzs: 2,
      natGateways: 1
    });

    const cluster = new ecs.Cluster(this, "fargate-cluster", { vpc });

    new ApplicationLoadBalancedFargateService(
        this,
        "MyFargateService",
        {
          cluster: cluster, // Required
          cpu: 512, // Default is 256
          desiredCount: 2, // Default is 1
          taskDefinition: taskDefinition,
          memoryLimitMiB: 2048, // Default is 512
          publicLoadBalancer: true // Default is false
        }
    );
  }
}