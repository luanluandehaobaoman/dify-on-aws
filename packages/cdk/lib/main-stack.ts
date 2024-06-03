/*
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License").
You may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {
  Fn,
  Stack,
  StackProps,
  CfnParameter,
  CfnDynamicReference,
  CfnDynamicReferenceService,
  aws_ec2 as ec2,
  aws_iam as iam,
  aws_cloudformation as cloudformation,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface MainProps extends StackProps {
}

export class MainStack extends Stack {
  private paramGroups: any[] = [];
  private paramLabels: any = {};

  constructor(scope: Construct, id: string, props: MainProps) {
    super(scope, id, props);

    const IPv4CIDR = new CfnParameter(this, 'IPv4CIDR', {
      description:
        'The subnet CIDR prefix, such as 10.1, defaults to a subnet mask of /16.',
      default: '10.1',
      allowedPattern:
        '^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
      type: 'String',
    });
    IPv4CIDR.overrideLogicalId('IPv4CIDR');
    this.paramLabels[IPv4CIDR.logicalId] = {
      default: 'The Prefix of IPv4 CIDR',
    };

    this.paramGroups.push({
      Label: { default: 'VPC settings' },
      Parameters: [IPv4CIDR.logicalId],
    });

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: this.paramGroups,
        ParameterLabels: this.paramLabels,
      },
    };

    // Init VPC Stack
    const VPCStack = new cloudformation.CfnStack(this, 'VPC', {
      parameters: {
        IPv4CIDR: IPv4CIDR.valueAsString,
      },
      templateUrl: `${__dirname}/templates/ThreeLayerSubnets.template.json`,
    });
    VPCStack.overrideLogicalId('VPC');

    const publicSubnetIds = Fn.getAtt(
      VPCStack.logicalId,
      'Outputs.PublicSubnetIds',
    ).toString();

    const publicSecurityGroupId = Fn.getAtt(
      VPCStack.logicalId,
      `Outputs.PublicSecurityGroupId`,
    ).toString();

    const installationInstanceImageId = new CfnDynamicReference(
      CfnDynamicReferenceService.SSM,
      '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-arm64',
    );

    const iamInstanceProfileRole = new iam.Role(
      this,
      'IamInstanceProfileRole',
      {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      },
    );
    const cfnInstanceProfileRole = iamInstanceProfileRole.node
      .defaultChild as iam.CfnRole;
    cfnInstanceProfileRole.overrideLogicalId('IamInstanceProfileRole');

    iamInstanceProfileRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'AmazonSSMManagedInstanceCore',
      ),
    );

    const cfnIamInstanceProfile = new iam.CfnInstanceProfile(
      this,
      'IamInstanceProfile',
      {
        roles: [iamInstanceProfileRole.roleName],
      },
    );
    cfnIamInstanceProfile.overrideLogicalId('IamInstanceProfile');

    const cfnInstallationInstance = new ec2.CfnInstance(
      this,
      'InstallationInstance',
      {
        iamInstanceProfile: Fn.select(
          1,
          Fn.split('/', cfnIamInstanceProfile.attrArn),
        ),
        imageId: installationInstanceImageId.toString(),
        instanceType: 't4g.nano',
        securityGroupIds: [publicSecurityGroupId],
        subnetId: Fn.select(0, Fn.split(',', publicSubnetIds)),
        userData: Fn.base64(
          `#!/bin/bash\n\n yum install git docker -y && systemctl start docker && systemctl enable docker && curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose && git clone https://github.com/langgenius/dify.git && cd dify/docker && docker-compose up -d`,
        ),
      },
    );
    cfnInstallationInstance.overrideLogicalId('InstallationInstance');
    cfnInstallationInstance.addDependency(cfnIamInstanceProfile);

  }
}
