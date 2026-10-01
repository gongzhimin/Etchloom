import torchvision.transforms as T
from torch.utils.data.dataset import Dataset
from PIL import Image
import os
import fnmatch


def _convert_to_rgb(image):
    return image.convert('RGB')


class StrokePatchesDataset(Dataset):
    def __init__(self, data_path):
        self.data_path = data_path
        num_source_images = len(fnmatch.filter(os.listdir(self.data_path), '*_source.png'))
        num_target_images = len(fnmatch.filter(os.listdir(self.data_path), '*_target.png'))
        assert num_source_images == num_target_images, \
            'Number of source and target images must be equal, found {0} source and {1} target images'.format(
                num_source_images, num_target_images)
        self.num_images = num_source_images

        normalize = T.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
        self.source_image_transformations = \
            T.Compose(
                [
                    _convert_to_rgb,
                    T.ToTensor(),
                    normalize
                ]
            )

        self.target_image_transformations = T.Compose(
            [
                _convert_to_rgb,
                T.ToTensor()
            ]
        )

    def __getitem__(self, index):
        source_image = Image.open(os.path.join(self.data_path, '{0:04d}_source.png'.format(index)))
        target_image = Image.open(os.path.join(self.data_path, '{0:04d}_target.png'.format(index)))

        source_image = self.source_image_transformations(source_image)
        target_image = self.target_image_transformations(target_image)

        return source_image, target_image

    def __len__(self):
        return self.num_images

