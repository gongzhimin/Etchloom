"""
PyTorch network definitions for Im2Pencil (CVPR 2019).
Reference: 'Im2Pencil: Controllable Pencil Illustration from Photographs'
Authors: Yijun Li, Chen Fang, Aaron Hertzmann, Eli Shechtman, Ming-Hsuan Yang.
"""

import functools
import torch
import torch.nn as nn


def get_norm_layer(norm_type='instance'):
    if norm_type == 'batch':
        return functools.partial(nn.BatchNorm2d, affine=True)
    elif norm_type == 'instance':
        return functools.partial(nn.InstanceNorm2d, affine=False)
    elif norm_type == 'none':
        return None
    else:
        raise NotImplementedError(f'normalization layer [{norm_type}] is not found')


class ResnetBlock(nn.Module):
    def __init__(self, dim, padding_type='reflect', norm_layer=nn.InstanceNorm2d, use_dropout=False, use_bias=True):
        super(ResnetBlock, self).__init__()
        self.conv_block = self.build_conv_block(dim, padding_type, norm_layer, use_dropout, use_bias)

    def build_conv_block(self, dim, padding_type, norm_layer, use_dropout, use_bias):
        conv_block = []
        p = 0
        if padding_type == 'reflect':
            conv_block += [nn.ReflectionPad2d(1)]
        elif padding_type == 'replicate':
            conv_block += [nn.ReplicationPad2d(1)]
        elif padding_type == 'zero':
            p = 1
        else:
            raise NotImplementedError(f'padding [{padding_type}] is not implemented')

        conv_block += [
            nn.Conv2d(dim, dim, kernel_size=3, padding=p, bias=use_bias),
            norm_layer(dim),
            nn.ReLU(True)
        ]
        if use_dropout:
            conv_block += [nn.Dropout(0.5)]

        p = 0
        if padding_type == 'reflect':
            conv_block += [nn.ReflectionPad2d(1)]
        elif padding_type == 'replicate':
            conv_block += [nn.ReplicationPad2d(1)]
        elif padding_type == 'zero':
            p = 1
        else:
            raise NotImplementedError(f'padding [{padding_type}] is not implemented')

        conv_block += [
            nn.Conv2d(dim, dim, kernel_size=3, padding=p, bias=use_bias),
            norm_layer(dim)
        ]
        return nn.Sequential(*conv_block)

    def forward(self, x):
        return x + self.conv_block(x)


class ResnetGeneratorUnit(nn.Module):
    """
    Branch 1: Outline / Sketch Generator (netG1).
    Inputs:
        input1: imgE_xdog (B, input_nc, H, W)
        input2: unitE (B, 2, H/4, W/4) one-hot vector for outline style
    Outputs:
        output: sketchy outline (B, output_nc, H, W)
    """
    def __init__(self, input_nc=3, output_nc=3, ngf=64, norm_layer=nn.InstanceNorm2d, use_dropout=False, n_blocks=9, padding_type='reflect'):
        assert n_blocks >= 0
        super(ResnetGeneratorUnit, self).__init__()
        self.input_nc = input_nc
        self.output_nc = output_nc
        self.ngf = ngf

        if isinstance(norm_layer, functools.partial):
            use_bias = (norm_layer.func == nn.InstanceNorm2d)
        else:
            use_bias = (norm_layer == nn.InstanceNorm2d)

        model0 = [
            nn.ReflectionPad2d(3),
            nn.Conv2d(input_nc, ngf, kernel_size=7, padding=0, bias=use_bias),
            norm_layer(ngf),
            nn.ReLU(True)
        ]

        n_downsampling = 2
        for i in range(n_downsampling):
            mult = 2 ** i
            model0 += [
                nn.Conv2d(ngf * mult, ngf * mult * 2, kernel_size=3, stride=2, padding=1, bias=use_bias),
                norm_layer(ngf * mult * 2),
                nn.ReLU(True)
            ]

        mult = 2 ** n_downsampling
        model1 = [
            nn.Conv2d(2, int(ngf * mult), kernel_size=3, stride=1, padding=1, bias=use_bias),
            norm_layer(int(ngf * mult)),
            nn.ReLU(True)
        ]

        model = [
            nn.Conv2d(ngf * mult * 2, int(ngf * mult), kernel_size=3, stride=1, padding=1, bias=use_bias),
            norm_layer(int(ngf * mult)),
            nn.ReLU(True)
        ]
        for _ in range(n_blocks):
            model += [ResnetBlock(ngf * mult, padding_type=padding_type, norm_layer=norm_layer, use_dropout=use_dropout, use_bias=use_bias)]

        upsample2 = nn.Upsample(scale_factor=2)
        for i in range(n_downsampling):
            mult = 2 ** (n_downsampling - i)
            model += [
                upsample2,
                nn.Conv2d(ngf * mult, int(ngf * mult / 2), kernel_size=3, stride=1, padding=1, bias=use_bias),
                norm_layer(int(ngf * mult / 2)),
                nn.ReLU(True)
            ]

        model += [
            nn.ReflectionPad2d(3),
            nn.Conv2d(ngf, output_nc, kernel_size=7, padding=0),
            nn.Tanh()
        ]

        self.model0 = nn.Sequential(*model0)
        self.model1 = nn.Sequential(*model1)
        self.model = nn.Sequential(*model)

    def forward(self, input1, input2):
        f1 = self.model0(input1)
        f2 = self.model1(input2)
        f1 = torch.cat((f1, f2), dim=1)
        return self.model(f1)


class ResnetGeneratorUnitShading(nn.Module):
    """
    Branch 2: Shading / Texture Generator (netG2).
    Inputs:
        input1: imgE (B, input_nc, H, W) edge boundary map
        input2: unitS (B, 4, H/4, W/4) one-hot vector for shading style:
                0=hatching, 1=crosshatching, 2=stippling, 3=blending
        input3: imgS (B, input_nc, H, W) guided filter tone map
    Outputs:
        output: tonal shading texture (B, output_nc, H, W)
    """
    def __init__(self, input_nc=3, output_nc=3, ngf=64, norm_layer=nn.InstanceNorm2d, use_dropout=False, n_blocks=9, padding_type='reflect'):
        assert n_blocks >= 0
        super(ResnetGeneratorUnitShading, self).__init__()
        self.input_nc = input_nc
        self.output_nc = output_nc
        self.ngf = ngf

        if isinstance(norm_layer, functools.partial):
            use_bias = (norm_layer.func == nn.InstanceNorm2d)
        else:
            use_bias = (norm_layer == nn.InstanceNorm2d)

        # Branch for edge
        model0 = [
            nn.ReflectionPad2d(3),
            nn.Conv2d(input_nc, ngf, kernel_size=7, padding=0, bias=use_bias),
            norm_layer(ngf),
            nn.ReLU(True)
        ]
        n_downsampling = 2
        for i in range(n_downsampling):
            mult = 2 ** i
            model0 += [
                nn.Conv2d(ngf * mult, ngf * mult * 2, kernel_size=3, stride=2, padding=1, bias=use_bias),
                norm_layer(ngf * mult * 2),
                nn.ReLU(True)
            ]

        # Branch for style unit (4 classes)
        mult = 2 ** n_downsampling
        model1 = [
            nn.Conv2d(4, int(ngf * mult), kernel_size=3, stride=1, padding=1, bias=use_bias),
            norm_layer(int(ngf * mult)),
            nn.ReLU(True)
        ]

        # Branch for tone (abstract / guided filter)
        model2 = [
            nn.Conv2d(input_nc, ngf, kernel_size=7, stride=4, padding=2, bias=use_bias),
            norm_layer(ngf),
            nn.ReLU(True),
            nn.Conv2d(ngf, ngf * 4, kernel_size=7, stride=4, padding=2, bias=use_bias),
            norm_layer(ngf * 4),
            nn.ReLU(True),
            nn.Upsample(scale_factor=4)
        ]

        # Combine all 3 intermediate representations
        model = [
            nn.Conv2d(ngf * 4 * 3, int(ngf * 4), kernel_size=3, stride=1, padding=1, bias=use_bias),
            norm_layer(int(ngf * 4)),
            nn.ReLU(True)
        ]
        for _ in range(n_blocks):
            model += [ResnetBlock(ngf * mult, padding_type=padding_type, norm_layer=norm_layer, use_dropout=use_dropout, use_bias=use_bias)]

        upsample2 = nn.Upsample(scale_factor=2)
        for i in range(n_downsampling):
            mult = 2 ** (n_downsampling - i)
            model += [
                upsample2,
                nn.Conv2d(ngf * mult, int(ngf * mult / 2), kernel_size=3, stride=1, padding=1, bias=use_bias),
                norm_layer(int(ngf * mult / 2)),
                nn.ReLU(True)
            ]

        model += [
            nn.ReflectionPad2d(3),
            nn.Conv2d(ngf, output_nc, kernel_size=7, padding=0),
            nn.Tanh()
        ]

        self.model0 = nn.Sequential(*model0)
        self.model1 = nn.Sequential(*model1)
        self.model2 = nn.Sequential(*model2)
        self.model = nn.Sequential(*model)

    def forward(self, input1, input2, input3):
        f1 = self.model0(input1)
        f2 = self.model1(input2)
        f3 = self.model2(input3)
        combined = torch.cat((f1, f2, f3), dim=1)
        return self.model(combined)


def build_models(edge_weights_path=None, shading_weights_path=None, device='cpu'):
    norm_layer = get_norm_layer('instance')
    
    netG1 = ResnetGeneratorUnit(3, 3, 64, norm_layer=norm_layer, use_dropout=False, n_blocks=9)
    if edge_weights_path and torch.cuda.is_available():
        netG1.load_state_dict(torch.load(edge_weights_path))
    elif edge_weights_path:
        netG1.load_state_dict(torch.load(edge_weights_path, map_location='cpu'))
    netG1.to(device)
    netG1.eval()

    netG2 = ResnetGeneratorUnitShading(3, 3, 64, norm_layer=norm_layer, use_dropout=False, n_blocks=9)
    if shading_weights_path and torch.cuda.is_available():
        netG2.load_state_dict(torch.load(shading_weights_path))
    elif shading_weights_path:
        netG2.load_state_dict(torch.load(shading_weights_path, map_location='cpu'))
    netG2.to(device)
    netG2.eval()

    return netG1, netG2
