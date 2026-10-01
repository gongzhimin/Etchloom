import os
import torch
import torch.nn as nn
import argparse
from unet.unet_model import UNet
from dataset import StrokePatchesDataset
from datetime import datetime
from tqdm import tqdm


def main():
    learner = Learner()
    learner.train()


class Learner:
    def __init__(self):
        self.args = self.parse_command_line()
        self.device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
        self.model = UNet(n_channels=3, n_classes=3, bilinear=False).to(self.device)

        if not os.path.exists(self.args.checkpoint_path):
            os.mkdir(self.args.checkpoint_path)

        # data
        self.dataset = StrokePatchesDataset(self.args.data_directory)
        data_size = len(self.dataset)
        val_size = int(0.2 * data_size)
        train_size = data_size - val_size
        train_set, self.val_set = torch.utils.data.random_split(self.dataset, [train_size, val_size])
        self.train_loader = torch.utils.data.DataLoader(dataset=train_set, batch_size=self.args.batch_size, shuffle=True)
        self.val_loader = torch.utils.data.DataLoader(dataset=self.val_set, batch_size=1, shuffle=False)

        # Loss and optimizer
        self.criterion = nn.MSELoss()
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=self.args.learning_rate)

        self.best_val_loss = 1000.0

    def parse_command_line(self):
        parser = argparse.ArgumentParser()
        parser.add_argument("--data_directory", default='./stroke_patches/diamond', help="Path to the training stroke patches.")
        parser.add_argument("--checkpoint_path", "-c", default='./checkpoints', help="Directory to save models to.")
        parser.add_argument("--learning_rate", "-lr", type=float, default=0.001, help="Learning rate.")
        parser.add_argument("--epochs", "-e", type=int, default=10, help="Number of training epochs.")
        parser.add_argument("--batch_size", "-b", type=int, default=4, help="Batch size.")
        parser.add_argument("--val_freq", type=int, default=1, help="Number epochs between validations.")
        args = parser.parse_args()
        return args

    def train(self):
        # Train the model
        total_step = len(self.train_loader)
        for epoch in range(self.args.epochs):
            start_time = datetime.now()
            self.model.train()
            losses = []
            for i, (source_images, target_images) in tqdm(enumerate(self.train_loader)):
                source_images = source_images.to(self.device)
                target_images = target_images.to(self.device)

                # Forward pass
                outputs = self.model(source_images)
                loss = self.criterion(outputs, target_images)
                losses.append(loss)

                # Backward and optimize
                self.optimizer.zero_grad()
                loss.backward()
                self.optimizer.step()
                del outputs
                epoch_time = datetime.now() - start_time

            print ('Epoch [{}/{}], Step [{}/{}], Loss: {:.4f}, Time: {}'.format(epoch + 1, self.args.epochs, i + 1,
                                                                        total_step,
                                                                        torch.Tensor(losses).mean().item(), epoch_time))
            if (epoch + 1) % self.args.val_freq == 0:
                val_loss = self.validate()
                print('Epoch: {} Loss: {}'.format((epoch + 1), val_loss))
                if val_loss < self.best_val_loss:
                    self.best_val_loss = val_loss
                    print('Best validation updated.')
                    # Save the checkpoint
                    torch.save(self.model.state_dict(), os.path.join(self.args.checkpoint_path, 'best_val.pt'))

        # Save the final model
        torch.save(self.model.state_dict(), os.path.join(self.args.checkpoint_path, 'final_model.pt'))

    def validate(self):
        self.model.eval()
        val_losses = []
        val_criterion = nn.MSELoss()
        with torch.no_grad():
            for i, (source_images, target_images) in enumerate(self.val_loader):
                batch_source_images = source_images.to(self.device)
                batch_target_images = target_images.to(self.device)
                batch_outputs = self.model(batch_source_images)
                loss = val_criterion(batch_outputs, batch_target_images)
                val_losses.append(loss)

        return torch.Tensor(val_losses).mean().item()


if __name__ == "__main__":
    main()

