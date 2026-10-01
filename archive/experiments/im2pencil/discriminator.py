"""
PatchGAN (70x70) Discriminator for Im2Pencil Shading Generator.
"""

import functools
import torch
import torch.nn as nn


class NLayerDiscriminator(nn.Module):
    """Defines a PatchGAN discriminator."""

    def __init__(self, input_nc=9, ndf=64, n_layers=3, norm_layer=nn.InstanceNorm2d):
        """
        input_nc: conditioned on (edge [3] + tone [3] + real/fake shading [3]) = 9
        """
        super(NLayerDiscriminator, self).__init__()
        if isinstance(norm_layer, functools.partial):
            use_bias = (norm_layer.func == nn.InstanceNorm2d)
        else:
            use_bias = (norm_layer == nn.InstanceNorm2d)

        kw = 4
        padw = 1
        sequence = [
            nn.Conv2d(input_nc, ndf, kernel_size=kw, stride=2, padding=padw),
            nn.LeakyReLU(0.2, True)
        ]
        nf_mult = 1
        for n in range(1, n_layers):
            nf_mult_prev = nf_mult
            nf_mult = min(2 ** n, 8)
            sequence += [
                nn.Conv2d(ndf * nf_mult_prev, ndf * nf_mult, kernel_size=kw, stride=2, padding=padw, bias=use_bias),
                norm_layer(ndf * nf_mult),
                nn.LeakyReLU(0.2, True)
            ]

        nf_mult_prev = nf_mult
        nf_mult = min(2 ** n_layers, 8)
        sequence += [
            nn.Conv2d(ndf * nf_mult_prev, ndf * nf_mult, kernel_size=kw, stride=1, padding=padw, bias=use_bias),
            norm_layer(ndf * nf_mult),
            nn.LeakyReLU(0.2, True)
        ]

        sequence += [nn.Conv2d(ndf * nf_mult, 1, kernel_size=kw, stride=1, padding=padw)]
        self.model = nn.Sequential(*sequence)

    def forward(self, x):
        return self.model(x)
