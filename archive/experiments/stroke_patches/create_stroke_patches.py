from PIL import Image, ImageFilter
import random
import os
import numpy as np
import math
import cairo
from tqdm import tqdm


stroke_patches = [
    'cuneiform_brush',
    'diamond_brush',
    'scribble_pencil',
    'speedball_pen',
    'wet_brush',
]

class CreateStrokePatchSet:
    def __init__(
            self,
            num_patches=5000,
            width=400,
            height=400,
            blur_radius=5.0,
            gaussian_noise_std=0.0,
            uniform_noise_low=0.0,
            uniform_noise_high=0.0,
            seed=42
    ):
        self.num_patches = num_patches
        self.width = width
        self.height = height
        self.blur_radius = blur_radius
        self.gaussian_noise_std = gaussian_noise_std
        self.uniform_noise_low = uniform_noise_low
        self.uniform_noise_high = uniform_noise_high
        random.seed(seed)

    def create_stroke_patch_set(self, patch_type, save_directory="./stroke_patches"):
        for i in tqdm(range(self.num_patches), "Creating stroke patches"):
            if patch_type == 'diamond_brush':
                image = self.create_diamond_brush_image()
            elif patch_type == 'scribble_pencil':
                image = self.create_scribble_pencil_image()
            elif patch_type == 'wet_brush':
                image = self.create_wet_brush_image()
            elif patch_type == 'cuneiform_brush':
                image = self.create_cuneiform_brush_image()
            elif patch_type == 'speedball_pen':
                image = self.create_speedball_pen_image()
            else:
                raise ValueError("Unknown variant: {}".format(patch_type))
            # Save the image to the specified directory
            output_directory = os.path.join(save_directory, patch_type)
            if not os.path.exists(output_directory):
                os.makedirs(output_directory)
            image.save(os.path.join(output_directory, '{0:04d}_target.png'.format(i)))
            # Optionally add Gaussian noise
            if self.gaussian_noise_std > 0.0:
                image = self.add_gaussian_noise(image, mean=0, std=self.gaussian_noise_std)
            # Optionally add uniform noise
            if (self.uniform_noise_low != 0.0) or (self.uniform_noise_high != 0.0):
                image = self.add_uniform_noise(image, low=self.uniform_noise_low, high=self.uniform_noise_high)
            # blur the image
            if self.blur_radius > 0.0:
                blurred_image = image.filter(ImageFilter.GaussianBlur(self.blur_radius))
            blurred_image.save(os.path.join(output_directory, '{0:04d}_source.png'.format(i)))

    def create_diamond_brush_image(self):
        # Create a width x height white background
        img = Image.new('RGB', (self.width, self.height), 'white')

        # draw the diamonds
        for _ in range(300):
            # Generate random size and position for the square
            size = random.randint(5, 50)
            x = random.randint(0, self.width - size)
            y = random.randint(0, self.height - size)

            # Generate random RGB values
            r = random.randint(0, 255)
            g = random.randint(0, 255)
            b = random.randint(0, 255)
            opacity = 255

            # Create a new image with the square, rotate it and paste it onto the main image
            square = Image.new('RGBA', (size, size), (r, g, b, opacity))
            square = square.rotate(45, expand=1, resample=Image.Resampling.BICUBIC)
            img.paste(square, (x, y), square)

        return img
    
    def create_wet_brush_image(self):
        return self.draw_random_lines(num_lines=50, line_length=80, line_width=40, round_end_caps=True)
    
    def create_scribble_pencil_image(self):
        return self.draw_random_lines(num_lines=400, line_length=500, line_width=10)
    
    def create_cuneiform_brush_image(self):
        # Create a width x height white background cairo context
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, self.width, self.height)
        context = cairo.Context(surface)
        context.set_source_rgb(1, 1, 1)  # Set white background
        context.paint()

        # Draw triangles
        for _ in range(350):
            x = np.random.randint(-50, self.width + 50)
            y = np.random.randint(-50, self.height + 50)
            self.draw_triangle(context, x, y, 90)

        # Convert the cairo surface to a PIL image
        img = Image.frombuffer("RGBA", (self.width, self.height), surface.get_data(), "raw", "BGRA", 0, 1)
        # convert to RGB
        return img.convert("RGB")
    
    def create_speedball_pen_image(self):
        # Create a width x height white background cairo context
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, self.width, self.height)
        context = cairo.Context(surface)
        context.set_source_rgb(1, 1, 1)  # Set white background
        context.paint()

        # draw the arcs
        for _ in range(220):
            radius = np.random.uniform(40, 150)
            center_x = np.random.uniform(-radius, self.width) + radius / 2
            center_y = np.random.uniform(-radius, self.height) + radius / 2
            start_angle = np.random.uniform(0, 360)
            end_angle = np.random.uniform(0, 360)
            if start_angle > end_angle:
                start_angle, end_angle = end_angle, start_angle

            context.set_source_rgba(0, 0, 0, 1)  #` Set black color
            context.set_line_width(2 * 100.00 / 72.0)  # Set line width
            context.arc(center_x, center_y, radius, np.deg2rad(start_angle), np.deg2rad(end_angle))
            context.stroke()

        # Convert the cairo surface to a PIL image
        img = Image.frombuffer("RGBA", (self.width, self.height), surface.get_data(), "raw", "BGRA", 0, 1)
        # convert to RGB
        return img.convert("RGB")
    
    def add_gaussian_noise(self, image, mean, std):
        # Convert the image to a numpy array of floats
        image_array = np.array(image).astype(np.float32)

        # Generate Gaussian noise and add it to the image
        image_array += np.random.normal(loc=mean, scale=std, size=image_array.shape)

        # clip pixels to 0 to 255 range, convert back to 8-bits per channel and return as a PIL image
        return Image.fromarray(np.clip(a=image_array, a_min=0, a_max=255).astype(np.uint8))
    
    def add_uniform_noise(self, image, low, high):
        # Convert the image to a numpy array of floats
        image_array = np.array(image).astype(np.float32)

        # Generate uniform noise and add it to the image
        image_array += np.random.uniform(low=low, high=high, size=image_array.shape)

        # clip pixels to 0 to 255 range, convert back to 8-bits per channel and return as a PIL image
        return Image.fromarray(np.clip(a=image_array, a_min=0, a_max=255).astype(np.uint8))
    
    def draw_random_line(self, line_length, line_width, context):
        # Generate a random angle and start position for the line
        angle = random.uniform(0.0, 2 * math.pi)
        margin = line_length / 2
        x_start = random.uniform(-margin, self.width + margin)
        y_start = random.uniform(-margin, self.height + margin)
        x_end = x_start + line_length * math.cos(angle)
        y_end = y_start + line_length * math.sin(angle)

        # Generate random RGB values
        r = random.random()
        g = random.random()
        b = random.random()
        alpha = 1.0

        # Set the color and draw the line
        context.set_source_rgba(r, g, b, alpha)
        context.set_line_width(line_width)
        context.move_to(x_start, y_start)
        context.line_to(x_end, y_end)
        context.stroke()
        return
    
    def draw_random_lines(self, num_lines, line_length, line_width, round_end_caps=False):
        # Create a width x height white background cairo context
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, self.width, self.height)
        context = cairo.Context(surface)
        if round_end_caps:
            context.set_line_cap(cairo.LINE_CAP_ROUND)
        context.set_source_rgb(1, 1, 1)  # Set white background
        context.paint()
        # draw random lines
        for _ in range(num_lines):
            self.draw_random_line(line_length=line_length, line_width=line_width, context=context)
        # Convert the cairo surface to a PIL image
        img = Image.frombuffer("RGBA", (self.width, self.height), surface.get_data(), "raw", "BGRA", 0, 1)
        # convert to RGB
        return img.convert("RGB")


    def draw_triangle(self, context, x, y, rotation):
        context.save()

        # Translate and rotate the context
        context.translate(x, y)
        context.rotate(np.deg2rad(rotation))

        # Draw the triangle, 20 x 100
        context.move_to(-10, -50)
        context.line_to(10, -50)
        context.line_to(0, 50)
        context.close_path()

        # Set the color to black with 33% transparency
        context.set_source_rgba(0, 0, 0, 0.33)

        # Fill the triangle
        context.fill()

        context.restore()

def parse_command_line():
    import argparse
    parser = argparse.ArgumentParser(description='Create stroke patch set.')
    parser.add_argument('--patch_type', type=str, choices=stroke_patches, default='speedball_pen', help='Type of stroke patch set to create')
    parser.add_argument('--num_patches', type=int, default=5000, help='Number of stroke patches in the stroke patch set.')
    parser.add_argument('--width', type=int, default=400, help='Width of a patch.')
    parser.add_argument('--height', type=int, default=400, help='Height of the patch.')
    parser.add_argument('--blur_radius', type=float, default=5.0, help='Blur radius.')
    parser.add_argument('--gaussian_noise_std', type=float, default=0.0, help='Standard deviation of the added noise.')
    parser.add_argument('--uniform_noise_low', type=float, default=0.0, help='Lower bound for uniform noise.')
    parser.add_argument('--uniform_noise_high', type=float, default=0.0, help='Upper bound for uniform noise.')
    parser.add_argument('--save_directory', type=str, default='./stroke_patches', help='Directory to save the created stroke patch set images')
    return parser.parse_args()


if __name__ == '__main__':
    args = parse_command_line()
    creator = CreateStrokePatchSet(
        num_patches=args.num_patches,
        width=args.width,
        height=args.height,
        blur_radius=args.blur_radius,
        gaussian_noise_std=args.gaussian_noise_std,
        uniform_noise_low=args.uniform_noise_low,
        uniform_noise_high=args.uniform_noise_high
    )
    creator.create_stroke_patch_set(patch_type=args.patch_type, save_directory=args.save_directory)



