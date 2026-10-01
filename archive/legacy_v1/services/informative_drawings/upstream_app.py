import numpy as np
import torch
import torch.nn as nn
import gradio as gr
from PIL import Image
import torchvision.transforms as transforms

norm_layer = nn.InstanceNorm2d

class ResidualBlock(nn.Module):
    def __init__(self, in_features):
        super(ResidualBlock, self).__init__()

        conv_block = [  nn.ReflectionPad2d(1),
                        nn.Conv2d(in_features, in_features, 3),
                        norm_layer(in_features),
                        nn.ReLU(inplace=True),
                        nn.ReflectionPad2d(1),
                        nn.Conv2d(in_features, in_features, 3),
                        norm_layer(in_features)
                        ]

        self.conv_block = nn.Sequential(*conv_block)

    def forward(self, x):
        return x + self.conv_block(x)


class Generator(nn.Module):
    def __init__(self, input_nc, output_nc, n_residual_blocks=9, sigmoid=True):
        super(Generator, self).__init__()

        # Initial convolution block
        model0 = [   nn.ReflectionPad2d(3),
                    nn.Conv2d(input_nc, 64, 7),
                    norm_layer(64),
                    nn.ReLU(inplace=True) ]
        self.model0 = nn.Sequential(*model0)

        # Downsampling
        model1 = []
        in_features = 64
        out_features = in_features*2
        for _ in range(2):
            model1 += [  nn.Conv2d(in_features, out_features, 3, stride=2, padding=1),
                        norm_layer(out_features),
                        nn.ReLU(inplace=True) ]
            in_features = out_features
            out_features = in_features*2
        self.model1 = nn.Sequential(*model1)

        model2 = []
        # Residual blocks
        for _ in range(n_residual_blocks):
            model2 += [ResidualBlock(in_features)]
        self.model2 = nn.Sequential(*model2)

        # Upsampling
        model3 = []
        out_features = in_features//2
        for _ in range(2):
            model3 += [  nn.ConvTranspose2d(in_features, out_features, 3, stride=2, padding=1, output_padding=1),
                        norm_layer(out_features),
                        nn.ReLU(inplace=True) ]
            in_features = out_features
            out_features = in_features//2
        self.model3 = nn.Sequential(*model3)

        # Output layer
        model4 = [  nn.ReflectionPad2d(3),
                        nn.Conv2d(64, output_nc, 7)]
        if sigmoid:
            model4 += [nn.Sigmoid()]

        self.model4 = nn.Sequential(*model4)

    def forward(self, x, cond=None):
        out = self.model0(x)
        out = self.model1(out)
        out = self.model2(out)
        out = self.model3(out)
        out = self.model4(out)

        return out

model1 = Generator(3, 1, 3)
model1.load_state_dict(torch.load('model.pth', map_location=torch.device('cpu')))
model1.eval()

model2 = Generator(3, 1, 3)
model2.load_state_dict(torch.load('model2.pth', map_location=torch.device('cpu')))
model2.eval()

def predict(input_img, ver):
    input_img = Image.open(input_img)
    # transform = transforms.Compose([transforms.Resize(256, Image.BICUBIC), transforms.ToTensor()])
    transform = transforms.Compose([transforms.ToTensor()])
    input_img = transform(input_img)
    input_img = torch.unsqueeze(input_img, 0)

    drawing = 0
    with torch.no_grad():
        if ver == 'style 2':
            drawing = model2(input_img)[0].detach()
        else:
            drawing = model1(input_img)[0].detach()
    
    drawing = transforms.ToPILImage()(drawing)
    return drawing

title="informative-drawings"
description="Gradio Demo for line drawing generation. "
# article = "<p style='text-align: center'><a href='TODO' target='_blank'>Project Page</a> | <a href='codelink' target='_blank'>Github</a></p>"
examples=[['cat.png', 'style 1'], ['bridge.png', 'style 1'], ['lizard.png', 'style 2'],]


iface = gr.Interface(predict, [gr.inputs.Image(type='filepath'),
    gr.inputs.Radio(['style 1','style 2'], type="value", default='style 1', label='version')],
    gr.outputs.Image(type="pil"), title=title,description=description,examples=examples)

iface.launch()