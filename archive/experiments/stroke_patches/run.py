import os
import torch
import torch.nn as nn
import torchvision.transforms as T
import argparse
from unet.unet_model import UNet
from dataset import _convert_to_rgb
from PIL import Image
from tqdm import tqdm


def main():
    learner = Inference()
    learner.run()


class Inference:
    def __init__(self):
        self.args = self.parse_command_line()
        self.device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
        self.model = UNet(n_channels=3, n_classes=3, bilinear=False).to(self.device)

    def parse_command_line(self):
        parser = argparse.ArgumentParser()
        parser.add_argument("--input_directory", default='./input', help="Path to directory that contains images to be processed.")
        parser.add_argument("--output_directory", default='./output', help="Path to directory that will contain the processed images.")
        parser.add_argument("--model_path", "-m", help="Path to trained model.")
        args = parser.parse_args()
        return args

    def run(self):
        self.model.load_state_dict(torch.load(self.args.model_path, weights_only=False))
        self.model.eval()

        normalize = T.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
        input_transform = \
            T.Compose(
                [
                    _convert_to_rgb,
                    T.ToTensor(),
                    normalize
                ]
            )
        output_transform = T.ToPILImage()

        if not os.path.exists(self.args.output_directory):
            os.mkdir(self.args.output_directory)

        input_test_files = os.listdir(self.args.input_directory)

        with torch.no_grad():
            for file in tqdm(input_test_files):
                image = Image.open(os.path.join(self.args.input_directory, file))
                image = input_transform(image)
                image = image.unsqueeze(dim=0)
                image = image.to(self.device)
                output = self.model(image)
                output = output.squeeze(dim=0)
                output_cpu = output.data.cpu()
                output_image = output_transform(output_cpu)
                output_image.save(os.path.join(self.args.output_directory, os.path.splitext(os.path.basename(self.args.model_path))[0] + '_' + file))


if __name__ == "__main__":
    main()

