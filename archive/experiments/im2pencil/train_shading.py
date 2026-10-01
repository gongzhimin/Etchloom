"""
Training script for Im2Pencil Shading Generator on Met Museum Master Engravings Dataset.
Trains ResnetGeneratorUnitShading + PatchGAN on local RTX 4060 Ti GPU.
"""

import os
import sys
import glob
import random
import time
import argparse
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms

from models import ResnetGeneratorUnitShading
from discriminator import NLayerDiscriminator


class EngravingPatchDataset(Dataset):
    def __init__(self, root_dir, is_train=True):
        self.target_dir = os.path.join(root_dir, 'target')
        self.tone_dir = os.path.join(root_dir, 'tone')
        self.edge_dir = os.path.join(root_dir, 'edge')

        all_files = sorted([f for f in os.listdir(self.target_dir) if f.endswith('.png')])
        # Deterministic shuffle
        random.seed(42)
        random.shuffle(all_files)

        split_idx = int(len(all_files) * 0.95)
        if is_train:
            self.files = all_files[:split_idx]
        else:
            self.files = all_files[split_idx:]

        print(f"[{'Train' if is_train else 'Val'} Dataset] Loaded {len(self.files)} patches.")

    def __len__(self):
        return len(self.files)

    def __getitem__(self, idx):
        fname = self.files[idx]
        p_target = os.path.join(self.target_dir, fname)
        p_tone = os.path.join(self.tone_dir, fname)
        p_edge = os.path.join(self.edge_dir, fname)

        img_target = Image.open(p_target).convert('RGB')
        img_tone = Image.open(p_tone).convert('RGB')
        img_edge = Image.open(p_edge).convert('RGB')

        # Data augmentation: Random horizontal / vertical flip
        if random.random() > 0.5:
            img_target = img_target.transpose(Image.FLIP_LEFT_RIGHT)
            img_tone = img_tone.transpose(Image.FLIP_LEFT_RIGHT)
            img_edge = img_edge.transpose(Image.FLIP_LEFT_RIGHT)
        if random.random() > 0.5:
            img_target = img_target.transpose(Image.FLIP_TOP_BOTTOM)
            img_tone = img_tone.transpose(Image.FLIP_TOP_BOTTOM)
            img_edge = img_edge.transpose(Image.FLIP_TOP_BOTTOM)

        to_tensor = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))
        ])

        t_target = to_tensor(img_target)
        t_tone = to_tensor(img_tone)
        t_edge = to_tensor(img_edge)

        return {
            'target': t_target,
            'tone': t_tone,
            'edge': t_edge,
            'fname': fname
        }


class SobelLoss(nn.Module):
    """Encourages sharp engraving line edges via first-order spatial gradients."""
    def __init__(self):
        super(SobelLoss, self).__init__()
        kx = torch.tensor([[-1., 0., 1.], [-2., 0., 2.], [-1., 0., 1.]]).view(1, 1, 3, 3)
        ky = torch.tensor([[-1., -2., -1.], [0., 0., 0.], [1., 2., 1.]]).view(1, 1, 3, 3)
        self.register_buffer('kx', kx.repeat(3, 1, 1, 1))
        self.register_buffer('ky', ky.repeat(3, 1, 1, 1))

    def forward(self, pred, target):
        pred_gx = F.conv2d(pred, self.kx, padding=1, groups=3)
        pred_gy = F.conv2d(pred, self.ky, padding=1, groups=3)
        targ_gx = F.conv2d(target, self.kx, padding=1, groups=3)
        targ_gy = F.conv2d(target, self.ky, padding=1, groups=3)
        return F.l1_loss(pred_gx, targ_gx) + F.l1_loss(pred_gy, targ_gy)


def train(epochs=20, batch_size=16, lr=0.0002, data_root='data/engravings_patches', save_dir='experiments/im2pencil/pretrained_models/shading_model'):
    os.makedirs(save_dir, exist_ok=True)
    preview_dir = 'experiments/im2pencil_train_previews'
    os.makedirs(preview_dir, exist_ok=True)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"=== Starting Training on Device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}) ===")

    train_dataset = EngravingPatchDataset(data_root, is_train=True)
    val_dataset = EngravingPatchDataset(data_root, is_train=False)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=2, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=4, shuffle=False)

    # Initialize Networks
    netG = ResnetGeneratorUnitShading(input_nc=3, output_nc=3, ngf=64, n_blocks=9).to(device)
    netD = NLayerDiscriminator(input_nc=9, ndf=64, n_layers=3).to(device)

    # Optimizers
    optG = torch.optim.Adam(netG.parameters(), lr=lr, betas=(0.5, 0.999))
    optD = torch.optim.Adam(netD.parameters(), lr=lr, betas=(0.5, 0.999))

    # Schedulers
    lr_lambda = lambda epoch: 1.0 - max(0, epoch - 10) / float(max(1, epochs - 10))
    schedG = torch.optim.lr_scheduler.LambdaLR(optG, lr_lambda=lr_lambda)
    schedD = torch.optim.lr_scheduler.LambdaLR(optD, lr_lambda=lr_lambda)

    # Losses
    criterionGAN = nn.MSELoss()
    criterionL1 = nn.L1Loss()
    criterionSobel = SobelLoss().to(device)

    total_steps = 0
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        netG.train()
        netD.train()
        epoch_d_loss = 0.0
        epoch_g_loss = 0.0
        epoch_l1_loss = 0.0

        for i, batch in enumerate(train_loader):
            real_target = batch['target'].to(device)
            real_tone = batch['tone'].to(device)
            real_edge = batch['edge'].to(device)
            bs, _, h, w = real_target.shape

            # Style unit tensor (4 channels, H/4, W/4). Set style 0 (hatching)
            unitS = torch.zeros(bs, 4, h // 4, w // 4, device=device)
            unitS[:, 0].fill_(1.0)

            # ---------------------
            #  Train Discriminator
            # ---------------------
            optD.zero_grad()

            # Real loss
            real_cond = torch.cat([real_edge, real_tone, real_target], dim=1)
            pred_real = netD(real_cond)
            loss_d_real = criterionGAN(pred_real, torch.ones_like(pred_real))

            # Fake loss
            with torch.no_grad():
                fake_target = netG(real_edge, unitS, real_tone)
            fake_cond = torch.cat([real_edge, real_tone, fake_target.detach()], dim=1)
            pred_fake = netD(fake_cond)
            loss_d_fake = criterionGAN(pred_fake, torch.zeros_like(pred_fake))

            loss_D = (loss_d_real + loss_d_fake) * 0.5
            loss_D.backward()
            optD.step()

            # -----------------
            #  Train Generator
            # -----------------
            optG.zero_grad()

            fake_target = netG(real_edge, unitS, real_tone)
            fake_cond_g = torch.cat([real_edge, real_tone, fake_target], dim=1)
            pred_fake_g = netD(fake_cond_g)

            loss_g_gan = criterionGAN(pred_fake_g, torch.ones_like(pred_fake_g))
            loss_g_l1 = criterionL1(fake_target, real_target) * 100.0
            loss_g_sobel = criterionSobel(fake_target, real_target) * 10.0

            loss_G = loss_g_gan + loss_g_l1 + loss_g_sobel
            loss_G.backward()
            optG.step()

            epoch_d_loss += loss_D.item()
            epoch_g_loss += loss_G.item()
            epoch_l1_loss += loss_g_l1.item()
            total_steps += 1

            if i % 30 == 0:
                elapsed = time.time() - start_time
                print(f"Epoch [{epoch}/{epochs}] Batch [{i}/{len(train_loader)}] "
                      f"Loss_D: {loss_D.item():.4f} Loss_G: {loss_G.item():.4f} "
                      f"L1: {loss_g_l1.item():.2f} Sobel: {loss_g_sobel.item():.2f} "
                      f"Time: {elapsed:.1f}s")

        schedG.step()
        schedD.step()

        # Save evaluation preview every 5 epochs or on the last epoch
        if epoch % 5 == 0 or epoch == epochs:
            netG.eval()
            with torch.no_grad():
                val_batch = next(iter(val_loader))
                v_target = val_batch['target'].to(device)
                v_tone = val_batch['tone'].to(device)
                v_edge = val_batch['edge'].to(device)
                bs_v = v_target.shape[0]
                v_unit = torch.zeros(bs_v, 4, 64, 64, device=device)
                v_unit[:, 0].fill_(1.0)
                v_fake = netG(v_edge, v_unit, v_tone)

                # Deprocess and save comparison grid
                to_img = lambda t: (np.clip((t[0].cpu().numpy().transpose(1, 2, 0) * 0.5 + 0.5) * 255, 0, 255)).astype(np.uint8)
                comp = np.concatenate([to_img(v_tone), to_img(v_edge), to_img(v_fake), to_img(v_target)], axis=1)
                preview_path = os.path.join(preview_dir, f"epoch_{epoch:02d}.png")
                Image.fromarray(comp).save(preview_path)
                print(f"[Preview Saved] {preview_path} (Tone | Edge | Generated Shading | Master Ground Truth)")

        # Save latest checkpoint
        save_path = os.path.join(save_dir, 'latest_net_G.pth')
        torch.save(netG.state_dict(), save_path)
        print(f"[Epoch {epoch} Done] Saved generator checkpoint: {save_path}")

    total_time = time.time() - start_time
    print(f"\n🎉 Training Finished in {total_time/60:.2f} minutes!")
    print(f"Model saved to: {os.path.join(save_dir, 'latest_net_G.pth')}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=15, help='Number of epochs')
    parser.add_argument('--batch_size', type=int, default=16, help='Batch size')
    parser.add_argument('--lr', type=float, default=0.0002, help='Learning rate')
    args = parser.parse_args()

    train(epochs=args.epochs, batch_size=args.batch_size, lr=args.lr)
