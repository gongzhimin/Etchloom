The code in this folder was copied from https://github.com/milesial/Pytorch-UNet.

The original GPL-3.0 license is included in this folder.

Two modifications were made.
1. In the DoubleConv class in unet_parts.py, the call to nn.BatchNorm2d was changed to nn.InstanceNorm2d.
2. In the forward method of the UNet class in unet_model.py, a Sigmoid operater was added before the final output.